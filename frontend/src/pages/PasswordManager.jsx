import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { credentialsApi, teamApi } from '../services/api';
import {
  Lock, Copy, Eye, EyeOff, ExternalLink, Plus, Search, Shield, Users,
  Clock, Key, Globe, Server, Mail, Cloud, Hash, MoreHorizontal, X,
  Trash2, Edit3, UserPlus, ChevronRight, AlertTriangle, Check
} from 'lucide-react';

const CATEGORIES = [
  { key: 'All', label: 'All', icon: Lock },
  { key: 'Social Media', label: 'Social Media', icon: Hash },
  { key: 'Hosting', label: 'Hosting', icon: Server },
  { key: 'API', label: 'API', icon: Key },
  { key: 'Email', label: 'Email', icon: Mail },
  { key: 'Cloud', label: 'Cloud', icon: Cloud },
  { key: 'Domain', label: 'Domain', icon: Globe },
  { key: 'Other', label: 'Other', icon: MoreHorizontal },
];

const CATEGORY_COLORS = {
  'Social Media': '#3B82F6',
  'Hosting': '#8B5CF6',
  'API': '#F59E0B',
  'Email': '#EF4444',
  'Cloud': '#06B6D4',
  'Domain': '#10B981',
  'Other': '#6B7280',
};

const emptyCredential = {
  title: '', username: '', password: '', url: '', category: 'Other', notes: '', projectId: '', accessLevel: 'ADMIN_ONLY'
};

function generatePassword(length = 20) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
  let pw = '';
  for (let i = 0; i < length; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

function timeAgo(date) {
  if (!date) return 'Never';
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export default function PasswordManager() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [form, setForm] = useState({ ...emptyCredential });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedField, setCopiedField] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [grantForm, setGrantForm] = useState({ userId: '', canView: true, canCopy: false, canEdit: false, expiresAt: '' });
  const [accessLogs, setAccessLogs] = useState([]);
  const [detailLogs, setDetailLogs] = useState([]);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Password Manager' });
  }, [dispatch]);

  const fetchCredentials = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeCategory !== 'All') params.category = activeCategory;
      if (search) params.search = search;
      const { data } = await credentialsApi.list(params);
      const list = Array.isArray(data) ? data : data?.data || data?.credentials || [];
      setCredentials(list);
    } catch {
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search]);

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  const fetchTeam = useCallback(async () => {
    try {
      const { data } = await teamApi.list();
      const list = Array.isArray(data) ? data : data?.data || data?.users || data?.team || [];
      setTeamMembers(list);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const isAdmin = ['CEO', 'CTO', 'ADMIN'].includes(user?.role);
  const canCreate = ['CEO', 'CTO', 'ADMIN', 'HR', 'PRODUCT_OWNER'].includes(user?.role);

  // Stats
  const stats = {
    total: credentials.length,
    shared: credentials.filter(c => (c.accessGrants || []).some(g => g.userId === user?.id)).length,
    categories: [...new Set(credentials.map(c => c.category).filter(Boolean))].length,
    recentAccess: credentials.filter(c => {
      const last = c._lastAccessed || c.accessLogs?.[0]?.createdAt;
      if (!last) return false;
      return (new Date() - new Date(last)) < 7 * 86400000;
    }).length,
  };

  const handleCopy = async (text, credentialId, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(`${credentialId}-${type}`);
      setTimeout(() => setCopiedField(null), 2000);
      // Log the action
      const accessAction = type === 'password' ? 'COPY_PASSWORD' : 'COPY_USERNAME';
      credentialsApi.logAccess(credentialId, accessAction).catch(() => {});
      toast.success(`${type === 'password' ? 'Password' : 'Username'} copied`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openDetail = async (cred) => {
    setShowDetail(cred);
    // Log page view
    credentialsApi.logAccess(cred.id, 'VIEW_PAGE').catch(() => {});
    // Fetch detail-level logs for this credential
    try {
      const { data } = await credentialsApi.getLogs();
      const logs = Array.isArray(data) ? data : data?.data || [];
      const credLogs = [];
      for (const group of logs) {
        if (group.credential?.id === cred.id) {
          for (const u of (group.users || [])) {
            for (const a of (u.actions || [])) {
              credLogs.push({
                user: u.user,
                action: a.action,
                count: a.count,
                timestamps: a.timestamps,
              });
            }
          }
        }
      }
      setDetailLogs(credLogs);
    } catch {
      setDetailLogs([]);
    }
  };

  const openCreate = () => {
    setForm({ ...emptyCredential });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (cred) => {
    setForm({
      title: cred.title || '',
      username: cred.username || '',
      password: cred.password || '',
      url: cred.url || '',
      category: cred.category || 'Other',
      notes: cred.notes || '',
      projectId: cred.projectId || '',
      accessLevel: cred.accessLevel || 'ADMIN_ONLY',
    });
    setEditingId(cred.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.warning('Title is required'); return; }
    if (!form.password.trim()) { toast.warning('Password is required'); return; }
    try {
      setSaving(true);
      if (editingId) {
        await credentialsApi.update(editingId, form);
        toast.success('Credential updated');
      } else {
        await credentialsApi.create(form);
        toast.success('Credential created');
      }
      setShowModal(false);
      fetchCredentials();
    } catch (err) {
      toast.error(err.message || 'Failed to save credential');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this credential? This cannot be undone.')) return;
    try {
      await credentialsApi.delete(id);
      toast.success('Credential deleted');
      setShowDetail(null);
      fetchCredentials();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!grantForm.userId) { toast.warning('Select a user'); return; }
    try {
      setSaving(true);
      await credentialsApi.grantAccess({
        credentialId: showDetail.id,
        userId: grantForm.userId,
        canView: grantForm.canView,
        canCopy: grantForm.canCopy,
        canEdit: grantForm.canEdit,
        expiresAt: grantForm.expiresAt || undefined,
      });
      toast.success('Access granted');
      setShowGrantModal(false);
      setGrantForm({ userId: '', canView: true, canCopy: false, canEdit: false, expiresAt: '' });
      fetchCredentials();
    } catch (err) {
      toast.error(err.message || 'Failed to grant access');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeAccess = async (credentialId, userId) => {
    try {
      await credentialsApi.revokeAccess({ credentialId, userId });
      toast.success('Access revoked');
      fetchCredentials();
    } catch (err) {
      toast.error(err.message || 'Failed to revoke');
    }
  };

  const fetchLogs = async () => {
    try {
      const { data } = await credentialsApi.getLogs();
      const logs = Array.isArray(data) ? data : data?.data || [];
      setAccessLogs(logs);
      setShowLogs(true);
    } catch (err) {
      toast.error('Failed to load logs');
    }
  };

  const accessLevelLabel = (level) => {
    const map = {
      ADMIN_ONLY: 'Admin Only',
      MANAGER_AND_ABOVE: 'Managers+',
      TEAM_AND_ABOVE: 'Team+',
      ALL_STAFF: 'All Staff',
    };
    return map[level] || level;
  };

  return (
    <div className="kai-page">
      {/* Stats Row */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Credentials', value: stats.total, icon: Lock, color: '#146DF7' },
          { label: 'Shared With Me', value: stats.shared, icon: Users, color: '#8B5CF6' },
          { label: 'Categories', value: stats.categories, icon: Key, color: '#F59E0B' },
          { label: 'Recent Access', value: stats.recentAccess, icon: Clock, color: '#10B981' },
        ].map((s, i) => (
          <div key={i} className="col-6 col-lg-3">
            <div className="kai-card p-3" style={{ borderLeft: `3px solid ${s.color}` }}>
              <div className="d-flex align-items-center gap-3">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={20} color={s.color} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--kai-text)' }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--kai-text-secondary)' }}>{s.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="kai-card p-3 mb-4">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="position-relative flex-grow-1" style={{ maxWidth: 360 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kai-text-secondary)' }} />
            <input
              className="form-control"
              placeholder="Search credentials..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }}
            />
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className="btn btn-sm"
                  style={{
                    background: isActive ? '#146DF7' : 'var(--kai-bg-secondary)',
                    color: isActive ? '#fff' : 'var(--kai-text-secondary)',
                    border: `1px solid ${isActive ? '#146DF7' : 'var(--kai-border)'}`,
                    borderRadius: 8, fontSize: 13, padding: '5px 12px',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Icon size={14} />
                  {cat.label}
                </button>
              );
            })}
          </div>
          <div className="ms-auto d-flex gap-2">
            {isAdmin && (
              <button className="btn btn-sm" onClick={fetchLogs}
                style={{ background: 'var(--kai-bg-secondary)', color: 'var(--kai-text)', border: '1px solid var(--kai-border)', borderRadius: 8, fontSize: 13, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={14} /> Access Logs
              </button>
            )}
            {canCreate && (
              <button className="btn btn-sm" onClick={openCreate}
                style={{ background: '#146DF7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} /> Add Credential
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Credential Cards */}
      {loading ? (
        <div className="text-center py-5" style={{ color: 'var(--kai-text-secondary)' }}>Loading credentials...</div>
      ) : credentials.length === 0 ? (
        <div className="kai-card p-5 text-center">
          <Lock size={48} style={{ color: 'var(--kai-text-secondary)', opacity: 0.4 }} />
          <p className="mt-3" style={{ color: 'var(--kai-text-secondary)' }}>No credentials found</p>
          {canCreate && <button className="btn btn-sm mt-2" onClick={openCreate} style={{ background: '#146DF7', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px' }}>Add First Credential</button>}
        </div>
      ) : (
        <div className="row g-3">
          {credentials.map(cred => {
            const catColor = CATEGORY_COLORS[cred.category] || '#6B7280';
            const grantsCount = cred._grantsCount || cred.accessGrants?.length || 0;
            const lastAccessed = cred._lastAccessed || cred.accessLogs?.[0]?.createdAt;
            return (
              <div key={cred.id} className="col-12 col-md-6 col-xl-4">
                <div className="kai-card p-3 h-100" style={{ cursor: 'pointer', transition: 'all 0.15s', border: '1px solid var(--kai-border)' }}
                  onClick={() => openDetail(cred)}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#146DF7'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--kai-border)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div className="d-flex align-items-start gap-3">
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: `${catColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Lock size={20} color={catColor} />
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--kai-text)' }} className="text-truncate">{cred.title}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: `${catColor}18`, color: catColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {cred.category || 'Other'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--kai-text-secondary)' }} className="text-truncate">
                        {cred.username ? `${'*'.repeat(Math.min(cred.username.length, 3))}${cred.username.slice(3)}` : 'No username'}
                      </div>
                      {cred.url && (
                        <div style={{ fontSize: 12, color: '#146DF7', marginTop: 2 }} className="text-truncate">
                          <Globe size={11} style={{ marginRight: 4 }} />{cred.url.replace(/^https?:\/\//, '')}
                        </div>
                      )}
                      <div className="d-flex align-items-center gap-3 mt-2" style={{ fontSize: 12, color: 'var(--kai-text-secondary)' }}>
                        <span><Users size={12} style={{ marginRight: 3 }} />{grantsCount} shared</span>
                        <span><Clock size={12} style={{ marginRight: 3 }} />{timeAgo(lastAccessed)}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: 'var(--kai-text-secondary)', flexShrink: 0, marginTop: 4 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Panel */}
      {showDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1050, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowDetail(null)} />
          <div style={{ width: 520, maxWidth: '95vw', background: 'var(--kai-bg)', overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.2)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="d-flex align-items-center justify-content-between">
              <h5 style={{ margin: 0, fontWeight: 700, color: 'var(--kai-text)' }}>{showDetail.title}</h5>
              <div className="d-flex gap-2">
                {(showDetail.createdById === user?.id || isAdmin) && (
                  <>
                    <button className="btn btn-sm" onClick={() => openEdit(showDetail)} style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', borderRadius: 8, color: 'var(--kai-text)', padding: '4px 10px' }}>
                      <Edit3 size={14} />
                    </button>
                    <button className="btn btn-sm" onClick={() => handleDelete(showDetail.id)} style={{ background: '#FEE2E2', border: 'none', borderRadius: 8, color: '#DC2626', padding: '4px 10px' }}>
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
                <button className="btn btn-sm" onClick={() => setShowDetail(null)} style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', borderRadius: 8, color: 'var(--kai-text)', padding: '4px 10px' }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* URL */}
            {showDetail.url && (
              <a href={showDetail.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#146DF7', fontSize: 14, textDecoration: 'none' }}>
                <ExternalLink size={14} />{showDetail.url}
              </a>
            )}

            {/* Username Field */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--kai-text-secondary)', marginBottom: 4, display: 'block' }}>Username</label>
              <div className="d-flex align-items-center gap-2" style={{ background: 'var(--kai-bg-secondary)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--kai-border)' }}>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 14, color: 'var(--kai-text)' }}>{showDetail.username || '-'}</span>
                {showDetail.username && (
                  <button className="btn btn-sm p-0" onClick={() => handleCopy(showDetail.username, showDetail.id, 'username')}
                    style={{ background: 'none', border: 'none', color: copiedField === `${showDetail.id}-username` ? '#10B981' : 'var(--kai-text-secondary)' }}>
                    {copiedField === `${showDetail.id}-username` ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                )}
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--kai-text-secondary)', marginBottom: 4, display: 'block' }}>Password</label>
              <div className="d-flex align-items-center gap-2" style={{ background: 'var(--kai-bg-secondary)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--kai-border)' }}>
                <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 14, color: 'var(--kai-text)', letterSpacing: visiblePasswords[showDetail.id] ? 0 : 3 }}>
                  {visiblePasswords[showDetail.id] ? showDetail.password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                </span>
                <button className="btn btn-sm p-0" onClick={() => togglePasswordVisibility(showDetail.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--kai-text-secondary)' }}>
                  {visiblePasswords[showDetail.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button className="btn btn-sm p-0" onClick={() => handleCopy(showDetail.password, showDetail.id, 'password')}
                  style={{ background: 'none', border: 'none', color: copiedField === `${showDetail.id}-password` ? '#10B981' : 'var(--kai-text-secondary)' }}>
                  {copiedField === `${showDetail.id}-password` ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {/* Meta */}
            <div className="d-flex flex-wrap gap-2">
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: `${CATEGORY_COLORS[showDetail.category] || '#6B7280'}18`, color: CATEGORY_COLORS[showDetail.category] || '#6B7280', fontWeight: 600 }}>
                {showDetail.category || 'Other'}
              </span>
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: '#146DF715', color: '#146DF7', fontWeight: 600 }}>
                {accessLevelLabel(showDetail.accessLevel)}
              </span>
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'var(--kai-bg-secondary)', color: 'var(--kai-text-secondary)' }}>
                Created by {showDetail.createdBy?.firstName || 'Unknown'} {showDetail.createdBy?.lastName || ''}
              </span>
            </div>

            {showDetail.notes && (
              <div style={{ fontSize: 13, color: 'var(--kai-text-secondary)', background: 'var(--kai-bg-secondary)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--kai-border)' }}>
                {showDetail.notes}
              </div>
            )}

            {/* Who Has Access */}
            <div>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--kai-text)' }}>Who Has Access ({(showDetail.accessGrants || []).length})</span>
                {(showDetail.createdById === user?.id || isAdmin) && (
                  <button className="btn btn-sm" onClick={() => { setShowGrantModal(true); setGrantForm({ userId: '', canView: true, canCopy: false, canEdit: false, expiresAt: '' }); }}
                    style={{ background: '#146DF7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <UserPlus size={12} /> Grant
                  </button>
                )}
              </div>
              {(showDetail.accessGrants || []).length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--kai-text-secondary)', padding: '8px 0' }}>No individual access grants</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(showDetail.accessGrants || []).map(grant => {
                    const member = teamMembers.find(m => m.id === grant.userId);
                    return (
                      <div key={grant.id} className="d-flex align-items-center justify-content-between" style={{ background: 'var(--kai-bg-secondary)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--kai-border)' }}>
                        <div>
                          <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--kai-text)' }}>{member ? `${member.firstName} ${member.lastName}` : grant.userId}</span>
                          <div className="d-flex gap-1 mt-1">
                            {grant.canView && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#10B98118', color: '#10B981', fontWeight: 600 }}>View</span>}
                            {grant.canCopy && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#3B82F618', color: '#3B82F6', fontWeight: 600 }}>Copy</span>}
                            {grant.canEdit && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F59E0B18', color: '#F59E0B', fontWeight: 600 }}>Edit</span>}
                          </div>
                        </div>
                        {(showDetail.createdById === user?.id || isAdmin) && (
                          <button className="btn btn-sm p-1" onClick={() => handleRevokeAccess(showDetail.id, grant.userId)}
                            style={{ background: 'none', border: 'none', color: '#DC2626' }}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Access Log (per credential) */}
            {detailLogs.length > 0 && (
              <div>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--kai-text)', marginBottom: 8, display: 'block' }}>Access History</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {detailLogs.map((log, i) => (
                    <div key={i} className="d-flex align-items-center justify-content-between" style={{ fontSize: 12, padding: '6px 10px', background: 'var(--kai-bg-secondary)', borderRadius: 6 }}>
                      <span style={{ color: 'var(--kai-text)' }}>
                        {log.user?.firstName || 'Unknown'} {log.user?.lastName || ''}
                      </span>
                      <span style={{
                        padding: '1px 8px', borderRadius: 4, fontWeight: 600, fontSize: 10,
                        background: log.action === 'COPY_PASSWORD' ? '#DC262618' : log.action === 'COPY_USERNAME' ? '#3B82F618' : '#10B98118',
                        color: log.action === 'COPY_PASSWORD' ? '#DC2626' : log.action === 'COPY_USERNAME' ? '#3B82F6' : '#10B981',
                      }}>
                        {log.action.replace(/_/g, ' ')} ({log.count}x)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'relative', width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', background: 'var(--kai-bg)', borderRadius: 16, padding: 24, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 style={{ margin: 0, fontWeight: 700, color: 'var(--kai-text)' }}>{editingId ? 'Edit Credential' : 'Add Credential'}</h5>
              <button className="btn btn-sm" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--kai-text-secondary)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Title *</label>
                <input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. GitHub, AWS Console" style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
              </div>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Username</label>
                <input className="form-control" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="user@example.com" style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
              </div>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Password *</label>
                <div className="d-flex gap-2">
                  <div className="position-relative flex-grow-1">
                    <input type={visiblePasswords.form ? 'text' : 'password'} className="form-control" value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8, paddingRight: 36 }} />
                    <button type="button" className="btn btn-sm" onClick={() => setVisiblePasswords(p => ({ ...p, form: !p.form }))}
                      style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--kai-text-secondary)' }}>
                      {visiblePasswords.form ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button type="button" className="btn btn-sm" onClick={() => setForm(f => ({ ...f, password: generatePassword() }))}
                    style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: '#146DF7', borderRadius: 8, whiteSpace: 'nowrap', fontSize: 13, padding: '4px 12px' }}>
                    Generate
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>URL</label>
                <input className="form-control" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://github.com" style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
              </div>
              <div className="row mb-3">
                <div className="col-6">
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Category</label>
                  <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }}>
                    {CATEGORIES.filter(c => c.key !== 'All').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Access Level</label>
                  <select className="form-select" value={form.accessLevel} onChange={e => setForm(f => ({ ...f, accessLevel: e.target.value }))}
                    style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }}>
                    <option value="ADMIN_ONLY">Admin Only</option>
                    <option value="MANAGER_AND_ABOVE">Managers & Above</option>
                    <option value="TEAM_AND_ABOVE">Team & Above</option>
                    <option value="ALL_STAFF">All Staff</option>
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Notes</label>
                <textarea className="form-control" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes..." style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
              </div>
              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-sm" onClick={() => setShowModal(false)}
                  style={{ background: 'var(--kai-bg-secondary)', color: 'var(--kai-text)', border: '1px solid var(--kai-border)', borderRadius: 8, padding: '6px 16px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-sm"
                  style={{ background: '#146DF7', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 20px', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grant Access Modal */}
      {showGrantModal && showDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1070, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowGrantModal(false)} />
          <div style={{ position: 'relative', width: 440, maxWidth: '95vw', background: 'var(--kai-bg)', borderRadius: 16, padding: 24, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 style={{ margin: 0, fontWeight: 700, color: 'var(--kai-text)' }}>Grant Access</h5>
              <button className="btn btn-sm" onClick={() => setShowGrantModal(false)} style={{ background: 'none', border: 'none', color: 'var(--kai-text-secondary)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleGrantAccess}>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Select User *</label>
                <select className="form-select" value={grantForm.userId} onChange={e => setGrantForm(f => ({ ...f, userId: e.target.value }))}
                  style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }}>
                  <option value="">Choose user...</option>
                  {teamMembers.filter(m => m.id !== user?.id).map(m => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.role})</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Permissions</label>
                <div className="d-flex gap-3">
                  {[
                    { key: 'canView', label: 'View' },
                    { key: 'canCopy', label: 'Copy Password' },
                    { key: 'canEdit', label: 'Edit' },
                  ].map(perm => (
                    <label key={perm.key} className="d-flex align-items-center gap-2" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--kai-text)' }}>
                      <input type="checkbox" checked={grantForm[perm.key]}
                        onChange={e => setGrantForm(f => ({ ...f, [perm.key]: e.target.checked }))}
                        style={{ accentColor: '#146DF7' }} />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Expires At (optional)</label>
                <input type="datetime-local" className="form-control" value={grantForm.expiresAt}
                  onChange={e => setGrantForm(f => ({ ...f, expiresAt: e.target.value }))}
                  style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
              </div>
              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-sm" onClick={() => setShowGrantModal(false)}
                  style={{ background: 'var(--kai-bg-secondary)', color: 'var(--kai-text)', border: '1px solid var(--kai-border)', borderRadius: 8, padding: '6px 16px' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-sm"
                  style={{ background: '#146DF7', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 20px', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Granting...' : 'Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C-Level Access Logs Modal */}
      {showLogs && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowLogs(false)} />
          <div style={{ position: 'relative', width: 700, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', background: 'var(--kai-bg)', borderRadius: 16, padding: 24, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 style={{ margin: 0, fontWeight: 700, color: 'var(--kai-text)' }}>
                <Shield size={18} style={{ marginRight: 8, color: '#146DF7' }} />
                Access Audit Report
              </h5>
              <button className="btn btn-sm" onClick={() => setShowLogs(false)} style={{ background: 'none', border: 'none', color: 'var(--kai-text-secondary)' }}><X size={18} /></button>
            </div>
            {accessLogs.length === 0 ? (
              <div className="text-center py-4" style={{ color: 'var(--kai-text-secondary)' }}>No access logs found</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {accessLogs.map((group, gi) => (
                  <div key={gi} style={{ background: 'var(--kai-bg-secondary)', borderRadius: 12, padding: 16, border: '1px solid var(--kai-border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--kai-text)', marginBottom: 10 }}>
                      <Lock size={14} style={{ marginRight: 6 }} />
                      {group.credential?.title || 'Unknown Credential'}
                      {group.credential?.category && (
                        <span style={{ fontSize: 11, marginLeft: 8, padding: '2px 8px', borderRadius: 4, background: `${CATEGORY_COLORS[group.credential.category] || '#6B7280'}18`, color: CATEGORY_COLORS[group.credential.category] || '#6B7280' }}>
                          {group.credential.category}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(group.users || []).map((u, ui) => (
                        <div key={ui} className="d-flex align-items-center justify-content-between" style={{ padding: '6px 10px', background: 'var(--kai-bg)', borderRadius: 8 }}>
                          <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--kai-text)' }}>
                            {u.user?.firstName || 'Unknown'} {u.user?.lastName || ''} <span style={{ fontSize: 11, color: 'var(--kai-text-secondary)' }}>({u.user?.role || '-'})</span>
                          </span>
                          <div className="d-flex gap-2">
                            {(u.actions || []).map((a, ai) => (
                              <span key={ai} style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                                background: a.action === 'COPY_PASSWORD' ? '#DC262615' : a.action === 'COPY_USERNAME' ? '#3B82F615' : a.action === 'SHARE' ? '#F59E0B15' : '#10B98115',
                                color: a.action === 'COPY_PASSWORD' ? '#DC2626' : a.action === 'COPY_USERNAME' ? '#3B82F6' : a.action === 'SHARE' ? '#F59E0B' : '#10B981',
                              }}>
                                {a.action.replace(/_/g, ' ')} ({a.count}x)
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
