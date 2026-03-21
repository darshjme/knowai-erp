import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { settingsApi, profileSetupApi } from '../services/api';
import {
  User, Shield, Bell, Palette, Save, Eye, EyeOff, Smartphone,
  Sun, Moon, Monitor, PanelLeft, PanelLeftClose, Loader2, Check,
  MapPin, Globe, Link2, Target, AlertCircle, Upload
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

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Japan', 'Singapore', 'UAE', 'Other',
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
    address: '', city: '', state: '', country: '', pincode: '',
    alternateEmail: '', about: '', dateOfBirth: '',
    linkedinUrl: '', twitterUrl: '', githubUrl: '', instagramUrl: '', websiteUrl: '',
    skills: '', companyEmail: '',
  });

  const [profileStatus, setProfileStatus] = useState({
    profileComplete: false,
    completionPercent: 0,
    daysRemaining: null,
  });

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, newPass: false, confirm: false });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [verificationDocs, setVerificationDocs] = useState([]);
  const [docUploading, setDocUploading] = useState({});

  const [notifications, setNotifications] = useState({
    emailNotifications: true, pushNotifications: true, weeklyDigest: false,
  });

  const [theme, setTheme] = useState('light');
  const [sidebarStyle, setSidebarStyle] = useState('expanded');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Settings' });
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchVerificationDocs();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch profile from /settings
      const { data } = await settingsApi.get();
      const s = data?.settings || data;
      if (s?.profile) setProfile(prev => ({ ...prev, ...s.profile }));
      if (s?.firstName) setProfile(prev => ({ ...prev, firstName: s.firstName, lastName: s.lastName || '', email: s.email || '', phone: s.phone || '', department: s.department || '', timezone: s.timezone || 'UTC' }));
      if (s?.twoFactorEnabled !== undefined) setTwoFactorEnabled(s.twoFactorEnabled);

      // Fetch profile-setup status for additional fields
      try {
        const psRes = await profileSetupApi.getStatus();
        const psData = psRes.data || psRes;
        setProfileStatus({
          profileComplete: psData.profileComplete || false,
          completionPercent: psData.completionPercent || 0,
          daysRemaining: psData.daysRemaining,
        });
        const p = psData.profile;
        if (p) {
          setProfile(prev => ({
            ...prev,
            firstName: p.firstName || prev.firstName,
            lastName: p.lastName || prev.lastName,
            email: p.email || prev.email,
            companyEmail: p.companyEmail || prev.companyEmail,
            phone: p.phone || prev.phone,
            department: p.department || prev.department,
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : prev.dateOfBirth,
            address: p.address || prev.address,
            city: p.city || prev.city,
            state: p.state || prev.state,
            country: p.country || prev.country,
            pincode: p.pincode || prev.pincode,
            alternateEmail: p.alternateEmail || prev.alternateEmail,
            about: p.about || prev.about,
            skills: p.skills || prev.skills,
            linkedinUrl: p.linkedinUrl || prev.linkedinUrl,
            twitterUrl: p.twitterUrl || prev.twitterUrl,
            githubUrl: p.githubUrl || prev.githubUrl,
            instagramUrl: p.instagramUrl || prev.instagramUrl,
            websiteUrl: p.websiteUrl || p.portfolioUrl || prev.websiteUrl,
          }));
          if (p.avatar) setAvatarUrl(p.avatar);
        }
      } catch {}

      // Fetch preferences from /settings/preferences
      try {
        const prefRes = await settingsApi.getPreferences();
        const prefs = prefRes.data;
        if (prefs?.theme) {
          setTheme(prefs.theme);
          document.documentElement.setAttribute('data-theme', prefs.theme);
        }
        if (prefs?.sidebarStyle) {
          setSidebarStyle(prefs.sidebarStyle);
          dispatch({ type: 'UI_SET_SIDEBAR_COLLAPSED', payload: prefs.sidebarStyle === 'compact' });
        }
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

    // Validate mandatory fields
    const mandatory = ['firstName', 'lastName', 'phone', 'address', 'city', 'country', 'about', 'alternateEmail'];
    const missing = mandatory.filter(f => !profile[f] || profile[f].trim() === '');
    if (missing.length > 0) {
      showMessage('error', `Please fill all required fields: ${missing.join(', ')}`);
      return;
    }

    if (profile.about && profile.about.trim().length < 50) {
      showMessage('error', 'About/Bio must be at least 50 characters');
      return;
    }

    setSaving(true);
    try {
      // Save to profile-setup API
      const saveData = { ...profile };
      delete saveData.email;
      delete saveData.companyEmail;
      delete saveData.timezone;
      await profileSetupApi.save(saveData);

      // Also save to settings API for basic fields
      await settingsApi.update({ section: 'profile', firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone, department: profile.department, timezone: profile.timezone });

      // Refresh status
      try {
        const psRes = await profileSetupApi.getStatus();
        const psData = psRes.data || psRes;
        setProfileStatus({
          profileComplete: psData.profileComplete || false,
          completionPercent: psData.completionPercent || 0,
          daysRemaining: psData.daysRemaining,
        });
      } catch {}

      showMessage('success', 'Profile updated successfully');
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwords.current) {
      showMessage('error', 'Current password is required');
      return;
    }
    if (passwords.newPass.length < 8) {
      showMessage('error', 'Password must be at least 8 characters');
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      showMessage('error', 'New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPass }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setPasswords({ current: '', newPass: '', confirm: '' });
      showMessage('success', 'Password changed successfully');
    } catch (err) {
      showMessage('error', err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    const action = twoFactorEnabled ? 'disable' : 'enable';
    setSaving(true);
    try {
      const res = await fetch('/api/auth/two-factor', {
        method: 'POST',
        body: JSON.stringify({ action }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update 2FA');
      setTwoFactorEnabled(!twoFactorEnabled);
      if (action === 'enable' && data.backupCodes) {
        setBackupCodes(data.backupCodes);
        setShowBackupModal(true);
      }
      showMessage('success', `Two-factor authentication ${action === 'enable' ? 'enabled' : 'disabled'}`);
    } catch (err) {
      showMessage('error', err.message || 'Failed to update 2FA');
    } finally {
      setSaving(false);
    }
  };

  const fetchVerificationDocs = async () => {
    try {
      const res = await fetch('/api/document-verification', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        const docs = data?.data || data?.documents || (Array.isArray(data) ? data : []);
        setVerificationDocs(docs);
      }
    } catch {}
  };

  const handleDocUpload = async (docType, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showMessage('error', 'File must be under 10MB');
      return;
    }
    setDocUploading(prev => ({ ...prev, [docType]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch('/api/files', { method: 'POST', body: fd, credentials: 'include' });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
      const fi = uploadData?.data || uploadData;
      const fileUrl = fi?.url || fi?.fileUrl || `/api/files/serve/${fi?.fileName || file.name}`;
      const fileName = fi?.originalName || fi?.fileName || file.name;
      const fileSize = fi?.size || file.size;

      const submitRes = await fetch('/api/document-verification', {
        method: 'POST',
        body: JSON.stringify({ action: 'submit', docType, fileName, fileUrl, fileSize }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error || 'Submission failed');
      showMessage('success', `${docType} submitted for verification`);
      fetchVerificationDocs();
    } catch (err) {
      showMessage('error', err.message || 'Failed to upload document');
    } finally {
      setDocUploading(prev => ({ ...prev, [docType]: false }));
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { label: '', color: 'transparent', percent: 0 };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { label: 'Weak', color: '#DC2626', percent: 33 };
    if (score <= 2) return { label: 'Medium', color: '#D97706', percent: 66 };
    return { label: 'Strong', color: '#16A34A', percent: 100 };
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
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem('knowai-theme', t);
      dispatch({ type: 'UI_SET_THEME', payload: t });
    }
    if (newSidebar) {
      setSidebarStyle(sb);
      dispatch({ type: 'UI_SET_SIDEBAR_COLLAPSED', payload: sb === 'compact' });
    }
    try {
      await settingsApi.updatePreferences({ theme: t, sidebarStyle: sb });
      showMessage('success', 'Appearance updated');
    } catch (err) {
      showMessage('error', err.response?.data?.error || 'Failed to update appearance');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showMessage('error', 'Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { showMessage('error', 'Image must be under 5MB'); return; }
    try {
      setAvatarUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch('/api/files', { method: 'POST', body: fd, credentials: 'include' });
      const uploadData = await uploadRes.json();
      const fi = uploadData?.data || uploadData;
      const url = fi?.url || fi?.fileUrl || `/api/files/serve/${fi?.fileName || file.name}`;
      setAvatarUrl(url);
      // Save avatar URL to profile
      await profileSetupApi.save({ avatar: url });
      // Update redux store
      const saved = localStorage.getItem('knowai-user');
      if (saved) {
        const u = JSON.parse(saved);
        u.avatar = url;
        localStorage.setItem('knowai-user', JSON.stringify(u));
        dispatch({ type: 'AUTH_SUCCESS', payload: u });
      }
      showMessage('success', 'Profile picture updated');
    } catch (err) {
      showMessage('error', 'Failed to upload profile picture');
    } finally { setAvatarUploading(false); }
  };

  const RequiredMark = () => <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>;

  const SectionHeader = ({ icon: Icon, title, subtitle, optional }) => (
    <div style={{ marginBottom: 20, marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Icon size={18} style={{ color: '#3B82F6' }} />
        <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h4>
        {optional && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 8 }}>Optional</span>}
      </div>
      {subtitle && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 0 26px' }}>{subtitle}</p>}
    </div>
  );

  const ToggleSwitch = ({ checked, onChange, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #E8EBED' }}>
      <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
      <button type="button" onClick={onChange} style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? '#111827' : '#CBD5E0', position: 'relative', transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: checked ? 22 : 2,
          width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-card)',
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
        style={{ position: 'absolute', right: 12, top: 32, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
        {showPasswords[field] ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#111827' }} />
      </div>
    );
  }

  return (
    <div data-testid="settings-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)] m-0">Settings</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Manage your account preferences and configuration</p>
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
                  background: active ? 'rgba(124,58,237,0.08)' : 'transparent',
                  color: active ? '#111827' : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 400, fontSize: 14, textAlign: 'left', marginBottom: 2,
                }}>
                  <Icon size={18} />
                  {tab.label}
                  {tab.key === 'profile' && !profileStatus.profileComplete && (
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', background: '#DC2626',
                      marginLeft: 'auto', flexShrink: 0,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {activeTab === 'profile' && (
            <div className="kai-card">
              <div className="kai-card-body">
                {/* Completion Status Bar */}
                <div style={{
                  background: profileStatus.profileComplete ? '#F0FDF4' : '#FFFBEB',
                  border: `1px solid ${profileStatus.profileComplete ? '#BBF7D0' : '#FDE68A'}`,
                  borderRadius: 10, padding: '14px 18px', marginBottom: 24,
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  {profileStatus.profileComplete
                    ? <Check size={20} color="#16A34A" />
                    : <AlertCircle size={20} color="#D97706" />
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: profileStatus.profileComplete ? '#166534' : '#92400E' }}>
                        {profileStatus.profileComplete ? 'Profile Complete' : 'Profile Incomplete'}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: profileStatus.profileComplete ? '#16A34A' : '#D97706' }}>
                        {profileStatus.completionPercent}%
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: profileStatus.profileComplete ? '#DCFCE7' : '#FEF3C7', overflow: 'hidden' }}>
                      <div style={{
                        width: `${profileStatus.completionPercent}%`, height: '100%', borderRadius: 3,
                        background: profileStatus.profileComplete ? '#16A34A' : '#D97706',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    {profileStatus.daysRemaining !== null && !profileStatus.profileComplete && (
                      <p style={{ fontSize: 11, color: '#92400E', margin: '6px 0 0 0' }}>
                        {profileStatus.daysRemaining} day{profileStatus.daysRemaining !== 1 ? 's' : ''} remaining to complete your profile
                      </p>
                    )}
                  </div>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Profile Information</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Update your personal details and contact information. Fields marked with <span style={{ color: '#DC2626' }}>*</span> are mandatory.</p>

                {/* Profile Picture */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: 20, background: 'var(--bg-elevated)', borderRadius: 12 }}>
                  <div style={{ position: 'relative' }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #7C3AED' }} />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 700, border: '3px solid #7C3AED' }}>
                        {(profile.firstName?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <label htmlFor="avatar-upload" style={{
                      position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: '50%',
                      background: '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', border: '2px solid var(--bg-card)', fontSize: 12,
                    }}>
                      {avatarUploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <span style={{ fontSize: 14 }}>&#9998;</span>}
                    </label>
                    <input id="avatar-upload" type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>{profile.firstName} {profile.lastName}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{profile.companyEmail || profile.email}</div>
                    <button type="button" onClick={() => document.getElementById('avatar-upload')?.click()}
                      style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                      Change Photo
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile}>
                  {/* Section 1: Personal Information */}
                  <SectionHeader icon={User} title="Personal Information" subtitle="Basic info about you" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
                    <div>
                      <label className="kai-label">First Name<RequiredMark /></label>
                      <input className="kai-input" value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="kai-label">Last Name<RequiredMark /></label>
                      <input className="kai-input" value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="kai-label">Company Email</label>
                      <input className="kai-input" type="email" value={profile.companyEmail || profile.email} disabled style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-generated @knowai.biz email</span>
                    </div>
                    <div>
                      <label className="kai-label">Alternate Email<RequiredMark /></label>
                      <input className="kai-input" type="email" value={profile.alternateEmail} onChange={e => setProfile(p => ({ ...p, alternateEmail: e.target.value }))} placeholder="personal@example.com" required />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Personal email for account recovery</span>
                    </div>
                    <div>
                      <label className="kai-label">Phone Number<RequiredMark /></label>
                      <input className="kai-input" type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" required />
                    </div>
                    <div>
                      <label className="kai-label">Date of Birth</label>
                      <input className="kai-input" type="date" value={profile.dateOfBirth} onChange={e => setProfile(p => ({ ...p, dateOfBirth: e.target.value }))} />
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

                  {/* Section 2: Address */}
                  <SectionHeader icon={MapPin} title="Address" subtitle="Your residential address" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="kai-label">Address Line<RequiredMark /></label>
                      <input className="kai-input" value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} placeholder="123 Main Street, Apt 4B" required />
                    </div>
                    <div>
                      <label className="kai-label">City<RequiredMark /></label>
                      <input className="kai-input" value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" required />
                    </div>
                    <div>
                      <label className="kai-label">State</label>
                      <input className="kai-input" value={profile.state} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))} placeholder="Maharashtra" />
                    </div>
                    <div>
                      <label className="kai-label">Country<RequiredMark /></label>
                      <select className="kai-input" value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} required>
                        <option value="">Select country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="kai-label">Pincode</label>
                      <input className="kai-input" value={profile.pincode} onChange={e => setProfile(p => ({ ...p, pincode: e.target.value }))} placeholder="400001" />
                    </div>
                  </div>

                  {/* Section 3: About */}
                  <SectionHeader icon={User} title="About" subtitle="Tell us about yourself (min 50 characters)" />
                  <div style={{ marginBottom: 28 }}>
                    <label className="kai-label">About / Bio<RequiredMark /></label>
                    <textarea
                      className="kai-input"
                      value={profile.about}
                      onChange={e => setProfile(p => ({ ...p, about: e.target.value }))}
                      placeholder="Tell us about yourself, your experience, interests, and what drives you..."
                      required
                      rows={4}
                      style={{ resize: 'vertical', minHeight: 100 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: (profile.about?.length || 0) < 50 ? '#DC2626' : '#16A34A' }}>
                        {profile.about?.length || 0} / 50 minimum characters
                      </span>
                    </div>
                  </div>

                  {/* Section 4: Social Profiles */}
                  <SectionHeader icon={Link2} title="Social Profiles" subtitle="Connect your social accounts" optional />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
                    <div>
                      <label className="kai-label">LinkedIn URL</label>
                      <input className="kai-input" value={profile.linkedinUrl} onChange={e => setProfile(p => ({ ...p, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/username" />
                    </div>
                    <div>
                      <label className="kai-label">Twitter / X URL</label>
                      <input className="kai-input" value={profile.twitterUrl} onChange={e => setProfile(p => ({ ...p, twitterUrl: e.target.value }))} placeholder="https://x.com/username" />
                    </div>
                    <div>
                      <label className="kai-label">GitHub URL</label>
                      <input className="kai-input" value={profile.githubUrl} onChange={e => setProfile(p => ({ ...p, githubUrl: e.target.value }))} placeholder="https://github.com/username" />
                    </div>
                    <div>
                      <label className="kai-label">Instagram URL</label>
                      <input className="kai-input" value={profile.instagramUrl} onChange={e => setProfile(p => ({ ...p, instagramUrl: e.target.value }))} placeholder="https://instagram.com/username" />
                    </div>
                    <div>
                      <label className="kai-label">Portfolio / Website URL</label>
                      <input className="kai-input" value={profile.websiteUrl} onChange={e => setProfile(p => ({ ...p, websiteUrl: e.target.value }))} placeholder="https://yoursite.com" />
                    </div>
                  </div>

                  {/* Section 5: Skills */}
                  <SectionHeader icon={Target} title="Skills" subtitle="Your professional skills (comma separated)" optional />
                  <div style={{ marginBottom: 28 }}>
                    <label className="kai-label">Skills</label>
                    <input className="kai-input" value={profile.skills} onChange={e => setProfile(p => ({ ...p, skills: e.target.value }))} placeholder="React, Node.js, Figma, Python, etc." />
                  </div>

                  <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button type="submit" className="kai-btn kai-btn-primary" disabled={saving}>
                      {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                      <span style={{ marginLeft: 6 }}>{saving ? 'Saving...' : 'Save Profile'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Password Change Section */}
              <div className="kai-card">
                <div className="kai-card-body">
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Change Password</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Ensure your account is using a strong, unique password</p>
                  <form onSubmit={handleChangePassword} style={{ maxWidth: 420 }}>
                    <PasswordField label="Current Password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} field="current" />
                    <PasswordField label="New Password (min 8 characters)" value={passwords.newPass} onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))} field="newPass" />
                    {passwords.newPass && (() => {
                      const strength = getPasswordStrength(passwords.newPass);
                      return (
                        <div style={{ marginTop: -12, marginBottom: 20 }}>
                          <div style={{ height: 4, borderRadius: 2, background: 'var(--border-default)', overflow: 'hidden', marginBottom: 4 }}>
                            <div style={{ width: `${strength.percent}%`, height: '100%', borderRadius: 2, background: strength.color, transition: 'width 0.3s ease' }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 500, color: strength.color }}>Password strength: {strength.label}</span>
                        </div>
                      );
                    })()}
                    <PasswordField label="Confirm New Password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} field="confirm" />
                    {passwords.confirm && passwords.newPass !== passwords.confirm && (
                      <p style={{ fontSize: 12, color: '#DC2626', marginTop: -12, marginBottom: 16 }}>Passwords do not match</p>
                    )}
                    <button type="submit" className="kai-btn kai-btn-primary" disabled={saving}>
                      {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> <span style={{ marginLeft: 6 }}>Changing...</span></> : 'Change Password'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Two-Factor Authentication Section */}
              <div className="kai-card">
                <div className="kai-card-body">
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Two-Factor Authentication</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Add an extra layer of security to your account</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: twoFactorEnabled ? 'rgba(22,163,74,0.1)' : 'var(--bg-elevated)' }}>
                      <Shield size={24} style={{ color: twoFactorEnabled ? '#16A34A' : 'var(--text-muted)' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Two-Factor Authentication</span>
                        <span className="kai-badge" style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 8,
                          background: twoFactorEnabled ? 'rgba(22,163,74,0.1)' : 'var(--bg-elevated)',
                          color: twoFactorEnabled ? '#16A34A' : 'var(--text-muted)',
                          fontWeight: 600,
                        }}>
                          {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {twoFactorEnabled ? 'Your account is secured with 2FA' : 'Enable 2FA for enhanced security'}
                      </div>
                    </div>
                    <button onClick={handleToggle2FA}
                      className={`kai-btn ${twoFactorEnabled ? '' : 'kai-btn-primary'}`}
                      disabled={saving}
                      style={twoFactorEnabled ? { background: 'rgba(220,38,38,0.1)', color: '#DC2626', border: '1px solid rgba(220,38,38,0.2)' } : {}}>
                      {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : (twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Backup Codes Modal */}
              {showBackupModal && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 9999,
                }} onClick={() => setShowBackupModal(false)}>
                  <div className="kai-card" style={{ maxWidth: 480, width: '90%', margin: 20 }} onClick={e => e.stopPropagation()}>
                    <div className="kai-card-body" style={{ padding: 28 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <Shield size={20} style={{ color: '#16A34A' }} />
                        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Save Your Backup Codes</h3>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
                        Store these backup codes in a safe place. You can use them to access your account if you lose your two-factor authentication device. Each code can only be used once.
                      </p>
                      <div style={{
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 10, padding: 16,
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20,
                      }}>
                        {backupCodes.map((code, i) => (
                          <div key={i} style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', padding: '4px 0', textAlign: 'center' }}>
                            {code}
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                        <button
                          className="kai-btn"
                          onClick={() => {
                            const text = backupCodes.join('\n');
                            navigator.clipboard.writeText(text).then(() => showMessage('success', 'Backup codes copied to clipboard'));
                          }}
                          style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                        >
                          Copy Codes
                        </button>
                        <button className="kai-btn kai-btn-primary" onClick={() => setShowBackupModal(false)}>
                          I have saved these codes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Identity Verification Section */}
              <div className="kai-card">
                <div className="kai-card-body">
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Identity Verification</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Verify your identity by uploading official documents</p>

                  {/* Verification Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, padding: '12px 16px', borderRadius: 10, background: 'var(--bg-elevated)' }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Verification Status:</span>
                    {verificationDocs.length > 0 && verificationDocs.every(d => d.status === 'Approved') ? (
                      <span className="kai-badge" style={{ background: 'rgba(22,163,74,0.1)', color: '#16A34A', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check size={14} /> Verified
                      </span>
                    ) : (
                      <span className="kai-badge" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                        Not verified
                      </span>
                    )}
                  </div>

                  {/* Document Upload Areas */}
                  {(() => {
                    const country = profile.country || 'India';
                    const TAX_DOCS = {
                      'India': { type: 'PAN_CARD', label: 'PAN Card', desc: 'Permanent Account Number' },
                      'United States': { type: 'SSN_CARD', label: 'SSN Card', desc: 'Social Security Number' },
                      'United Kingdom': { type: 'NI_NUMBER', label: 'NI Number', desc: 'National Insurance Number' },
                      'Canada': { type: 'SIN_CARD', label: 'SIN Card', desc: 'Social Insurance Number' },
                      'UAE': { type: 'EMIRATES_ID', label: 'Emirates ID', desc: 'UAE National ID' },
                      'Singapore': { type: 'NRIC', label: 'NRIC', desc: 'National Registration Identity Card' },
                      'Australia': { type: 'TFN', label: 'TFN', desc: 'Tax File Number' },
                    };
                    const taxDoc = TAX_DOCS[country] || { type: 'TAX_ID', label: 'Tax ID', desc: 'Government tax identification' };
                    return [
                      { type: 'PASSPORT', label: 'Government ID', description: 'Passport, National ID, Driver\'s License, or Aadhaar' },
                      { type: taxDoc.type, label: taxDoc.label, description: taxDoc.desc },
                    ];
                  })().map(doc => {
                    const existingDoc = verificationDocs.find(d => d.docType === doc.type || d.docType === doc.label);
                    const isUploading = docUploading[doc.type] || docUploading[doc.label];
                    const statusColors = {
                      Pending: { bg: 'rgba(217,119,6,0.1)', color: '#D97706' },
                      Approved: { bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
                      Rejected: { bg: 'rgba(220,38,38,0.1)', color: '#DC2626' },
                      Resubmit: { bg: 'rgba(217,119,6,0.1)', color: '#D97706' },
                    };

                    return (
                      <div key={doc.type} style={{
                        border: '1px solid var(--border-default)', borderRadius: 12, padding: 20, marginBottom: 16,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{doc.label || doc.type}</span>
                              {existingDoc && (
                                <span className="kai-badge" style={{
                                  background: (statusColors[existingDoc.status] || statusColors.Pending).bg,
                                  color: (statusColors[existingDoc.status] || statusColors.Pending).color,
                                  padding: '2px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                }}>
                                  {existingDoc.status}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, marginBottom: 8 }}>{doc.description}</p>
                            {existingDoc?.fileName && (
                              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                                Uploaded: {existingDoc.fileName}
                              </p>
                            )}
                            {existingDoc?.reviewerNote && (
                              <p style={{ fontSize: 12, color: (statusColors[existingDoc.status] || statusColors.Pending).color, margin: '6px 0 0 0', fontWeight: 500 }}>
                                Note: {existingDoc.reviewerNote}
                              </p>
                            )}
                          </div>
                          <div>
                            <label style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                hidden
                                disabled={isUploading}
                                onChange={e => {
                                  handleDocUpload(doc.type, e.target.files?.[0]);
                                  e.target.value = '';
                                }}
                              />
                              <span className="kai-btn" style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                border: '1px solid var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-primary)',
                                pointerEvents: isUploading ? 'none' : 'auto', opacity: isUploading ? 0.6 : 1,
                                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                              }}>
                                {isUploading
                                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...</>
                                  : <><Upload size={14} /> {existingDoc && (existingDoc.status === 'Rejected' || existingDoc.status === 'Resubmit') ? 'Re-upload' : existingDoc ? 'Replace' : 'Upload'}</>
                                }
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="kai-card">
              <div className="kai-card-body">
                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Notification Preferences</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Choose how and when you want to be notified</p>
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
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Theme</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Select your preferred color scheme</p>
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
                          border: `2px solid ${active ? '#111827' : 'var(--border-default)'}`,
                          background: active ? 'rgba(124,58,237,0.08)' : 'var(--bg-card)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        }}>
                          <Icon size={24} style={{ color: active ? '#7C3AED' : 'var(--text-secondary)' }} />
                          <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#111827' : 'var(--text-secondary)' }}>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="kai-card">
                <div className="kai-card-body">
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Sidebar Style</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>Choose your sidebar layout preference</p>
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
                          border: `2px solid ${active ? '#111827' : 'var(--border-default)'}`,
                          background: active ? 'rgba(124,58,237,0.08)' : 'var(--bg-card)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        }}>
                          <Icon size={24} style={{ color: active ? '#7C3AED' : 'var(--text-secondary)' }} />
                          <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#111827' : 'var(--text-secondary)' }}>{opt.label}</span>
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
