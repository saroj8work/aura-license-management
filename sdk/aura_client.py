"""
Aura Life Sciences Client SDK
-----------------------------
Drop-in Python SDK for lab instruments (sequencers, chromatography workstations,
digital pathology scanners) and cloud microservices.

Supports:
- Zero-network Air-Gapped Ed25519 Cryptographic Verification (.lic files)
- Online Node Activation, Lease Renewal & Automatic Heartbeat Background Daemon
- Hardware Fingerprint Node-Locking (CPU, Host, Platform)
- Feature Entitlement Guard Decorators (@require_feature)
"""

import os
import sys
import json
import base64
import hashlib
import platform
import threading
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.error

# Cryptographic imports
try:
    from cryptography.hazmat.primitives.asymmetric import ed25519
    from cryptography.hazmat.primitives import serialization
    from cryptography.exceptions import InvalidSignature
except ImportError:
    raise ImportError("Aura SDK requires 'cryptography'. Install via 'pip install cryptography'.")

class LicenseError(Exception):
    """Base exception for all licensing errors."""
    pass

class LicenseExpiredError(LicenseError):
    """Raised when a license has passed its validity date."""
    pass

class LicenseTamperedError(LicenseError):
    """Raised when asymmetric digital signature does not match claims."""
    pass

class EntitlementError(LicenseError):
    """Raised when a required feature flag is not entitled."""
    pass

class AuraLicenseClient:
    def __init__(
        self,
        server_url: str = "http://127.0.0.1:8000/api/v1",
        public_key_b64: Optional[str] = None
    ):
        self.server_url = server_url.rstrip("/")
        self.public_key_b64 = public_key_b64
        self.active_license_key: Optional[str] = None
        self.entitled_features: List[str] = []
        self.lease_expires_at: Optional[datetime] = None
        self._heartbeat_thread: Optional[threading.Thread] = None
        self._stop_heartbeat = threading.Event()
        self.machine_fingerprint = self.generate_machine_fingerprint()

    @staticmethod
    def generate_machine_fingerprint() -> str:
        """
        Calculates a deterministic hardware fingerprint from machine telemetry.
        """
        raw = f"{platform.machine()}::{platform.node()}::{platform.system()}::{platform.version()}"
        return "fp_" + hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]

    def _canonical_json(self, data: Dict[str, Any]) -> bytes:
        return json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")

    # =========================================================================
    # OFFLINE AIR-GAPPED VERIFICATION (ZERO NETWORK CALLS)
    # =========================================================================
    def verify_offline_license_file(self, license_file_path: str) -> Dict[str, Any]:
        """
        Mathematically verifies an Ed25519-signed .lic bundle on an air-gapped lab instrument.
        Requires NO internet connection.
        """
        if not os.path.exists(license_file_path):
            raise LicenseError(f"License file not found: {license_file_path}")

        with open(license_file_path, "r", encoding="utf-8") as f:
            bundle = json.load(f)

        claims = bundle.get("claims", {})
        signature_b64 = bundle.get("signature", "")
        pub_key_b64 = self.public_key_b64 or bundle.get("public_key")

        if not pub_key_b64:
            raise LicenseError("No Ed25519 public key provided in bundle or client config.")

        # 1. Verify Asymmetric Signature
        try:
            pub_bytes = base64.b64decode(pub_key_b64.encode("utf-8"))
            verifier = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
            signature = base64.urlsafe_b64decode(signature_b64.encode("utf-8"))
            canonical_bytes = self._canonical_json(claims)
            verifier.verify(signature, canonical_bytes)
        except (InvalidSignature, Exception) as e:
            raise LicenseTamperedError("Cryptographic signature mismatch! The license claims have been modified or corrupted.")

        # 2. Verify Expiration
        expires_at_str = claims.get("expires_at")
        if expires_at_str:
            exp_date = datetime.fromisoformat(expires_at_str)
            if exp_date < datetime.utcnow():
                raise LicenseExpiredError(f"Air-gapped license expired on {exp_date.isoformat()}")

        self.active_license_key = claims.get("license_key")
        self.entitled_features = claims.get("allowed_features", [])

        return {
            "status": "VALID",
            "license_key": self.active_license_key,
            "tenant_name": claims.get("tenant_name"),
            "entitled_features": self.entitled_features,
            "expires_at": expires_at_str,
            "verification_mode": "AIR_GAPPED_ED25519_VERIFIED"
        }

    # =========================================================================
    # ONLINE ACTIVATION & HEARTBEAT LEASING
    # =========================================================================
    def activate_online(self, license_key: str, device_label: str = "Lab Instrument") -> Dict[str, Any]:
        """
        Activates this hardware node against the cloud/local Aura server.
        """
        url = f"{self.server_url}/licenses/activate"
        payload = {
            "license_key": license_key,
            "machine_fingerprint": self.machine_fingerprint,
            "hostname": platform.node(),
            "platform_os": f"{platform.system()} {platform.release()}",
            "device_label": device_label
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

        try:
            with urllib.request.urlopen(req) as resp:
                res = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            raise LicenseError(f"Activation failed ({e.code}): {err_body}")

        self.active_license_key = license_key
        self.entitled_features = res.get("allowed_features", [])
        if res.get("lease_expires_at"):
            self.lease_expires_at = datetime.fromisoformat(res["lease_expires_at"])

        return res

    def start_heartbeat_daemon(self, interval_seconds: int = 3600):
        """
        Starts a background daemon thread that periodically pings the server
        to renew the workstation hardware lease.
        """
        if self._heartbeat_thread and self._heartbeat_thread.is_alive():
            return

        self._stop_heartbeat.clear()

        def _loop():
            while not self._stop_heartbeat.is_set():
                self._stop_heartbeat.wait(interval_seconds)
                if self._stop_heartbeat.is_set():
                    break
                try:
                    self.send_heartbeat()
                except Exception as e:
                    print(f"[Aura SDK Warning] Heartbeat failed: {e}", file=sys.stderr)

        self._heartbeat_thread = threading.Thread(target=_loop, daemon=True)
        self._heartbeat_thread.start()

    def send_heartbeat(self) -> Dict[str, Any]:
        if not self.active_license_key:
            raise LicenseError("No active license key set for heartbeat.")

        url = f"{self.server_url}/licenses/heartbeat"
        payload = {
            "license_key": self.active_license_key,
            "machine_fingerprint": self.machine_fingerprint
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode("utf-8"))

        if res.get("lease_expires_at"):
            self.lease_expires_at = datetime.fromisoformat(res["lease_expires_at"])
        return res

    def stop_heartbeat(self):
        self._stop_heartbeat.set()
        if self._heartbeat_thread:
            self._heartbeat_thread.join(timeout=2)

    # =========================================================================
    # ENTITLEMENT CHECK & DECORATOR
    # =========================================================================
    def has_feature(self, feature_code: str) -> bool:
        """Returns True if the current license grants this feature."""
        return feature_code in self.entitled_features

    def require_feature(self, feature_code: str):
        """
        Function decorator that guards clinical or analysis methods.
        Raises EntitlementError if the license lacks the required feature flag.
        """
        def decorator(func):
            def wrapper(*args, **kwargs):
                if not self.has_feature(feature_code):
                    raise EntitlementError(
                        f"Access Denied: Feature '{feature_code}' is not licensed. "
                        f"Current features: {self.entitled_features}"
                    )
                return func(*args, **kwargs)
            return wrapper
        return decorator
