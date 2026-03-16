import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  LayoutDashboard, FolderKanban, ListChecks, Users, DollarSign,
  CalendarDays, Receipt, Briefcase, UserPlus, FileText, MessageCircle,
  Mail, BarChart3, Settings, Shield, Clock, Target, FileSearch,
  AlertTriangle, TrendingUp, CreditCard, ChevronLeft, X, HelpCircle, Brain,
  Lock
} from 'lucide-react';
import { ROLE_SIDEBAR_ACCESS, ROLE_LABELS, ROLE_COLORS } from '../../utils/roleConfig';

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
  const { sidebarCollapsed, sidebarMobileOpen } = useSelector(s => s.ui);
  const { user } = useSelector(s => s.auth);
  const location = useLocation();

  const userRole = user?.role || 'GUY';
  const roleAccess = ROLE_SIDEBAR_ACCESS[userRole];
  const roleLabel = ROLE_LABELS[userRole] || userRole;
  const roleColor = ROLE_COLORS[userRole] || '#6B7280';

  const isAdminRole = ['CTO', 'CEO', 'ADMIN'].includes(userRole);

  // Filter nav sections based on role access
  const filteredSections = useMemo(() => {
    // null means full access (e.g. ADMIN, CTO, CEO)
    if (roleAccess === null || roleAccess === undefined) {
      return NAV_SECTIONS;
    }

    return NAV_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Admin-only items are only visible to CTO/CEO/ADMIN
        if (item.adminOnly) return isAdminRole;
        const key = item.path.replace(/^\//, ''); // strip leading slash
        return roleAccess.includes(key);
      }),
    })).filter(section => section.items.length > 0);
  }, [roleAccess, isAdminRole]);

  const closeMobile = () => dispatch({ type: 'UI_CLOSE_MOBILE_SIDEBAR' });
  const toggleCollapse = () => dispatch({ type: 'UI_TOGGLE_SIDEBAR' });

  return (
    <>
      <div className={`app-sidebar-overlay ${sidebarMobileOpen ? 'show' : ''}`} onClick={closeMobile} />
      <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${sidebarMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">K</div>
          <span className="sidebar-logo-text">Know<span>AI</span></span>
          <button className="d-none d-lg-flex" onClick={toggleCollapse} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--kai-sidebar-text)', cursor: 'pointer', padding: 4 }}>
            <ChevronLeft size={16} style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          <button className="d-lg-none" onClick={closeMobile} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--kai-sidebar-text)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredSections.map(section => (
            <div key={section.title}>
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={closeMobile}
                  >
                    <Icon size={20} />
                    <span className="nav-text">{item.label}</span>
                    {item.badge && <span className="nav-badge">{item.badge}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' }}>
          <button
            className="sidebar-nav-item sidebar-help-btn"
            onClick={() => {
              if (window.__knowaiRestartTour) {
                window.__knowaiRestartTour();
              }
            }}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: '10px 12px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 14,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            title="Help & Guide"
          >
            <HelpCircle size={20} style={{ opacity: 0.85 }} />
            <span className="nav-text" style={{ fontWeight: 500 }}>Help & Guide</span>
          </button>
        </div>

        <div style={{ padding: '8px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="sidebar-nav-item" style={{ opacity: 0.7 }}>
            <div className="kai-avatar kai-avatar-sm" style={{ background: '#146DF7' }}>
              {user?.firstName?.[0] || 'U'}
            </div>
            <span className="nav-text" style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span>{user?.firstName || 'User'} {user?.lastName?.[0] || ''}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: roleColor,
                  background: `${roleColor}20`,
                  padding: '1px 6px',
                  borderRadius: 4,
                  lineHeight: '16px',
                  display: 'inline-block',
                  width: 'fit-content',
                }}
              >
                {roleLabel}
              </span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
