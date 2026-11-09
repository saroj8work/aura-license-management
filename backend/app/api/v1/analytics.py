from typing import Optional
from fastapi import APIRouter, Depends, Header, Cookie
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.tenant import Tenant, AccountType
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.license import License, LicenseActivation
from app.models.audit_log import AuditLog
from app.services.audit_service import audit_service
from app.core.currency import get_currency_info, convert_amount

router = APIRouter()

@router.get("/overview")
def get_dashboard_overview(
    x_country_code: Optional[str] = Header(None),
    aura_country: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    country = x_country_code or aura_country or "IN"
    curr_info = get_currency_info(country)

    total_tenants = db.query(Tenant).count()
    b2b_tenants = db.query(Tenant).filter(Tenant.account_type == AccountType.B2B_ENTERPRISE.value).count()
    b2c_tenants = db.query(Tenant).filter(Tenant.account_type == AccountType.B2C_INDIVIDUAL.value).count()

    active_subs = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.ACTIVE.value).all()
    active_subs_count = len(active_subs)

    # Calculate ARR (USD base)
    arr_usd = 0.0
    for s in active_subs:
        if s.plan:
            price_dollars = s.plan.price_cents / 100.0
            if s.plan.billing_interval == "ANNUAL":
                arr_usd += price_dollars
            elif s.plan.billing_interval == "MONTHLY":
                arr_usd += price_dollars * 12

    total_licenses = db.query(License).count()
    active_activations = db.query(LicenseActivation).filter(LicenseActivation.is_active == True).count()
    total_audits = db.query(AuditLog).count()

    verification = audit_service.verify_full_chain(db)

    # Localized ARR
    arr_cents = int(arr_usd * 100)
    localized_arr = convert_amount(arr_cents, curr_info)

    return {
        "total_tenants": total_tenants,
        "b2b_tenants_count": b2b_tenants,
        "b2c_tenants_count": b2c_tenants,
        "active_subscriptions": active_subs_count,
        "total_licenses_issued": total_licenses,
        "active_device_activations": active_activations,
        "arr_usd": round(arr_usd, 2),
        "localized_arr": localized_arr,
        "country_code": curr_info.get("code"),
        "currency_symbol": curr_info.get("symbol"),
        "gxp_audit_entries_count": total_audits,
        "audit_chain_healthy": verification["is_valid"]
    }
