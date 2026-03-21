import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { invoicesApi, clientsApi } from '../services/api';

const STATUS_MAP = {
  DRAFT: { label: 'Draft', cls: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]', color: '#596882' },
  SENT: { label: 'Sent', cls: 'bg-[#2563EB]/10 text-[#2563EB]', color: '#2563EB' },
  PAID: { label: 'Paid', cls: 'bg-[#16A34A]/10 text-[#16A34A]', color: '#16A34A' },
  OVERDUE: { label: 'Overdue', cls: 'bg-[#CB3939]/10 text-[#CB3939]', color: '#CB3939' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]', color: '#2d3436' },
};

const emptyLineItem = { description: '', quantity: 1, rate: 0, amount: 0 };
const generateInvoiceNumber = () => { const yr = new Date().getFullYear(); const num = String(Math.floor(Math.random() * 9000) + 1000); return `INV-${yr}-${num}`; };

export default function Invoices() {
  const dispatch = useDispatch();
  const [invoices, setInvoices] = useState([]); const [clients, setClients] = useState([]); const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false); const [showPreview, setShowPreview] = useState(null); const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState(''); const [search, setSearch] = useState('');
  const [form, setForm] = useState({ invoice_number: '', client_id: '', due_date: '', notes: '', tax_rate: 0, discount: 0, currency: 'INR' });
  const [lineItems, setLineItems] = useState([{ ...emptyLineItem }]);

  useEffect(() => { dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Invoices' }); }, [dispatch]);

  const fetchInvoices = useCallback(async () => {
    try { setLoading(true); const params = {}; if (statusFilter) params.status = statusFilter; if (search) params.search = search; const { data } = await invoicesApi.list(params); setInvoices(Array.isArray(data) ? data : data.invoices || data.data || []); }
    catch (err) { toast.error('Failed to load invoices'); } finally { setLoading(false); }
  }, [statusFilter, search]);

  const fetchClients = useCallback(async () => { try { const { data } = await clientsApi.list(); setClients(Array.isArray(data) ? data : data.clients || data.data || []); } catch {} }, []);
  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  const calcLineAmount = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
  const subtotal = lineItems.reduce((s, item) => s + calcLineAmount(item), 0);
  const taxAmount = subtotal * (parseFloat(form.tax_rate) || 0) / 100;
  const discountAmount = parseFloat(form.discount) || 0;
  const total = subtotal + taxAmount - discountAmount;

  const stats = {
    totalInvoiced: invoices.reduce((s, i) => s + (parseFloat(i.total) || parseFloat(i.amount) || 0), 0),
    paid: invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + (parseFloat(i.total) || parseFloat(i.amount) || 0), 0),
    pending: invoices.filter(i => i.status === 'SENT' || i.status === 'DRAFT').reduce((s, i) => s + (parseFloat(i.total) || parseFloat(i.amount) || 0), 0),
    overdue: invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + (parseFloat(i.total) || parseFloat(i.amount) || 0), 0),
  };

  const openCreate = () => { setForm({ invoice_number: generateInvoiceNumber(), client_id: '', due_date: '', notes: '', tax_rate: 0, discount: 0, currency: 'INR' }); setLineItems([{ ...emptyLineItem }]); setShowModal(true); };
  const updateLineItem = (index, field, value) => { setLineItems(prev => { const updated = [...prev]; updated[index] = { ...updated[index], [field]: value }; updated[index].amount = calcLineAmount(updated[index]); return updated; }); };
  const addLineItem = () => setLineItems(prev => [...prev, { ...emptyLineItem }]);
  const removeLineItem = (index) => { if (lineItems.length <= 1) return; setLineItems(prev => prev.filter((_, i) => i !== index)); };

  const handleCreate = async (e) => {
    e.preventDefault(); if (!form.client_id) { toast.warning('Select a client'); return; } if (lineItems.every(li => !li.description.trim())) { toast.warning('Add at least one line item'); return; }
    const selectedClient = clients.find(c => String(c.id) === String(form.client_id));
    try { setSaving(true); await invoicesApi.create({ invoiceNumber: form.invoice_number, clientName: selectedClient?.name || '', clientEmail: selectedClient?.email || '', items: JSON.stringify(lineItems.filter(li => li.description.trim())), subtotal, tax: taxAmount, discount: discountAmount, total, dueDate: form.due_date || undefined, notes: form.notes, currency: form.currency, status: 'DRAFT' }); toast.success('Invoice created'); setShowModal(false); fetchInvoices(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to create invoice'); } finally { setSaving(false); }
  };

  const markAsPaid = async (invoice) => { try { await invoicesApi.update(invoice.id, { status: 'PAID', paid_at: new Date().toISOString() }); toast.success('Invoice marked as paid'); fetchInvoices(); } catch { toast.error('Failed to update'); } };
  const markAsSent = async (invoice) => { try { await invoicesApi.update(invoice.id, { status: 'SENT', sent_at: new Date().toISOString() }); toast.success('Invoice sent'); fetchInvoices(); } catch { toast.error('Failed to send'); } };
  const handleDelete = async (id) => { if (!window.confirm('Delete this invoice?')) return; try { await invoicesApi.delete(id); toast.success('Invoice deleted'); fetchInvoices(); } catch { toast.error('Failed to delete'); } };

  const getClientName = (id) => { const c = clients.find(cl => cl.id === id || String(cl.id) === String(id)); return c ? c.name : ''; };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const CURRENCY_SYMBOLS = { INR: '\u20B9', USD: '$' };
  const formatCurrency = (v, currency) => { const sym = CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS[form.currency] || '\u20B9'; return `${sym}${(parseFloat(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight font-[Manrope]">Invoices</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Create and manage your business invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="create-invoice" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-2" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Invoiced', value: stats.totalInvoiced, bg: 'rgba(124,58,237,0.1)', color: '#7C3AED' },
          { label: 'Paid', value: stats.paid, bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
          { label: 'Pending', value: stats.pending, bg: 'rgba(234,88,12,0.1)', color: '#EA580C' },
          { label: 'Overdue', value: stats.overdue, bg: 'rgba(203,57,57,0.1)', color: '#CB3939' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: s.bg, color: s.color }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div className="text-[22px] font-bold text-[var(--text-primary)]">{formatCurrency(s.value)}</div>
            <div className="text-[13px] text-[var(--text-secondary)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl mb-5">
        <div className="px-5 py-3 flex gap-3 items-center flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input data-testid="search-invoices" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg pl-9 pr-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px] w-[160px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Invoice Table */}
      {loading ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-center py-16">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-[var(--text-muted)]">Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-center py-16">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mx-auto mb-3"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <h5 className="text-[var(--text-primary)] font-semibold mb-1">No invoices yet</h5>
          <p className="text-[var(--text-muted)] text-[13px]">Create your first invoice to get started</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b-2 border-[var(--border-default)]">
                {['Invoice #', 'Client', 'Amount', 'Tax', 'Total', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const st = STATUS_MAP[inv.status] || STATUS_MAP.DRAFT;
                return (
                  <tr key={inv.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-3 py-2.5"><span className="font-bold font-mono text-[13px] text-[var(--text-primary)]">{inv.invoiceNumber || inv.invoice_number || `INV-${inv.id}`}</span></td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">{inv.clientName || getClientName(inv.clientId || inv.client_id) || inv.client_name || '-'}</td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">{formatCurrency(inv.subtotal || inv.amount, inv.currency)}</td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">{formatCurrency(inv.tax || 0, inv.currency)}</td>
                    <td className="px-3 py-2.5 font-bold text-[var(--text-primary)]">{formatCurrency(inv.total || inv.amount, inv.currency)}</td>
                    <td className="px-3 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span></td>
                    <td className="px-3 py-2.5 text-[var(--text-muted)]">{formatDate(inv.createdAt || inv.created_at || inv.date)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowPreview(inv)} title="Preview">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        {inv.status === 'DRAFT' && <button className="bg-[#7C3AED] text-white rounded-lg px-2 py-1 hover:bg-[#7C3AED]/90 transition-colors" onClick={() => markAsSent(inv)} title="Send"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>}
                        {(inv.status === 'SENT' || inv.status === 'OVERDUE') && <button className="bg-[#16A34A] text-white rounded-lg px-2 py-1 hover:bg-[#16A34A]/90 transition-colors" onClick={() => markAsPaid(inv)} title="Mark Paid"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></button>}
                        <button className="bg-[#CB3939] text-white rounded-lg px-2 py-1 hover:bg-[#CB3939]/90 transition-colors" onClick={() => handleDelete(inv.id)} title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Preview */}
      {showPreview && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPreview(null)} />
          <div className="relative bg-white rounded-xl w-[680px] max-w-[95vw] max-h-[90vh] overflow-y-auto shadow-2xl text-[#10222F]">
            <div className="p-10">
              <div className="flex justify-between mb-8">
                <div>
                  <div className="text-[28px] font-[800] text-[#111827] tracking-tighter">INVOICE</div>
                  <div className="text-[14px] text-[#5B6B76] mt-1">{showPreview.invoiceNumber || showPreview.invoice_number || `INV-${showPreview.id}`}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[16px]">Know AI</div>
                  <div className="text-[12px] text-[#5B6B76] leading-relaxed">Enterprise Resource Planning<br />Date: {formatDate(showPreview.createdAt || showPreview.created_at || showPreview.date)}<br />{(showPreview.dueDate || showPreview.due_date) && <>Due: {formatDate(showPreview.dueDate || showPreview.due_date)}</>}</div>
                </div>
              </div>
              <div className="mb-6">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#5B6B76] mb-1.5">Bill To</div>
                <div className="text-[15px] font-semibold">{showPreview.clientName || getClientName(showPreview.clientId || showPreview.client_id) || 'Client'}</div>
              </div>
              <table className="w-full border-collapse mb-6">
                <thead><tr className="border-b-2 border-[#111827]"><th className="text-left py-2 text-[11px] font-bold uppercase tracking-wider text-[#5B6B76]">Description</th><th className="text-right py-2 text-[11px] font-bold uppercase tracking-wider text-[#5B6B76] w-[60px]">Qty</th><th className="text-right py-2 text-[11px] font-bold uppercase tracking-wider text-[#5B6B76] w-[100px]">Rate</th><th className="text-right py-2 text-[11px] font-bold uppercase tracking-wider text-[#5B6B76] w-[100px]">Amount</th></tr></thead>
                <tbody>
                  {(() => { let items = showPreview.items || showPreview.line_items; if (typeof items === 'string') { try { items = JSON.parse(items); } catch { items = null; } } return (items && items.length > 0) ? items : [{ description: showPreview.notes || 'Services', quantity: 1, rate: showPreview.amount || showPreview.total, amount: showPreview.amount || showPreview.total }]; })().map((item, i) => (
                    <tr key={i} className="border-b border-[#E7E7E8]"><td className="py-2.5 text-[13px]">{item.description}</td><td className="py-2.5 text-[13px] text-right">{item.quantity || 1}</td><td className="py-2.5 text-[13px] text-right">{formatCurrency(item.rate || item.amount)}</td><td className="py-2.5 text-[13px] text-right font-semibold">{formatCurrency(item.amount || (item.quantity * item.rate))}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-[250px]">
                  <div className="flex justify-between py-1.5 text-[13px]"><span className="text-[#5B6B76]">Subtotal</span><span>{formatCurrency(showPreview.subtotal || showPreview.amount || showPreview.total)}</span></div>
                  {showPreview.tax > 0 && <div className="flex justify-between py-1.5 text-[13px]"><span className="text-[#5B6B76]">Tax</span><span>{formatCurrency(showPreview.tax)}</span></div>}
                  {showPreview.discount > 0 && <div className="flex justify-between py-1.5 text-[13px]"><span className="text-[#5B6B76]">Discount</span><span>-{formatCurrency(showPreview.discount)}</span></div>}
                  <div className="flex justify-between py-2.5 text-[16px] font-[800] border-t-2 border-[#10222F] mt-1.5"><span>Total</span><span className="text-[#111827]">{formatCurrency(showPreview.total || showPreview.amount)}</span></div>
                </div>
              </div>
              <div className="text-center mt-6"><span className={`text-[14px] px-5 py-1.5 rounded-full font-medium ${(STATUS_MAP[showPreview.status] || STATUS_MAP.DRAFT).cls}`}>{(STATUS_MAP[showPreview.status] || STATUS_MAP.DRAFT).label}</span></div>
            </div>
            <div className="px-10 py-4 border-t border-[#E7E7E8] flex justify-end gap-2 bg-[#FAFAFA] rounded-b-xl">
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowPreview(null)}>Close</button>
              {showPreview.status === 'DRAFT' && <button className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors" onClick={() => { markAsSent(showPreview); setShowPreview(null); }}>Send Invoice</button>}
              {(showPreview.status === 'SENT' || showPreview.status === 'OVERDUE') && <button className="bg-[#16A34A] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#16A34A]/90 transition-colors" onClick={() => { markAsPaid(showPreview); setShowPreview(null); }}>Mark as Paid</button>}
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[720px] max-w-[95vw] max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex justify-between items-center">
              <h4 className="text-[16px] font-bold text-[var(--text-primary)] m-0">Create Invoice</h4>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1.5 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowModal(false)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <form onSubmit={handleCreate} className="p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div><label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Invoice #</label><input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px] font-mono" value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} /></div>
                <div><label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Client *</label><select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px]" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} required><option value="">Select client</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Due Date</label><input type="date" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px]" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
                <div><label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Currency</label><select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px]" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}><option value="INR">INR</option><option value="USD">USD</option></select></div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Line Items</label>
                  <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1" onClick={addLineItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Row
                  </button>
                </div>
                <div className="border border-[var(--border-default)] rounded-lg overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead><tr className="bg-[var(--bg-elevated)]"><th className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Description</th><th className="text-center px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] w-[80px]">Qty</th><th className="text-center px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] w-[110px]">Rate</th><th className="text-right px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] w-[110px]">Amount</th><th className="w-10" /></tr></thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr key={idx} className="border-t border-[var(--border-subtle)]">
                          <td className="p-1.5"><input className="w-full bg-transparent border-none px-2 py-1 text-[var(--text-primary)] outline-none text-[13px]" placeholder="Service description" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} /></td>
                          <td className="p-1.5"><input className="w-full bg-transparent border-none px-2 py-1 text-[var(--text-primary)] outline-none text-[13px] text-center" type="number" min="1" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', e.target.value)} /></td>
                          <td className="p-1.5"><input className="w-full bg-transparent border-none px-2 py-1 text-[var(--text-primary)] outline-none text-[13px] text-center" type="number" min="0" step="0.01" value={item.rate} onChange={e => updateLineItem(idx, 'rate', e.target.value)} /></td>
                          <td className="px-3 py-1.5 text-right font-semibold text-[13px] text-[var(--text-primary)]">{formatCurrency(calcLineAmount(item))}</td>
                          <td className="p-1.5 text-center">{lineItems.length > 1 && <button type="button" onClick={() => removeLineItem(idx)} className="bg-transparent border-none cursor-pointer text-[#CB3939] p-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div><label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Notes</label><textarea className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] outline-none text-[13px] resize-y" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, additional notes..." /></div>
                <div className="bg-[var(--bg-elevated)] rounded-lg p-4">
                  <div className="flex justify-between mb-2 text-[13px]"><span className="text-[var(--text-muted)]">Subtotal</span><span className="font-semibold text-[var(--text-primary)]">{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between items-center mb-2 text-[13px]">
                    <div className="flex items-center gap-1.5"><span className="text-[var(--text-muted)]">Tax</span><input className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded px-1.5 py-0.5 text-[12px] text-center w-[60px] text-[var(--text-primary)] outline-none" type="number" min="0" max="100" step="0.1" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} /><span className="text-[var(--text-muted)] text-[12px]">%</span></div>
                    <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-3 text-[13px]">
                    <div className="flex items-center gap-1.5"><span className="text-[var(--text-muted)]">Discount</span><input className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded px-1.5 py-0.5 text-[12px] text-center w-[80px] text-[var(--text-primary)] outline-none" type="number" min="0" step="0.01" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} /></div>
                    <span className="font-semibold text-[var(--text-primary)]">-{formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t-2 border-[var(--border-default)] text-[16px]"><span className="font-[800] text-[var(--text-primary)]">Total</span><span className="font-[800] text-[#7C3AED]">{formatCurrency(total)}</span></div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" data-testid="submit-invoice" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors" disabled={saving}>{saving ? 'Creating...' : 'Create Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
