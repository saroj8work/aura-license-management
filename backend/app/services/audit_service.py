from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.audit_log import AuditLog
from app.core.config import settings
from app.core.audit_chain import audit_chain_engine

class AuditService:
    @staticmethod
    def record_event(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Optional[str],
        actor_email: str,
        actor_user_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        reason_for_change: Optional[str] = None,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """
        Appends a 21 CFR Part 11 compliant tamper-evident audit record
        with automatic SHA-256 hash chaining.
        """
        # Get the hash of the latest audit record
        latest_record = db.query(AuditLog).order_by(desc(AuditLog.id)).first()
        prev_hash = latest_record.hash if latest_record else settings.AUDIT_GENESIS_HASH

        now_utc = datetime.utcnow()
        iso_time = now_utc.isoformat()

        calculated_hash = audit_chain_engine.calculate_entry_hash(
            prev_hash=prev_hash,
            timestamp_iso=iso_time,
            actor_email=actor_email,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id or ""),
            details=details or {},
            reason_for_change=reason_for_change or ""
        )

        record = AuditLog(
            timestamp=now_utc,
            tenant_id=tenant_id,
            actor_user_id=actor_user_id,
            actor_email=actor_email,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            details=details or {},
            reason_for_change=reason_for_change,
            client_ip=client_ip,
            user_agent=user_agent,
            previous_hash=prev_hash,
            hash=calculated_hash
        )

        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def verify_full_chain(db: Session) -> Dict[str, Any]:
        """
        Verifies the cryptographic chain across all historical audit entries.
        """
        records = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
        is_valid, anomalies = audit_chain_engine.verify_chain(records)
        return {
            "is_valid": is_valid,
            "total_records": len(records),
            "anomalies_detected": anomalies,
            "chain_status": "VERIFIED_TAMPER_FREE" if is_valid else "INTEGRITY_BREACH_DETECTED",
            "last_verified_at": datetime.utcnow().isoformat()
        }

audit_service = AuditService()
