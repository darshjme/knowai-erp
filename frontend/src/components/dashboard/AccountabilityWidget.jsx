import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountabilityApi } from '../../services/api';
import { AlertTriangle, ArrowRight, Bell, Shield, Clock, User } from 'lucide-react';
import { toast } from 'react-toastify';

const SEVERITY_STYLES = {
  critical: { bg: '#FEE2E2', border: '#FCA5A5', color: '#991B1B', icon: '🔴' },
  warning: { bg: '#FEF3C7', border: '#FCD34D', color: '#92400E', icon: '🟡' },
  info: { bg: '#DBEAFE', border: '#93C5FD', color: '#1E40AF', icon: '🔵' },
};

export default function AccountabilityWidget() {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await accountabilityApi.getAlerts('me');
      const data = res.data;
      setAlerts(data?.alerts || []);
      setSummary(data?.summary || null);
    } catch {
      // Silent - widget shouldn't break dashboard
    } finally {
      setLoading(false);
    }
  };

  const handleNudge = async (alert) => {
    try {
      await accountabilityApi.sendNudge({
        targetUserId: alert.blocker.id,
        blockingTaskId: alert.blockerTask.id,
        blockedTaskId: alert.blockedTask.id,
        message: `${alert.blocked.name} is waiting on you to complete "${alert.blockerTask.title}" so they can proceed with "${alert.blockedTask.title}"`,
      });
      toast.success(`Accountability reminder sent to ${alert.blocker.name}`);
    } catch {
      toast.error('Failed to send reminder');
    }
  };

  if (loading || alerts.length === 0) return null;

  return (
    <div className="kai-card" style={{ border: '1px solid #FCA5A5' }}>
      <div className="kai-card-header" style={{ background: '#FEF2F2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} style={{ color: '#DC2626' }} />
          <h6 style={{ margin: 0, color: '#991B1B' }}>Accountability Alerts</h6>
          {summary?.criticalCount > 0 && (
            <span className="kai-badge danger" style={{ fontSize: 10 }}>{summary.criticalCount} critical</span>
          )}
        </div>
      </div>
      <div className="kai-card-body" style={{ padding: 0 }}>
        {alerts.slice(0, 5).map((alert) => {
          const style = SEVERITY_STYLES[alert.severity];
          return (
            <div key={alert.id} style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--kai-border-light)',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{style.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--kai-text)' }}>
                  {alert.type === 'blocking' ? (
                    <>
                      <strong style={{ color: '#DC2626' }}>You are blocking</strong>{' '}
                      <span style={{ cursor: 'pointer', color: 'var(--kai-primary)', fontWeight: 600 }}
                        onClick={() => navigate(`/profile/${alert.blocked.id}`)}>
                        {alert.blocked.name}
                      </span>
                      {' — complete '}
                      <strong>"{alert.blockerTask.title}"</strong>
                      {' so they can work on '}
                      <strong>"{alert.blockedTask.title}"</strong>
                      {alert.blockerTask.project && <span style={{ color: 'var(--kai-text-muted)' }}> ({alert.blockerTask.project})</span>}
                    </>
                  ) : (
                    <>
                      <span style={{ cursor: 'pointer', color: 'var(--kai-primary)', fontWeight: 600 }}
                        onClick={() => navigate(`/profile/${alert.blocker.id}`)}>
                        {alert.blocker.name}
                      </span>
                      {' hasn\'t completed '}
                      <strong>"{alert.blockerTask.title}"</strong>
                      {' which is blocking your task '}
                      <strong>"{alert.blockedTask.title}"</strong>
                    </>
                  )}
                </div>
                {alert.daysOverdue > 0 && (
                  <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12} /> {alert.daysOverdue} days overdue
                  </div>
                )}
              </div>
              {alert.type === 'blocked' && (
                <button
                  className="kai-btn kai-btn-outline kai-btn-sm"
                  onClick={() => handleNudge(alert)}
                  title={`Send reminder to ${alert.blocker.name}`}
                  style={{ flexShrink: 0 }}
                >
                  <Bell size={13} /> Nudge
                </button>
              )}
              {alert.type === 'blocking' && (
                <button
                  className="kai-btn kai-btn-primary kai-btn-sm"
                  onClick={() => navigate('/tasks')}
                  style={{ flexShrink: 0 }}
                >
                  <ArrowRight size={13} /> Do it
                </button>
              )}
            </div>
          );
        })}
      </div>
      {alerts.length > 5 && (
        <div className="kai-card-footer" style={{ textAlign: 'center' }}>
          <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => navigate('/tasks?view=blocked')}>
            View all {alerts.length} alerts
          </button>
        </div>
      )}
    </div>
  );
}
