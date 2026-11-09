import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

class SubscriptionStatus(str, enum.Enum):
    TRIALING = "TRIALING"
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    CANCELED = "CANCELED"
    EXPIRED = "EXPIRED"

class PaymentMethodType(str, enum.Enum):
    CREDIT_CARD = "CREDIT_CARD"
    PURCHASE_ORDER = "PURCHASE_ORDER"
    INVOICE_NET30 = "INVOICE_NET30"

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id"), nullable=False)
    status = Column(String(32), default=SubscriptionStatus.ACTIVE.value, nullable=False)
    
    allocated_seats = Column(Integer, default=1, nullable=False)
    used_seats = Column(Integer, default=0, nullable=False)
    
    current_period_start = Column(DateTime, default=datetime.utcnow, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    cancel_at_period_end = Column(Boolean, default=False)
    
    payment_method = Column(String(32), default=PaymentMethodType.CREDIT_CARD.value)
    purchase_order_number = Column(String(128), nullable=True)  # Enterprise PO ref
    billing_email = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="subscriptions")
    plan = relationship("Plan", back_populates="subscriptions")
    licenses = relationship("License", back_populates="subscription")
