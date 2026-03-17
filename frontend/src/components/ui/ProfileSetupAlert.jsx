import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { profileSetupApi } from '../../services/api';
import { AlertTriangle, Clock, CheckCircle, ArrowRight, X } from 'lucide-react';

export default function ProfileSetupAlert() {
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchStatus();
  }, [user]);

  const fetchStatus = async () => {
    try {
      const res = await profileSetupApi.getStatus();
      const data = res.data || res;
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch profile status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !status || status.profileComplete || dismissed) return null;

  const daysRemaining = status.daysRemaining ?? 14;
  const completionPercent = status.completionPercent ?? 0;
  const isUrgent = daysRemaining <= 3;

  const bgColor = isUrgent ? '#FEF2F2' : '#FFFBEB';
  const borderColor = isUrgent ? '#FCA5A5' : '#FCD34D';
  const textColor = isUrgent ? '#991B1B' : '#92400E';
  const accentColor = isUrgent ? '#DC2626' : '#D97706';
  const barBg = isUrgent ? '#FECACA' : '#FDE68A';
  const barFill = isUrgent ? '#DC2626' : '#D97706';

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: '16px 20px',
      margin: '0 0 20px 0',
      position: 'relative',
    }}>
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute', top: 12, right: 12,
          background: 'none', border: 'none', cursor: 'pointer',
          color: textColor, opacity: 0.6,
        }}
        title="Dismiss"
      >
        <X size={16} />
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: isUrgent ? '#FEE2E2' : '#FEF3C7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {isUrgent ? <AlertTriangle size={20} color="#DC2626" /> : <Clock size={20} color="#D97706" />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: textColor }}>
              {isUrgent ? 'Urgent: Complete Your Profile!' : 'Complete Your Profile Setup'}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px',
              borderRadius: 10, background: accentColor, color: '#fff',
            }}>
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
            </span>
          </div>

          <p style={{ fontSize: 13, color: textColor, opacity: 0.85, margin: '0 0 10px 0', lineHeight: 1.4 }}>
            {isUrgent
              ? 'Your account will be disabled if you do not complete your profile. Fill all required fields now.'
              : 'Complete your profile setup to keep your account active. All mandatory fields must be filled.'}
          </p>

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              flex: 1, height: 8, borderRadius: 4,
              background: barBg, overflow: 'hidden',
            }}>
              <div style={{
                width: `${completionPercent}%`,
                height: '100%',
                borderRadius: 4,
                background: barFill,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: accentColor, whiteSpace: 'nowrap' }}>
              {completionPercent}% complete
            </span>
          </div>

          <button
            onClick={() => navigate('/settings')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: accentColor, color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Complete Now <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
