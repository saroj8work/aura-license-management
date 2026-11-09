from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.schemas.all_schemas import AuditLogOut, AuditVerificationResponse
from app.services.audit_service import audit_service
from app.core.audit_chain import audit_chain_engine
from app.core.config import settings

router = APIRouter()

@router.get("/logs", response_model=List[AuditLogOut])
def list_audit_logs(
    tenant_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if tenant_id:
        query = query.filter(AuditLog.tenant_id == tenant_id)
    if action:
        query = query.filter(AuditLog.action == action)
    return query.order_by(AuditLog.id.desc()).limit(limit).all()

@router.get("/verify-chain", response_model=AuditVerificationResponse)
def verify_audit_chain(db: Session = Depends(get_db)):
    """
    FDA 21 CFR Part 11 / GxP Cryptographic Integrity Verification.
    Traverses the chronological hash chain and verifies that no record
    has been deleted, altered, or injected out-of-order.
    """
    return audit_service.verify_full_chain(db)

@router.post("/tamper-test")
def simulate_database_tampering(record_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    DEMO / GxP TESTING ENDPOINT:
    Simulates malicious SQL tampering by corrupting an audit log entry's details
    without updating its cryptographic hash, triggering immediate GxP alarm.
    """
    target = None
    if record_id:
        target = db.query(AuditLog).filter(AuditLog.id == record_id).first()
    else:
        target = db.query(AuditLog).order_by(AuditLog.id.desc()).first()

    if not target:
        raise HTTPException(status_code=404, detail="No audit logs available to tamper")

    from sqlalchemy.orm.attributes import flag_modified
    original_details = target.details.copy() if target.details else {}
    target.details = {**original_details, "TAMPERED_BY_UNAUTHORIZED_DBA": True, "stolen_seats": 9999}
    target.reason_for_change = "TAMPERED_WITHOUT_REHASHING"
    flag_modified(target, "details")
    db.commit()

    return {
        "message": f"Successfully tampered audit record ID {target.id}. Run /verify-chain to view GxP anomaly detection.",
        "tampered_record_id": target.id
    }

@router.post("/repair-chain")
def repair_chain_integrity(db: Session = Depends(get_db)):
    """
    Recomputes the cryptographic hash chain sequentially across all audit logs.
    Restores valid status after tamper simulation testing.
    """
    records = db.query(AuditLog).order_by(AuditLog.id.asc()).all()
    prev_hash = settings.AUDIT_GENESIS_HASH

    for rec in records:
        rec.previous_hash = prev_hash
        iso_time = rec.timestamp.isoformat()
        rec.hash = audit_chain_engine.calculate_entry_hash(
            prev_hash=prev_hash,
            timestamp_iso=iso_time,
            actor_email=rec.actor_email,
            action=rec.action,
            entity_type=rec.entity_type,
            entity_id=str(rec.entity_id or ""),
            details=rec.details,
            reason_for_change=rec.reason_for_change
        )
        prev_hash = rec.hash

    db.commit()
    return {"message": "Audit trail cryptographic chain restored to valid state", "records_re_chained": len(records)}
