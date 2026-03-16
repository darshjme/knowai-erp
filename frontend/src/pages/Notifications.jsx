import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { notificationsApi } from '../services/api';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'hr', label: 'HR' },
  { key: 'system', label: 'System' },
];

const TYPE_CONFIG = {
  task: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    color: '#146DF7',
    bg: 'rgba(20, 109, 247, 0.1)',
  },
  task_assigned: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
        <polyline points="17 11 19 13 23 9"/>
      </svg>
    ),
    color: '#146DF7',
    bg: 'rgba(20, 109, 247, 0.1)',
  },
  task_completed: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    color: '#16A34A',
    bg: 'rgba(22, 163, 74, 0.1)',
  },
  task_overdue: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    color: '#CB3939',
    bg: 'rgba(203, 57, 57, 0.1)',
  },
  hr: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    color: '#8B3FE9',
    bg: 'rgba(139, 63, 233, 0.1)',
  },
  leave: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    color: '#EA580C',
    bg: 'rgba(234, 88, 12, 0.1)',
  },
  payroll: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    color: '#16A34A',
    bg: 'rgba(22, 163, 74, 0.1)',
  },
  system: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    color: '#5B6B76',
    bg: 'rgba(91, 107, 118, 0.1)',
  },
  mention: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>
      </svg>
    ),
    color: '#2563EB',
    bg: 'rgba(37, 99, 235, 0.1)',
  },
  comment: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    color: '#146DF7',
    bg: 'rgba(20, 109, 247, 0.1)',
  },
  project: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    color: '#EA580C',
    bg: 'rgba(234, 88, 12, 0.1)',
  },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.system;
}

function getTypeCategory(type) {
  if (['task', 'task_assigned', 'task_completed', 'task_overdue'].includes(type)) return 'tasks';
  if (['hr', 'leave', 'payroll'].includes(type)) return 'hr';
  if (['system'].includes(type)) return 'system';
  return 'all';
}

function groupByDate(notifications) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  };

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

const PAGE_SIZE = 20;

export default function Notifications() {
  const dispatch = useDispatch();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Notifications' });
    fetchNotifications(1, true);
  }, []);

  useEffect(() => {
    fetchNotifications(1, true);
  }, [activeTab]);

  const fetchNotifications = async (pg = 1, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const params = { page: pg, limit: PAGE_SIZE };
      if (activeTab === 'unread') params.unread = true;
      else if (activeTab !== 'all') params.type = activeTab;

      const res = await notificationsApi.list(params);
      const data = res.data?.notifications || res.data || [];
      const items = Array.isArray(data) ? data : [];

      if (reset) {
        setNotifications(items);
      } else {
        setNotifications(prev => [...prev, ...items]);
      }
      setHasMore(items.length >= PAGE_SIZE);
      setPage(pg);

      // Sync to redux store
      if (reset && activeTab === 'all') {
        dispatch({ type: 'NOTIFS_SET', payload: items });
      }
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleMarkRead = async (notification) => {
    const nid = notification._id || notification.id;
    if (notification.read) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => (n._id || n.id) === nid ? { ...n, read: true } : n));
    dispatch({ type: 'NOTIFS_MARK_READ', payload: nid });

    try {
      await notificationsApi.markRead(nid);
    } catch {
      // Revert on failure
      setNotifications(prev => prev.map(n => (n._id || n.id) === nid ? { ...n, read: false } : n));
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) {
      toast.info('All notifications are already read');
      return;
    }

    // Optimistic
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      await Promise.all(unread.map(n => notificationsApi.markRead(n._id || n.id)));
      dispatch({ type: 'NOTIFS_SET', payload: notifications.map(n => ({ ...n, read: true })) });
      toast.success(`Marked ${unread.length} notification(s) as read`);
    } catch {
      fetchNotifications(1, true);
      toast.error('Failed to mark all as read');
    }
  };

  const handleLoadMore = () => {
    fetchNotifications(page + 1, false);
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    return getTypeCategory(n.type) === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const grouped = groupByDate(filteredNotifications);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Stay updated with your latest alerts and activities</p>
        </div>
        <div className="page-actions">
          {unreadCount > 0 && (
            <span className="kai-badge primary" style={{ fontSize: 12, padding: '4px 12px' }}>
              {unreadCount} unread
            </span>
          )}
          <button className="kai-btn kai-btn-outline" onClick={handleMarkAllRead}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Mark All Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--kai-surface)', padding: 4, borderRadius: 'var(--kai-radius)', border: '1px solid var(--kai-border)', width: 'fit-content', maxWidth: '100%', flexWrap: 'wrap' }}>
        {FILTER_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          let count = 0;
          if (tab.key === 'unread') count = unreadCount;
          else if (tab.key === 'all') count = notifications.length;
          else count = notifications.filter(n => getTypeCategory(n.type) === tab.key).length;

          return (
            <button
              key={tab.key}
              className={`kai-btn kai-btn-sm ${isActive ? 'kai-btn-primary' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: isActive ? 'var(--kai-primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--kai-text-muted)',
                border: 'none',
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--kai-bg)',
                  padding: '1px 6px',
                  borderRadius: 'var(--kai-radius-pill)',
                  marginLeft: 4,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="kai-card">
        <div className="kai-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--kai-border)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No notifications</div>
              <div style={{ fontSize: 13 }}>
                {activeTab === 'unread' ? 'You have read all your notifications' : 'No notifications to show'}
              </div>
            </div>
          ) : (
            grouped.map(([groupLabel, items]) => (
              <div key={groupLabel}>
                {/* Group Header */}
                <div style={{
                  padding: '10px 20px',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: 'var(--kai-text-muted)',
                  background: 'var(--kai-bg)',
                  borderBottom: '1px solid var(--kai-border-light)',
                  borderTop: '1px solid var(--kai-border-light)',
                }}>
                  {groupLabel}
                </div>

                {/* Notification Items */}
                {items.map(notification => {
                  const nid = notification._id || notification.id;
                  const type = notification.type || 'system';
                  const config = getTypeConfig(type);
                  const isUnread = !notification.read;

                  return (
                    <div
                      key={nid}
                      onClick={() => handleMarkRead(notification)}
                      style={{
                        display: 'flex',
                        gap: 14,
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--kai-border-light)',
                        cursor: isUnread ? 'pointer' : 'default',
                        background: isUnread ? 'rgba(20, 109, 247, 0.02)' : 'transparent',
                        transition: 'var(--kai-transition)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--kai-surface-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = isUnread ? 'rgba(20,109,247,0.02)' : 'transparent'}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 'var(--kai-radius-lg)',
                        background: config.bg,
                        color: config.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {config.icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13.5,
                              fontWeight: isUnread ? 600 : 400,
                              color: 'var(--kai-text)',
                              marginBottom: 2,
                            }}>
                              {notification.title || notification.message || 'Notification'}
                            </div>
                            {(notification.description || notification.body) && (
                              <div style={{ fontSize: 12.5, color: 'var(--kai-text-muted)', lineHeight: 1.4 }}>
                                {notification.description || notification.body}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: 'var(--kai-text-muted)', whiteSpace: 'nowrap' }}>
                              {formatRelativeTime(notification.createdAt || notification.date || notification.timestamp)}
                            </span>
                            {isUnread && (
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--kai-primary)', flexShrink: 0 }} />
                            )}
                          </div>
                        </div>

                        {/* Tags/metadata */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <span className="kai-badge" style={{ background: config.bg, color: config.color, fontSize: 10 }}>
                            {type.replace(/_/g, ' ')}
                          </span>
                          {notification.project && (
                            <span className="kai-badge secondary" style={{ fontSize: 10 }}>{notification.project}</span>
                          )}
                          {notification.assignee && (
                            <span className="kai-badge" style={{ fontSize: 10, background: 'var(--kai-bg)', color: 'var(--kai-text-muted)' }}>
                              {notification.assignee}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {/* Load More */}
          {hasMore && filteredNotifications.length > 0 && (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <button
                className="kai-btn kai-btn-outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                      <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
