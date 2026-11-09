import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base

class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    license_id = Column(UUID(as_uuid=True), ForeignKey("licenses.id", ondelete="CASCADE"), nullable=True)
    metric_name = Column(String(128), nullable=False, index=True)  # e.g., "samples_processed", "api_calls"
    quantity = Column(Integer, default=1, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
