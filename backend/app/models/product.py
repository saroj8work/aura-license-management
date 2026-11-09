import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, JSON, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

class TargetAudience(str, enum.Enum):
    B2C = "B2C"
    B2B = "B2B"

class BillingInterval(str, enum.Enum):
    MONTHLY = "MONTHLY"
    ANNUAL = "ANNUAL"
    PERPETUAL = "PERPETUAL"

class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(64), unique=True, index=True, nullable=False)  # e.g., "AURA-GENOMICS-SUITE"
    name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    plans = relationship("Plan", back_populates="product", cascade="all, delete-orphan")
    licenses = relationship("License", back_populates="product")

class Plan(Base):
    __tablename__ = "plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(64), unique=True, index=True, nullable=False)  # e.g., "B2C-PRO-MONTHLY"
    name = Column(String(255), nullable=False)
    target_audience = Column(String(16), default=TargetAudience.B2B.value, nullable=False)
    price_cents = Column(Integer, default=0, nullable=False)
    currency = Column(String(8), default="USD", nullable=False)
    billing_interval = Column(String(16), default=BillingInterval.MONTHLY.value, nullable=False)
    
    # Entitlement parameters
    seat_limit = Column(Integer, default=1, nullable=False)  # 1 for B2C, multi for B2B
    max_devices_per_seat = Column(Integer, default=2, nullable=False)
    features = Column(JSON, default=list)  # ["gxp_audit_trail", "airgap_support", "hl7_fhir", "batch_processing"]
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="plans")
    subscriptions = relationship("Subscription", back_populates="plan")
