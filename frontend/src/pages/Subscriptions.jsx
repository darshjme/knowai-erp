import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { subscriptionsApi, credentialsApi } from '../services/api';
import {
  CreditCard, Plus, Search, DollarSign, Clock, AlertTriangle, TrendingUp,
  X, Edit3, Trash2, Calendar, ExternalLink, Link2, MoreHorizontal, Zap,
  Monitor, Palette, Megaphone, MessageSquare, Cloud, RefreshCw
} from 'lucide-react';

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', color: '#10B981', bg: '#10B98118' },
  TRIAL: { label: 'Trial', color: '#3B82F6', bg: '#3B82F618' },
  EXPIRING: { label: 'Expiring', color: '#F59E0B', bg: '#F59E0B18' },
  CANCELLED: { label: 'Cancelled', color: '#EF4444', bg: '#EF444418' },
  EXPIRED: { label: 'Expired', color: '#6B7280', bg: '#6B728018' },
};

const CATEGORY_CONFIG = {
  Development: { icon: Monitor, color: '#8B5CF6' },
  Design: { icon: Palette, color: '#EC4899' },
  Marketing: { icon: Megaphone, color: '#F59E0B' },
  Communication: { icon: MessageSquare, color: '#3B82F6' },
  Cloud: { icon: Cloud, color: '#06B6D4' },
  Other: { icon: MoreHorizontal, color: '#6B7280' },
};

const BILLING_LABELS = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};

const emptySubscription = {
  name: '', provider: '', plan: '', cost: '', billingCycle: 'MONTHLY', currency: 'INR',
  startDate: '', renewalDate: '', category: 'Other', status: 'ACTIVE',
  loginUrl: '', credentialId: '', notes: '', autoRenew: true,
};

function formatCurrency(amount, currency = 'INR') {
  const sym = currency === 'INR' ? '\u20B9' : currency === 'USD' ? '$' : currency;
  return `${sym}${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d - now) / (86400000));
}

export default function Subscriptions() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const [subscriptions, setSubscriptions] = useState([]);
  const [totals, setTotals] = useState({ monthly: 0, yearly: 0, activeCount: 0, expiringSoon: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptySubscription });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState([]);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Subscriptions' });
  }, [dispatch]);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'All') params.status = statusFilter;
      if (categoryFilter !== 'All') params.category = categoryFilter;
      const res = await subscriptionsApi.list(params);
      const rd = res.data;
      // After interceptor unwrap: rd = { subscriptions: [...], totals: {...} } or rd = [...]
      const list = Array.isArray(rd) ? rd : rd?.subscriptions || rd?.data || [];
      setSubscriptions(list);
      if (rd?.totals) {
        setTotals(rd.totals);
      } else {
        // Calculate totals client-side as fallback
        const active = list.filter(s => s.status === 'ACTIVE' || s.status === 'TRIAL');
        const monthly = active.reduce((sum, s) => {
          if (s.billingCycle === 'YEARLY') return sum + s.cost / 12;
          if (s.billingCycle === 'QUARTERLY') return sum + s.cost / 3;
          return sum + s.cost;
        }, 0);
        const now = new Date();
        const td = new Date(now.getTime() + 30 * 86400000);
        setTotals({
          monthly: Math.round(monthly),
          yearly: Math.round(monthly * 12),
          activeCount: active.length,
          expiringSoon: list.filter(s => s.renewalDate && new Date(s.renewalDate) <= td && new Date(s.renewalDate) >= now && s.status === 'ACTIVE').length,
        });
      }
    } catch {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const fetchCredentials = useCallback(async () => {
    try {
      const { data } = await credentialsApi.list();
      const list = Array.isArray(data) ? data : data?.data || [];
      setCredentials(list);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  const canCreate = ['CEO', 'CTO', 'ADMIN', 'CFO', 'PRODUCT_OWNER', 'HR'].includes(user?.role);

  const openCreate = () => {
    setForm({ ...emptySubscription, startDate: new Date().toISOString().split('T')[0] });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (sub) => {
    setForm({
      name: sub.name || '',
      provider: sub.provider || '',
      plan: sub.plan || '',
      cost: sub.cost?.toString() || '',
      billingCycle: sub.billingCycle || 'MONTHLY',
      currency: sub.currency || 'INR',
      startDate: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : '',
      renewalDate: sub.renewalDate ? new Date(sub.renewalDate).toISOString().split('T')[0] : '',
      category: sub.category || 'Other',
      status: sub.status || 'ACTIVE',
      loginUrl: sub.loginUrl || '',
      credentialId: sub.credentialId || '',
      notes: sub.notes || '',
      autoRenew: sub.autoRenew !== false,
    });
    setEditingId(sub.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.warning('Name is required'); return; }
    if (!form.cost || parseFloat(form.cost) < 0) { toast.warning('Enter a valid cost'); return; }
    if (!form.startDate) { toast.warning('Start date is required'); return; }
    try {
      setSaving(true);
      const payload = { ...form, cost: parseFloat(form.cost) };
      if (editingId) {
        await subscriptionsApi.update(editingId, payload);
        toast.success('Subscription updated');
      } else {
        await subscriptionsApi.create(payload);
        toast.success('Subscription created');
      }
      setShowModal(false);
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.message || 'Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subscription?')) return;
    try {
      await subscriptionsApi.delete(id);
      toast.success('Subscription deleted');
      fetchSubscriptions();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const allCategories = ['All', ...new Set(subscriptions.map(s => s.category).filter(Boolean))];

  return (
    <div className="kai-page">
      {/* Stats Row */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Monthly Cost', value: formatCurrency(totals.monthly), icon: DollarSign, color: '#146DF7' },
          { label: 'Active Subscriptions', value: totals.activeCount, icon: Zap, color: '#10B981' },
          { label: 'Expiring in 30 Days', value: totals.expiringSoon, icon: AlertTriangle, color: '#F59E0B' },
          { label: 'Total Yearly Cost', value: formatCurrency(totals.yearly), icon: TrendingUp, color: '#8B5CF6' },
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
          <div className="position-relative flex-grow-1" style={{ maxWidth: 320 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--kai-text-secondary)' }} />
            <input
              className="form-control"
              placeholder="Search subscriptions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 36, background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }}
            />
          </div>
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ width: 'auto', background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8, fontSize: 13 }}>
            <option value="All">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="form-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            style={{ width: 'auto', background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8, fontSize: 13 }}>
            {allCategories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
          </select>
          {canCreate && (
            <button className="btn btn-sm ms-auto" onClick={openCreate}
              style={{ background: '#146DF7', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Add Subscription
            </button>
          )}
        </div>
      </div>

      {/* Subscription Table */}
      {loading ? (
        <div className="text-center py-5" style={{ color: 'var(--kai-text-secondary)' }}>Loading subscriptions...</div>
      ) : subscriptions.length === 0 ? (
        <div className="kai-card p-5 text-center">
          <CreditCard size={48} style={{ color: 'var(--kai-text-secondary)', opacity: 0.4 }} />
          <p className="mt-3" style={{ color: 'var(--kai-text-secondary)' }}>No subscriptions found</p>
          {canCreate && <button className="btn btn-sm mt-2" onClick={openCreate} style={{ background: '#146DF7', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px' }}>Add First Subscription</button>}
        </div>
      ) : (
        <div className="kai-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--kai-border)' }}>
                  {['Service', 'Plan', 'Cost', 'Billing', 'Renewal', 'Status', 'Category', ''].map((h, i) => (
                    <th key={i} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--kai-text-secondary)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => {
                  const statusCfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.EXPIRED;
                  const catCfg = CATEGORY_CONFIG[sub.category] || CATEGORY_CONFIG.Other;
                  const CatIcon = catCfg.icon;
                  const days = daysUntil(sub.renewalDate);
                  const isExpiring = days !== null && days >= 0 && days <= 30 && sub.status === 'ACTIVE';

                  return (
                    <tr key={sub.id} style={{ borderBottom: '1px solid var(--kai-border)', transition: 'background 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--kai-bg-secondary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="d-flex align-items-center gap-3">
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${catCfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CatIcon size={18} color={catCfg.color} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--kai-text)' }}>{sub.name}</div>
                            {sub.provider && <div style={{ fontSize: 12, color: 'var(--kai-text-secondary)' }}>{sub.provider}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--kai-text)' }}>{sub.plan || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--kai-text)' }}>{formatCurrency(sub.cost, sub.currency)}</span>
                        <span style={{ fontSize: 11, color: 'var(--kai-text-secondary)' }}>/{sub.billingCycle === 'YEARLY' ? 'yr' : sub.billingCycle === 'QUARTERLY' ? 'qtr' : 'mo'}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--kai-text-secondary)' }}>
                        {BILLING_LABELS[sub.billingCycle] || sub.billingCycle}
                        {sub.autoRenew && <RefreshCw size={11} style={{ marginLeft: 4, opacity: 0.6 }} />}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {sub.renewalDate ? (
                          <div>
                            <div style={{ fontSize: 13, color: isExpiring ? '#F59E0B' : 'var(--kai-text)' }}>
                              {new Date(sub.renewalDate).toLocaleDateString()}
                            </div>
                            {isExpiring && (
                              <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <AlertTriangle size={10} /> {days} days left
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, color: 'var(--kai-text-secondary)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, fontWeight: 600, background: statusCfg.bg, color: statusCfg.color }}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: `${catCfg.color}15`, color: catCfg.color, fontWeight: 500 }}>
                          {sub.category || 'Other'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="d-flex gap-1">
                          {sub.loginUrl && (
                            <a href={sub.loginUrl} target="_blank" rel="noopener noreferrer"
                              style={{ padding: 4, borderRadius: 6, color: 'var(--kai-text-secondary)', display: 'inline-flex' }}>
                              <ExternalLink size={14} />
                            </a>
                          )}
                          {canCreate && (
                            <>
                              <button className="btn btn-sm p-1" onClick={() => openEdit(sub)}
                                style={{ background: 'none', border: 'none', color: 'var(--kai-text-secondary)', borderRadius: 6 }}>
                                <Edit3 size={14} />
                              </button>
                              <button className="btn btn-sm p-1" onClick={() => handleDelete(sub.id)}
                                style={{ background: 'none', border: 'none', color: '#DC2626', borderRadius: 6 }}>
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'relative', width: 580, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', background: 'var(--kai-bg)', borderRadius: 16, padding: 24, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h5 style={{ margin: 0, fontWeight: 700, color: 'var(--kai-text)' }}>{editingId ? 'Edit Subscription' : 'Add Subscription'}</h5>
              <button className="btn btn-sm" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--kai-text-secondary)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="row mb-3">
                <div className="col-6">
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Figma Pro" style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
                </div>
                <div className="col-6">
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Provider</label>
                  <input className="form-control" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                    placeholder="e.g. Figma Inc." style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-4">
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Plan</label>
                  <input className="form-control" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                    placeholder="e.g. Pro, Enterprise" style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
                </div>
                <div className="col-4">
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Cost *</label>
                  <input type="number" step="0.01" className="form-control" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    placeholder="0" style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
                </div>
                <div className="col-4">
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Billing Cycle</label>
                  <select className="form-select" value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}
                    style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-6">
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Start Date *</label>
                  <input type="date" className="form-control" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
                </div>
                <div className="col-6">
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Renewal Date</label>
                  <input type="date" className="form-control" value={form.renewalDate} onChange={e => setForm(f => ({ ...f, renewalDate: e.target.value }))}
                    style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-4">
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Category</label>
                  <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }}>
                    {Object.keys(CATEGORY_CONFIG).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-4">
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="col-4">
                  <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Currency</label>
                  <select className="form-select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Login URL</label>
                <input className="form-control" value={form.loginUrl} onChange={e => setForm(f => ({ ...f, loginUrl: e.target.value }))}
                  placeholder="https://..." style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
              </div>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Linked Credential</label>
                <select className="form-select" value={form.credentialId} onChange={e => setForm(f => ({ ...f, credentialId: e.target.value }))}
                  style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }}>
                  <option value="">None</option>
                  {credentials.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Notes</label>
                <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes..." style={{ background: 'var(--kai-bg-secondary)', border: '1px solid var(--kai-border)', color: 'var(--kai-text)', borderRadius: 8 }} />
              </div>
              <div className="mb-3">
                <label className="d-flex align-items-center gap-2" style={{ fontSize: 13, cursor: 'pointer', color: 'var(--kai-text)' }}>
                  <input type="checkbox" checked={form.autoRenew} onChange={e => setForm(f => ({ ...f, autoRenew: e.target.checked }))} style={{ accentColor: '#146DF7' }} />
                  Auto-renew enabled
                </label>
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
    </div>
  );
}
