from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Cookie
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.subscription import Subscription
from app.schemas.all_schemas import SubscriptionCreate, SubscriptionOut, UpgradePlanRequest
from app.services.subscription_service import subscription_service
from app.core.currency import get_currency_info, convert_amount

router = APIRouter()

@router.get("", response_model=List[SubscriptionOut])
def list_subscriptions(
    tenant_id: Optional[str] = None,
    x_country_code: Optional[str] = Header(None),
    aura_country: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    country = x_country_code or aura_country or "IN"
    curr_info = get_currency_info(country)
    query = db.query(Subscription)
    if tenant_id:
        query = query.filter(Subscription.tenant_id == tenant_id)
    subs = query.order_by(Subscription.created_at.desc()).all()
    for s in subs:
        if s.plan:
            setattr(s.plan, "localized_pricing", convert_amount(s.plan.price_cents, curr_info))
    return subs

@router.post("", response_model=SubscriptionOut)
def create_subscription(
    data: SubscriptionCreate,
    db: Session = Depends(get_db)
):
    return subscription_service.create_subscription(
        db=db,
        tenant_id=str(data.tenant_id),
        plan_id=str(data.plan_id),
        billing_email=data.billing_email,
        payment_method=data.payment_method or "CREDIT_CARD",
        purchase_order_number=data.purchase_order_number,
        custom_seats=data.custom_seats,
        actor_email=data.billing_email
    )

@router.get("/{sub_id}", response_model=SubscriptionOut)
def get_subscription(sub_id: str, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub

@router.post("/{sub_id}/upgrade", response_model=SubscriptionOut)
def upgrade_subscription(
    sub_id: str,
    data: UpgradePlanRequest,
    db: Session = Depends(get_db)
):
    return subscription_service.upgrade_plan(
        db=db,
        subscription_id=sub_id,
        new_plan_id=str(data.new_plan_id),
        actor_email="admin@system.local",
        reason_for_change=data.reason_for_change or "Plan tier upgraded"
    )

@router.post("/{sub_id}/cancel", response_model=SubscriptionOut)
def cancel_subscription(
    sub_id: str,
    reason: Optional[str] = "Customer requested cancellation",
    db: Session = Depends(get_db)
):
    return subscription_service.cancel_subscription(
        db=db,
        subscription_id=sub_id,
        actor_email="customer@system.local",
        reason_for_change=reason or "Cancellation scheduled"
    )
