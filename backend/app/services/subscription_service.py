from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.subscription import Subscription, SubscriptionStatus, PaymentMethodType
from app.models.tenant import Tenant, AccountType
from app.models.product import Plan, Product
from app.models.license import License, LicenseType
from app.services.license_service import license_service
from app.services.audit_service import audit_service

class SubscriptionService:
    @classmethod
    def create_subscription(
        cls,
        db: Session,
        tenant_id: str,
        plan_id: str,
        billing_email: str,
        payment_method: str = "CREDIT_CARD",
        purchase_order_number: Optional[str] = None,
        custom_seats: Optional[int] = None,
        actor_email: Optional[str] = None
    ) -> Subscription:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        plan = db.query(Plan).filter(Plan.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")

        allocated_seats = custom_seats if custom_seats and custom_seats > 0 else plan.seat_limit

        now = datetime.utcnow()
        if plan.billing_interval == "ANNUAL":
            period_end = now + timedelta(days=365)
        else:
            period_end = now + timedelta(days=30)

        sub = Subscription(
            tenant_id=tenant.id,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE.value,
            allocated_seats=allocated_seats,
            used_seats=0,
            current_period_start=now,
            current_period_end=period_end,
            payment_method=payment_method,
            purchase_order_number=purchase_order_number,
            billing_email=billing_email
        )

        db.add(sub)
        db.commit()
        db.refresh(sub)

        # Automatically issue primary license matching plan entitlements
        license_type = LicenseType.SINGLE_SEAT.value if tenant.account_type == AccountType.B2C_INDIVIDUAL.value else LicenseType.FLOATING_POOL.value
        
        license_obj = license_service.issue_license(
            db=db,
            tenant_id=str(tenant.id),
            product_id=str(plan.product_id),
            license_type=license_type,
            max_activations=allocated_seats * plan.max_devices_per_seat,
            allowed_features=plan.features,
            expires_at=period_end,
            actor_email=actor_email or billing_email,
            subscription_id=str(sub.id),
            reason_for_change=f"Subscription provisioned: {plan.name}"
        )

        # Audit
        audit_service.record_event(
            db=db,
            action="SUBSCRIPTION_CREATED",
            entity_type="SUBSCRIPTION",
            entity_id=str(sub.id),
            actor_email=actor_email or billing_email,
            tenant_id=str(tenant.id),
            details={
                "plan_code": plan.code,
                "plan_name": plan.name,
                "allocated_seats": allocated_seats,
                "initial_license_key": license_obj.license_key,
                "payment_method": payment_method
            },
            reason_for_change="New customer subscription onboarded"
        )

        return sub

    @classmethod
    def upgrade_plan(
        cls,
        db: Session,
        subscription_id: str,
        new_plan_id: str,
        actor_email: str,
        reason_for_change: str = "Plan upgrade requested"
    ) -> Subscription:
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            raise HTTPException(status_code=404, detail="Subscription not found")

        new_plan = db.query(Plan).filter(Plan.id == new_plan_id).first()
        if not new_plan:
            raise HTTPException(status_code=404, detail="New plan not found")

        old_plan_id = sub.plan_id
        sub.plan_id = new_plan.id
        sub.allocated_seats = new_plan.seat_limit

        # Update linked licenses features and limits
        for lic in sub.licenses:
            lic.max_activations = new_plan.seat_limit * new_plan.max_devices_per_seat
            lic.allowed_features = new_plan.features
            # Re-sign claims
            lic.public_claims["allowed_features"] = new_plan.features
            lic.public_claims["max_activations"] = lic.max_activations
            lic.signature = crypto_manager.sign_payload(lic.public_claims)

        db.commit()
        db.refresh(sub)

        audit_service.record_event(
            db=db,
            action="PLAN_UPGRADED",
            entity_type="SUBSCRIPTION",
            entity_id=str(sub.id),
            actor_email=actor_email,
            tenant_id=str(sub.tenant_id),
            details={
                "previous_plan_id": str(old_plan_id),
                "new_plan_code": new_plan.code,
                "new_seats": sub.allocated_seats
            },
            reason_for_change=reason_for_change
        )

        return sub

    @classmethod
    def cancel_subscription(
        cls,
        db: Session,
        subscription_id: str,
        actor_email: str,
        reason_for_change: str
    ) -> Subscription:
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            raise HTTPException(status_code=404, detail="Subscription not found")

        sub.cancel_at_period_end = True
        db.commit()
        db.refresh(sub)

        audit_service.record_event(
            db=db,
            action="SUBSCRIPTION_CANCEL_SCHEDULED",
            entity_type="SUBSCRIPTION",
            entity_id=str(sub.id),
            actor_email=actor_email,
            tenant_id=str(sub.tenant_id),
            details={
                "current_period_end": sub.current_period_end.isoformat(),
                "cancel_at_period_end": True
            },
            reason_for_change=reason_for_change
        )

        return sub

subscription_service = SubscriptionService()
