import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, JSON, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

class LicenseType(str, enum.Enum):
    SINGLE_SEAT = "SINGLE_SEAT"          # B2C single researcher / clinician
    FLOATING_POOL = "FLOATING_POOL"      # B2B concurrent lab seats
    NODE_LOCKED = "NODE_LOCKED"          # Bound to specific instrument hardware
    AIR_GAPPED = "AIR_GAPPED"            # Completely offline signed .lic token

class LicenseStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"
    SUSPENDED = "SUSPENDED"

class License(Base):
    __tablename__ = "licenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    
    license_key = Column(String(128), unique=True, index=True, nullable=False)
    license_type = Column(String(32), default=LicenseType.SINGLE_SEAT.value, nullable=False)
    status = Column(String(32), default=LicenseStatus.ACTIVE.value, nullable=False)
    
    max_activations = Column(Integer, default=1, nullable=False)
    current_activations = Column(Integer, default=0, nullable=False)
    
    expires_at = Column(DateTime, nullable=True)  # Null indicates perpetual airgap
    allowed_features = Column(JSON, default=list)  # Feature flag list
    public_claims = Column(JSON, default=dict)     # Signed entitlement claims
    signature = Column(Text, nullable=False)       # Ed25519 digital signature
    
    revocation_reason = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="licenses")
    product = relationship("Product", back_populates="licenses")
    subscription = relationship("Subscription", back_populates="licenses")
    activations = relationship("LicenseActivation", back_populates="license", cascade="all, delete-orphan")

class LicenseActivation(Base):
    __tablename__ = "license_activations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    license_id = Column(UUID(as_uuid=True), ForeignKey("licenses.id", ondelete="CASCADE"), nullable=False)
    machine_fingerprint = Column(String(128), index=True, nullable=False)
    hostname = Column(String(255), nullable=True)
    platform_os = Column(String(128), nullable=True)
    device_label = Column(String(255), nullable=True)  # e.g., "Illumina NovaSeq Workstation Lab #3"
    ip_address = Column(String(64), nullable=True)
    
    lease_expires_at = Column(DateTime, nullable=False)
    last_heartbeat_at = Column(DateTime, default=datetime.utcnow)
    activation_token = Column(Text, nullable=True)  # Signed runtime lease token
    is_active = Column(Boolean, default=True)
    deactivated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    license = relationship("License", back_populates="activations")
