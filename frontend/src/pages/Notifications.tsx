import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { notificationsApi } from '../services/api';

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: 'bi-bell' },
  { key: 'unread', label: 'Unread', icon: 'bi-envelope' },
  { key: 'tasks', label: 'Tasks', icon: 'bi-check2-square' },
  { key: 'projects', label: 'Projects', icon: 'bi-folder' },
  { key: 'system', label: 'System', icon: 'bi-gear' },
  { key: 'announcements', label: 'Announcements', icon: 'bi-megaphone' },
];

const TYPE_CONFIG = {
  task: { icon: 'bi-check2-square', color: '#146DF7', bg: 'rgba(20, 109, 247, 0.1)' },
  task_assigned: { icon: 'bi-person-check', color: '#146DF7', bg: 'rgba(20, 109, 247, 0.1)' },
  TASK_ASSIGNED: { icon: 'bi-person-check', color: '#146DF7', bg: 'rgba(20, 109, 247, 0.1)' },
  task_completed: { icon: 'bi-check-circle', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
  TASK_COMPLETED: { icon: 'bi-check-circle', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
  task_overdue: { icon: 'bi-exclamation-triangle', color: '#CB3939', bg: 'rgba(203, 57, 57, 0.1)' },
  TASK_OVERDUE: { icon: 'bi-exclamation-triangle', color: '#CB3939', bg: 'rgba(203, 57, 57, 0.1)' },
  TASK_COMMENT: { icon: 'bi-chat-dots', color: '#146DF7', bg: 'rgba(20, 109, 247, 0.1)' },
  hr: { icon: 'bi-people', color: '#8B3FE9', bg: 'rgba(139, 63, 233, 0.1)' },
  leave: { icon: 'bi-calendar-event', color: '#EA580C', bg: 'rgba(234, 88, 12, 0.1)' },
  LEAVE_APPROVED: { icon: 'bi-calendar-check', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
  LEAVE_REJECTED: { icon: 'bi-calendar-x', color: '#CB3939', bg: 'rgba(203, 57, 57, 0.1)' },
  payroll: { icon: 'bi-currency-dollar', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
  system: { icon: 'bi-gear', color: '#5B6B76', bg: 'rgba(91, 107, 118, 0.1)' },
  SYSTEM: { icon: 'bi-gear', color: '#5B6B76', bg: 'rgba(91, 107, 118, 0.1)' },
  CHAT_MENTION: { icon: 'bi-at', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },
  mention: { icon: 'bi-at', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.1)' },
  comment: { icon: 'bi-chat-dots', color: '#146DF7', bg: 'rgba(20, 109, 247, 0.1)' },
  project: { icon: 'bi-folder', color: '#EA580C', bg: 'rgba(234, 88, 12, 0.1)' },
  LEAD_ASSIGNED: { icon: 'bi-person-lines-fill', color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.1)' },
  DOCUMENT_VERIFIED: { icon: 'bi-file-earmark-check', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
  COMPLAINT_FILED: { icon: 'bi-flag', color: '#CB3939', bg: 'rgba(203, 57, 57, 0.1)' },
  COMPLAINT_RESOLVED: { icon: 'bi-flag-fill', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.1)' },
  ANNOUNCEMENT: { icon: 'bi-megaphone', color: '#D97706', bg: 'rgba(217, 119, 6, 0.1)' },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.system;
}

function getTypeCategory(type) {
  if (['task', 'task_assigned', 'task_completed', 'task_overdue', 'TASK_ASSIGNED', 'TASK_COMPLETED', 'TASK_OVERDUE', 'TASK_COMMENT'].includes(type)) return 'tasks';
  if (['project', 'LEAD_ASSIGNED'].includes(type)) return 'projects';
  if (['hr', 'leave', 'payroll', 'LEAVE_APPROVED', 'LEAVE_REJECTED'].includes(type)) return 'system';
  if (['system', 'SYSTEM', 'CHAT_MENTION', 'DOCUMENT_VERIFIED', 'COMPLAINT_FILED', 'COMPLAINT_RESOLVED'].includes(type)) return 'system';
  if (['ANNOUNCEMENT'].includes(type)) return 'announcements';
  return 'all';
}

function groupByDate(notifications) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

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
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
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

  useEffect(() => {
    fetchNotifications(1, true);
  }, [activeTab]);

  // Poll for new notifications every 30 seconds and play sound
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await notificationsApi.list({ page: 1, limit: 5, read: 'false' });
        const data = res.data?.notifications || res.data || [];
        const items = Array.isArray(data) ? data : [];
        const newCount = items.length;
        if (newCount > prevCountRef.current && prevCountRef.current !== undefined) {
          playNotificationSound();
          // Refresh the list
          fetchNotifications(1, true);
        }
        prevCountRef.current = newCount;
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async (pg = 1, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const params = { page: pg, limit: PAGE_SIZE };
      if (activeTab === 'unread') params.read = 'false';
      else if (activeTab !== 'all') {
        // Map tab to notification types
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

      if (reset) {
        setNotifications(items);
      } else {
        setNotifications(prev => [...prev, ...items]);
      }
      setHasMore(items.length >= PAGE_SIZE);
      setPage(pg);

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
    if (notification.read) {
      // If already read, just navigate
      if (notification.linkUrl) navigate(notification.linkUrl);
      return;
    }

    setNotifications(prev => prev.map(n => (n._id || n.id) === nid ? { ...n, read: true } : n));
    dispatch({ type: 'NOTIFS_MARK_READ', payload: nid });

    try {
      await notificationsApi.markRead(nid);
    } catch {
      setNotifications(prev => prev.map(n => (n._id || n.id) === nid ? { ...n, read: false } : n));
      toast.error('Failed to mark as read');
    }

    if (notification.linkUrl) navigate(notification.linkUrl);
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) {
      toast.info('All notifications are already read');
      return;
    }

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
            <i className="bi bi-check2-all" style={{ marginRight: 6 }} />
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
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className={tab.icon} style={{ fontSize: 13 }} />
              {tab.label}
              {count > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--kai-bg)',
                  padding: '1px 6px',
                  borderRadius: 'var(--kai-radius-pill)',
                  marginLeft: 2,
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
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>
              <i className="bi bi-arrow-repeat" style={{ fontSize: 24, animation: 'spin 1s linear infinite', display: 'block', marginBottom: 8 }} />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>
              <i className="bi bi-bell-slash" style={{ fontSize: 48, display: 'block', marginBottom: 12, opacity: 0.3 }} />
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
                  const isAnnouncement = type === 'ANNOUNCEMENT';
                  const priority = notification.metadata?.priority || notification.priority;

                  return (
                    <div
                      key={nid}
                      onClick={() => handleMarkRead(notification)}
                      style={{
                        display: 'flex',
                        gap: 14,
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--kai-border-light)',
                        cursor: 'pointer',
                        background: isUnread ? 'rgba(20, 109, 247, 0.02)' : 'transparent',
                        borderLeft: isUnread ? '3px solid #146DF7' : '3px solid transparent',
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
                        fontSize: 18,
                      }}>
                        <i className={config.icon} />
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
                            {(notification.description || notification.body || notification.message) && (
                              <div style={{ fontSize: 12.5, color: 'var(--kai-text-muted)', lineHeight: 1.4 }}>
                                {notification.description || notification.body || (notification.title !== notification.message ? notification.message : '')}
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
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span className="kai-badge" style={{ background: config.bg, color: config.color, fontSize: 10 }}>
                            {type.replace(/_/g, ' ')}
                          </span>
                          {isAnnouncement && priority && (
                            <span className="kai-badge" style={{
                              fontSize: 10,
                              background: priority === 'URGENT' ? 'rgba(203, 57, 57, 0.1)' : priority === 'IMPORTANT' ? 'rgba(234, 88, 12, 0.1)' : 'var(--kai-bg)',
                              color: priority === 'URGENT' ? '#CB3939' : priority === 'IMPORTANT' ? '#EA580C' : 'var(--kai-text-muted)',
                            }}>
                              {priority}
                            </span>
                          )}
                          {notification.project && (
                            <span className="kai-badge secondary" style={{ fontSize: 10 }}>{notification.project}</span>
                          )}
                          {notification.assignee && (
                            <span className="kai-badge" style={{ fontSize: 10, background: 'var(--kai-bg)', color: 'var(--kai-text-muted)' }}>
                              {notification.assignee}
                            </span>
                          )}
                          {notification.linkUrl && (
                            <span className="kai-badge" style={{ fontSize: 10, background: 'rgba(20,109,247,0.08)', color: '#146DF7' }}>
                              <i className="bi bi-box-arrow-up-right" style={{ marginRight: 3, fontSize: 9 }} />
                              View
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
                    <i className="bi bi-arrow-repeat" style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} />
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
