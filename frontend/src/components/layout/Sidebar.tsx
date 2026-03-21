import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, ListChecks, Users, DollarSign,
  CalendarDays, Receipt, Briefcase, UserPlus, FileText, MessageCircle,
  Mail, BarChart3, Settings, Shield, Clock, Target, FileSearch,
  AlertTriangle, TrendingUp, CreditCard, ChevronLeft, X, HelpCircle, Brain,
  Lock, Send, GitPullRequest, Film, Layers, Menu
} from 'lucide-react';
import { ROLE_SIDEBAR_ACCESS, ROLE_LABELS, ROLE_COLORS } from '../../utils/roleConfig';
import type { RootState } from '../../store/store';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    ]
  },
  {
    title: 'Work',
    items: [
      { label: 'Projects', path: '/projects', icon: FolderKanban },
      { label: 'Tasks', path: '/tasks', icon: ListChecks },
      { label: 'Calendar', path: '/calendar', icon: CalendarDays },
      { label: 'Time Tracking', path: '/time-tracking', icon: Clock },
      { label: 'Goals', path: '/goals', icon: Target },
      { label: 'Docs', path: '/docs', icon: FileText },
      { label: 'Files', path: '/files', icon: FileSearch },
      { label: 'Content Reviews', path: '/video-reviews', icon: Film },
      { label: 'Content Workspace', path: '/content-workspace', icon: Layers },
    ]
  },
  {
    title: 'People',
    items: [
      { label: 'Team', path: '/team', icon: Users },
      { label: 'HR Dashboard', path: '/hr-dashboard', icon: Briefcase },
      { label: 'Payroll', path: '/payroll', icon: DollarSign },
      { label: 'Leaves', path: '/leaves', icon: CalendarDays },
      { label: 'Hiring', path: '/hiring', icon: UserPlus },
      { label: 'Documents', path: '/documents', icon: FileText },
      { label: 'Complaints', path: '/complaints', icon: AlertTriangle },
      { label: 'Requests', path: '/requests', icon: Send },
      { label: 'Change Requests', path: '/change-requests', icon: GitPullRequest },
    ]
  },
  {
    title: 'Business',
    items: [
      { label: 'Clients', path: '/clients', icon: Users },
      { label: 'Leads', path: '/leads', icon: TrendingUp },
      { label: 'Invoices', path: '/invoices', icon: Receipt },
      { label: 'Expenses', path: '/expenses', icon: CreditCard },
    ]
  },
  {
    title: 'Communication',
    items: [
      { label: 'Chat', path: '/chat', icon: MessageCircle },
      { label: 'Email', path: '/email', icon: Mail },
      { label: 'Notifications', path: '/notifications', icon: Shield },
    ]
  },
  {
    title: 'My Profile',
    items: [
      { label: 'Personality Test', path: '/personality-test', icon: Brain },
    ]
  },
  {
    title: 'System',
    items: [
      { label: 'Admin Panel', path: '/admin', icon: Shield, adminOnly: true },
      { label: 'Passwords', path: '/passwords', icon: Lock },
      { label: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
      { label: 'Reports', path: '/reports', icon: BarChart3 },
      { label: 'Audit Log', path: '/audit', icon: Shield },
      { label: 'Settings', path: '/settings', icon: Settings },
    ]
  },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const { sidebarCollapsed, sidebarMobileOpen } = useSelector((s: RootState) => s.ui);
  const { user } = useSelector((s: RootState) => s.auth);
  const location = useLocation();

  const userRole = user?.role || 'GUY';
  const roleAccess = ROLE_SIDEBAR_ACCESS[userRole];
  const roleLabel = ROLE_LABELS[userRole] || userRole;
  const roleColor = ROLE_COLORS[userRole] || '#6B7280';

  const isAdminRole = ['CTO', 'CEO', 'ADMIN'].includes(userRole);

  const filteredSections = useMemo(() => {
    if (roleAccess === null || roleAccess === undefined) {
      return NAV_SECTIONS;
    }
    return NAV_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(item => {
        if ((item as any).adminOnly) return isAdminRole;
        const key = item.path.replace(/^\//, '');
        return roleAccess.includes(key);
      }),
    })).filter(section => section.items.length > 0);
  }, [roleAccess, isAdminRole]);

  const closeMobile = () => dispatch({ type: 'UI_CLOSE_MOBILE_SIDEBAR' });
  const toggleCollapse = () => dispatch({ type: 'UI_TOGGLE_SIDEBAR' });

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-[var(--bg-primary)]/60 z-[999] lg:hidden"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`
          flex flex-col h-screen bg-[var(--bg-card)] border-r border-[var(--border-default)]
          transition-all duration-250 ease-out z-[1000] shrink-0
          ${sidebarCollapsed ? 'w-16' : 'w-[240px]'}
          ${sidebarMobileOpen ? 'fixed left-0 top-0 w-[240px]' : 'hidden lg:flex'}
          lg:relative lg:flex
        `}
      >
        {/* Brand */}
        <div className="flex items-center h-16 px-4 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white font-bold text-sm shrink-0">
            K
          </div>
          {!sidebarCollapsed && (
            <span className="ml-3 text-[16px] font-semibold text-[var(--text-primary)]">
              Know<span className="text-[#D5FC0F]">AI</span>
            </span>
          )}
          {/* Collapse button (desktop) */}
          {!sidebarCollapsed && (
            <button
              onClick={toggleCollapse}
              className="ml-auto hidden lg:flex items-center justify-center w-6 h-6 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              data-testid="sidebar-collapse"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {sidebarCollapsed && (
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex items-center justify-center w-6 h-6 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors absolute left-[52px]"
            >
              <ChevronLeft size={16} className="rotate-180" />
            </button>
          )}
          {/* Close button (mobile) */}
          <button
            onClick={closeMobile}
            className="ml-auto lg:hidden flex items-center justify-center w-6 h-6 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2" data-testid="sidebar-nav">
          {filteredSections.map(section => (
            <div key={section.title} className="mb-1">
              {!sidebarCollapsed && (
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)] px-3 pt-4 pb-1 font-medium">
                  {section.title}
                </div>
              )}
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobile}
                    data-testid={`nav-${item.path.replace(/\//g, '')}`}
                    className={`
                      flex items-center gap-2.5 h-9 rounded-lg px-3 text-[13px] font-medium transition-colors
                      ${isActive
                        ? 'bg-[#7C3AED]/15 text-[#7C3AED]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                      }
                      ${sidebarCollapsed ? 'justify-center px-0' : ''}
                    `}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Help button */}
        {!sidebarCollapsed && (
          <div className="px-3 py-2 border-t border-[var(--border-default)]">
            <button
              onClick={() => { if ((window as any).__knowaiRestartTour) (window as any).__knowaiRestartTour(); }}
              className="flex items-center gap-2.5 w-full h-9 rounded-lg px-3 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
              title="Help & Guide"
            >
              <HelpCircle size={18} className="opacity-85" />
              <span>Help & Guide</span>
            </button>
          </div>
        )}

        {/* User section */}
        <div className="px-3 py-3 border-t border-[var(--border-default)]">
          <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
              style={{ background: '#111827' }}
            >
              {user?.firstName?.[0] || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] text-[var(--text-primary)] truncate">
                  {user?.firstName || 'User'} {user?.lastName?.[0] || ''}
                </span>
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded w-fit mt-0.5"
                  style={{ color: roleColor, background: `${roleColor}20` }}
                >
                  {roleLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
