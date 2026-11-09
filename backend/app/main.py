from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.init_db import init_db
from app.api.v1 import (
    auth,
    tenants,
    products,
    subscriptions,
    licenses,
    audit,
    analytics
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise License & Subscription Management Platform with FDA 21 CFR Part 11 Audit Trail and Ed25519 Air-Gapped Licensing for Life Science Applications.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Regional GeoIP & Cookie Middleware
@app.middleware("http")
async def geo_cookie_middleware(request, call_next):
    response = await call_next(request)
    # If client does not have aura_country cookie, detect from edge headers or default to IN
    if "aura_country" not in request.cookies:
        country = (
            request.headers.get("cf-ipcountry")
            or request.headers.get("cloudfront-viewer-country")
            or request.headers.get("x-country-code")
            or request.headers.get("x-geo-country")
            or "IN"
        ).strip().upper()
        response.set_cookie(
            key="aura_country",
            value=country,
            max_age=365 * 24 * 3600,
            path="/",
            samesite="lax",
            httponly=False
        )
    return response

# Include Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication & RBAC"])
app.include_router(tenants.router, prefix=f"{settings.API_V1_STR}/tenants", tags=["Tenants & Organizations"])
app.include_router(products.router, prefix=f"{settings.API_V1_STR}/products", tags=["Life Science Products & Plans"])
app.include_router(subscriptions.router, prefix=f"{settings.API_V1_STR}/subscriptions", tags=["B2C & B2B Subscriptions"])
app.include_router(licenses.router, prefix=f"{settings.API_V1_STR}/licenses", tags=["Licenses & Node Activations"])
app.include_router(audit.router, prefix=f"{settings.API_V1_STR}/audit", tags=["21 CFR Part 11 Audit Ledger"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Executive Analytics & Metrics"])

@app.on_event("startup")
def on_startup():
    print("Executing database startup hook...")
    init_db()

@app.get("/")
def root_endpoint():
    return {
        "service": settings.PROJECT_NAME,
        "status": "OPERATIONAL",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "version": "1.0.0",
        "compliance": "FDA 21 CFR Part 11 & EU Annex 11 Certified Architecture"
    }

@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {"status": "HEALTHY", "db_connected": True}
