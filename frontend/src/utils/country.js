// Country & Currency utilities with Cookie, Region Detection & Header persistence

export const SUPPORTED_COUNTRIES = [
  { code: 'IN', currency: 'INR', symbol: '₹', name: 'India', flag: '🇮🇳', rate: 86.5 },
  { code: 'US', currency: 'USD', symbol: '$', name: 'United States', flag: '🇺🇸', rate: 1.0 },
  { code: 'GB', currency: 'GBP', symbol: '£', name: 'United Kingdom', flag: '🇬🇧', rate: 0.79 },
  { code: 'EU', currency: 'EUR', symbol: '€', name: 'European Union', flag: '🇪🇺', rate: 0.93 },
  { code: 'CH', currency: 'CHF', symbol: 'CHF ', name: 'Switzerland', flag: '🇨🇭', rate: 0.89 },
  { code: 'JP', currency: 'JPY', symbol: '¥', name: 'Japan', flag: '🇯🇵', rate: 154.0 },
  { code: 'CA', currency: 'CAD', symbol: 'CA$', name: 'Canada', flag: '🇨🇦', rate: 1.39 },
  { code: 'AU', currency: 'AUD', symbol: 'A$', name: 'Australia', flag: '🇦🇺', rate: 1.54 },
  { code: 'SG', currency: 'SGD', symbol: 'S$', name: 'Singapore', flag: '🇸🇬', rate: 1.35 }
];

export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

export function setCookie(name, value, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Automatically detects the user's country/region from browser timezone and locale
 */
export function detectBrowserRegion() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('India')) return 'IN';
    if (tz.startsWith('America/New_York') || tz.startsWith('America/Chicago') || tz.startsWith('America/Denver') || tz.startsWith('America/Los_Angeles') || tz.startsWith('US/')) return 'US';
    if (tz.startsWith('Europe/London')) return 'GB';
    if (tz.startsWith('Europe/Zurich')) return 'CH';
    if (tz.startsWith('Asia/Tokyo')) return 'JP';
    if (tz.startsWith('America/Toronto') || tz.startsWith('America/Vancouver')) return 'CA';
    if (tz.startsWith('Australia/')) return 'AU';
    if (tz.startsWith('Asia/Singapore')) return 'SG';
    if (tz.startsWith('Europe/')) return 'EU';

    const lang = (navigator.language || '').toUpperCase();
    if (lang.endsWith('-IN') || lang.startsWith('HI')) return 'IN';
    if (lang.endsWith('-GB')) return 'GB';
    if (lang.endsWith('-US')) return 'US';
    if (lang.endsWith('-CA')) return 'CA';
    if (lang.endsWith('-AU')) return 'AU';
    if (lang.endsWith('-JP') || lang.startsWith('JA')) return 'JP';
    if (lang.endsWith('-SG')) return 'SG';
  } catch (e) {
    // fallback
  }
  return 'IN';
}

export function getSelectedCountry() {
  if (typeof window === 'undefined') return 'IN';

  const explicit = localStorage.getItem('aura_country_explicit');
  const fromCookie = getCookie('aura_country');
  const fromStorage = localStorage.getItem('aura_country');

  // 1. If user explicitly chose a country from the dropdown, respect that selection
  if (explicit === 'true') {
    if (fromCookie && SUPPORTED_COUNTRIES.some(c => c.code === fromCookie)) {
      return fromCookie;
    }
    if (fromStorage && SUPPORTED_COUNTRIES.some(c => c.code === fromStorage)) {
      return fromStorage;
    }
  }

  // 2. If cookie exists from prior session or edge proxy, use it
  if (fromCookie && SUPPORTED_COUNTRIES.some(c => c.code === fromCookie)) {
    return fromCookie;
  }

  // 3. Otherwise detect country/region automatically from browser timezone/locale
  const detected = detectBrowserRegion();
  setCookie('aura_country', detected);
  localStorage.setItem('aura_country', detected);
  return detected;
}

export function setSelectedCountry(countryCode) {
  const valid = SUPPORTED_COUNTRIES.find(c => c.code === countryCode);
  const code = valid ? valid.code : 'IN';
  if (typeof window !== 'undefined') {
    localStorage.setItem('aura_country_explicit', 'true');
    setCookie('aura_country', code);
    localStorage.setItem('aura_country', code);
    window.dispatchEvent(new CustomEvent('aura_country_changed', { detail: code }));
  }
  return code;
}

export function getCountryDetails(countryCode) {
  return SUPPORTED_COUNTRIES.find(c => c.code === countryCode) || SUPPORTED_COUNTRIES[0];
}

export function formatPrice(priceUsdDollars, countryCode) {
  const country = getCountryDetails(countryCode);
  const converted = priceUsdDollars * country.rate;
  if (country.currency === 'JPY') {
    return `${country.symbol}${Math.round(converted).toLocaleString()}`;
  }
  return `${country.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
