import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Aura Life Sciences License & Subscription Management Platform"
    API_V1_STR: str = "/api/v1"
    
    # Database Settings (PostgreSQL Localhost)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg://postgres@localhost:5433/auralicense"
    )
    
    # JWT Settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "aura_lifesciences_super_secure_jwt_secret_key_2026_gxp_part11")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Ed25519 Cryptographic Keys for Air-Gapped License Signing
    ED25519_PRIVATE_KEY_B64: str = os.getenv("ED25519_PRIVATE_KEY_B64", "")
    ED25519_PUBLIC_KEY_B64: str = os.getenv("ED25519_PUBLIC_KEY_B64", "")
    
    # CORS Origins for React Frontend
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Regulatory & GxP Compliance
    ENABLE_GXP_HASH_CHAIN: bool = True
    AUDIT_GENESIS_HASH: str = "0000000000000000000000000000000000000000000000000000000000000000"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
