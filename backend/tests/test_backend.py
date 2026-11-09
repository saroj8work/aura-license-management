import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.core.crypto import crypto_manager
from app.core.audit_chain import audit_chain_engine

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "HEALTHY"

def test_list_products_and_plans():
    response = client.get("/api/v1/products")
    assert response.status_code == 200
    products = response.json()
    assert len(products) >= 3
    # Check that plans exist
    genomics = next(p for p in products if p["code"] == "AURA-GENOMICS-SUITE")
    assert len(genomics["plans"]) >= 2
    # Verify both B2C and B2B plans are present
    audiences = [p["target_audience"] for p in genomics["plans"]]
    assert "B2C" in audiences
    assert "B2B" in audiences

def test_list_tenants():
    response = client.get("/api/v1/tenants")
    assert response.status_code == 200
    tenants = response.json()
    assert len(tenants) >= 3
    b2b_tenants = [t for t in tenants if t["account_type"] == "B2B_ENTERPRISE"]
    b2c_tenants = [t for t in tenants if t["account_type"] == "B2C_INDIVIDUAL"]
    assert len(b2b_tenants) >= 2
    assert len(b2c_tenants) >= 1

def test_public_key_endpoint():
    response = client.get("/api/v1/licenses/public-key")
    assert response.status_code == 200
    data = response.json()
    assert data["algorithm"] == "Ed25519"
    assert "public_key_b64" in data
    assert "public_key_pem" in data

def test_crypto_manager_sign_and_verify():
    claims = {
        "license_key": "TEST-AURA-KEY-1234",
        "tenant": "Test Lab",
        "max_seats": 5,
        "features": ["ngs_alignment", "gxp_audit_trail"]
    }
    signature = crypto_manager.sign_payload(claims)
    assert signature is not None
    assert len(signature) > 20
    # Verify with local key
    is_valid = crypto_manager.verify_signature(claims, signature)
    assert is_valid is True

    # Tampered claims must fail verification
    tampered_claims = claims.copy()
    tampered_claims["max_seats"] = 999
    is_invalid = crypto_manager.verify_signature(tampered_claims, signature)
    assert is_invalid is False

def test_license_activation_and_seat_limits():
    # Provision a dedicated test license
    tenants = client.get("/api/v1/tenants").json()
    products = client.get("/api/v1/products").json()
    new_lic_resp = client.post("/api/v1/licenses", json={
        "tenant_id": tenants[0]["id"],
        "product_id": products[0]["id"],
        "license_type": "FLOATING",
        "max_activations": 5,
        "features": ["ngs_alignment", "variant_calling"]
    })
    assert new_lic_resp.status_code == 200
    target_lic = new_lic_resp.json()
    lic_key = target_lic["license_key"]

    # 1. Activate on unique machine fingerprint
    m_fp = f"test_unit_machine_fp_{uuid.uuid4().hex[:8]}"
    act_resp = client.post("/api/v1/licenses/activate", json={
        "license_key": lic_key,
        "machine_fingerprint": m_fp,
        "hostname": "Test-Unit-Station.local",
        "platform_os": "Linux Ubuntu 22.04",
        "device_label": "Unit Test Robot"
    })
    assert act_resp.status_code == 200
    data = act_resp.json()
    assert data["status"] == "ACTIVATED"
    assert data["license_key"] == lic_key

    # 2. Heartbeat on activated node
    hb_resp = client.post("/api/v1/licenses/heartbeat", json={
        "license_key": lic_key,
        "machine_fingerprint": m_fp
    })
    assert hb_resp.status_code == 200
    assert hb_resp.json()["status"] == "HEARTBEAT_ACKNOWLEDGED"

    # 3. Deactivate node
    deact_resp = client.post("/api/v1/licenses/deactivate", json={
        "license_key": lic_key,
        "machine_fingerprint": m_fp,
        "reason": "Test finished"
    })
    assert deact_resp.status_code == 200
    assert deact_resp.json()["status"] == "DEACTIVATED"

def test_airgap_file_download_and_offline_verification():
    licenses = client.get("/api/v1/licenses").json()
    target_lic = licenses[0]
    lic_id = target_lic["id"]

    # Download airgap license file
    file_resp = client.get(f"/api/v1/licenses/{lic_id}/airgap-file")
    assert file_resp.status_code == 200
    lic_bundle = file_resp.json()
    assert lic_bundle["format"] == "AURA_LIFESCIENCES_LIC_V1"
    assert "signature" in lic_bundle
    assert "public_key" in lic_bundle

    # Simulate client SDK offline verification
    verify_resp = client.post("/api/v1/licenses/offline-verify", json={
        "license_file_json": lic_bundle
    })
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()
    assert v_data["is_signature_valid"] is True
    assert v_data["is_cryptographically_authentic"] is True
    assert v_data["verification_mode"] == "AIR_GAPPED_OFFLINE_MATHEMATICAL_VERIFICATION"

def test_audit_chain_verification():
    resp = client.get("/api/v1/audit/verify-chain")
    assert resp.status_code == 200
    chain_info = resp.json()
    assert chain_info["is_valid"] is True
    assert chain_info["chain_status"] == "VERIFIED_TAMPER_FREE"
    assert chain_info["total_records"] >= 5
    assert len(chain_info["anomalies_detected"]) == 0

def test_audit_tamper_detection_and_repair():
    # 1. Tamper an audit record
    tamper_resp = client.post("/api/v1/audit/tamper-test")
    assert tamper_resp.status_code == 200
    tampered_id = tamper_resp.json()["tampered_record_id"]

    # 2. Check chain integrity (must fail!)
    check_resp = client.get("/api/v1/audit/verify-chain")
    assert check_resp.status_code == 200
    assert check_resp.json()["is_valid"] is False
    assert check_resp.json()["chain_status"] == "INTEGRITY_BREACH_DETECTED"
    assert len(check_resp.json()["anomalies_detected"]) > 0

    # 3. Repair chain
    repair_resp = client.post("/api/v1/audit/repair-chain")
    assert repair_resp.status_code == 200

    # 4. Verify chain is restored
    restored_resp = client.get("/api/v1/audit/verify-chain")
    assert restored_resp.status_code == 200
    assert restored_resp.json()["is_valid"] is True
    assert restored_resp.json()["chain_status"] == "VERIFIED_TAMPER_FREE"

def test_analytics_overview():
    resp = client.get("/api/v1/analytics/overview")
    assert resp.status_code == 200
    stats = resp.json()
    assert stats["total_tenants"] >= 3
    assert stats["active_subscriptions"] >= 2
    assert stats["arr_usd"] > 0
    assert stats["audit_chain_healthy"] is True
