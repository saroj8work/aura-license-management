from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

# --- AUTH SCHEMAS ---
class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    role: str
    tenant_id: str
    account_type: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Optional[str] = "SCIENTIST_USER"
    tenant_id: Optional[uuid.UUID] = None

class UserOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

# --- TENANT SCHEMAS ---
class TenantCreate(BaseModel):
    name: str
    slug: str
    account_type: str = "B2B_ENTERPRISE"  # B2C_INDIVIDUAL or B2B_ENTERPRISE
    contact_email: EmailStr
    department_tag: Optional[str] = None
    gxp_validation_status: Optional[str] = "VALIDATED"
    metadata_json: Optional[Dict[str, Any]] = None

class TenantOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    account_type: str
    contact_email: str
    is_active: bool
    gxp_validation_status: str
    department_tag: Optional[str]
    metadata_json: Optional[Dict[str, Any]]
    created_at: datetime
    class Config:
        from_attributes = True

# --- PRODUCT & PLAN SCHEMAS ---
class PlanOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    code: str
    name: str
    target_audience: str
    price_cents: int
    currency: str
    billing_interval: str
    seat_limit: int
    max_devices_per_seat: int
    features: List[str]
    is_active: bool
    localized_pricing: Optional[Dict[str, Any]] = None
    class Config:
        from_attributes = True

class ProductOut(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: Optional[str]
    is_active: bool
    plans: List[PlanOut] = []
    class Config:
        from_attributes = True

# --- SUBSCRIPTION SCHEMAS ---
class SubscriptionCreate(BaseModel):
    tenant_id: uuid.UUID
    plan_id: uuid.UUID
    billing_email: EmailStr
    payment_method: Optional[str] = "CREDIT_CARD"
    purchase_order_number: Optional[str] = None
    custom_seats: Optional[int] = None

class SubscriptionOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    plan_id: uuid.UUID
    status: str
    allocated_seats: int
    used_seats: int
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    payment_method: str
    purchase_order_number: Optional[str]
    billing_email: str
    created_at: datetime
    plan: Optional[PlanOut] = None
    class Config:
        from_attributes = True

class UpgradePlanRequest(BaseModel):
    new_plan_id: uuid.UUID
    reason_for_change: Optional[str] = "Plan upgrade requested"

# --- LICENSE SCHEMAS ---
class LicenseIssueRequest(BaseModel):
    tenant_id: uuid.UUID
    product_id: uuid.UUID
    license_type: str = "SINGLE_SEAT"  # SINGLE_SEAT, FLOATING_POOL, NODE_LOCKED, AIR_GAPPED
    max_activations: int = 1
    allowed_features: List[str] = []
    expires_at: Optional[datetime] = None
    subscription_id: Optional[uuid.UUID] = None
    reason_for_change: Optional[str] = "Manual license provisioning"

class LicenseActivationOut(BaseModel):
    id: uuid.UUID
    machine_fingerprint: str
    hostname: Optional[str]
    platform_os: Optional[str]
    device_label: Optional[str]
    ip_address: Optional[str]
    lease_expires_at: datetime
    last_heartbeat_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class LicenseOut(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    product_id: uuid.UUID
    subscription_id: Optional[uuid.UUID]
    license_key: str
    license_type: str
    status: str
    max_activations: int
    current_activations: int
    expires_at: Optional[datetime]
    allowed_features: List[str]
    public_claims: Dict[str, Any]
    signature: str
    created_at: datetime
    activations: List[LicenseActivationOut] = []
    class Config:
        from_attributes = True

class ActivateLicenseRequest(BaseModel):
    license_key: str
    machine_fingerprint: str
    hostname: Optional[str] = None
    platform_os: Optional[str] = None
    device_label: Optional[str] = None

class HeartbeatRequest(BaseModel):
    license_key: str
    machine_fingerprint: str

class DeactivateRequest(BaseModel):
    license_key: str
    machine_fingerprint: str
    reason: Optional[str] = "Device decommissioned"

class RevokeLicenseRequest(BaseModel):
    reason_for_change: str = Field(..., min_length=5, description="Mandatory GxP / 21 CFR Part 11 justification")

class OfflineVerifyRequest(BaseModel):
    license_file_json: Dict[str, Any]
    target_machine_fingerprint: Optional[str] = None

# --- AUDIT SCHEMAS ---
class AuditLogOut(BaseModel):
    id: int
    timestamp: datetime
    tenant_id: Optional[uuid.UUID]
    actor_email: str
    action: str
    entity_type: str
    entity_id: Optional[str]
    details: Dict[str, Any]
    reason_for_change: Optional[str]
    client_ip: Optional[str]
    previous_hash: str
    hash: str
    class Config:
        from_attributes = True

class AuditVerificationResponse(BaseModel):
    is_valid: bool
    total_records: int
    anomalies_detected: List[Dict[str, Any]]
    chain_status: str
    last_verified_at: str

# --- ANALYTICS SCHEMAS ---
class DashboardOverview(BaseModel):
    total_tenants: int
    b2b_tenants_count: int
    b2c_tenants_count: int
    active_subscriptions: int
    total_licenses_issued: int
    active_device_activations: int
    arr_usd: float
    gxp_audit_entries_count: int
    audit_chain_healthy: bool
