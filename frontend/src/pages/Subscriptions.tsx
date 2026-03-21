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

const inputClass = "w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]";
const labelClass = "block text-[13px] font-semibold text-[var(--text-secondary)] mb-1";

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
      const list = Array.isArray(rd) ? rd : rd?.subscriptions || rd?.data || [];
      setSubscriptions(list);
      if (rd?.totals) {
        setTotals(rd.totals);
      } else {
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
    <div>
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Monthly Cost', value: formatCurrency(totals.monthly), icon: DollarSign, color: '#7C3AED' },
          { label: 'Active Subscriptions', value: totals.activeCount, icon: Zap, color: '#10B981' },
          { label: 'Expiring in 30 Days', value: totals.expiringSoon, icon: AlertTriangle, color: '#F59E0B' },
          { label: 'Total Yearly Cost', value: formatCurrency(totals.yearly), icon: TrendingUp, color: '#8B5CF6' },
        ].map((s, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3" style={{ borderLeft: `3px solid ${s.color}` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div>
                <div className="text-[22px] font-bold text-[var(--text-primary)]">{s.value}</div>
                <div className="text-[12px] text-[var(--text-secondary)]">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-grow max-w-[320px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              data-testid="search-subscriptions"
              className={`${inputClass} pl-9`}
              placeholder="Search subscriptions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select data-testid="status-filter" className={`${inputClass} w-auto`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select data-testid="category-filter" className={`${inputClass} w-auto`} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            {allCategories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
          </select>
          {canCreate && (
            <button data-testid="add-subscription" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 ml-auto flex items-center gap-1.5" onClick={openCreate}>
              <Plus size={14} /> Add Subscription
            </button>
          )}
        </div>
      </div>

      {/* Subscription Table */}
      {loading ? (
        <div className="text-center py-10 text-[var(--text-secondary)]">Loading subscriptions...</div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-10 text-center">
          <CreditCard size={48} className="text-[var(--text-secondary)] opacity-40 mx-auto" />
          <p className="mt-3 text-[var(--text-secondary)]">No subscriptions found</p>
          {canCreate && <button className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 mt-2" onClick={openCreate}>Add First Subscription</button>}
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  {['Service', 'Plan', 'Cost', 'Billing', 'Renewal', 'Status', 'Category', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[12px] font-semibold text-[var(--text-secondary)] whitespace-nowrap">{h}</th>
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
                    <tr key={sub.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${catCfg.color}15` }}>
                            <CatIcon size={18} color={catCfg.color} />
                          </div>
                          <div>
                            <div className="font-semibold text-[14px] text-[var(--text-primary)]">{sub.name}</div>
                            {sub.provider && <div className="text-[12px] text-[var(--text-secondary)]">{sub.provider}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--text-primary)]">{sub.plan || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[14px] text-[var(--text-primary)]">{formatCurrency(sub.cost, sub.currency)}</span>
                        <span className="text-[11px] text-[var(--text-secondary)]">/{sub.billingCycle === 'YEARLY' ? 'yr' : sub.billingCycle === 'QUARTERLY' ? 'qtr' : 'mo'}</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                        {BILLING_LABELS[sub.billingCycle] || sub.billingCycle}
                        {sub.autoRenew && <RefreshCw size={11} className="inline ml-1 opacity-60" />}
                      </td>
                      <td className="px-4 py-3">
                        {sub.renewalDate ? (
                          <div>
                            <div className={`text-[13px] ${isExpiring ? 'text-amber-500' : 'text-[var(--text-primary)]'}`}>
                              {new Date(sub.renewalDate).toLocaleDateString()}
                            </div>
                            {isExpiring && (
                              <div className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
                                <AlertTriangle size={10} /> {days} days left
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[13px] text-[var(--text-secondary)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] px-2.5 py-0.5 rounded-md font-semibold" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[12px] px-2.5 py-0.5 rounded-md font-medium" style={{ background: `${catCfg.color}15`, color: catCfg.color }}>
                          {sub.category || 'Other'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {sub.loginUrl && (
                            <a href={sub.loginUrl} target="_blank" rel="noopener noreferrer"
                              className="p-1 rounded-md text-[var(--text-secondary)] inline-flex hover:bg-[var(--bg-elevated)]">
                              <ExternalLink size={14} />
                            </a>
                          )}
                          {canCreate && (
                            <>
                              <button data-testid={`edit-sub-${sub.id}`} className="p-1 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] bg-transparent border-none cursor-pointer" onClick={() => openEdit(sub)}>
                                <Edit3 size={14} />
                              </button>
                              <button data-testid={`delete-sub-${sub.id}`} className="p-1 rounded-md text-red-600 hover:bg-red-50 bg-transparent border-none cursor-pointer" onClick={() => handleDelete(sub.id)}>
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
        <div className="fixed inset-0 z-[1060] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative w-[580px] max-w-[95vw] max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h5 className="m-0 font-bold text-[var(--text-primary)]">{editingId ? 'Edit Subscription' : 'Add Subscription'}</h5>
              <button className="bg-transparent border-none text-[var(--text-secondary)] cursor-pointer p-1" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelClass}>Name *</label>
                  <input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Figma Pro" />
                </div>
                <div>
                  <label className={labelClass}>Provider</label>
                  <input className={inputClass} value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="e.g. Figma Inc." />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className={labelClass}>Plan</label>
                  <input className={inputClass} value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} placeholder="e.g. Pro, Enterprise" />
                </div>
                <div>
                  <label className={labelClass}>Cost *</label>
                  <input type="number" step="0.01" className={inputClass} value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="0" />
                </div>
                <div>
                  <label className={labelClass}>Billing Cycle</label>
                  <select className={inputClass} value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelClass}>Start Date *</label>
                  <input type="date" className={inputClass} value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Renewal Date</label>
                  <input type="date" className={inputClass} value={form.renewalDate} onChange={e => setForm(f => ({ ...f, renewalDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className={labelClass}>Category</label>
                  <select className={inputClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {Object.keys(CATEGORY_CONFIG).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Currency</label>
                  <select className={inputClass} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className={labelClass}>Login URL</label>
                <input className={inputClass} value={form.loginUrl} onChange={e => setForm(f => ({ ...f, loginUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="mb-3">
                <label className={labelClass}>Linked Credential</label>
                <select className={inputClass} value={form.credentialId} onChange={e => setForm(f => ({ ...f, credentialId: e.target.value }))}>
                  <option value="">None</option>
                  {credentials.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className={labelClass}>Notes</label>
                <textarea className={`${inputClass} resize-y`} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." />
              </div>
              <div className="mb-3">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer text-[var(--text-primary)]">
                  <input type="checkbox" checked={form.autoRenew} onChange={e => setForm(f => ({ ...f, autoRenew: e.target.checked }))} className="accent-[#7C3AED]" />
                  Auto-renew enabled
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-medium" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="bg-[#7C3AED] text-white rounded-lg px-5 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 disabled:opacity-70">
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
