// Role-based access configuration for Know AI ERP
// All roles have complaints access (view own + resolved)

const COMMON = ['dashboard', 'calendar', 'chat', 'notifications', 'profile', 'settings', 'expenses', 'leaves', 'complaints', 'personality-test', 'goals', 'requests', 'change-requests', 'content-workspace'];
const SENIOR_EXTRA = ['projects', 'analytics', 'time-tracking', 'docs', 'files', 'email', 'passwords', 'subscriptions', 'video-reviews', 'content-workspace'];
const JUNIOR_BASE = ['tasks', 'time-tracking', 'docs', 'files'];

export const ROLE_SIDEBAR_ACCESS = {
  // C-Suite: full access
  CEO: null,
  CTO: null,
  CFO: [...COMMON, ...SENIOR_EXTRA, 'payroll', 'invoices', 'reports', 'team', 'audit', 'clients', 'leads', 'tasks', 'hr-dashboard', 'hiring', 'documents', 'admin'],
  BRAND_FACE: [...COMMON, ...SENIOR_EXTRA, 'clients', 'leads', 'reports', 'tasks', 'team', 'hr-dashboard', 'hiring', 'payroll', 'admin'],

  // Management
  ADMIN: null,
  HR: [...COMMON, ...SENIOR_EXTRA, 'tasks', 'team', 'payroll', 'hiring', 'documents', 'hr-dashboard', 'reports', 'contacts', 'onboarding'],
  PRODUCT_OWNER: [...COMMON, ...SENIOR_EXTRA, 'tasks', 'clients', 'leads', 'invoices', 'reports', 'team', 'hiring'],
  BRAND_PARTNER: [...COMMON, 'clients', 'leads', 'docs', 'files', 'tasks'],

  // Accounting
  SR_ACCOUNTANT: [...COMMON, 'payroll', 'invoices', 'reports', 'docs', 'files', 'email', 'tasks'],
  JR_ACCOUNTANT: [...COMMON, 'payroll', 'invoices', 'docs', 'files', 'tasks'],

  // Development
  SR_DEVELOPER: [...COMMON, ...SENIOR_EXTRA, 'tasks'],
  JR_DEVELOPER: [...COMMON, ...JUNIOR_BASE],

  // Design
  SR_GRAPHIC_DESIGNER: [...COMMON, ...SENIOR_EXTRA, 'tasks'],
  JR_GRAPHIC_DESIGNER: [...COMMON, ...JUNIOR_BASE],

  // Content & Editorial
  SR_EDITOR: [...COMMON, ...SENIOR_EXTRA, 'tasks'],
  JR_EDITOR: [...COMMON, ...JUNIOR_BASE],
  SR_CONTENT_STRATEGIST: [...COMMON, ...SENIOR_EXTRA, 'tasks'],
  JR_CONTENT_STRATEGIST: [...COMMON, ...JUNIOR_BASE],

  // Script Writing
  SR_SCRIPT_WRITER: [...COMMON, ...SENIOR_EXTRA, 'tasks'],
  JR_SCRIPT_WRITER: [...COMMON, ...JUNIOR_BASE],

  // Brand Strategy
  SR_BRAND_STRATEGIST: [...COMMON, ...SENIOR_EXTRA, 'tasks', 'clients', 'leads'],
  JR_BRAND_STRATEGIST: [...COMMON, ...JUNIOR_BASE, 'clients'],

  // Operations
  DRIVER: ['dashboard', 'tasks', 'calendar', 'chat', 'leaves', 'complaints', 'notifications', 'settings', 'personality-test', 'payroll', 'requests', 'change-requests'],

  // General
  GUY: [...COMMON, 'tasks', 'files'],
  OFFICE_BOY: ['dashboard', 'tasks', 'calendar', 'chat', 'leaves', 'complaints', 'notifications', 'settings', 'personality-test', 'requests', 'change-requests'],
};

export const ROLE_LABELS = {
  CEO: 'Chief Executive Officer',
  CTO: 'Chief Technology Officer',
  CFO: 'Chief Financial Officer',
  BRAND_FACE: 'Brand Ambassador & Co-Founder',
  ADMIN: 'System Administrator',
  HR: 'Human Resources',
  PRODUCT_OWNER: 'Product Owner',
  BRAND_PARTNER: 'Brand Partner',
  SR_ACCOUNTANT: 'Senior Accountant',
  JR_ACCOUNTANT: 'Junior Accountant',
  SR_DEVELOPER: 'Senior Developer',
  JR_DEVELOPER: 'Junior Developer',
  SR_GRAPHIC_DESIGNER: 'Senior Graphic Designer',
  JR_GRAPHIC_DESIGNER: 'Junior Graphic Designer',
  SR_EDITOR: 'Senior Editor',
  JR_EDITOR: 'Junior Editor',
  SR_CONTENT_STRATEGIST: 'Senior Content Strategist',
  JR_CONTENT_STRATEGIST: 'Junior Content Strategist',
  SR_SCRIPT_WRITER: 'Senior Script Writer',
  JR_SCRIPT_WRITER: 'Junior Script Writer',
  SR_BRAND_STRATEGIST: 'Senior Brand Strategist',
  JR_BRAND_STRATEGIST: 'Junior Brand Strategist',
  DRIVER: 'Driver',
  GUY: 'Team Member',
  OFFICE_BOY: 'Office Assistant',
};

export const ROLE_COLORS = {
  CEO: '#DC2626',
  CTO: '#7C3AED',
  CFO: '#059669',
  BRAND_FACE: '#D97706',
  ADMIN: '#1D4ED8',
  HR: '#DB2777',
  PRODUCT_OWNER: '#7C3AED',
  BRAND_PARTNER: '#EA580C',
  SR_ACCOUNTANT: '#0D9488',
  JR_ACCOUNTANT: '#14B8A6',
  SR_DEVELOPER: '#4F46E5',
  JR_DEVELOPER: '#6366F1',
  SR_GRAPHIC_DESIGNER: '#C026D3',
  JR_GRAPHIC_DESIGNER: '#D946EF',
  SR_EDITOR: '#0891B2',
  JR_EDITOR: '#22D3EE',
  SR_CONTENT_STRATEGIST: '#2563EB',
  JR_CONTENT_STRATEGIST: '#3B82F6',
  SR_SCRIPT_WRITER: '#9333EA',
  JR_SCRIPT_WRITER: '#A855F7',
  SR_BRAND_STRATEGIST: '#E11D48',
  JR_BRAND_STRATEGIST: '#F43F5E',
  DRIVER: '#64748B',
  GUY: '#6B7280',
  OFFICE_BOY: '#78716C',
};

// Dashboard widget visibility by role
export const ROLE_DASHBOARD_WIDGETS = {
  CEO: null, CTO: null, ADMIN: null,
  CFO: ['revenue', 'expenses', 'revenueChart', 'deadlines'],
  HR: ['team', 'leaves', 'recentActivity', 'deadlines'],
  PRODUCT_OWNER: ['projects', 'tasks', 'taskDistribution', 'recentActivity', 'quickActions', 'deadlines'],
  BRAND_FACE: ['tasks', 'recentActivity', 'deadlines'],
  BRAND_PARTNER: ['tasks', 'recentActivity', 'deadlines'],
  SR_ACCOUNTANT: ['revenue', 'expenses', 'revenueChart', 'deadlines'],
  JR_ACCOUNTANT: ['revenue', 'expenses', 'deadlines'],
  SR_DEVELOPER: ['tasks', 'projects', 'taskDistribution', 'deadlines'],
  JR_DEVELOPER: ['tasks', 'taskDistribution', 'deadlines'],
  SR_GRAPHIC_DESIGNER: ['tasks', 'taskDistribution', 'deadlines'],
  JR_GRAPHIC_DESIGNER: ['tasks', 'deadlines'],
  SR_EDITOR: ['tasks', 'taskDistribution', 'deadlines'],
  JR_EDITOR: ['tasks', 'deadlines'],
  SR_CONTENT_STRATEGIST: ['tasks', 'taskDistribution', 'deadlines'],
  JR_CONTENT_STRATEGIST: ['tasks', 'deadlines'],
  SR_SCRIPT_WRITER: ['tasks', 'taskDistribution', 'deadlines'],
  JR_SCRIPT_WRITER: ['tasks', 'deadlines'],
  GUY: ['tasks', 'deadlines'],
  OFFICE_BOY: ['tasks', 'deadlines'],
};

export function hasAccess(role, sidebarKey) {
  const access = ROLE_SIDEBAR_ACCESS[role];
  if (access === null || access === undefined) return true;
  return access.includes(sidebarKey);
}

export function canSeeWidget(role, widgetKey) {
  const widgets = ROLE_DASHBOARD_WIDGETS[role];
  if (widgets === null || widgets === undefined) return true;
  return widgets.includes(widgetKey);
}

// Helper to check if a role is senior level
export function isSenior(role) {
  return ['CEO', 'CTO', 'CFO', 'BRAND_FACE', 'ADMIN', 'HR', 'PRODUCT_OWNER'].includes(role) ||
    role?.startsWith('SR_');
}
