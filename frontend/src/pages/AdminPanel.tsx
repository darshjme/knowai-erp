import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Shield, LayoutDashboard, Palette, Mail, HardDrive, Building2,
  Lock, Plug, Users, Activity, Server, Database, Globe, Eye, EyeOff,
  RefreshCw, CheckCircle, XCircle, Send, TestTube, Save, Search,
  ChevronRight, TrendingUp, FileText, MessageSquare, Zap
} from 'lucide-react';
import { adminApi } from '../services/api';

const ADMIN_ROLES = ['CTO', 'CEO', 'ADMIN'];

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'email', label: 'Email Server', icon: Mail },
  { id: 'storage', label: 'File Storage', icon: HardDrive },
  { id: 'company', label: 'Company Info', icon: Building2 },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'users', label: 'Users & Roles', icon: Users },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { user } = useSelector((s) => s.auth);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [config, setConfig] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canAccess = user && ADMIN_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, statsRes] = await Promise.all([
        adminApi.getConfig(),
        adminApi.getStats(),
      ]);
      const cd = configRes.data;
      const configData = cd?.data || cd || {};
      setConfig(configData);

      const sd = statsRes.data;
      const statsData = sd?.data || sd || {};
      setStats(statsData);
    } catch (err) {
      toast.error('Failed to load admin data: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const saveSection = async (section, fields) => {
    setSaving(true);
    try {
      const configs = {};
      for (const [field, value] of Object.entries(fields)) {
        configs[`${section}.${field}`] = value;
      }
      await adminApi.saveConfig({ configs });
      toast.success('Configuration saved successfully!');
      await loadData();
    } catch (err) {
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const getSection = (section) => config[section] || {};

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, #146DF7 0%, #0D4FBF 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Shield size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#10222F' }}>Admin Panel</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>System configuration and management</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Tab Nav */}
        <div style={{
          width: 220, flexShrink: 0,
          background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
          padding: '8px', height: 'fit-content', position: 'sticky', top: 80,
        }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: isActive ? '#146DF7' : 'transparent',
                  color: isActive ? '#fff' : '#374151',
                  fontSize: 14, fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.15s',
                  marginBottom: 2,
                }}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
                {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6B7280' }}>
              <RefreshCw size={32} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: 12 }}>Loading admin data...</p>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardTab stats={stats} onRefresh={loadData} />}
              {activeTab === 'branding' && <BrandingTab data={getSection('app')} onSave={(f) => saveSection('app', f)} saving={saving} />}
              {activeTab === 'email' && <EmailTab data={getSection('email')} onSave={(f) => saveSection('email', f)} saving={saving} />}
              {activeTab === 'storage' && <StorageTab data={getSection('storage')} onSave={(f) => saveSection('storage', f)} saving={saving} stats={stats} />}
              {activeTab === 'company' && <CompanyTab data={getSection('company')} onSave={(f) => saveSection('company', f)} saving={saving} />}
              {activeTab === 'security' && <SecurityTab data={getSection('security')} onSave={(f) => saveSection('security', f)} saving={saving} />}
              {activeTab === 'integrations' && <IntegrationsTab data={getSection('integrations')} notifs={getSection('notifications')} onSave={saveSection} saving={saving} />}
              {activeTab === 'users' && <UsersTab stats={stats} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function Card({ title, icon: Icon, children, style }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
      padding: 24, marginBottom: 16, ...style,
    }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {Icon && <Icon size={18} color="#146DF7" />}
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#10222F' }}>{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

function FormField({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF' }}>{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder, disabled, style: extraStyle }) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
        fontSize: 14, outline: 'none', transition: 'border-color 0.15s',
        background: disabled ? '#F3F4F6' : '#fff', ...extraStyle,
      }}
      onFocus={(e) => { e.target.style.borderColor = '#146DF7'; }}
      onBlur={(e) => { e.target.style.borderColor = '#D1D5DB'; }}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
        fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
      }}
      onFocus={(e) => { e.target.style.borderColor = '#146DF7'; }}
      onBlur={(e) => { e.target.style.borderColor = '#D1D5DB'; }}
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
          background: checked ? '#146DF7' : '#D1D5DB', transition: 'background 0.2s',
          position: 'relative',
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 10, background: '#fff',
          position: 'absolute', top: 2,
          left: checked ? 22 : 2, transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      {label && <span style={{ color: '#374151' }}>{label}</span>}
    </label>
  );
}

function SaveButton({ onClick, saving, label = 'Save Changes' }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 24px', borderRadius: 8, border: 'none',
        background: saving ? '#93C5FD' : '#146DF7', color: '#fff',
        fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <Save size={16} />
      {saving ? 'Saving...' : label}
    </button>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB',
      padding: '16px 20px', flex: '1 1 180px', minWidth: 180,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
        {Icon && <div style={{
          width: 32, height: 32, borderRadius: 8, background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon size={16} color={color} /></div>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#10222F' }}>{value ?? '---'}</div>
      {sub && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4,
        }}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

// ─── Tab: Dashboard ──────────────────────────────────────────────────────────

function DashboardTab({ stats, onRefresh }) {
  if (!stats) return <Card title="Dashboard"><p>No stats available.</p></Card>;

  const u = stats.users || {};
  const p = stats.projects || {};
  const t = stats.tasks || {};
  const inv = stats.invoices || {};
  const f = stats.files || {};
  const ch = stats.chat || {};
  const sys = stats.system || {};

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#10222F' }}>System Dashboard</h2>
        <button
          onClick={onRefresh}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB',
            background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151',
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Users" value={u.total} icon={Users} color="#146DF7" sub={`${u.active || 0} active, ${u.newThisMonth || 0} new this month`} />
        <StatCard label="Projects" value={p.total} icon={FileText} color="#7C3AED" sub={`${p.active || 0} active`} />
        <StatCard label="Tasks" value={t.total} icon={Activity} color="#059669" sub={`${t.completed || 0} completed (${t.completionRate || 0}%)`} />
        <StatCard label="Revenue" value={`₹${((inv.revenue || 0) / 1000).toFixed(1)}K`} icon={TrendingUp} color="#D97706" sub={`₹${((inv.pendingPayments || 0) / 1000).toFixed(1)}K pending`} />
        <StatCard label="Files" value={f.total} icon={HardDrive} color="#DC2626" sub={`${f.storageUsedMB || 0} MB used`} />
        <StatCard label="Chat" value={ch.messages} icon={MessageSquare} color="#0891B2" sub={`${ch.rooms || 0} rooms`} />
      </div>

      {/* System Health */}
      <Card title="System Health" icon={Server}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Uptime</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#10222F' }}>{sys.uptime || '---'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Node Version</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#10222F' }}>{sys.nodeVersion || '---'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Memory Usage</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#10222F' }}>{sys.memoryUsageMB || 0} MB</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Platform</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#10222F' }}>{sys.platform || '---'}</div>
          </div>
        </div>
      </Card>

      {/* Users by Role */}
      {u.byRole && u.byRole.length > 0 && (
        <Card title="Users by Role" icon={Users}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {u.byRole.map((r) => (
              <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 160, fontSize: 13, fontWeight: 500, color: '#374151' }}>{r.role}</span>
                <div style={{ flex: 1, height: 24, background: '#F3F4F6', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 6,
                    background: 'linear-gradient(90deg, #146DF7, #3B82F6)',
                    width: `${Math.max((r.count / (u.total || 1)) * 100, 4)}%`,
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
                    fontSize: 11, fontWeight: 700, color: '#fff', minWidth: 30,
                  }}>
                    {r.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* DB Table Counts */}
      {stats.dbTables && (
        <Card title="Database Tables" icon={Database}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {Object.entries(stats.dbTables).map(([table, count]) => (
              <div key={table} style={{
                padding: '10px 14px', background: '#FAFAFA', borderRadius: 8, border: '1px solid #E5E7EB',
              }}>
                <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{table}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#10222F' }}>{String(count)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

// ─── Tab: Branding ───────────────────────────────────────────────────────────

function BrandingTab({ data, onSave, saving }) {
  const [form, setForm] = useState({
    name: data.name || 'Know AI',
    logo_url: data.logo_url || '/logo.png',
    favicon_url: data.favicon_url || '/favicon.ico',
    primary_color: data.primary_color || '#146DF7',
    tagline: data.tagline || '',
  });

  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <Card title="Branding" icon={Palette}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="App Name">
          <Input value={form.name} onChange={(v) => set('name', v)} placeholder="Know AI" />
        </FormField>
        <FormField label="Tagline">
          <Input value={form.tagline} onChange={(v) => set('tagline', v)} placeholder="Empowering people to work with AI" />
        </FormField>
        <FormField label="Logo URL" hint="File path or external URL">
          <Input value={form.logo_url} onChange={(v) => set('logo_url', v)} placeholder="/logo.png" />
        </FormField>
        <FormField label="Favicon URL">
          <Input value={form.favicon_url} onChange={(v) => set('favicon_url', v)} placeholder="/favicon.ico" />
        </FormField>
        <FormField label="Primary Color">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={form.primary_color}
              onChange={(e) => set('primary_color', e.target.value)}
              style={{ width: 44, height: 36, border: '1px solid #D1D5DB', borderRadius: 8, cursor: 'pointer', padding: 2 }}
            />
            <Input value={form.primary_color} onChange={(v) => set('primary_color', v)} placeholder="#146DF7" style={{ flex: 1 }} />
          </div>
        </FormField>
      </div>

      {/* Live Preview */}
      <div style={{ marginTop: 20, padding: 20, background: '#FAFAFA', borderRadius: 12, border: '1px solid #E5E7EB' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#6B7280' }}>Live Preview</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: form.primary_color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            fontWeight: 700, fontSize: 18,
          }}>
            {form.name?.[0] || 'K'}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#10222F' }}>{form.name || 'Know AI'}</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>{form.tagline || 'Your tagline here'}</div>
          </div>
        </div>
        <button style={{
          padding: '8px 20px', borderRadius: 8, border: 'none',
          background: form.primary_color, color: '#fff', fontWeight: 600, fontSize: 13,
        }}>
          Sample Button
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <SaveButton onClick={() => onSave(form)} saving={saving} />
      </div>
    </Card>
  );
}

// ─── Tab: Email Server ───────────────────────────────────────────────────────

function EmailTab({ data, onSave, saving }) {
  const [form, setForm] = useState({
    smtp_host: data.smtp_host || '',
    smtp_port: data.smtp_port || '587',
    smtp_user: data.smtp_user || '',
    smtp_password: data.smtp_password || '',
    smtp_secure: data.smtp_secure || 'false',
    from_name: data.from_name || '',
    from_address: data.from_address || '',
  });
  const [testing, setTesting] = useState(false);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await adminApi.testEmail({});
      const rd = res.data;
      if (rd?.success) {
        toast.success(rd.message || 'SMTP connection successful!');
      } else {
        toast.error(rd?.message || 'SMTP test failed.');
      }
    } catch (err) {
      toast.error('SMTP test failed: ' + (err.message || 'Unknown error'));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card title="Email Server (SMTP)" icon={Mail}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="SMTP Host">
          <Input value={form.smtp_host} onChange={(v) => set('smtp_host', v)} placeholder="smtp.gmail.com" />
        </FormField>
        <FormField label="SMTP Port">
          <Input value={form.smtp_port} onChange={(v) => set('smtp_port', v)} placeholder="587" />
        </FormField>
        <FormField label="SMTP User">
          <Input value={form.smtp_user} onChange={(v) => set('smtp_user', v)} placeholder="user@gmail.com" />
        </FormField>
        <FormField label="SMTP Password">
          <PasswordInput value={form.smtp_password} onChange={(v) => set('smtp_password', v)} placeholder="App password" />
        </FormField>
        <FormField label="From Name">
          <Input value={form.from_name} onChange={(v) => set('from_name', v)} placeholder="Know AI" />
        </FormField>
        <FormField label="From Address">
          <Input value={form.from_address} onChange={(v) => set('from_address', v)} placeholder="noreply@knowai.com" />
        </FormField>
      </div>

      <FormField label="Secure Connection (TLS/SSL)">
        <Toggle checked={form.smtp_secure === 'true'} onChange={(v) => set('smtp_secure', v ? 'true' : 'false')} label="Enable TLS/SSL" />
      </FormField>

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <SaveButton onClick={() => onSave(form)} saving={saving} />
        <button
          onClick={testConnection}
          disabled={testing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 8, border: '1px solid #D1D5DB',
            background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500,
            cursor: testing ? 'default' : 'pointer',
          }}
        >
          <Send size={16} />
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
    </Card>
  );
}

// ─── Tab: File Storage ───────────────────────────────────────────────────────

function StorageTab({ data, onSave, saving, stats }) {
  const [form, setForm] = useState({
    provider: data.provider || 'local',
    local_path: data.local_path || 'uploads/',
    aws_bucket: data.aws_bucket || '',
    aws_region: data.aws_region || 'ap-south-1',
    aws_access_key: data.aws_access_key || '',
    aws_secret_key: data.aws_secret_key || '',
    gcp_bucket: data.gcp_bucket || '',
    gcp_credentials: data.gcp_credentials || '',
    gdrive_folder_id: data.gdrive_folder_id || '',
    gdrive_credentials: data.gdrive_credentials || '',
    max_file_size_mb: data.max_file_size_mb || '50',
  });
  const [testing, setTesting] = useState(false);

  const set = (k, v) => setForm({ ...form, [k]: v });

  const providers = [
    { id: 'local', label: 'Local Server' },
    { id: 'aws_s3', label: 'AWS S3' },
    { id: 'google_cloud', label: 'Google Cloud Storage' },
    { id: 'google_drive', label: 'Google Drive' },
  ];

  const testStorage = async () => {
    setTesting(true);
    try {
      const res = await adminApi.testStorage({});
      const rd = res.data;
      if (rd?.success) {
        toast.success(rd.message || 'Storage connection successful!');
      } else {
        toast.error(rd?.message || 'Storage test failed.');
      }
    } catch (err) {
      toast.error('Storage test failed: ' + (err.message || 'Unknown error'));
    } finally {
      setTesting(false);
    }
  };

  const fileStats = stats?.files || {};

  return (
    <Card title="File Storage" icon={HardDrive}>
      {/* Storage usage */}
      <div style={{
        padding: 16, background: '#FAFAFA', borderRadius: 10, border: '1px solid #E5E7EB', marginBottom: 20,
        display: 'flex', gap: 24,
      }}>
        <div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>Total Files</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10222F' }}>{fileStats.total || 0}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>Storage Used</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10222F' }}>{fileStats.storageUsedMB || 0} MB</div>
        </div>
      </div>

      <FormField label="Storage Provider">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => set('provider', p.id)}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: form.provider === p.id ? '2px solid #146DF7' : '1px solid #D1D5DB',
                background: form.provider === p.id ? '#EFF6FF' : '#fff',
                color: form.provider === p.id ? '#146DF7' : '#374151',
                fontWeight: form.provider === p.id ? 600 : 500,
                fontSize: 13, cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label="Max File Size (MB)">
        <Input value={form.max_file_size_mb} onChange={(v) => set('max_file_size_mb', v)} placeholder="50" style={{ maxWidth: 200 }} />
      </FormField>

      {/* Provider-specific fields */}
      {form.provider === 'local' && (
        <FormField label="Upload Path">
          <Input value={form.local_path} onChange={(v) => set('local_path', v)} placeholder="uploads/" />
        </FormField>
      )}

      {form.provider === 'aws_s3' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormField label="S3 Bucket Name">
            <Input value={form.aws_bucket} onChange={(v) => set('aws_bucket', v)} placeholder="my-bucket" />
          </FormField>
          <FormField label="AWS Region">
            <Input value={form.aws_region} onChange={(v) => set('aws_region', v)} placeholder="ap-south-1" />
          </FormField>
          <FormField label="AWS Access Key">
            <Input value={form.aws_access_key} onChange={(v) => set('aws_access_key', v)} placeholder="AKIA..." />
          </FormField>
          <FormField label="AWS Secret Key">
            <PasswordInput value={form.aws_secret_key} onChange={(v) => set('aws_secret_key', v)} placeholder="Secret key" />
          </FormField>
        </div>
      )}

      {form.provider === 'google_cloud' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormField label="GCP Bucket Name">
            <Input value={form.gcp_bucket} onChange={(v) => set('gcp_bucket', v)} placeholder="my-gcp-bucket" />
          </FormField>
          <div />
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="GCP Service Account Credentials (JSON)" hint="Paste service account JSON">
              <TextArea value={form.gcp_credentials} onChange={(v) => set('gcp_credentials', v)} placeholder='{"type":"service_account",...}' rows={4} />
            </FormField>
          </div>
        </div>
      )}

      {form.provider === 'google_drive' && (
        <>
          <FormField label="Google Drive Folder ID">
            <Input value={form.gdrive_folder_id} onChange={(v) => set('gdrive_folder_id', v)} placeholder="1a2b3c..." />
          </FormField>
          <FormField label="Google Drive Credentials (JSON)" hint="Paste service account or OAuth JSON">
            <TextArea value={form.gdrive_credentials} onChange={(v) => set('gdrive_credentials', v)} placeholder='{"type":"service_account",...}' rows={4} />
          </FormField>
        </>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <SaveButton onClick={() => onSave(form)} saving={saving} />
        <button
          onClick={testStorage}
          disabled={testing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 8, border: '1px solid #D1D5DB',
            background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500,
            cursor: testing ? 'default' : 'pointer',
          }}
        >
          <TestTube size={16} />
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
      </div>
    </Card>
  );
}

// ─── Tab: Company Info ───────────────────────────────────────────────────────

function CompanyTab({ data, onSave, saving }) {
  const [form, setForm] = useState({
    name: data.name || 'Know AI',
    address: data.address || '',
    phone: data.phone || '',
    website: data.website || '',
    gst_number: data.gst_number || '',
    pan_number: data.pan_number || '',
    registration_number: data.registration_number || '',
  });

  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <Card title="Company Information" icon={Building2}>
      <p style={{ fontSize: 13, color: '#6B7280', marginTop: -8, marginBottom: 16 }}>
        This information appears on invoices and official documents.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="Company Name">
          <Input value={form.name} onChange={(v) => set('name', v)} placeholder="Know AI" />
        </FormField>
        <FormField label="Phone">
          <Input value={form.phone} onChange={(v) => set('phone', v)} placeholder="+91 98765 43210" />
        </FormField>
        <FormField label="Website">
          <Input value={form.website} onChange={(v) => set('website', v)} placeholder="https://knowai.com" />
        </FormField>
        <FormField label="GST Number">
          <Input value={form.gst_number} onChange={(v) => set('gst_number', v)} placeholder="22AAAAA0000A1Z5" />
        </FormField>
        <FormField label="PAN Number">
          <Input value={form.pan_number} onChange={(v) => set('pan_number', v)} placeholder="AAAAA0000A" />
        </FormField>
        <FormField label="Registration Number">
          <Input value={form.registration_number} onChange={(v) => set('registration_number', v)} placeholder="CIN/LLPIN" />
        </FormField>
      </div>
      <FormField label="Address">
        <TextArea value={form.address} onChange={(v) => set('address', v)} placeholder="Full company address" rows={3} />
      </FormField>
      <div style={{ marginTop: 8 }}>
        <SaveButton onClick={() => onSave(form)} saving={saving} />
      </div>
    </Card>
  );
}

// ─── Tab: Security ───────────────────────────────────────────────────────────

function SecurityTab({ data, onSave, saving }) {
  const [form, setForm] = useState({
    session_timeout_hours: data.session_timeout_hours || '168',
    max_login_attempts: data.max_login_attempts || '5',
    lockout_duration_minutes: data.lockout_duration_minutes || '15',
    password_min_length: data.password_min_length || '8',
    require_2fa: data.require_2fa || 'false',
    allowed_ips: data.allowed_ips || '',
  });

  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <Card title="Security Settings" icon={Lock}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="Session Timeout (hours)" hint="Default: 168 (7 days)">
          <Input value={form.session_timeout_hours} onChange={(v) => set('session_timeout_hours', v)} placeholder="168" />
        </FormField>
        <FormField label="Max Login Attempts" hint="Before account lockout">
          <Input value={form.max_login_attempts} onChange={(v) => set('max_login_attempts', v)} placeholder="5" />
        </FormField>
        <FormField label="Lockout Duration (minutes)" hint="After max attempts exceeded">
          <Input value={form.lockout_duration_minutes} onChange={(v) => set('lockout_duration_minutes', v)} placeholder="15" />
        </FormField>
        <FormField label="Minimum Password Length">
          <Input value={form.password_min_length} onChange={(v) => set('password_min_length', v)} placeholder="8" />
        </FormField>
      </div>

      <FormField label="Two-Factor Authentication">
        <Toggle checked={form.require_2fa === 'true'} onChange={(v) => set('require_2fa', v ? 'true' : 'false')} label="Require 2FA for all users" />
      </FormField>

      <FormField label="Allowed IP Addresses" hint="One IP per line. Leave empty to allow all.">
        <TextArea value={form.allowed_ips} onChange={(v) => set('allowed_ips', v)} placeholder="192.168.1.1&#10;10.0.0.0/24" rows={4} />
      </FormField>

      <div style={{ marginTop: 8 }}>
        <SaveButton onClick={() => onSave(form)} saving={saving} />
      </div>
    </Card>
  );
}

// ─── Tab: Integrations ───────────────────────────────────────────────────────

function IntegrationsTab({ data, notifs, onSave, saving }) {
  const [intForm, setIntForm] = useState({
    google_client_id: data.google_client_id || '',
    google_client_secret: data.google_client_secret || '',
    stripe_key: data.stripe_key || '',
    razorpay_key: data.razorpay_key || '',
  });

  const [notifForm, setNotifForm] = useState({
    slack_webhook: notifs.slack_webhook || '',
    discord_webhook: notifs.discord_webhook || '',
    teams_webhook: notifs.teams_webhook || '',
  });

  const setInt = (k, v) => setIntForm({ ...intForm, [k]: v });
  const setNotif = (k, v) => setNotifForm({ ...notifForm, [k]: v });

  const testWebhook = async (url, name) => {
    if (!url) {
      toast.error(`No ${name} webhook URL configured.`);
      return;
    }
    try {
      toast.info(`Testing ${name} webhook...`);
      // We can't actually hit the webhook from the browser due to CORS.
      // This is a placeholder - in production the backend would handle this.
      toast.success(`${name} webhook URL is configured. Server-side test recommended.`);
    } catch {
      toast.error(`${name} webhook test failed.`);
    }
  };

  return (
    <>
      <Card title="Google OAuth" icon={Globe}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormField label="Client ID">
            <Input value={intForm.google_client_id} onChange={(v) => setInt('google_client_id', v)} placeholder="xxxx.apps.googleusercontent.com" />
          </FormField>
          <FormField label="Client Secret">
            <PasswordInput value={intForm.google_client_secret} onChange={(v) => setInt('google_client_secret', v)} placeholder="Client secret" />
          </FormField>
        </div>
      </Card>

      <Card title="Payment Gateways" icon={Zap}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormField label="Stripe API Key">
            <PasswordInput value={intForm.stripe_key} onChange={(v) => setInt('stripe_key', v)} placeholder="sk_live_..." />
          </FormField>
          <FormField label="Razorpay API Key">
            <PasswordInput value={intForm.razorpay_key} onChange={(v) => setInt('razorpay_key', v)} placeholder="rzp_live_..." />
          </FormField>
        </div>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <SaveButton onClick={() => onSave('integrations', intForm)} saving={saving} label="Save Integrations" />
      </div>

      <Card title="Notification Webhooks" icon={MessageSquare}>
        <FormField label="Slack Webhook URL">
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input value={notifForm.slack_webhook} onChange={(v) => setNotif('slack_webhook', v)} placeholder="https://hooks.slack.com/services/..." />
            </div>
            <button
              onClick={() => testWebhook(notifForm.slack_webhook, 'Slack')}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #D1D5DB',
                background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Test
            </button>
          </div>
        </FormField>
        <FormField label="Discord Webhook URL">
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input value={notifForm.discord_webhook} onChange={(v) => setNotif('discord_webhook', v)} placeholder="https://discord.com/api/webhooks/..." />
            </div>
            <button
              onClick={() => testWebhook(notifForm.discord_webhook, 'Discord')}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #D1D5DB',
                background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Test
            </button>
          </div>
        </FormField>
        <FormField label="MS Teams Webhook URL">
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input value={notifForm.teams_webhook} onChange={(v) => setNotif('teams_webhook', v)} placeholder="https://outlook.office.com/webhook/..." />
            </div>
            <button
              onClick={() => testWebhook(notifForm.teams_webhook, 'Teams')}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid #D1D5DB',
                background: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Test
            </button>
          </div>
        </FormField>
      </Card>

      <SaveButton onClick={() => onSave('notifications', notifForm)} saving={saving} label="Save Notifications" />
    </>
  );
}

// ─── Tab: Users & Roles ──────────────────────────────────────────────────────

function UsersTab({ stats }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const u = stats?.users || {};

  // Load users list
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await adminApi.getConfig();
      // The main admin route returns users - use existing admin endpoint
    } catch {
      // ignore
    }
    setLoadingUsers(false);
  };

  const ROLE_HIERARCHY = [
    { level: 100, roles: ['CTO'], label: 'C-Suite (Level 100)', color: '#7C3AED' },
    { level: 95, roles: ['CEO'], label: 'C-Suite (Level 95)', color: '#DC2626' },
    { level: 90, roles: ['CFO', 'BRAND_FACE'], label: 'C-Suite (Level 90)', color: '#059669' },
    { level: 80, roles: ['ADMIN'], label: 'Management (Level 80)', color: '#1D4ED8' },
    { level: 70, roles: ['HR', 'PRODUCT_OWNER'], label: 'Management (Level 70)', color: '#DB2777' },
    { level: 60, roles: ['BRAND_PARTNER'], label: 'Partners (Level 60)', color: '#EA580C' },
    { level: 50, roles: ['SR_DEVELOPER', 'SR_GRAPHIC_DESIGNER', 'SR_EDITOR', 'SR_CONTENT_STRATEGIST', 'SR_SCRIPT_WRITER', 'SR_BRAND_STRATEGIST', 'SR_ACCOUNTANT'], label: 'Senior Staff (Level 50)', color: '#4F46E5' },
    { level: 30, roles: ['JR_DEVELOPER', 'JR_GRAPHIC_DESIGNER', 'JR_EDITOR', 'JR_CONTENT_STRATEGIST', 'JR_SCRIPT_WRITER', 'JR_BRAND_STRATEGIST', 'JR_ACCOUNTANT'], label: 'Junior Staff (Level 30)', color: '#6366F1' },
    { level: 10, roles: ['GUY', 'OFFICE_BOY', 'DRIVER'], label: 'General (Level 10)', color: '#6B7280' },
  ];

  const byRole = u.byRole || [];
  const roleMap = {};
  byRole.forEach((r) => { roleMap[r.role] = r.count; });

  return (
    <>
      {/* Role Hierarchy */}
      <Card title="Role Hierarchy" icon={Shield}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ROLE_HIERARCHY.map((tier) => {
            const totalInTier = tier.roles.reduce((sum, r) => sum + (roleMap[r] || 0), 0);
            return (
              <div key={tier.level} style={{
                padding: '12px 16px', borderRadius: 10, border: '1px solid #E5E7EB',
                background: '#FAFAFA',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: 4, background: tier.color,
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#10222F' }}>{tier.label}</span>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: tier.color,
                    background: `${tier.color}15`, padding: '2px 8px', borderRadius: 4,
                  }}>
                    {totalInTier} user{totalInTier !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tier.roles.map((role) => (
                    <span key={role} style={{
                      fontSize: 12, padding: '3px 10px', borderRadius: 6,
                      background: '#fff', border: '1px solid #E5E7EB', color: '#374151',
                      fontWeight: 500,
                    }}>
                      {role.replace(/_/g, ' ')} ({roleMap[role] || 0})
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* User Count by Role Bar Chart */}
      {byRole.length > 0 && (
        <Card title="User Distribution" icon={Users}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {byRole.sort((a, b) => b.count - a.count).map((r) => {
              const pct = Math.max((r.count / (u.total || 1)) * 100, 3);
              return (
                <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    width: 180, fontSize: 12, fontWeight: 500, color: '#374151',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {r.role.replace(/_/g, ' ')}
                  </span>
                  <div style={{ flex: 1, height: 20, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      background: 'linear-gradient(90deg, #146DF7, #3B82F6)',
                      width: `${pct}%`, transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{ width: 30, fontSize: 13, fontWeight: 600, color: '#10222F', textAlign: 'right' }}>
                    {r.count}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="Total Users" value={u.total} icon={Users} color="#146DF7" />
        <StatCard label="Active Now" value={u.active} icon={Activity} color="#059669" />
        <StatCard label="New This Month" value={u.newThisMonth} icon={TrendingUp} color="#D97706" />
        <StatCard label="Unique Roles" value={byRole.length} icon={Shield} color="#7C3AED" />
      </div>
    </>
  );
}
