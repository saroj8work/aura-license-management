import pytest
import os
import json
import tempfile
from datetime import datetime, timedelta
from app.core.crypto import crypto_manager
from sdk.aura_client import (
    AuraLicenseClient,
    LicenseError,
    LicenseExpiredError,
    LicenseTamperedError,
    EntitlementError
)

def test_sdk_hardware_fingerprint():
    fp1 = AuraLicenseClient.generate_machine_fingerprint()
    fp2 = AuraLicenseClient.generate_machine_fingerprint()
    assert fp1.startswith("fp_")
    assert fp1 == fp2  # Deterministic on same machine

def test_sdk_airgap_verification_valid():
    client = AuraLicenseClient(public_key_b64=crypto_manager.get_public_key_b64())
    claims = {
        "license_key": "AURA-AIRGAP-TEST-9988",
        "tenant_name": "BioPharma QC Cleanroom",
        "allowed_features": ["chromato_qc", "gxp_part11_audit_trail"],
        "expires_at": (datetime.utcnow() + timedelta(days=365)).isoformat(),
        "issued_at": datetime.utcnow().isoformat()
    }
    bundle = crypto_manager.generate_airgap_license_file("AURA-AIRGAP-TEST-9988", claims)

    with tempfile.NamedTemporaryFile("w", suffix=".lic", delete=False) as f:
        json.dump(bundle, f)
        temp_path = f.name

    try:
        res = client.verify_offline_license_file(temp_path)
        assert res["status"] == "VALID"
        assert res["license_key"] == "AURA-AIRGAP-TEST-9988"
        assert client.has_feature("chromato_qc") is True
        assert client.has_feature("unlicensed_ai_module") is False
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def test_sdk_airgap_tamper_detection():
    client = AuraLicenseClient(public_key_b64=crypto_manager.get_public_key_b64())
    claims = {
        "license_key": "AURA-AIRGAP-TEST-1122",
        "tenant_name": "Tamper Test Lab",
        "allowed_features": ["ngs_alignment"],
        "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat()
    }
    bundle = crypto_manager.generate_airgap_license_file("AURA-AIRGAP-TEST-1122", claims)

    # Malicious tampering: add an unauthorized feature without recalculating signature
    bundle["claims"]["allowed_features"].append("unauthorized_admin_feature")

    with tempfile.NamedTemporaryFile("w", suffix=".lic", delete=False) as f:
        json.dump(bundle, f)
        temp_path = f.name

    try:
        with pytest.raises(LicenseTamperedError):
            client.verify_offline_license_file(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def test_sdk_airgap_expiration_detection():
    client = AuraLicenseClient(public_key_b64=crypto_manager.get_public_key_b64())
    claims = {
        "license_key": "AURA-EXPIRED-KEY",
        "tenant_name": "Expired Account",
        "allowed_features": ["ngs_alignment"],
        "expires_at": (datetime.utcnow() - timedelta(days=1)).isoformat()  # Expired yesterday
    }
    bundle = crypto_manager.generate_airgap_license_file("AURA-EXPIRED-KEY", claims)

    with tempfile.NamedTemporaryFile("w", suffix=".lic", delete=False) as f:
        json.dump(bundle, f)
        temp_path = f.name

    try:
        with pytest.raises(LicenseExpiredError):
            client.verify_offline_license_file(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def test_sdk_feature_guard_decorator():
    client = AuraLicenseClient()
    client.entitled_features = ["ngs_alignment"]

    @client.require_feature("ngs_alignment")
    def allowed_func():
        return "SUCCESS_ALIGNMENT"

    @client.require_feature("spectrometry_qc")
    def blocked_func():
        return "SHOULD_NEVER_RUN"

    assert allowed_func() == "SUCCESS_ALIGNMENT"

    with pytest.raises(EntitlementError) as exc_info:
        blocked_func()
    assert "spectrometry_qc" in str(exc_info.value)
