from datetime import datetime, timedelta
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.models.tenant import User, Tenant
from app.schemas.all_schemas import TokenSchema, LoginRequest, UserCreate, UserOut
import hashlib

router = APIRouter()

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

@router.post("/login", response_model=TokenSchema)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    pw_hash = hash_pw(request.password)
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or user.hashed_password != pw_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    account_type = tenant.account_type if tenant else "B2B_ENTERPRISE"

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "tenant_id": str(user.tenant_id)
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "email": user.email,
        "role": user.role,
        "tenant_id": str(user.tenant_id),
        "account_type": account_type
    }

@router.post("/register", response_model=UserOut)
def register(request: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # If no tenant_id provided, create default B2C personal workspace
    tenant_id = request.tenant_id
    if not tenant_id:
        slug = request.email.split("@")[0].lower() + "-lab"
        tenant = Tenant(
            name=f"{request.full_name}'s Lab",
            slug=slug,
            account_type="B2C_INDIVIDUAL",
            contact_email=request.email,
            gxp_validation_status="STANDARD"
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        tenant_id = tenant.id

    user = User(
        tenant_id=tenant_id,
        email=request.email,
        hashed_password=hash_pw(request.password),
        full_name=request.full_name,
        role=request.role or "SCIENTIST_USER"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
