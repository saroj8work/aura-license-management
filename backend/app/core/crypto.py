import base64
import json
import hashlib
from typing import Dict, Any, Tuple
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from cryptography.exceptions import InvalidSignature
from app.core.config import settings

class CryptoManager:
    """
    Manages Asymmetric Cryptography (Ed25519) for Life Sciences License Signing
    and Air-Gapped Instrument Entitlement Verification.
    """
    def __init__(self):
        self._init_keys()

    def _init_keys(self):
        if settings.ED25519_PRIVATE_KEY_B64:
            priv_bytes = base64.b64decode(settings.ED25519_PRIVATE_KEY_B64)
            self.private_key = ed25519.Ed25519PrivateKey.from_private_bytes(priv_bytes)
            self.public_key = self.private_key.public_key()
        else:
            # Generate deterministic fallback or runtime keypair
            self.private_key = ed25519.Ed25519PrivateKey.generate()
            self.public_key = self.private_key.public_key()

    def get_public_key_b64(self) -> str:
        pub_bytes = self.public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        return base64.b64encode(pub_bytes).decode("utf-8")

    def get_public_key_pem(self) -> str:
        pub_bytes = self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return pub_bytes.decode("utf-8")

    def _canonical_json(self, data: Dict[str, Any]) -> bytes:
        return json.dumps(data, sort_keys=True, separators=(",", ":")).encode("utf-8")

    def sign_payload(self, claims: Dict[str, Any]) -> str:
        """
        Digitally signs a canonical representation of license claims.
        Returns a URL-safe Base64 encoded signature.
        """
        canonical_bytes = self._canonical_json(claims)
        signature = self.private_key.sign(canonical_bytes)
        return base64.urlsafe_b64encode(signature).decode("utf-8")

    def verify_signature(self, claims: Dict[str, Any], signature_b64: str, public_key_b64: str = None) -> bool:
        """
        Verifies the Ed25519 signature of license claims.
        Can verify using the local public key or a passed public key for air-gapped lab nodes.
        """
        try:
            canonical_bytes = self._canonical_json(claims)
            signature = base64.urlsafe_b64decode(signature_b64.encode("utf-8"))
            
            if public_key_b64:
                pub_bytes = base64.b64decode(public_key_b64.encode("utf-8"))
                verifier = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
            else:
                verifier = self.public_key

            verifier.verify(signature, canonical_bytes)
            return True
        except (InvalidSignature, ValueError, Exception):
            return False

    def generate_airgap_license_file(self, license_key: str, claims: Dict[str, Any]) -> Dict[str, Any]:
        """
        Produces a 21 CFR Part 11 compliant signed .lic bundle
        for air-gapped lab instruments (sequencers, spectrometry, clinical workstations).
        """
        signature = self.sign_payload(claims)
        payload_hash = hashlib.sha256(self._canonical_json(claims)).hexdigest()

        return {
            "format": "AURA_LIFESCIENCES_LIC_V1",
            "license_key": license_key,
            "claims": claims,
            "payload_sha256": payload_hash,
            "signature": signature,
            "public_key": self.get_public_key_b64(),
            "algorithm": "Ed25519",
            "issuer": "Aura License Authority (Cloud/Local)"
        }

    @staticmethod
    def compute_machine_fingerprint(cpu_id: str, hostname: str, platform_info: str) -> str:
        """
        Creates a consistent cryptographic hardware fingerprint for node-locking.
        """
        raw = f"{cpu_id.strip().lower()}::{hostname.strip().lower()}::{platform_info.strip().lower()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

crypto_manager = CryptoManager()
