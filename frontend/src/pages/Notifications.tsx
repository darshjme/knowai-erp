import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { notificationsApi } from '../services/api';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'projects', label: 'Projects' },
  { key: 'system', label: 'System' },
  { key: 'announcements', label: 'Announcements' },
];

const TYPE_CONFIG = {
  task: { color: '#3B82F6', bg: 'bg-blue-500/10' },
  task_assigned: { color: '#3B82F6', bg: 'bg-blue-500/10' },
  TASK_ASSIGNED: { color: '#3B82F6', bg: 'bg-blue-500/10' },
  task_completed: { color: '#16A34A', bg: 'bg-green-500/10' },
  TASK_COMPLETED: { color: '#16A34A', bg: 'bg-green-500/10' },
  task_overdue: { color: '#CB3939', bg: 'bg-red-500/10' },
  TASK_OVERDUE: { color: '#CB3939', bg: 'bg-red-500/10' },
  TASK_COMMENT: { color: '#3B82F6', bg: 'bg-blue-500/10' },
  hr: { color: '#8B3FE9', bg: 'bg-purple-500/10' },
  leave: { color: '#EA580C', bg: 'bg-orange-500/10' },
  LEAVE_APPROVED: { color: '#16A34A', bg: 'bg-green-500/10' },
  LEAVE_REJECTED: { color: '#CB3939', bg: 'bg-red-500/10' },
  payroll: { color: '#16A34A', bg: 'bg-green-500/10' },
  system: { color: '#5B6B76', bg: 'bg-gray-500/10' },
  SYSTEM: { color: '#5B6B76', bg: 'bg-gray-500/10' },
  CHAT_MENTION: { color: '#2563EB', bg: 'bg-blue-500/10' },
  mention: { color: '#2563EB', bg: 'bg-blue-500/10' },
  comment: { color: '#3B82F6', bg: 'bg-blue-500/10' },
  project: { color: '#EA580C', bg: 'bg-orange-500/10' },
  LEAD_ASSIGNED: { color: '#7C3AED', bg: 'bg-purple-500/10' },
  DOCUMENT_VERIFIED: { color: '#16A34A', bg: 'bg-green-500/10' },
  COMPLAINT_FILED: { color: '#CB3939', bg: 'bg-red-500/10' },
  COMPLAINT_RESOLVED: { color: '#16A34A', bg: 'bg-green-500/10' },
  ANNOUNCEMENT: { color: '#D97706', bg: 'bg-amber-500/10' },
};

function getTypeConfig(type) { return TYPE_CONFIG[type] || TYPE_CONFIG.system; }

function getTypeCategory(type) {
  if (['task', 'task_assigned', 'task_completed', 'task_overdue', 'TASK_ASSIGNED', 'TASK_COMPLETED', 'TASK_OVERDUE', 'TASK_COMMENT'].includes(type)) return 'tasks';
  if (['project', 'LEAD_ASSIGNED'].includes(type)) return 'projects';
  if (['hr', 'leave', 'payroll', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'system', 'SYSTEM', 'CHAT_MENTION', 'DOCUMENT_VERIFIED', 'COMPLAINT_FILED', 'COMPLAINT_RESOLVED'].includes(type)) return 'system';
  if (['ANNOUNCEMENT'].includes(type)) return 'announcements';
  return 'all';
}

function groupByDate(notifications) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const groups = { Today: [], Yesterday: [], 'This Week': [], Older: [] };
  notifications.forEach(n => {
    const d = new Date(n.createdAt || n.date || n.timestamp);
    if (d >= today) groups.Today.push(n);
    else if (d >= yesterday) groups.Yesterday.push(n);
    else if (d >= weekAgo) groups['This Week'].push(n);
    else groups.Older.push(n);
  });
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 800; gain.gain.value = 0.1;
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

const PAGE_SIZE = 20;

export default function Notifications() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Notifications' });
    fetchNotifications(1, true);
  }, []);

  useEffect(() => { fetchNotifications(1, true); }, [activeTab]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await notificationsApi.list({ page: 1, limit: 5, read: 'false' });
        const data = res.data?.notifications || res.data || [];
        const items = Array.isArray(data) ? data : [];
        const newCount = items.length;
        if (newCount > prevCountRef.current && prevCountRef.current !== undefined) {
          playNotificationSound();
          fetchNotifications(1, true);
        }
        prevCountRef.current = newCount;
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async (pg = 1, reset = false) => {
    try {
      if (reset) setLoading(true); else setLoadingMore(true);
      const params = { page: pg, limit: PAGE_SIZE };
      if (activeTab === 'unread') params.read = 'false';
      else if (activeTab !== 'all') {
        const typeMap = {
          tasks: 'TASK_ASSIGNED,TASK_COMPLETED,TASK_OVERDUE,TASK_COMMENT',
          projects: 'LEAD_ASSIGNED',
          system: 'SYSTEM,CHAT_MENTION,DOCUMENT_VERIFIED,COMPLAINT_FILED,COMPLAINT_RESOLVED,LEAVE_APPROVED,LEAVE_REJECTED',
          announcements: 'ANNOUNCEMENT',
        };
        if (typeMap[activeTab]) params.type = typeMap[activeTab];
      }
      const res = await notificationsApi.list(params);
      const rd = res.data;
      const data = rd?.notifications || rd?.data || rd || [];
      const items = Array.isArray(data) ? data : [];
      if (reset) setNotifications(items); else setNotifications(prev => [...prev, ...items]);
      setHasMore(items.length >= PAGE_SIZE);
      setPage(pg);
      if (reset && activeTab === 'all') dispatch({ type: 'NOTIFS_SET', payload: items });
    } catch (err) { toast.error('Failed to load notifications'); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  const handleMarkRead = async (notification) => {
    const nid = notification._id || notification.id;
    if (notification.read) { if (notification.linkUrl) navigate(notification.linkUrl); return; }
    setNotifications(prev => prev.map(n => (n._id || n.id) === nid ? { ...n, read: true } : n));
    dispatch({ type: 'NOTIFS_MARK_READ', payload: nid });
    try { await notificationsApi.markRead(nid); }
    catch { setNotifications(prev => prev.map(n => (n._id || n.id) === nid ? { ...n, read: false } : n)); toast.error('Failed to mark as read'); }
    if (notification.linkUrl) navigate(notification.linkUrl);
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) { toast.info('All notifications are already read'); return; }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await Promise.all(unread.map(n => notificationsApi.markRead(n._id || n.id)));
      dispatch({ type: 'NOTIFS_SET', payload: notifications.map(n => ({ ...n, read: true })) });
      toast.success(`Marked ${unread.length} notification(s) as read`);
    } catch { fetchNotifications(1, true); toast.error('Failed to mark all as read'); }
  };

  const handleLoadMore = () => fetchNotifications(page + 1, false);

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    return getTypeCategory(n.type) === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const grouped = groupByDate(filteredNotifications);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)] font-[Manrope]">Notifications</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Stay updated with your latest alerts and activities</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="text-[12px] bg-[#7C3AED]/10 text-[#7C3AED] px-3 py-1 rounded-full font-semibold">{unreadCount} unread</span>
          )}
          <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1.5"
            onClick={handleMarkAllRead} data-testid="mark-all-read">
            Mark All Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-5 bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border-default)] w-fit max-w-full flex-wrap" data-testid="notification-tabs">
        {FILTER_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          let count = 0;
          if (tab.key === 'unread') count = unreadCount;
          else if (tab.key === 'all') count = notifications.length;
          else count = notifications.filter(n => getTypeCategory(n.type) === tab.key).length;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors flex items-center gap-1.5 ${isActive ? 'bg-[#7C3AED] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'}`}
              data-testid={`tab-${tab.key}`}>
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/25' : 'bg-[var(--bg-elevated)]'}`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[var(--text-muted)]">
            <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading notifications...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-muted)]">
            <div className="text-[48px] opacity-30 mb-3">&#128276;</div>
            <div className="text-[15px] font-semibold mb-1">No notifications</div>
            <div className="text-[13px]">{activeTab === 'unread' ? 'You have read all your notifications' : 'No notifications to show'}</div>
          </div>
        ) : (
          grouped.map(([groupLabel, items]) => (
            <div key={groupLabel}>
              <div className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-elevated)] border-b border-[var(--border-default)]">
                {groupLabel}
              </div>
              {items.map(notification => {
                const nid = notification._id || notification.id;
                const type = notification.type || 'system';
                const config = getTypeConfig(type);
                const isUnread = !notification.read;
                const isAnnouncement = type === 'ANNOUNCEMENT';
                const priority = notification.metadata?.priority || notification.priority;

                return (
                  <div key={nid} onClick={() => handleMarkRead(notification)}
                    className={`flex gap-3.5 px-5 py-3.5 border-b border-[var(--border-default)] cursor-pointer transition-colors hover:bg-[var(--bg-elevated)] ${isUnread ? 'bg-[#7C3AED]/[0.02] border-l-[3px] border-l-[#7C3AED]' : 'border-l-[3px] border-l-transparent'}`}
                    data-testid="notification-item">
                    <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0 text-[18px]`} style={{ color: config.color }}>
                      &#9679;
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className={`text-[13.5px] text-[var(--text-primary)] mb-0.5 ${isUnread ? 'font-semibold' : 'font-normal'}`}>
                            {notification.title || notification.message || 'Notification'}
                          </div>
                          {(notification.description || notification.body || notification.message) && (
                            <div className="text-[12.5px] text-[var(--text-muted)] leading-snug">
                              {notification.description || notification.body || (notification.title !== notification.message ? notification.message : '')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                            {formatRelativeTime(notification.createdAt || notification.date || notification.timestamp)}
                          </span>
                          {isUnread && <div className="w-2 h-2 rounded-full bg-[#7C3AED] shrink-0" />}
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${config.bg}`} style={{ color: config.color }}>
                          {type.replace(/_/g, ' ')}
                        </span>
                        {isAnnouncement && priority && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priority === 'URGENT' ? 'bg-red-500/10 text-red-400' : priority === 'IMPORTANT' ? 'bg-orange-500/10 text-orange-400' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                            {priority}
                          </span>
                        )}
                        {notification.project && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[var(--bg-elevated)] text-[var(--text-muted)]">{notification.project}</span>
                        )}
                        {notification.linkUrl && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-400">View</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {hasMore && filteredNotifications.length > 0 && (
          <div className="p-4 text-center">
            <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
              onClick={handleLoadMore} disabled={loadingMore} data-testid="load-more">
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
