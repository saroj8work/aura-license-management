import secrets
import string
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.license import License, LicenseActivation, LicenseType, LicenseStatus
from app.models.tenant import Tenant
from app.models.product import Product
from app.models.subscription import Subscription
from app.core.crypto import crypto_manager
from app.services.audit_service import audit_service

class LicenseService:
    @staticmethod
    def generate_license_key(prefix: str = "AURA") -> str:
        """
        Generates readable, partitioned license keys e.g. AURA-GXP-7B8A-42F1-9C3E
        """
        chars = string.ascii_uppercase + string.digits
        parts = [''.join(secrets.choice(chars) for _ in range(4)) for _ in range(3)]
        return f"{prefix}-{''.join(parts[0])}-{parts[1]}-{parts[2]}"

    @classmethod
    def issue_license(
        cls,
        db: Session,
        tenant_id: str,
        product_id: str,
        license_type: str,
        max_activations: int,
        allowed_features: List[str],
        expires_at: Optional[datetime],
        actor_email: str,
        subscription_id: Optional[str] = None,
        reason_for_change: Optional[str] = "Initial license issuance"
    ) -> License:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        key_prefix = "AURA-B2C" if tenant.account_type == "B2C_INDIVIDUAL" else "AURA-GXP"
        license_key = cls.generate_license_key(prefix=key_prefix)

        # Cryptographic Claims Payload
        claims = {
            "license_key": license_key,
            "tenant_id": str(tenant_id),
            "tenant_name": tenant.name,
            "product_code": product.code,
            "license_type": license_type,
            "max_activations": max_activations,
            "allowed_features": allowed_features,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "issued_at": datetime.utcnow().isoformat()
        }

        signature = crypto_manager.sign_payload(claims)

        license_obj = License(
            tenant_id=tenant.id,
            product_id=product.id,
            subscription_id=subscription_id,
            license_key=license_key,
            license_type=license_type,
            status=LicenseStatus.ACTIVE.value,
            max_activations=max_activations,
            current_activations=0,
            expires_at=expires_at,
            allowed_features=allowed_features,
            public_claims=claims,
            signature=signature
        )

        db.add(license_obj)
        db.commit()
        db.refresh(license_obj)

        # 21 CFR Part 11 Audit Trail
        audit_service.record_event(
            db=db,
            action="LICENSE_ISSUED",
            entity_type="LICENSE",
            entity_id=str(license_obj.id),
            actor_email=actor_email,
            tenant_id=str(tenant.id),
            details={
                "license_key": license_key,
                "license_type": license_type,
                "product_code": product.code,
                "max_activations": max_activations,
                "allowed_features": allowed_features,
                "expires_at": expires_at.isoformat() if expires_at else None
            },
            reason_for_change=reason_for_change
        )

        return license_obj

    @classmethod
    def activate_license(
        cls,
        db: Session,
        license_key: str,
        machine_fingerprint: str,
        hostname: Optional[str],
        platform_os: Optional[str],
        device_label: Optional[str],
        client_ip: Optional[str],
        lease_hours: int = 168 # 7 days default heartbeat window
    ) -> Dict[str, Any]:
        license_obj = db.query(License).filter(License.license_key == license_key).first()
        if not license_obj:
            raise HTTPException(status_code=404, detail="Invalid license key")

        if license_obj.status != LicenseStatus.ACTIVE.value:
            raise HTTPException(status_code=400, detail=f"License is currently {license_obj.status}")

        if license_obj.expires_at and license_obj.expires_at < datetime.utcnow():
            license_obj.status = LicenseStatus.EXPIRED.value
            db.commit()
            raise HTTPException(status_code=400, detail="License has expired")

        # Check existing activation on this machine
        existing_act = db.query(LicenseActivation).filter(
            LicenseActivation.license_id == license_obj.id,
            LicenseActivation.machine_fingerprint == machine_fingerprint,
            LicenseActivation.is_active == True
        ).first()

        now = datetime.utcnow()
        lease_expiry = now + timedelta(hours=lease_hours)

        if existing_act:
            # Renew existing activation lease
            existing_act.last_heartbeat_at = now
            existing_act.lease_expires_at = lease_expiry
            existing_act.hostname = hostname or existing_act.hostname
            existing_act.platform_os = platform_os or existing_act.platform_os
            existing_act.ip_address = client_ip or existing_act.ip_address
            act = existing_act
        else:
            # Check seat / activation limit
            if license_obj.current_activations >= license_obj.max_activations:
                raise HTTPException(
                    status_code=400,
                    detail=f"Activation seat limit reached ({license_obj.current_activations}/{license_obj.max_activations}). Please deactivate an existing node or upgrade plan."
                )

            act = LicenseActivation(
                license_id=license_obj.id,
                machine_fingerprint=machine_fingerprint,
                hostname=hostname,
                platform_os=platform_os,
                device_label=device_label or f"Workstation-{machine_fingerprint[:8]}",
                ip_address=client_ip,
                lease_expires_at=lease_expiry,
                last_heartbeat_at=now,
                is_active=True
            )
            db.add(act)
            license_obj.current_activations += 1

        # Generate signed runtime activation lease token
        lease_claims = {
            "activation_id": str(act.id),
            "license_key": license_key,
            "machine_fingerprint": machine_fingerprint,
            "lease_expires_at": lease_expiry.isoformat(),
            "allowed_features": license_obj.allowed_features,
            "issued_at": now.isoformat()
        }
        token_signature = crypto_manager.sign_payload(lease_claims)
        act.activation_token = token_signature

        db.commit()
        db.refresh(act)

        # Audit
        audit_service.record_event(
            db=db,
            action="LICENSE_ACTIVATED",
            entity_type="LICENSE",
            entity_id=str(license_obj.id),
            actor_email=f"machine:{machine_fingerprint[:12]}",
            tenant_id=str(license_obj.tenant_id),
            details={
                "machine_fingerprint": machine_fingerprint,
                "hostname": hostname,
                "device_label": act.device_label,
                "lease_expires_at": lease_expiry.isoformat()
            },
            client_ip=client_ip
        )

        return {
            "status": "ACTIVATED",
            "license_key": license_key,
            "activation_id": str(act.id),
            "device_label": act.device_label,
            "lease_expires_at": lease_expiry.isoformat(),
            "allowed_features": license_obj.allowed_features,
            "token": token_signature,
            "public_key": crypto_manager.get_public_key_b64()
        }

    @classmethod
    def heartbeat(
        cls,
        db: Session,
        license_key: str,
        machine_fingerprint: str,
        client_ip: Optional[str] = None
    ) -> Dict[str, Any]:
        license_obj = db.query(License).filter(License.license_key == license_key).first()
        if not license_obj or license_obj.status != LicenseStatus.ACTIVE.value:
            raise HTTPException(status_code=400, detail="License is inactive or not found")

        act = db.query(LicenseActivation).filter(
            LicenseActivation.license_id == license_obj.id,
            LicenseActivation.machine_fingerprint == machine_fingerprint,
            LicenseActivation.is_active == True
        ).first()

        if not act:
            raise HTTPException(status_code=404, detail="No active node activation found for this device")

        now = datetime.utcnow()
        act.last_heartbeat_at = now
        act.lease_expires_at = now + timedelta(hours=168)  # extend by 7 days
        if client_ip:
            act.ip_address = client_ip

        db.commit()

        return {
            "status": "HEARTBEAT_ACKNOWLEDGED",
            "license_key": license_key,
            "last_heartbeat_at": act.last_heartbeat_at.isoformat(),
            "lease_expires_at": act.lease_expires_at.isoformat(),
            "allowed_features": license_obj.allowed_features
        }

    @classmethod
    def deactivate(
        cls,
        db: Session,
        license_key: str,
        machine_fingerprint: str,
        actor_email: str,
        reason: Optional[str] = "User initiated deactivation"
    ) -> Dict[str, Any]:
        license_obj = db.query(License).filter(License.license_key == license_key).first()
        if not license_obj:
            raise HTTPException(status_code=404, detail="License not found")

        act = db.query(LicenseActivation).filter(
            LicenseActivation.license_id == license_obj.id,
            LicenseActivation.machine_fingerprint == machine_fingerprint,
            LicenseActivation.is_active == True
        ).first()

        if not act:
            raise HTTPException(status_code=404, detail="Active activation not found")

        act.is_active = False
        act.deactivated_at = datetime.utcnow()
        license_obj.current_activations = max(0, license_obj.current_activations - 1)

        db.commit()

        audit_service.record_event(
            db=db,
            action="LICENSE_DEACTIVATED",
            entity_type="LICENSE",
            entity_id=str(license_obj.id),
            actor_email=actor_email,
            tenant_id=str(license_obj.tenant_id),
            details={
                "machine_fingerprint": machine_fingerprint,
                "device_label": act.device_label,
                "current_activations": license_obj.current_activations
            },
            reason_for_change=reason
        )

        return {
            "status": "DEACTIVATED",
            "license_key": license_key,
            "current_activations": license_obj.current_activations,
            "max_activations": license_obj.max_activations
        }

    @classmethod
    def revoke_license(
        cls,
        db: Session,
        license_id: str,
        actor_email: str,
        reason_for_change: str
    ) -> License:
        license_obj = db.query(License).filter(License.id == license_id).first()
        if not license_obj:
            raise HTTPException(status_code=404, detail="License not found")

        license_obj.status = LicenseStatus.REVOKED.value
        license_obj.revocation_reason = reason_for_change

        # Deactivate all active node sessions
        activations = db.query(LicenseActivation).filter(
            LicenseActivation.license_id == license_obj.id,
            LicenseActivation.is_active == True
        ).all()
        for act in activations:
            act.is_active = False
            act.deactivated_at = datetime.utcnow()

        license_obj.current_activations = 0
        db.commit()
        db.refresh(license_obj)

        audit_service.record_event(
            db=db,
            action="LICENSE_REVOKED",
            entity_type="LICENSE",
            entity_id=str(license_obj.id),
            actor_email=actor_email,
            tenant_id=str(license_obj.tenant_id),
            details={
                "license_key": license_obj.license_key,
                "revoked_activations_count": len(activations)
            },
            reason_for_change=reason_for_change
        )

        return license_obj

license_service = LicenseService()
