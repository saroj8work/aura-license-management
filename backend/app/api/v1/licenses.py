from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.license import License, LicenseActivation
from app.schemas.all_schemas import (
    LicenseOut,
    LicenseIssueRequest,
    ActivateLicenseRequest,
    HeartbeatRequest,
    DeactivateRequest,
    RevokeLicenseRequest,
    OfflineVerifyRequest
)
from app.services.license_service import license_service
from app.core.crypto import crypto_manager
import json

router = APIRouter()

@router.get("", response_model=List[LicenseOut])
def list_licenses(
    tenant_id: Optional[str] = None,
    product_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(License)
    if tenant_id:
        query = query.filter(License.tenant_id == tenant_id)
    if product_id:
        query = query.filter(License.product_id == product_id)
    if status:
        query = query.filter(License.status == status)
    return query.order_by(License.created_at.desc()).all()

@router.post("", response_model=LicenseOut)
def issue_license(
    data: LicenseIssueRequest,
    db: Session = Depends(get_db)
):
    return license_service.issue_license(
        db=db,
        tenant_id=str(data.tenant_id),
        product_id=str(data.product_id),
        license_type=data.license_type,
        max_activations=data.max_activations,
        allowed_features=data.allowed_features,
        expires_at=data.expires_at,
        actor_email="admin@aura.io",
        subscription_id=str(data.subscription_id) if data.subscription_id else None,
        reason_for_change=data.reason_for_change
    )

@router.get("/public-key")
def get_public_key():
    """
    Returns the Ed25519 public key in Base64 and PEM formats
    for client-side or offline lab instrument verification.
    """
    return {
        "algorithm": "Ed25519",
        "public_key_b64": crypto_manager.get_public_key_b64(),
        "public_key_pem": crypto_manager.get_public_key_pem(),
        "format": "RFC 8032 / PKCS#8"
    }

@router.post("/activate")
def activate_node(
    data: ActivateLicenseRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    return license_service.activate_license(
        db=db,
        license_key=data.license_key,
        machine_fingerprint=data.machine_fingerprint,
        hostname=data.hostname,
        platform_os=data.platform_os,
        device_label=data.device_label,
        client_ip=client_ip
    )

@router.post("/heartbeat")
def heartbeat_node(
    data: HeartbeatRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    return license_service.heartbeat(
        db=db,
        license_key=data.license_key,
        machine_fingerprint=data.machine_fingerprint,
        client_ip=client_ip
    )

@router.post("/deactivate")
def deactivate_node(
    data: DeactivateRequest,
    db: Session = Depends(get_db)
):
    return license_service.deactivate(
        db=db,
        license_key=data.license_key,
        machine_fingerprint=data.machine_fingerprint,
        actor_email="device-operator@lab.local",
        reason=data.reason
    )

@router.post("/{license_id}/revoke", response_model=LicenseOut)
def revoke_license(
    license_id: str,
    data: RevokeLicenseRequest,
    db: Session = Depends(get_db)
):
    return license_service.revoke_license(
        db=db,
        license_id=license_id,
        actor_email="compliance-officer@aura.io",
        reason_for_change=data.reason_for_change
    )

@router.get("/{license_id}/airgap-file")
def download_airgap_license(
    license_id: str,
    db: Session = Depends(get_db)
):
    """
    Downloads a tamper-evident signed .lic JSON bundle
    for deployment to air-gapped lab instruments.
    """
    lic = db.query(License).filter(License.id == license_id).first()
    if not lic:
        raise HTTPException(status_code=404, detail="License not found")

    airgap_payload = crypto_manager.generate_airgap_license_file(
        license_key=lic.license_key,
        claims=lic.public_claims
    )

    content = json.dumps(airgap_payload, indent=2)
    filename = f"{lic.license_key}.lic"

    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/offline-verify")
def offline_verify_simulator(data: OfflineVerifyRequest):
    """
    Simulates the client SDK verification on an air-gapped lab instrument.
    Performs purely offline Ed25519 signature and claim integrity verification.
    """
    bundle = data.license_file_json
    claims = bundle.get("claims", {})
    signature = bundle.get("signature", "")
    public_key = bundle.get("public_key", crypto_manager.get_public_key_b64())

    is_sig_valid = crypto_manager.verify_signature(claims, signature, public_key_b64=public_key)

    # Check expiration if specified
    expires_at_str = claims.get("expires_at")
    has_expired = False
    if expires_at_str:
        try:
            from datetime import datetime
            exp_date = datetime.fromisoformat(expires_at_str)
            if exp_date < datetime.utcnow():
                has_expired = True
        except Exception:
            pass

    return {
        "is_signature_valid": is_sig_valid,
        "is_cryptographically_authentic": is_sig_valid and not has_expired,
        "has_expired": has_expired,
        "license_key": claims.get("license_key"),
        "tenant_name": claims.get("tenant_name"),
        "allowed_features": claims.get("allowed_features", []),
        "max_activations": claims.get("max_activations"),
        "algorithm": bundle.get("algorithm", "Ed25519"),
        "verification_mode": "AIR_GAPPED_OFFLINE_MATHEMATICAL_VERIFICATION"
    }
