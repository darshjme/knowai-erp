import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Search, Bell, Moon, Sun, Menu, LogOut, ChevronRight, Home, Megaphone } from 'lucide-react';
import VerifiedBadge from '../ui/VerifiedBadge';
import { authApi, notificationsApi } from '../../services/api';
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
  'video-reviews': 'Content Reviews',
  'content-workspace': 'Content Workspace',
  requests: 'Requests',
  'change-requests': 'Change Requests',
  careers: 'Careers',
  passwords: 'Password Manager',
  subscriptions: 'Subscriptions',
  admin: 'Admin Panel',
  'personality-test': 'Personality Test',
};

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function timeAgo(d) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

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
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [showNotifDrop, setShowNotifDrop] = useState(false);
  const prevCount = useRef(unreadCount);
  const notifRef = useRef(null);

  // Poll notifications every 30 seconds
  const fetchNotifs = useCallback(async () => {
    try {
      const res = await notificationsApi.list({ unread: true, limit: 5 });
      const rd = res.data;
      const list = Array.isArray(rd) ? rd : rd?.data || rd?.notifications || [];
      setRecentNotifs(list.slice(0, 5));
      const count = rd?.unreadCount ?? list.filter(n => !n.read).length;
      dispatch({ type: 'SET_NOTIFICATION_COUNT', payload: count });
      // Play sound if count increased
      if (count > prevCount.current && prevCount.current >= 0) {
        playNotificationSound();
      }
      prevCount.current = count;
    } catch {}
  }, [dispatch]);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setRecentNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      dispatch({ type: 'SET_NOTIFICATION_COUNT', payload: Math.max(0, (unreadCount || 0) - 1) });
    } catch {}
  };

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
          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--kai-text)', letterSpacing: -0.3 }}>KnowAI</span>
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

      <div ref={notifRef} style={{ position: 'relative' }}>
        <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowNotifDrop(!showNotifDrop)} style={{ position: 'relative' }}>
          <Bell size={16} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--kai-danger)', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        {showNotifDrop && (
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 340, background: 'var(--kai-bg)', border: '1px solid var(--kai-border)', borderRadius: 10, boxShadow: 'var(--kai-shadow-lg)', zIndex: 1050, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--kai-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
              {unreadCount > 0 && <span style={{ fontSize: 11, color: 'var(--kai-accent)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => { navigate('/notifications'); setShowNotifDrop(false); }}>View All</span>}
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {recentNotifs.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--kai-text-muted)', fontSize: 13 }}>No new notifications</div>
              ) : recentNotifs.map(n => (
                <div key={n.id} onClick={() => { if (n.linkUrl) navigate(n.linkUrl); if (!n.read) handleMarkRead(n.id); setShowNotifDrop(false); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--kai-border)', background: n.read ? 'transparent' : 'var(--kai-primary-light)', borderLeft: n.read ? 'none' : '3px solid var(--kai-primary)', transition: 'background .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--kai-bg-hover, rgba(0,0,0,.03))'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : 'var(--kai-primary-light)'; }}>
                  <div style={{ fontWeight: n.read ? 400 : 600, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', lineHeight: 1.3 }}>{typeof n.message === 'string' ? n.message.substring(0, 80) : ''}{n.message?.length > 80 ? '...' : ''}</div>
                  <div style={{ fontSize: 10, color: 'var(--kai-text-muted)', marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--kai-border)', textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--kai-accent)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => { navigate('/notifications'); setShowNotifDrop(false); }}>See all notifications</span>
            </div>
          </div>
        )}
      </div>

      <Dropdown align="end">
        <Dropdown.Toggle as="div" style={{ cursor: 'pointer' }}>
          <div className="kai-avatar" style={{ background: '#111827' }}>
            {user?.firstName?.[0] || 'U'}
          </div>
        </Dropdown.Toggle>
        <Dropdown.Menu style={{ minWidth: 200, borderRadius: 'var(--kai-radius-lg)', border: '1px solid var(--kai-border)', boxShadow: 'var(--kai-shadow-lg)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--kai-border)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>{user?.firstName} {user?.lastName} <VerifiedBadge verified={user?.verified} size={14} /></div>
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
