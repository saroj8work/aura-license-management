import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, JSON, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base

class AccountType(str, enum.Enum):
    B2C_INDIVIDUAL = "B2C_INDIVIDUAL"
    B2B_ENTERPRISE = "B2B_ENTERPRISE"

class UserRole(str, enum.Enum):
    SUPERADMIN = "SUPERADMIN"
    ORG_ADMIN = "ORG_ADMIN"
    LAB_MANAGER = "LAB_MANAGER"
    COMPLIANCE_OFFICER = "COMPLIANCE_OFFICER"
    SCIENTIST_USER = "SCIENTIST_USER"

class Tenant(Base):
    """
    Unified Account/Tenant model supporting both:
    - B2C Individual Researchers / Clinicians (Personal workspace, single-seat self-serve)
    - B2B Enterprise Life Science Organizations (Multi-seat, lab departments, GxP validation)
    """
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(128), unique=True, index=True, nullable=False)
    account_type = Column(String(32), default=AccountType.B2B_ENTERPRISE.value, nullable=False)
    contact_email = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    gxp_validation_status = Column(String(64), default="VALIDATED")  # VALIDATED, PENDING, EXEMPT
    department_tag = Column(String(128), nullable=True)  # e.g., "Genomics Core", "Pharmacology QC"
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="tenant", cascade="all, delete-orphan")
    licenses = relationship("License", back_populates="tenant", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="tenant")

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(32), default=UserRole.SCIENTIST_USER.value, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
