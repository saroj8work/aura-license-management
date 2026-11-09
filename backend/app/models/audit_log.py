from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, BigInteger, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base

class AuditLog(Base):
    """
    FDA 21 CFR Part 11 / EU Annex 11 compliant audit trail entity.
    Features:
    - Immutable sequence of modifications (Append-only)
    - SHA-256 hash chaining to detect database tampering
    - Mandatory electronic attribution (actor_email, IP, user agent)
    - Mandatory reason for change on compliance-sensitive operations
    """
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    actor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_email = Column(String(255), nullable=False)
    
    action = Column(String(64), nullable=False, index=True)       # e.g., LICENSE_ISSUED, REVOKED, ACTIVATED
    entity_type = Column(String(64), nullable=False, index=True)  # e.g., LICENSE, SUBSCRIPTION, TENANT
    entity_id = Column(String(128), nullable=True)
    
    details = Column(JSON, default=dict)
    reason_for_change = Column(String(500), nullable=True)        # 21 CFR Part 11 requirement
    
    client_ip = Column(String(64), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    previous_hash = Column(String(64), nullable=False)            # SHA-256 hash of preceding row
    hash = Column(String(64), nullable=False, unique=True)        # SHA-256 hash of this row sealed

    # Relationships
    tenant = relationship("Tenant", back_populates="audit_logs")
