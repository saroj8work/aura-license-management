from typing import Dict, Any, Optional

# Supported Country to Currency mapping with FX reference rates (USD base)
COUNTRY_CURRENCY_MAP: Dict[str, Dict[str, Any]] = {
    "IN": {"code": "INR", "symbol": "₹", "rate": 86.5, "name": "Indian Rupee", "flag": "🇮🇳"},
    "US": {"code": "USD", "symbol": "$", "rate": 1.0, "name": "United States Dollar", "flag": "🇺🇸"},
    "GB": {"code": "GBP", "symbol": "£", "rate": 0.79, "name": "British Pound", "flag": "🇬🇧"},
    "EU": {"code": "EUR", "symbol": "€", "rate": 0.93, "name": "Euro", "flag": "🇪🇺"},
    "DE": {"code": "EUR", "symbol": "€", "rate": 0.93, "name": "Euro (Germany)", "flag": "🇩🇪"},
    "FR": {"code": "EUR", "symbol": "€", "rate": 0.93, "name": "Euro (France)", "flag": "🇫🇷"},
    "CH": {"code": "CHF", "symbol": "CHF ", "rate": 0.89, "name": "Swiss Franc", "flag": "🇨🇭"},
    "JP": {"code": "JPY", "symbol": "¥", "rate": 154.0, "name": "Japanese Yen", "flag": "🇯🇵"},
    "CA": {"code": "CAD", "symbol": "CA$", "rate": 1.39, "name": "Canadian Dollar", "flag": "🇨🇦"},
    "AU": {"code": "AUD", "symbol": "A$", "rate": 1.54, "name": "Australian Dollar", "flag": "🇦🇺"},
    "SG": {"code": "SGD", "symbol": "S$", "rate": 1.35, "name": "Singapore Dollar", "flag": "🇸🇬"}
}

DEFAULT_CURRENCY = COUNTRY_CURRENCY_MAP["IN"]

def get_currency_info(country_code: Optional[str]) -> Dict[str, Any]:
    if not country_code:
        return DEFAULT_CURRENCY
    clean_code = country_code.strip().upper()
    return COUNTRY_CURRENCY_MAP.get(clean_code, DEFAULT_CURRENCY)

def convert_amount(amount_cents_usd: int, target_currency_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converts a USD cents amount into the target localized currency.
    """
    usd_dollars = amount_cents_usd / 100.0
    rate = target_currency_info["rate"]
    converted_amount = usd_dollars * rate
    symbol = target_currency_info["symbol"]
    code = target_currency_info["code"]

    # Formatting rules (e.g. JPY has no decimal subunits, INR uses standard comma)
    if code in ["JPY", "KRW"]:
        formatted = f"{symbol}{round(converted_amount):,}"
    else:
        formatted = f"{symbol}{converted_amount:,.2f}"

    return {
        "amount_usd": usd_dollars,
        "converted_amount": round(converted_amount, 2),
        "currency_code": code,
        "currency_symbol": symbol,
        "exchange_rate": rate,
        "formatted": formatted
    }
