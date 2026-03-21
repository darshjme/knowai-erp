import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { accountabilityApi } from '../../services/api';
import { AlertTriangle, ArrowRight, Bell, Shield, Clock, User } from 'lucide-react';
import { toast } from 'react-toastify';

const SEVERITY_STYLES = {
  critical: { bg: 'bg-red-50', border: 'border-red-300', color: 'text-red-800', icon: '🔴' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-300', color: 'text-amber-800', icon: '🟡' },
  info: { bg: 'bg-blue-50', border: 'border-blue-300', color: 'text-blue-800', icon: '🔵' },
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
    <div className="bg-[var(--bg-card)] border border-red-300 rounded-xl" data-testid="accountability-widget">
      <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-t-xl border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-red-600" />
          <h6 className="m-0 text-red-800 dark:text-red-300 font-semibold text-sm">Accountability Alerts</h6>
          {summary?.criticalCount > 0 && (
            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-semibold">{summary.criticalCount} critical</span>
          )}
        </div>
      </div>
      <div>
        {alerts.slice(0, 5).map((alert) => {
          const style = SEVERITY_STYLES[alert.severity];
          return (
            <div key={alert.id} className="px-4 py-3 border-b border-[var(--border-subtle)] flex gap-3 items-start">
              <span className="text-base shrink-0 mt-0.5">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] leading-relaxed text-[var(--text-primary)]">
                  {alert.type === 'blocking' ? (
                    <>
                      <strong className="text-red-600">You are blocking</strong>{' '}
                      <span className="cursor-pointer text-[#7C3AED] font-semibold"
                        onClick={() => navigate(`/profile/${alert.blocked.id}`)}>
                        {alert.blocked.name}
                      </span>
                      {' — complete '}
                      <strong>"{alert.blockerTask.title}"</strong>
                      {' so they can work on '}
                      <strong>"{alert.blockedTask.title}"</strong>
                      {alert.blockerTask.project && <span className="text-[var(--text-muted)]"> ({alert.blockerTask.project})</span>}
                    </>
                  ) : (
                    <>
                      <span className="cursor-pointer text-[#7C3AED] font-semibold"
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
                  <div className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                    <Clock size={12} /> {alert.daysOverdue} days overdue
                  </div>
                )}
              </div>
              {alert.type === 'blocked' && (
                <button
                  data-testid={`nudge-${alert.id}`}
                  className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1.5 text-[12px] font-medium hover:bg-[var(--bg-elevated)] transition-colors inline-flex items-center gap-1 shrink-0"
                  onClick={() => handleNudge(alert)}
                  title={`Send reminder to ${alert.blocker.name}`}
                >
                  <Bell size={13} /> Nudge
                </button>
              )}
              {alert.type === 'blocking' && (
                <button
                  data-testid={`do-it-${alert.id}`}
                  className="bg-[#7C3AED] text-white rounded-lg px-3 py-1.5 text-[12px] font-semibold hover:bg-[#7C3AED]/90 transition-colors inline-flex items-center gap-1 shrink-0"
                  onClick={() => navigate('/tasks')}
                >
                  <ArrowRight size={13} /> Do it
                </button>
              )}
            </div>
          );
        })}
      </div>
      {alerts.length > 5 && (
        <div className="px-4 py-3 text-center border-t border-[var(--border-default)]">
          <button
            className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-1.5 text-[12px] font-medium hover:bg-[var(--bg-elevated)] transition-colors"
            onClick={() => navigate('/tasks?view=blocked')}
          >
            View all {alerts.length} alerts
          </button>
        </div>
      )}
    </div>
  );
}
