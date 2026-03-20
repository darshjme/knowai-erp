import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { Receipt } from 'lucide-react';
import { expensesApi } from '../services/api';
import EmptyState from '../components/ui/EmptyState';

const CATEGORIES = [
  { key: 'TRAVEL', label: 'Travel', icon: '✈', color: '#2563EB' },
  { key: 'FOOD', label: 'Food', icon: '🍽', color: '#16A34A' },
  { key: 'EQUIPMENT', label: 'Equipment', icon: '🖥', color: '#8B3FE9' },
  { key: 'SOFTWARE', label: 'Software', icon: '💻', color: '#6366F1' },
  { key: 'OFFICE', label: 'Office', icon: '🏢', color: '#EA580C' },
  { key: 'MARKETING', label: 'Marketing', icon: '📢', color: '#D97706' },
  { key: 'FUEL', label: 'Fuel', icon: '⛽', color: '#CB3939' },
  { key: 'OTHER', label: 'Other', icon: '📎', color: '#5B6B76' },
];

const STATUS_MAP = {
  PENDING: { label: 'Pending', cls: 'warning' },
  SUBMITTED: { label: 'Submitted', cls: 'warning' },
  APPROVED: { label: 'Approved', cls: 'success' },
  REJECTED: { label: 'Rejected', cls: 'danger' },
  REIMBURSED: { label: 'Reimbursed', cls: 'info' },
  DRAFT: { label: 'Draft', cls: 'secondary' },
};

const CURRENCIES = [
  { value: 'INR', label: 'INR', symbol: '\u20B9' },
  { value: 'USD', label: 'USD', symbol: '$' },
];
const getCurrencySymbol = (code) => CURRENCIES.find(c => c.value === code)?.symbol || '\u20B9';

const emptyExpense = { title: '', description: '', category: '', amount: '', receipt: null, currency: 'INR' };

export default function Expenses() {
  const dispatch = useDispatch();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyExpense });
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Expenses' });
  }, [dispatch]);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const { data } = await expensesApi.list(params);
      setExpenses(Array.isArray(data) ? data : data.expenses || data.data || []);
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, dateFrom, dateTo]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // Stats
  const stats = {
    totalSubmitted: expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    approved: expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    pending: expenses.filter(e => e.status === 'PENDING' || e.status === 'SUBMITTED').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    reimbursed: expenses.filter(e => e.status === 'REIMBURSED').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    pendingCount: expenses.filter(e => e.status === 'PENDING' || e.status === 'SUBMITTED').length,
    approvedCount: expenses.filter(e => e.status === 'APPROVED').length,
  };

  const openSubmit = () => {
    setForm({ ...emptyExpense });
    setReceiptPreview(null);
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, receipt: file }));
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.warning('Title is required'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.warning('Enter a valid amount'); return; }
    if (!form.category) { toast.warning('Select a category'); return; }

    try {
      setSaving(true);
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        amount: parseFloat(form.amount),
        currency: form.currency || 'INR',
      };

      // If there's a receipt file, encode as base64 and send as "receipt"
      if (form.receipt) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(form.receipt);
        });
        payload.receipt = base64;
      }

      await expensesApi.create(payload);
      toast.success('Expense submitted');
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit expense');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (expense) => {
    try {
      await expensesApi.update(expense.id, { status: 'APPROVED' });
      toast.success('Expense approved');
      fetchExpenses();
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async (expense) => {
    try {
      await expensesApi.update(expense.id, { status: 'REJECTED' });
      toast.success('Expense rejected');
      fetchExpenses();
    } catch { toast.error('Failed to reject'); }
  };

  const handleReimburse = async (expense) => {
    try {
      await expensesApi.update(expense.id, { status: 'REIMBURSED', reimbursed_at: new Date().toISOString() });
      toast.success('Marked as reimbursed');
      fetchExpenses();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await expensesApi.delete(id);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch { toast.error('Failed to delete'); }
  };

  const getCategoryInfo = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
  const formatCurrency = (v, currency) => {
    const sym = getCurrencySymbol(currency || 'INR');
    return `${sym}${(parseFloat(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

  const hasActiveFilters = statusFilter || categoryFilter || dateFrom || dateTo;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Expenses</h1>
          <p>Track, submit, and manage expense reports</p>
        </div>
        <div className="page-actions">
          <ExportButtons data={expenses} pageType="expenses" title="Expenses Report" filename="expenses" />
          <button className="kai-btn kai-btn-primary" onClick={openSubmit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Submit Expense
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--kai-primary-light, rgba(17,24,39,0.08))', color: 'var(--kai-primary)', marginBottom: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div className="stat-value">{formatCurrency(stats.totalSubmitted)}</div>
          <div className="stat-label">Total Submitted</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--kai-success)', marginBottom: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="stat-value">{formatCurrency(stats.approved)}</div>
          <div className="stat-label">Approved ({stats.approvedCount})</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(234,88,12,0.1)', color: 'var(--kai-warning)', marginBottom: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-value">{formatCurrency(stats.pending)}</div>
          <div className="stat-label">Pending ({stats.pendingCount})</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--kai-info)', marginBottom: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div className="stat-value">{formatCurrency(stats.reimbursed)}</div>
          <div className="stat-label">Reimbursed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="kai-card" style={{ marginBottom: 20 }}>
        <div className="kai-card-body" style={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="kai-select" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="kai-select" style={{ width: 150 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--kai-text-muted)', whiteSpace: 'nowrap' }}>From</label>
              <input type="date" className="kai-input" style={{ width: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 12, color: 'var(--kai-text-muted)', whiteSpace: 'nowrap' }}>To</label>
              <input type="date" className="kai-input" style={{ width: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            {hasActiveFilters && (
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => { setStatusFilter(''); setCategoryFilter(''); setDateFrom(''); setDateTo(''); }}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expense Table */}
      {loading ? (
        <div className="kai-card">
          <div className="kai-card-body" style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner-border text-primary" role="status" />
            <p style={{ marginTop: 12, color: 'var(--kai-text-muted)' }}>Loading expenses...</p>
          </div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="kai-card">
          <div className="kai-card-body">
            <EmptyState
              icon={Receipt}
              title="No expenses"
              description="Submit your first expense report"
              actionLabel="Submit Expense"
              onAction={openSubmit}
            />
          </div>
        </div>
      ) : (
        <div className="kai-card">
          <div className="kai-card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="kai-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Receipt</th>
                  <th>Status</th>
                  <th>Submitted By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => {
                  const cat = getCategoryInfo(expense.category);
                  const st = STATUS_MAP[expense.status] || STATUS_MAP.PENDING;
                  return (
                    <tr key={expense.id}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{expense.title}</div>
                          {expense.description && (
                            <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {expense.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 24, height: 24, borderRadius: 6, background: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                            {cat.icon}
                          </span>
                          <span style={{ fontSize: 13 }}>{cat.label}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 14 }}>{formatCurrency(expense.amount, expense.currency)}</td>
                      <td>
                        {expense.receipt ? (
                          <button
                            className="kai-btn kai-btn-outline kai-btn-sm"
                            onClick={() => {
                              if (expense.receipt.startsWith('data:') || expense.receipt.startsWith('http')) {
                                window.open(expense.receipt, '_blank');
                              }
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                            View
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>No receipt</span>
                        )}
                      </td>
                      <td><span className={`kai-badge ${st.cls}`}>{st.label}</span></td>
                      <td style={{ fontSize: 13 }}>{expense.submitter ? `${expense.submitter.firstName} ${expense.submitter.lastName}` : expense.submitted_by || '-'}</td>
                      <td style={{ fontSize: 13, color: 'var(--kai-text-muted)' }}>{formatDate(expense.createdAt || expense.expenseDate || expense.created_at || expense.date)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(expense.status === 'PENDING' || expense.status === 'SUBMITTED') && (
                            <>
                              <button className="kai-btn kai-btn-success kai-btn-sm" onClick={() => handleApprove(expense)} title="Approve">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                              </button>
                              <button className="kai-btn kai-btn-danger kai-btn-sm" onClick={() => handleReject(expense)} title="Reject">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </>
                          )}
                          {expense.status === 'APPROVED' && (
                            <button className="kai-btn kai-btn-primary kai-btn-sm" onClick={() => handleReimburse(expense)} title="Reimburse">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                            </button>
                          )}
                          <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => handleDelete(expense.id)} title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
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

      {/* Submit Expense Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'relative', background: 'var(--kai-surface)', borderRadius: 'var(--kai-radius-lg)', width: 520, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--kai-shadow-lg)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--kai-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Submit Expense</h4>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="kai-label">Title *</label>
                  <input className="kai-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Client dinner, Flight to NYC" required />
                </div>
                <div>
                  <label className="kai-label">Description</label>
                  <textarea className="kai-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details..." style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <label className="kai-label">Category *</label>
                    <select className="kai-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
                      <option value="">Select category</option>
                      {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="kai-label">Amount *</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select className="kai-select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={{ width: 90, flexShrink: 0 }}>
                        {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.symbol} {c.value}</option>)}
                      </select>
                      <input className="kai-input" type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required style={{ flex: 1 }} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="kai-label">Receipt Upload</label>
                  <div
                    style={{
                      border: '2px dashed var(--kai-border)',
                      borderRadius: 'var(--kai-radius)',
                      padding: 20,
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'var(--kai-bg)',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => document.getElementById('receipt-input').click()}
                  >
                    <input
                      id="receipt-input"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    {receiptPreview ? (
                      <div>
                        <img src={receiptPreview} alt="Receipt preview" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 'var(--kai-radius)', marginBottom: 8 }} />
                        <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{form.receipt?.name}</div>
                      </div>
                    ) : form.receipt ? (
                      <div>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--kai-primary)" strokeWidth="1.5" style={{ marginBottom: 8 }}><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                        <div style={{ fontSize: 13, color: 'var(--kai-text)' }}>{form.receipt.name}</div>
                      </div>
                    ) : (
                      <div>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--kai-text-muted)" strokeWidth="1.5" style={{ marginBottom: 8 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <div style={{ fontSize: 13, color: 'var(--kai-text-muted)' }}>Click to upload receipt</div>
                        <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', marginTop: 4 }}>Images or PDF, max 5MB</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary" disabled={saving}>
                  {saving ? 'Submitting...' : 'Submit Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
