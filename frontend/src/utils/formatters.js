// ── Currency ─────────────────────────────────────────────
/**
 * Format a number as currency.
 * @param {number} amount
 * @param {string} currency - ISO 4217 code (default 'INR')
 */
export function formatCurrency(amount, currency = 'INR') {
  if (amount == null || isNaN(amount)) return '--';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Date ─────────────────────────────────────────────────
const DATE_TOKENS = {
  YYYY: (d) => String(d.getFullYear()),
  YY: (d) => String(d.getFullYear()).slice(-2),
  MM: (d) => String(d.getMonth() + 1).padStart(2, '0'),
  DD: (d) => String(d.getDate()).padStart(2, '0'),
  HH: (d) => String(d.getHours()).padStart(2, '0'),
  mm: (d) => String(d.getMinutes()).padStart(2, '0'),
  ss: (d) => String(d.getSeconds()).padStart(2, '0'),
};

/**
 * Format a date using a simple token string.
 * Supports: YYYY, YY, MM, DD, HH, mm, ss
 * @param {string|Date} date
 * @param {string} format - default 'DD/MM/YYYY'
 */
export function formatDate(date, format = 'DD/MM/YYYY') {
  if (!date) return '--';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '--';
  let result = format;
  // Replace longest tokens first to avoid partial matches (e.g. MM before mm)
  for (const [token, fn] of Object.entries(DATE_TOKENS).sort(
    (a, b) => b[0].length - a[0].length,
  )) {
    result = result.replace(token, fn(d));
  }
  return result;
}

// ── Relative time ────────────────────────────────────────
const RELATIVE_THRESHOLDS = [
  { max: 60, divisor: 1, unit: 'second' },
  { max: 3600, divisor: 60, unit: 'minute' },
  { max: 86400, divisor: 3600, unit: 'hour' },
  { max: 604800, divisor: 86400, unit: 'day' },
  { max: 2592000, divisor: 604800, unit: 'week' },
  { max: 31536000, divisor: 2592000, unit: 'month' },
  { max: Infinity, divisor: 31536000, unit: 'year' },
];

/**
 * Returns a human-readable relative time string ("2 hours ago", "in 3 days").
 * @param {string|Date} date
 */
export function formatRelativeTime(date) {
  if (!date) return '--';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '--';

  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const absDiff = Math.abs(diffSec);

  // "just now" for very recent
  if (absDiff < 10) return 'just now';

  for (const { max, divisor, unit } of RELATIVE_THRESHOLDS) {
    if (absDiff < max) {
      const value = Math.floor(absDiff / divisor);
      const plural = value === 1 ? '' : 's';
      return diffSec < 0
        ? `${value} ${unit}${plural} ago`
        : `in ${value} ${unit}${plural}`;
    }
  }

  return formatDate(d);
}

// ── Compact number ───────────────────────────────────────
/**
 * Format large numbers in compact notation: 1200 -> "1.2K"
 * @param {number} num
 */
export function formatNumber(num) {
  if (num == null || isNaN(num)) return '--';
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(num);
}

// ── Initials ─────────────────────────────────────────────
/**
 * Get uppercase initials from first and last name.
 * @param {string} firstName
 * @param {string} lastName
 */
export function getInitials(firstName, lastName) {
  const f = (firstName || '').trim().charAt(0).toUpperCase();
  const l = (lastName || '').trim().charAt(0).toUpperCase();
  return `${f}${l}` || '?';
}

// ── Status / Priority / Role color maps ──────────────────
const STATUS_COLORS = {
  active: '#16A34A',
  completed: '#16A34A',
  done: '#16A34A',
  approved: '#16A34A',
  paid: '#16A34A',
  open: '#2563EB',
  'in-progress': '#EA580C',
  'in progress': '#EA580C',
  in_progress: '#EA580C',
  pending: '#D97706',
  review: '#7C3AED',
  'on-hold': '#6B7280',
  on_hold: '#6B7280',
  cancelled: '#CB3939',
  rejected: '#CB3939',
  closed: '#6B7280',
  overdue: '#CB3939',
  draft: '#6B7280',
  sent: '#2563EB',
};

const PRIORITY_COLORS = {
  critical: '#CB3939',
  high: '#EA580C',
  medium: '#D97706',
  low: '#16A34A',
  none: '#6B7280',
};

// Import from roleConfig at build-time would create a circular reference in
// some setups, so we inline a copy here for the formatter utility.
const ROLE_COLORS = {
  CEO: '#DC2626',
  CTO: '#7C3AED',
  CFO: '#059669',
  BRAND_FACE: '#D97706',
  ADMIN: '#1D4ED8',
  HR: '#DB2777',
  ACCOUNTING: '#0D9488',
  PRODUCT_OWNER: '#7C3AED',
  CONTENT_STRATEGIST: '#2563EB',
  BRAND_PARTNER: '#EA580C',
  SR_DEVELOPER: '#4F46E5',
  EDITOR: '#0891B2',
  GRAPHIC_DESIGNER: '#C026D3',
  JR_DEVELOPER: '#6366F1',
  GUY: '#6B7280',
  OFFICE_BOY: '#78716C',
};

/**
 * Get a hex color for a status string.
 * @param {string} status
 */
export function getStatusColor(status) {
  if (!status) return '#6B7280';
  return STATUS_COLORS[status.toLowerCase().trim()] || '#6B7280';
}

/**
 * Get a hex color for a priority string.
 * @param {string} priority
 */
export function getPriorityColor(priority) {
  if (!priority) return '#6B7280';
  return PRIORITY_COLORS[priority.toLowerCase().trim()] || '#6B7280';
}

/**
 * Get a hex color for a role key.
 * @param {string} role
 */
export function getRoleColor(role) {
  if (!role) return '#6B7280';
  return ROLE_COLORS[role] || ROLE_COLORS[role.toUpperCase()] || '#6B7280';
}
