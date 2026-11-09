from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, Cookie
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.product import Product, Plan
from app.core.currency import get_currency_info, convert_amount, COUNTRY_CURRENCY_MAP
from pydantic import BaseModel
import uuid

router = APIRouter()

class PlanCreateInput(BaseModel):
    product_id: str
    code: str
    name: str
    target_audience: str = "B2B"
    price_cents: int
    currency: str = "USD"
    billing_interval: str = "MONTHLY"
    seat_limit: int = 1
    max_devices_per_seat: int = 2
    features: List[str] = []

class ProductCreateInput(BaseModel):
    code: str
    name: str
    description: str

@router.get("/currencies")
def list_supported_currencies():
    """Returns available country codes, flags, currency symbols and exchange rates."""
    return [
        {
            "country_code": country,
            "currency_code": data["code"],
            "symbol": data["symbol"],
            "name": data["name"],
            "flag": data["flag"],
            "rate": data["rate"]
        }
        for country, data in COUNTRY_CURRENCY_MAP.items()
    ]

@router.get("")
def list_products(
    x_country_code: Optional[str] = Header(None),
    aura_country: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    country = x_country_code or aura_country or "IN"
    curr_info = get_currency_info(country)

    products = db.query(Product).filter(Product.is_active == True).all()
    result = []

    for prod in products:
        plans_data = []
        for pl in prod.plans:
            if pl.is_active:
                pricing = convert_amount(pl.price_cents, curr_info)
                plans_data.append({
                    "id": str(pl.id),
                    "product_id": str(pl.product_id),
                    "code": pl.code,
                    "name": pl.name,
                    "target_audience": pl.target_audience,
                    "price_cents": pl.price_cents,
                    "currency": pl.currency,
                    "billing_interval": pl.billing_interval,
                    "seat_limit": pl.seat_limit,
                    "max_devices_per_seat": pl.max_devices_per_seat,
                    "features": pl.features,
                    "is_active": pl.is_active,
                    # Localized dynamic currency block
                    "localized_pricing": pricing
                })

        result.append({
            "id": str(prod.id),
            "code": prod.code,
            "name": prod.name,
            "description": prod.description,
            "is_active": prod.is_active,
            "plans": plans_data
        })

    return result

@router.post("")
def create_product(data: ProductCreateInput, db: Session = Depends(get_db)):
    prod = Product(
        code=data.code,
        name=data.name,
        description=data.description
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)
    return prod

@router.post("/plans")
def create_plan(data: PlanCreateInput, db: Session = Depends(get_db)):
    plan = Plan(
        product_id=data.product_id,
        code=data.code,
        name=data.name,
        target_audience=data.target_audience,
        price_cents=data.price_cents,
        currency=data.currency,
        billing_interval=data.billing_interval,
        seat_limit=data.seat_limit,
        max_devices_per_seat=data.max_devices_per_seat,
        features=data.features
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan
