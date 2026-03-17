import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { settingsApi } from '../services/api';
import {
  User, Shield, Bell, Palette, Save, Eye, EyeOff, Smartphone,
  Sun, Moon, Monitor, PanelLeft, PanelLeftClose, Loader2, Check
} from 'lucide-react';

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'appearance', label: 'Appearance', icon: Palette },
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney',
];

export default function Settings() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [profile, setProfile] = useState({
    firstName: '', lastName: '', email: '', phone: '', department: '', timezone: 'UTC',
  });

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const [notifications, setNotifications] = useState({
    emailNotifications: true, pushNotifications: true, weeklyDigest: false,
  });

  const [theme, setTheme] = useState('light');
  const [sidebarStyle, setSidebarStyle] = useState('expanded');

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Settings' });
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch profile from /settings
      const { data } = await settingsApi.get();
      const s = data?.settings || data;
      if (s?.profile) setProfile(prev => ({ ...prev, ...s.profile }));
      if (s?.firstName) setProfile(prev => ({ ...prev, firstName: s.firstName, lastName: s.lastName || '', email: s.email || '', phone: s.phone || '', department: s.department || '', timezone: s.timezone || 'UTC' }));
      if (s?.twoFactorEnabled !== undefined) setTwoFactorEnabled(s.twoFactorEnabled);

      // Fetch preferences from /settings/preferences
      try {
        const prefRes = await settingsApi.getPreferences();
        const prefs = prefRes.data;
        if (prefs?.theme) {
          setTheme(prefs.theme);
          document.documentElement.setAttribute('data-theme', prefs.theme);
        }
        if (prefs?.sidebarStyle) setSidebarStyle(prefs.sidebarStyle);
        if (prefs?.emailNotifications !== undefined) setNotifications(prev => ({
          ...prev,
          email: prefs.emailNotifications,
          push: prefs.pushNotifications,
          digest: prefs.weeklyDigest,
        }));
      } catch {}
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, msg) => {
    if (type === 'success') { setSuccess(msg); setError(''); }
    else { setError(msg); setSuccess(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update({ section: 'profile', ...profile });
      showMessage('success', 'Profile updated successfully');
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) {
      showMessage('error', 'New passwords do not match');
      return;
    }
    if (passwords.newPass.length < 8) {
      showMessage('error', 'Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      await settingsApi.update({
        section: 'security', currentPassword: passwords.current, newPassword: passwords.newPass,
      });
      setPasswords({ current: '', newPass: '', confirm: '' });
      showMessage('success', 'Password changed successfully');
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    setSaving(true);
    try {
      await settingsApi.update({ section: 'security', twoFactorEnabled: !twoFactorEnabled });
      setTwoFactorEnabled(!twoFactorEnabled);
      showMessage('success', `Two-factor authentication ${!twoFactorEnabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to update 2FA');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await settingsApi.update({ section: 'notifications', ...notifications });
      showMessage('success', 'Notification preferences saved');
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to update notifications');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppearance = async (newTheme, newSidebar) => {
    const t = newTheme || theme;
    const sb = newSidebar || sidebarStyle;
    if (newTheme) {
      setTheme(t);
      // Apply theme immediately to DOM
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('knowai-theme', t);
      dispatch({ type: 'UI_SET_THEME', payload: t });
    }
    if (newSidebar) {
      setSidebarStyle(sb);
      // Sync Redux sidebar state with the chosen style
      if (sb === 'collapsed') {
        dispatch({ type: 'UI_SET_SIDEBAR_COLLAPSED', payload: true });
      } else {
        dispatch({ type: 'UI_SET_SIDEBAR_COLLAPSED', payload: false });
      }
    }
    try {
      await settingsApi.updatePreferences({ theme: t, sidebarStyle: sb });
      showMessage('success', 'Appearance updated');
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to update appearance');
    }
  };

  const ToggleSwitch = ({ checked, onChange, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #E8EBED' }}>
      <span style={{ fontSize: 14, color: '#10222F', fontWeight: 500 }}>{label}</span>
      <button type="button" onClick={onChange} style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? '#146DF7' : '#CBD5E0', position: 'relative', transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: checked ? 22 : 2,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }} />
      </button>
    </div>
  );

  const PasswordField = ({ label, value, onChange, field }) => (
    <div style={{ marginBottom: 20, position: 'relative' }}>
      <label className="kai-label">{label}</label>
      <input className="kai-input" type={showPasswords[field] ? 'text' : 'password'} value={value} onChange={onChange} required style={{ paddingRight: 42 }} />
      <button type="button" onClick={() => setShowPasswords(p => ({ ...p, [field]: !p[field] }))}
        style={{ position: 'absolute', right: 12, top: 32, background: 'none', border: 'none', cursor: 'pointer', color: '#5B6B76' }}>
        {showPasswords[field] ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#146DF7' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your account preferences and configuration</p>
        </div>
      </div>

      {(success || error) && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, fontWeight: 500,
          background: success ? '#d4edda' : '#f8d7da', color: success ? '#155724' : '#721c24',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {success && <Check size={16} />}
          {success || error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div className="kai-card" style={{ width: 220, flexShrink: 0, minWidth: 0 }}>
          <div className="kai-card-body" style={{ padding: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 14px', border: 'none', borderRadius: 8, cursor: 'pointer',
                  background: active ? '#EBF3FE' : 'transparent',
                  color: active ? '#146DF7' : '#4C5963',
                  fontWeight: active ? 600 : 400, fontSize: 14, textAlign: 'left', marginBottom: 2,
                }}>
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {activeTab === 'profile' && (
            <div className="kai-card">
              <div className="kai-card-body">
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#10222F', marginBottom: 4 }}>Profile Information</h3>
                <p style={{ color: '#5B6B76', fontSize: 13, marginBottom: 24 }}>Update your personal details and contact information</p>
                <form onSubmit={handleSaveProfile}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                    <div>
                      <label className="kai-label">First Name</label>
                      <input className="kai-input" value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="kai-label">Last Name</label>
                      <input className="kai-input" value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="kai-label">Email Address</label>
                      <input className="kai-input" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="kai-label">Phone Number</label>
                      <input className="kai-input" type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
                    </div>
                    <div>
                      <label className="kai-label">Department</label>
                      <input className="kai-input" value={profile.department} onChange={e => setProfile(p => ({ ...p, department: e.target.value }))} placeholder="Engineering" />
                    </div>
                    <div>
                      <label className="kai-label">Timezone</label>
                      <select className="kai-input" value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}>
                        {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="kai-btn kai-btn-primary" disabled={saving}>
                      {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                      <span style={{ marginLeft: 6 }}>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="kai-card">
                <div className="kai-card-body">
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#10222F', marginBottom: 4 }}>Change Password</h3>
                  <p style={{ color: '#5B6B76', fontSize: 13, marginBottom: 24 }}>Ensure your account is using a strong, unique password</p>
                  <form onSubmit={handleChangePassword} style={{ maxWidth: 420 }}>
                    <PasswordField label="Current Password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} field="current" />
                    <PasswordField label="New Password" value={passwords.newPass} onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))} field="newPass" />
                    <PasswordField label="Confirm New Password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} field="confirm" />
                    <button type="submit" className="kai-btn kai-btn-primary" disabled={saving}>
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              </div>
              <div className="kai-card">
                <div className="kai-card-body">
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#10222F', marginBottom: 4 }}>Two-Factor Authentication</h3>
                  <p style={{ color: '#5B6B76', fontSize: 13, marginBottom: 20 }}>Add an extra layer of security to your account</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Smartphone size={32} style={{ color: '#146DF7' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#10222F' }}>
                        {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                      <div style={{ fontSize: 13, color: '#5B6B76' }}>
                        {twoFactorEnabled ? 'Your account is secured with 2FA' : 'Enable 2FA for enhanced security'}
                      </div>
                    </div>
                    <button onClick={handleToggle2FA}
                      className={`kai-btn ${twoFactorEnabled ? '' : 'kai-btn-primary'}`}
                      disabled={saving}
                      style={twoFactorEnabled ? { background: '#f8d7da', color: '#721c24', border: 'none' } : {}}>
                      {twoFactorEnabled ? 'Disable' : 'Enable'} 2FA
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="kai-card">
              <div className="kai-card-body">
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#10222F', marginBottom: 4 }}>Notification Preferences</h3>
                <p style={{ color: '#5B6B76', fontSize: 13, marginBottom: 24 }}>Choose how and when you want to be notified</p>
                <div style={{ maxWidth: 480 }}>
                  <ToggleSwitch label="Email Notifications" checked={notifications.emailNotifications}
                    onChange={() => setNotifications(n => ({ ...n, emailNotifications: !n.emailNotifications }))} />
                  <ToggleSwitch label="Push Notifications" checked={notifications.pushNotifications}
                    onChange={() => setNotifications(n => ({ ...n, pushNotifications: !n.pushNotifications }))} />
                  <ToggleSwitch label="Weekly Digest" checked={notifications.weeklyDigest}
                    onChange={() => setNotifications(n => ({ ...n, weeklyDigest: !n.weeklyDigest }))} />
                </div>
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleSaveNotifications} className="kai-btn kai-btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="kai-card">
                <div className="kai-card-body">
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#10222F', marginBottom: 4 }}>Theme</h3>
                  <p style={{ color: '#5B6B76', fontSize: 13, marginBottom: 24 }}>Select your preferred color scheme</p>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[
                      { key: 'light', label: 'Light', icon: Sun },
                      { key: 'dark', label: 'Dark', icon: Moon },
                      { key: 'system', label: 'System', icon: Monitor },
                    ].map(opt => {
                      const Icon = opt.icon;
                      const active = theme === opt.key;
                      return (
                        <button key={opt.key} onClick={() => handleSaveAppearance(opt.key, null)} style={{
                          flex: 1, padding: '20px 16px', borderRadius: 12, cursor: 'pointer',
                          border: `2px solid ${active ? '#146DF7' : '#E8EBED'}`,
                          background: active ? '#EBF3FE' : '#fff',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        }}>
                          <Icon size={24} style={{ color: active ? '#146DF7' : '#5B6B76' }} />
                          <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#146DF7' : '#4C5963' }}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="kai-card">
                <div className="kai-card-body">
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#10222F', marginBottom: 4 }}>Sidebar Style</h3>
                  <p style={{ color: '#5B6B76', fontSize: 13, marginBottom: 24 }}>Choose your sidebar layout preference</p>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[
                      { key: 'expanded', label: 'Expanded', icon: PanelLeft },
                      { key: 'compact', label: 'Compact', icon: PanelLeftClose },
                    ].map(opt => {
                      const Icon = opt.icon;
                      const active = sidebarStyle === opt.key;
                      return (
                        <button key={opt.key} onClick={() => handleSaveAppearance(null, opt.key)} style={{
                          flex: 1, maxWidth: 200, padding: '20px 16px', borderRadius: 12, cursor: 'pointer',
                          border: `2px solid ${active ? '#146DF7' : '#E8EBED'}`,
                          background: active ? '#EBF3FE' : '#fff',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        }}>
                          <Icon size={24} style={{ color: active ? '#146DF7' : '#5B6B76' }} />
                          <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#146DF7' : '#4C5963' }}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
