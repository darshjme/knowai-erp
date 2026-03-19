// Multi-currency support for Know AI ERP
// Supported: USD, INR, HKD, CAD, GBP, AUD, AED

export const CURRENCIES = {
  USD: { symbol: '$', code: 'USD', name: 'US Dollar', locale: 'en-US', flag: '🇺🇸' },
  INR: { symbol: '₹', code: 'INR', name: 'Indian Rupee', locale: 'en-IN', flag: '🇮🇳' },
  HKD: { symbol: 'HK$', code: 'HKD', name: 'Hong Kong Dollar', locale: 'en-HK', flag: '🇭🇰' },
  CAD: { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar', locale: 'en-CA', flag: '🇨🇦' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound', locale: 'en-GB', flag: '🇬🇧' },
  AUD: { symbol: 'A$', code: 'AUD', name: 'Australian Dollar', locale: 'en-AU', flag: '🇦🇺' },
  AED: { symbol: 'د.إ', code: 'AED', name: 'UAE Dirham', locale: 'ar-AE', flag: '🇦🇪' },
};

export const DEFAULT_CURRENCY = 'INR';

export function formatCurrency(amount, currency = DEFAULT_CURRENCY) {
  if (amount == null || isNaN(amount)) return `${CURRENCIES[currency]?.symbol || '₹'}0`;
  const config = CURRENCIES[currency] || CURRENCIES.INR;
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${config.symbol}${amount.toLocaleString()}`;
  }
}

export function getCurrencySymbol(currency = DEFAULT_CURRENCY) {
  return CURRENCIES[currency]?.symbol || '₹';
}

export function getCurrencyOptions() {
  return Object.entries(CURRENCIES).map(([code, c]) => ({
    value: code,
    label: `${c.flag} ${c.code} - ${c.name}`,
    symbol: c.symbol,
  }));
}

// Approximate conversion rates (for display only - use live API for real conversions)
const RATES_TO_INR = {
  USD: 83.5, INR: 1, HKD: 10.7, CAD: 62.1, GBP: 105.8, AUD: 54.3, AED: 22.7,
};

export function convertCurrency(amount, from, to) {
  if (from === to) return amount;
  const inINR = amount * (RATES_TO_INR[from] || 1);
  return inINR / (RATES_TO_INR[to] || 1);
}
