import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { Receipt } from 'lucide-react';
import { expensesApi } from '../services/api';
import EmptyState from '../components/ui/EmptyState';

const CATEGORIES = [
  { key: 'TRAVEL', label: 'Travel', icon: '\u2708', color: '#2563EB' },
  { key: 'FOOD', label: 'Food', icon: '\uD83C\uDF7D', color: '#16A34A' },
  { key: 'EQUIPMENT', label: 'Equipment', icon: '\uD83D\uDDA5', color: '#8B3FE9' },
  { key: 'SOFTWARE', label: 'Software', icon: '\uD83D\uDCBB', color: '#6366F1' },
  { key: 'OFFICE', label: 'Office', icon: '\uD83C\uDFE2', color: '#EA580C' },
  { key: 'MARKETING', label: 'Marketing', icon: '\uD83D\uDCE2', color: '#D97706' },
  { key: 'FUEL', label: 'Fuel', icon: '\u26FD', color: '#CB3939' },
  { key: 'OTHER', label: 'Other', icon: '\uD83D\uDCCE', color: '#5B6B76' },
];

const STATUS_MAP = {
  PENDING: { label: 'Pending', cls: 'bg-[#EA580C]/10 text-[#EA580C]' },
  SUBMITTED: { label: 'Submitted', cls: 'bg-[#EA580C]/10 text-[#EA580C]' },
  APPROVED: { label: 'Approved', cls: 'bg-[#16A34A]/10 text-[#16A34A]' },
  REJECTED: { label: 'Rejected', cls: 'bg-[#CB3939]/10 text-[#CB3939]' },
  REIMBURSED: { label: 'Reimbursed', cls: 'bg-[#2563EB]/10 text-[#2563EB]' },
  DRAFT: { label: 'Draft', cls: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' },
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

  useEffect(() => { dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Expenses' }); }, [dispatch]);

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
    } catch (err) { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  }, [statusFilter, categoryFilter, dateFrom, dateTo]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const stats = {
    totalSubmitted: expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    approved: expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    pending: expenses.filter(e => e.status === 'PENDING' || e.status === 'SUBMITTED').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    reimbursed: expenses.filter(e => e.status === 'REIMBURSED').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    pendingCount: expenses.filter(e => e.status === 'PENDING' || e.status === 'SUBMITTED').length,
    approvedCount: expenses.filter(e => e.status === 'APPROVED').length,
  };

  const openSubmit = () => { setForm({ ...emptyExpense }); setReceiptPreview(null); setShowModal(true); };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, receipt: file }));
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(reader.result);
      reader.readAsDataURL(file);
    } else { setReceiptPreview(null); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.warning('Title is required'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.warning('Enter a valid amount'); return; }
    if (!form.category) { toast.warning('Select a category'); return; }
    try {
      setSaving(true);
      const payload = { title: form.title, description: form.description, category: form.category, amount: parseFloat(form.amount), currency: form.currency || 'INR' };
      if (form.receipt) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => { reader.onload = () => resolve(reader.result); reader.readAsDataURL(form.receipt); });
        payload.receipt = base64;
      }
      await expensesApi.create(payload);
      toast.success('Expense submitted');
      setShowModal(false);
      fetchExpenses();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to submit expense'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (expense) => { try { await expensesApi.update(expense.id, { status: 'APPROVED' }); toast.success('Expense approved'); fetchExpenses(); } catch { toast.error('Failed to approve'); } };
  const handleReject = async (expense) => { try { await expensesApi.update(expense.id, { status: 'REJECTED' }); toast.success('Expense rejected'); fetchExpenses(); } catch { toast.error('Failed to reject'); } };
  const handleReimburse = async (expense) => { try { await expensesApi.update(expense.id, { status: 'REIMBURSED', reimbursed_at: new Date().toISOString() }); toast.success('Marked as reimbursed'); fetchExpenses(); } catch { toast.error('Failed to update'); } };
  const handleDelete = async (id) => { if (!window.confirm('Delete this expense?')) return; try { await expensesApi.delete(id); toast.success('Expense deleted'); fetchExpenses(); } catch { toast.error('Failed to delete'); } };

  const getCategoryInfo = (key) => CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
  const formatCurrency = (v, currency) => { const sym = getCurrencySymbol(currency || 'INR'); return `${sym}${(parseFloat(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const hasActiveFilters = statusFilter || categoryFilter || dateFrom || dateTo;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight font-[Manrope]">Expenses</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Track, submit, and manage expense reports</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons data={expenses} pageType="expenses" title="Expenses Report" filename="expenses" />
          <button data-testid="submit-expense" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-2" onClick={openSubmit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Submit Expense
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Submitted', value: formatCurrency(stats.totalSubmitted), bg: 'rgba(124,58,237,0.1)', color: '#7C3AED', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
          { label: `Approved (${stats.approvedCount})`, value: formatCurrency(stats.approved), bg: 'rgba(22,163,74,0.1)', color: '#16A34A', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
          { label: `Pending (${stats.pendingCount})`, value: formatCurrency(stats.pending), bg: 'rgba(234,88,12,0.1)', color: '#EA580C', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
          { label: 'Reimbursed', value: formatCurrency(stats.reimbursed), bg: 'rgba(37,99,235,0.1)', color: '#2563EB', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
        ].map(s => (
          <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="text-[22px] font-bold text-[var(--text-primary)]">{s.value}</div>
            <div className="text-[13px] text-[var(--text-secondary)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl mb-5">
        <div className="px-5 py-3 flex gap-3 items-center flex-wrap">
          <select className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px] w-[150px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px] w-[150px]" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <label className="text-[12px] text-[var(--text-muted)] whitespace-nowrap">From</label>
            <input type="date" className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px] w-[140px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[12px] text-[var(--text-muted)] whitespace-nowrap">To</label>
            <input type="date" className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px] w-[140px]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {hasActiveFilters && (
            <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => { setStatusFilter(''); setCategoryFilter(''); setDateFrom(''); setDateTo(''); }}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Expense Table */}
      {loading ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-center py-16">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-[var(--text-muted)]">Loading expenses...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
          <EmptyState icon={Receipt} title="No expenses" description="Submit your first expense report" actionLabel="Submit Expense" onAction={openSubmit} />
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-[var(--border-default)]">
                  {['Title', 'Category', 'Amount', 'Receipt', 'Status', 'Submitted By', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => {
                  const cat = getCategoryInfo(expense.category);
                  const st = STATUS_MAP[expense.status] || STATUS_MAP.PENDING;
                  return (
                    <tr key={expense.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-[13.5px] text-[var(--text-primary)]">{expense.title}</div>
                        {expense.description && <div className="text-[12px] text-[var(--text-muted)] mt-0.5 max-w-[200px] truncate">{expense.description}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-md flex items-center justify-center text-[12px]" style={{ background: `${cat.color}15` }}>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-bold text-[14px] text-[var(--text-primary)]">{formatCurrency(expense.amount, expense.currency)}</td>
                      <td className="px-3 py-2.5">
                        {expense.receipt ? (
                          <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-[11px] hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1"
                            onClick={() => { if (expense.receipt.startsWith('data:') || expense.receipt.startsWith('http')) window.open(expense.receipt, '_blank'); }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                            View
                          </button>
                        ) : <span className="text-[12px] text-[var(--text-muted)]">No receipt</span>}
                      </td>
                      <td className="px-3 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span></td>
                      <td className="px-3 py-2.5 text-[var(--text-secondary)]">{expense.submitter ? `${expense.submitter.firstName} ${expense.submitter.lastName}` : expense.submitted_by || '-'}</td>
                      <td className="px-3 py-2.5 text-[var(--text-muted)]">{formatDate(expense.createdAt || expense.expenseDate || expense.created_at || expense.date)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          {(expense.status === 'PENDING' || expense.status === 'SUBMITTED') && (
                            <>
                              <button className="bg-[#16A34A] text-white rounded-lg px-2 py-1 hover:bg-[#16A34A]/90 transition-colors" onClick={() => handleApprove(expense)} title="Approve">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                              </button>
                              <button className="bg-[#CB3939] text-white rounded-lg px-2 py-1 hover:bg-[#CB3939]/90 transition-colors" onClick={() => handleReject(expense)} title="Reject">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </>
                          )}
                          {expense.status === 'APPROVED' && (
                            <button className="bg-[#7C3AED] text-white rounded-lg px-2 py-1 hover:bg-[#7C3AED]/90 transition-colors" onClick={() => handleReimburse(expense)} title="Reimburse">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                            </button>
                          )}
                          <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => handleDelete(expense.id)} title="Delete">
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[520px] max-w-[90vw] max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex justify-between items-center">
              <h4 className="text-[16px] font-bold text-[var(--text-primary)] m-0">Submit Expense</h4>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1.5 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Title *</label>
                <input data-testid="expense-title" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Client dinner, Flight to NYC" required />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Description</label>
                <textarea className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px] resize-y" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Additional details..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Category *</label>
                  <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px]" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Amount *</label>
                  <div className="flex gap-2">
                    <select className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px] w-[90px] flex-shrink-0" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                      {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.symbol} {c.value}</option>)}
                    </select>
                    <input className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Receipt Upload</label>
                <div className="border-2 border-dashed border-[var(--border-default)] rounded-lg p-5 text-center cursor-pointer bg-[var(--bg-elevated)] hover:border-[#7C3AED]/50 transition-colors"
                  onClick={() => document.getElementById('receipt-input').click()}>
                  <input id="receipt-input" type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                  {receiptPreview ? (
                    <div>
                      <img src={receiptPreview} alt="Receipt preview" className="max-h-[120px] max-w-full rounded-lg mx-auto mb-2" />
                      <div className="text-[12px] text-[var(--text-muted)]">{form.receipt?.name}</div>
                    </div>
                  ) : form.receipt ? (
                    <div>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" className="mx-auto mb-2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                      <div className="text-[13px] text-[var(--text-primary)]">{form.receipt.name}</div>
                    </div>
                  ) : (
                    <div>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mx-auto mb-2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <div className="text-[13px] text-[var(--text-muted)]">Click to upload receipt</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1">Images or PDF, max 5MB</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" data-testid="confirm-submit-expense" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors" disabled={saving}>
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
