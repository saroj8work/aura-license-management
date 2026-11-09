from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.tenant import Tenant
from app.schemas.all_schemas import TenantCreate, TenantOut
from app.services.audit_service import audit_service

router = APIRouter()

@router.get("", response_model=List[TenantOut])
def list_tenants(
    account_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Tenant)
    if account_type:
        query = query.filter(Tenant.account_type == account_type)
    return query.order_by(Tenant.created_at.desc()).all()

@router.post("", response_model=TenantOut)
def create_tenant(request: TenantCreate, db: Session = Depends(get_db)):
    existing = db.query(Tenant).filter(Tenant.slug == request.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tenant slug already exists")

    tenant = Tenant(
        name=request.name,
        slug=request.slug,
        account_type=request.account_type,
        contact_email=request.contact_email,
        department_tag=request.department_tag,
        gxp_validation_status=request.gxp_validation_status or "VALIDATED",
        metadata_json=request.metadata_json or {}
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    audit_service.record_event(
        db=db,
        action="TENANT_CREATED",
        entity_type="TENANT",
        entity_id=str(tenant.id),
        actor_email=request.contact_email,
        tenant_id=str(tenant.id),
        details={
            "name": tenant.name,
            "account_type": tenant.account_type,
            "gxp_status": tenant.gxp_validation_status
        },
        reason_for_change="Initial organization onboarding"
    )

    return tenant

@router.get("/{tenant_id}", response_model=TenantOut)
def get_tenant(tenant_id: str, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant
