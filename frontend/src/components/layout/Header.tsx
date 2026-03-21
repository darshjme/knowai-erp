import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { Search, Bell, Moon, Sun, Menu as MenuIcon, LogOut, ChevronRight, Home, PanelRight, Command } from 'lucide-react';
import VerifiedBadge from '../ui/VerifiedBadge';
import { authApi, notificationsApi } from '../../services/api';
import type { RootState } from '../../store/store';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', 'hr-dashboard': 'HR Dashboard', projects: 'Projects',
  tasks: 'Tasks', team: 'Team', payroll: 'Payroll', leaves: 'Leaves',
  expenses: 'Expenses', hiring: 'Hiring', documents: 'Documents',
  complaints: 'Complaints', clients: 'Clients', leads: 'Leads',
  invoices: 'Invoices', chat: 'Chat', email: 'Email', calendar: 'Calendar',
  files: 'Files', docs: 'Docs', analytics: 'Analytics', reports: 'Reports',
  settings: 'Settings', audit: 'Audit Log', notifications: 'Notifications',
  'time-tracking': 'Time Tracking', goals: 'Goals', 'video-reviews': 'Content Reviews',
  'content-workspace': 'Content Workspace', requests: 'Requests',
  'change-requests': 'Change Requests', careers: 'Careers',
  passwords: 'Password Manager', subscriptions: 'Subscriptions',
  admin: 'Admin Panel', 'personality-test': 'Personality Test',
};

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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

function timeAgo(d: string | undefined) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Breadcrumbs() {
  const location = useLocation();
  const { pageTitle } = useSelector((s: RootState) => s.ui);
  const parts = location.pathname.split('/').filter(Boolean);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'dashboard')) return null;

  const isUUID = (s: string) => /^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s);

  return (
    <nav className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] flex-wrap">
      <Link to="/dashboard" className="text-[var(--text-muted)] flex items-center hover:text-[var(--text-secondary)]">
        <Home size={14} />
      </Link>
      {parts.map((part, i) => {
        const path = '/' + parts.slice(0, i + 1).join('/');
        const isLast = i === parts.length - 1;
        const label = isUUID(part)
          ? (pageTitle || 'Detail')
          : (ROUTE_LABELS[part] || part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="opacity-50" />
            {isLast ? (
              <span className="text-[var(--text-primary)] font-semibold">{label}</span>
            ) : (
              <Link to={path} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">{label}</Link>
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
  const { user } = useSelector((s: RootState) => s.auth);
  const { theme, pageTitle } = useSelector((s: RootState) => s.ui);
  const { unreadCount } = useSelector((s: RootState) => s.notifications);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const [showNotifDrop, setShowNotifDrop] = useState(false);
  const prevCount = useRef(unreadCount);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await notificationsApi.list({ unread: true, limit: 5 });
      const rd = res.data;
      const list = Array.isArray(rd) ? rd : rd?.data || rd?.notifications || [];
      setRecentNotifs(list.slice(0, 5));
      const count = rd?.unreadCount ?? list.filter((n: any) => !n.read).length;
      dispatch({ type: 'SET_NOTIFICATION_COUNT', payload: count });
      if (count > prevCount.current && prevCount.current >= 0) playNotificationSound();
      prevCount.current = count;
    } catch {}
  }, [dispatch]);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setRecentNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      dispatch({ type: 'SET_NOTIFICATION_COUNT', payload: Math.max(0, (unreadCount || 0) - 1) });
    } catch {}
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    dispatch({ type: 'UI_SET_THEME', payload: next });
  };

  const toggleMobile = () => dispatch({ type: 'UI_TOGGLE_MOBILE_SIDEBAR' });
  const toggleRightPanel = () => dispatch({ type: 'UI_TOGGLE_RIGHT_PANEL' });

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('knowai-user');
    localStorage.removeItem('knowai-authenticated');
    dispatch({ type: 'AUTH_LOGOUT' });
    navigate('/login');
  };

  return (
    <header
      data-testid="header"
      className="flex items-center h-14 px-5 bg-[var(--bg-card)] border-b border-[var(--border-default)] shrink-0 gap-3"
    >
      {/* Mobile menu button */}
      <button
        onClick={toggleMobile}
        className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
        data-testid="mobile-menu"
      >
        <MenuIcon size={18} />
      </button>

      {/* Page title + breadcrumbs */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <h1 className="text-[17px] font-bold text-[var(--text-primary)] m-0 truncate font-heading">
          {pageTitle}
        </h1>
        <Breadcrumbs />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Command palette trigger */}
      <button
        onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
        className="hidden sm:flex items-center gap-2 h-8 px-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-[13px] text-[var(--text-muted)] hover:border-[var(--text-muted)] transition-colors cursor-pointer"
        data-testid="cmd-k-trigger"
      >
        <Search size={14} />
        <span className="hidden md:inline">Search...</span>
        <kbd className="text-[10px] bg-[var(--bg-primary)] px-1.5 py-0.5 rounded border border-[var(--border-default)] font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center w-8 h-8 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
        title="Toggle theme"
        data-testid="theme-toggle"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Right panel toggle (mobile/tablet) */}
      <button
        onClick={toggleRightPanel}
        className="xl:hidden flex items-center justify-center w-8 h-8 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
        title="Toggle right panel"
        data-testid="panel-toggle"
      >
        <PanelRight size={18} />
      </button>

      {/* Notification bell */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => setShowNotifDrop(!showNotifDrop)}
          className="flex items-center justify-center w-8 h-8 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors relative"
          data-testid="notification-bell"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#EF4444] text-white text-[9px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification dropdown */}
        {showNotifDrop && (
          <div className="absolute top-full right-0 mt-2 w-[340px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-modal z-[1050] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
              <span className="font-bold text-sm text-[var(--text-primary)]">Notifications</span>
              {unreadCount > 0 && (
                <span
                  className="text-[11px] text-[#7C3AED] cursor-pointer font-semibold hover:underline"
                  onClick={() => { navigate('/notifications'); setShowNotifDrop(false); }}
                >
                  View All
                </span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recentNotifs.length === 0 ? (
                <div className="p-6 text-center text-[var(--text-muted)] text-[13px]">
                  All caught up!
                </div>
              ) : recentNotifs.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => { if (n.linkUrl) navigate(n.linkUrl); if (!n.read) handleMarkRead(n.id); setShowNotifDrop(false); }}
                  className={`px-4 py-2.5 cursor-pointer border-b border-[var(--border-default)] transition-colors hover:bg-[var(--bg-elevated)] ${!n.read ? 'bg-[#7C3AED]/5 border-l-[3px] border-l-[#7C3AED]' : ''}`}
                >
                  <div className={`text-[13px] mb-0.5 ${n.read ? 'font-normal' : 'font-semibold'} text-[var(--text-primary)]`}>
                    {n.title}
                  </div>
                  <div className="text-[12px] text-[var(--text-muted)] leading-tight truncate">
                    {typeof n.message === 'string' ? n.message.substring(0, 80) : ''}
                    {n.message?.length > 80 ? '...' : ''}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">{timeAgo(n.createdAt)}</div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-[var(--border-default)] text-center">
              <span
                className="text-[12px] text-[#7C3AED] cursor-pointer font-semibold hover:underline"
                onClick={() => { navigate('/notifications'); setShowNotifDrop(false); }}
              >
                See all notifications
              </span>
            </div>
          </div>
        )}
      </div>

      {/* User avatar dropdown */}
      <Menu as="div" className="relative">
        <MenuButton
          className="w-8 h-8 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:ring-2 hover:ring-[#7C3AED]/40 transition-all"
          data-testid="user-avatar"
        >
          {user?.firstName?.[0] || 'U'}
        </MenuButton>
        <MenuItems className="absolute right-0 mt-2 w-[220px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-modal z-[1050] overflow-hidden focus:outline-none">
          <div className="px-4 py-3 border-b border-[var(--border-default)]">
            <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
              {user?.firstName} {user?.lastName}
              <VerifiedBadge verified={user?.verified} size={14} />
            </div>
            <div className="text-[12px] text-[var(--text-muted)] truncate">{user?.email}</div>
            <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#7C3AED]/15 text-[#7C3AED]">
              {user?.role}
            </span>
          </div>
          <div className="py-1">
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => navigate('/settings')}
                  className={`w-full text-left px-4 py-2 text-[13px] text-[var(--text-secondary)] ${active ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : ''}`}
                >
                  Settings
                </button>
              )}
            </MenuItem>
            <div className="border-t border-[var(--border-default)] my-1" />
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={handleLogout}
                  className={`w-full text-left px-4 py-2 text-[13px] text-[#EF4444] flex items-center gap-2 ${active ? 'bg-[var(--bg-elevated)]' : ''}`}
                >
                  <LogOut size={14} /> Logout
                </button>
              )}
            </MenuItem>
          </div>
        </MenuItems>
      </Menu>
    </header>
  );
}
