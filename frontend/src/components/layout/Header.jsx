import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Search, Bell, Moon, Sun, Menu, LogOut, ChevronRight, Home } from 'lucide-react';
import { authApi } from '../../services/api';
import { Dropdown } from 'react-bootstrap';

const ROUTE_LABELS = {
  dashboard: 'Dashboard',
  'hr-dashboard': 'HR Dashboard',
  projects: 'Projects',
  tasks: 'Tasks',
  team: 'Team',
  payroll: 'Payroll',
  leaves: 'Leaves',
  expenses: 'Expenses',
  hiring: 'Hiring',
  documents: 'Documents',
  complaints: 'Complaints',
  clients: 'Clients',
  leads: 'Leads',
  invoices: 'Invoices',
  chat: 'Chat',
  email: 'Email',
  calendar: 'Calendar',
  files: 'Files',
  docs: 'Docs',
  analytics: 'Analytics',
  reports: 'Reports',
  settings: 'Settings',
  audit: 'Audit Log',
  notifications: 'Notifications',
  'time-tracking': 'Time Tracking',
  goals: 'Goals',
};

function Breadcrumbs() {
  const location = useLocation();
  const { pageTitle } = useSelector(s => s.ui);
  const parts = location.pathname.split('/').filter(Boolean);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'dashboard')) {
    return null;
  }

  // Check if last segment is a UUID/ID (detail page)
  const isUUID = (s) => /^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s);

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--kai-text-muted)', flexWrap: 'wrap' }}>
      <Link to="/dashboard" style={{ color: 'var(--kai-text-muted)', display: 'flex', alignItems: 'center' }}>
        <Home size={14} />
      </Link>
      {parts.map((part, i) => {
        const path = '/' + parts.slice(0, i + 1).join('/');
        const isLast = i === parts.length - 1;

        // If this segment is an ID, show the page title instead (e.g. project name)
        let label;
        if (isUUID(part)) {
          label = pageTitle || 'Detail';
        } else {
          label = ROUTE_LABELS[part] || part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }

        return (
          <span key={path} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChevronRight size={12} style={{ color: 'var(--kai-text-muted)', opacity: 0.5 }} />
            {isLast ? (
              <span style={{ color: 'var(--kai-text)', fontWeight: 600 }}>{label}</span>
            ) : (
              <Link to={path} style={{ color: 'var(--kai-text-muted)' }}>{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { theme, pageTitle } = useSelector(s => s.ui);
  const { unreadCount } = useSelector(s => s.notifications);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    dispatch({ type: 'UI_SET_THEME', payload: next });
  };

  const toggleMobile = () => dispatch({ type: 'UI_TOGGLE_MOBILE_SIDEBAR' });

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('knowai-user');
    localStorage.removeItem('knowai-authenticated');
    dispatch({ type: 'AUTH_LOGOUT' });
    navigate('/login');
  };

  return (
    <header className="app-header">
      <button className="d-lg-none kai-btn kai-btn-outline kai-btn-sm" onClick={toggleMobile}>
        <Menu size={18} />
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--kai-primary)', letterSpacing: -0.3 }}>KnowAI</span>
          <span style={{ width: 1, height: 18, background: 'var(--kai-border)' }} />
          <h5 style={{ margin: 0, fontWeight: 700, fontSize: 17, color: 'var(--kai-text)' }}>{pageTitle}</h5>
        </div>
        <Breadcrumbs />
      </div>

      <div className="kai-search hide-mobile" style={{ marginLeft: 'auto', width: 260 }}>
        <Search size={16} />
        <input type="text" placeholder="Search anything..." style={{ height: 36 }} />
      </div>

      <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={toggleTheme} title="Toggle theme">
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => navigate('/notifications')} style={{ position: 'relative' }}>
        <Bell size={16} />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--kai-danger)', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Dropdown align="end">
        <Dropdown.Toggle as="div" style={{ cursor: 'pointer' }}>
          <div className="kai-avatar" style={{ background: '#146DF7' }}>
            {user?.firstName?.[0] || 'U'}
          </div>
        </Dropdown.Toggle>
        <Dropdown.Menu style={{ minWidth: 200, borderRadius: 'var(--kai-radius-lg)', border: '1px solid var(--kai-border)', boxShadow: 'var(--kai-shadow-lg)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--kai-border)' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{user?.email}</div>
            <div className="kai-badge primary" style={{ marginTop: 6, fontSize: 10 }}>{user?.role}</div>
          </div>
          <Dropdown.Item onClick={() => navigate('/settings')}>Settings</Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item onClick={handleLogout} className="text-danger">
            <LogOut size={14} style={{ marginRight: 8 }} /> Logout
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </header>
  );
}
