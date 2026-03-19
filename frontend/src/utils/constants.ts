// ══════════════════════════════════════════════════════════
// Know AI ERP — Application Constants
// ══════════════════════════════════════════════════════════

// ── API Base URL ─────────────────────────────────────────
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Role Hierarchy (highest authority first) ─────────────
export const ROLE_HIERARCHY = [
  'ADMIN',
  'CEO',
  'CTO',
  'CFO',
  'PRODUCT_OWNER',
  'BRAND_FACE',
  'HR',
  'ACCOUNTING',
  'CONTENT_STRATEGIST',
  'BRAND_PARTNER',
  'SR_DEVELOPER',
  'EDITOR',
  'GRAPHIC_DESIGNER',
  'JR_DEVELOPER',
  'GUY',
  'OFFICE_BOY',
];

// ── Status Colors ────────────────────────────────────────
export const STATUS_COLORS = {
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

// ── Priority Colors ──────────────────────────────────────
export const PRIORITY_COLORS = {
  critical: '#CB3939',
  high: '#EA580C',
  medium: '#D97706',
  low: '#16A34A',
  none: '#6B7280',
};

// ── Role Colors ──────────────────────────────────────────
export const ROLE_COLORS = {
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

// ── Navigation Links (per role) ──────────────────────────
// Each entry: { key, label, icon (Bootstrap Icons class), path }
// "icon" uses Bootstrap Icons naming (bi-*).

const link = (key, label, icon, path) => ({ key, label, icon, path: path || `/${key}` });

const ALL_NAV_LINKS = [
  link('dashboard', 'Dashboard', 'bi-grid-1x2-fill'),
  link('analytics', 'Analytics', 'bi-graph-up'),
  link('projects', 'Projects', 'bi-kanban-fill'),
  link('tasks', 'Tasks', 'bi-check2-square'),
  link('team', 'Team', 'bi-people-fill'),
  link('hr-dashboard', 'HR Dashboard', 'bi-person-badge-fill'),
  link('payroll', 'Payroll', 'bi-cash-stack'),
  link('leaves', 'Leaves', 'bi-calendar2-week-fill'),
  link('hiring', 'Hiring', 'bi-person-plus-fill'),
  link('documents', 'Documents', 'bi-file-earmark-text-fill'),
  link('complaints', 'Complaints', 'bi-exclamation-triangle-fill'),
  link('clients', 'Clients', 'bi-building'),
  link('leads', 'Leads', 'bi-funnel-fill'),
  link('invoices', 'Invoices', 'bi-receipt'),
  link('expenses', 'Expenses', 'bi-wallet2'),
  link('chat', 'Chat', 'bi-chat-dots-fill'),
  link('email', 'Email', 'bi-envelope-fill'),
  link('calendar', 'Calendar', 'bi-calendar3'),
  link('files', 'Files', 'bi-folder-fill'),
  link('docs', 'Docs', 'bi-journal-text'),
  link('reports', 'Reports', 'bi-bar-chart-line-fill'),
  link('audit', 'Audit Log', 'bi-shield-lock-fill'),
  link('settings', 'Settings', 'bi-gear-fill'),
  link('notifications', 'Notifications', 'bi-bell-fill'),
  link('time-tracking', 'Time Tracking', 'bi-stopwatch-fill'),
  link('goals', 'Goals', 'bi-bullseye'),
];

// Build a lookup map: key -> link object
const LINK_MAP = Object.fromEntries(ALL_NAV_LINKS.map((l) => [l.key, l]));

// Import from roleConfig would create a tight coupling here, so we duplicate
// the sidebar access map directly (source of truth: utils/roleConfig.js).
import { ROLE_SIDEBAR_ACCESS } from './roleConfig';

/**
 * Get the navigation links available for a given role.
 * @param {string} role
 * @returns {Array<{key, label, icon, path}>}
 */
export function getNavLinksForRole(role) {
  const access = ROLE_SIDEBAR_ACCESS[role];
  // null = full access (ADMIN)
  if (access === null) return ALL_NAV_LINKS;
  if (!access) return [];
  return access.map((key) => LINK_MAP[key]).filter(Boolean);
}

// Also export the full list so components can iterate without a role filter
export { ALL_NAV_LINKS as NAV_LINKS };
