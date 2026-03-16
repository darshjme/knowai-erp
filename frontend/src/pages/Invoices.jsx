import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { invoicesApi, clientsApi } from '../services/api';

const STATUS_MAP = {
  DRAFT: { label: 'Draft', cls: 'secondary', color: '#596882' },
  SENT: { label: 'Sent', cls: 'info', color: '#0c5460' },
  PAID: { label: 'Paid', cls: 'success', color: '#155724' },
  OVERDUE: { label: 'Overdue', cls: 'danger', color: '#721c24' },
  CANCELLED: { label: 'Cancelled', cls: 'secondary', color: '#2d3436' },
};

const emptyLineItem = { description: '', quantity: 1, rate: 0, amount: 0 };

const generateInvoiceNumber = () => {
  const yr = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `INV-${yr}-${num}`;
};

export default function Invoices() {
  const dispatch = useDispatch();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Invoice form state
  const [form, setForm] = useState({
    invoice_number: '', client_id: '', due_date: '', notes: '',
    tax_rate: 0, discount: 0,
  });
  const [lineItems, setLineItems] = useState([{ ...emptyLineItem }]);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Invoices' });
  }, [dispatch]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await invoicesApi.list(params);
      setInvoices(Array.isArray(data) ? data : data.invoices || data.data || []);
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await clientsApi.list();
      setClients(Array.isArray(data) ? data : data.clients || data.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Calculations
  const calcLineAmount = (item) => (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
  const subtotal = lineItems.reduce((s, item) => s + calcLineAmount(item), 0);
  const taxAmount = subtotal * (parseFloat(form.tax_rate) || 0) / 100;
  const discountAmount = parseFloat(form.discount) || 0;
  const total = subtotal + taxAmount - discountAmount;

  // Stats
  const stats = {
    totalInvoiced: invoices.reduce((s, i) => s + (parseFloat(i.total) || parseFloat(i.amount) || 0), 0),
    paid: invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + (parseFloat(i.total) || parseFloat(i.amount) || 0), 0),
    pending: invoices.filter(i => i.status === 'SENT' || i.status === 'DRAFT').reduce((s, i) => s + (parseFloat(i.total) || parseFloat(i.amount) || 0), 0),
    overdue: invoices.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + (parseFloat(i.total) || parseFloat(i.amount) || 0), 0),
  };

  const openCreate = () => {
    setForm({ invoice_number: generateInvoiceNumber(), client_id: '', due_date: '', notes: '', tax_rate: 0, discount: 0 });
    setLineItems([{ ...emptyLineItem }]);
    setShowModal(true);
  };

  const updateLineItem = (index, field, value) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      updated[index].amount = calcLineAmount(updated[index]);
      return updated;
    });
  };

  const addLineItem = () => setLineItems(prev => [...prev, { ...emptyLineItem }]);
  const removeLineItem = (index) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.client_id) { toast.warning('Select a client'); return; }
    if (lineItems.every(li => !li.description.trim())) { toast.warning('Add at least one line item'); return; }

    try {
      setSaving(true);
      await invoicesApi.create({
        ...form,
        line_items: lineItems.filter(li => li.description.trim()),
        subtotal, tax: taxAmount, discount: discountAmount, total,
        status: 'DRAFT',
      });
      toast.success('Invoice created');
      setShowModal(false);
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const markAsPaid = async (invoice) => {
    try {
      await invoicesApi.update(invoice.id, { status: 'PAID', paid_at: new Date().toISOString() });
      toast.success('Invoice marked as paid');
      fetchInvoices();
    } catch { toast.error('Failed to update invoice'); }
  };

  const markAsSent = async (invoice) => {
    try {
      await invoicesApi.update(invoice.id, { status: 'SENT', sent_at: new Date().toISOString() });
      toast.success('Invoice sent');
      fetchInvoices();
    } catch { toast.error('Failed to send invoice'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await invoicesApi.delete(id);
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch { toast.error('Failed to delete'); }
  };

  const getClientName = (id) => {
    const c = clients.find(cl => cl.id === id || String(cl.id) === String(id));
    return c ? c.name : '';
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const formatCurrency = (v) => `$${(parseFloat(v) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Invoices</h1>
          <p>Create and manage your business invoices</p>
        </div>
        <div className="page-actions">
          <button className="kai-btn kai-btn-primary" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Invoiced', value: stats.totalInvoiced, color: 'var(--kai-primary)', bg: 'rgba(20,109,247,0.1)', icon: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>, iconExtra: <><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></> },
          { label: 'Paid', value: stats.paid, color: 'var(--kai-success)', bg: 'rgba(22,163,74,0.1)', icon: <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>, iconExtra: <polyline points="22 4 12 14.01 9 11.01"/> },
          { label: 'Pending', value: stats.pending, color: 'var(--kai-warning)', bg: 'rgba(234,88,12,0.1)', icon: <circle cx="12" cy="12" r="10"/>, iconExtra: <><polyline points="12 6 12 12 16 14"/></> },
          { label: 'Overdue', value: stats.overdue, color: 'var(--kai-danger)', bg: 'rgba(203,57,57,0.1)', icon: <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>, iconExtra: <><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></> },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.bg, color: s.color, marginBottom: 12 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{s.icon}{s.iconExtra}</svg>
            </div>
            <div className="stat-value">{formatCurrency(s.value)}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="kai-card" style={{ marginBottom: 20 }}>
        <div className="kai-card-body" style={{ padding: '12px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="kai-search" style={{ flex: 1, minWidth: 200 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="kai-select" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Invoice Table */}
      {loading ? (
        <div className="kai-card">
          <div className="kai-card-body" style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner-border text-primary" role="status" />
            <p style={{ marginTop: 12, color: 'var(--kai-text-muted)' }}>Loading invoices...</p>
          </div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="kai-card">
          <div className="kai-card-body" style={{ textAlign: 'center', padding: 60 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--kai-text-muted)" strokeWidth="1.5" style={{ marginBottom: 12 }}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <h5 style={{ color: 'var(--kai-text)', margin: '0 0 4px' }}>No invoices yet</h5>
            <p style={{ color: 'var(--kai-text-muted)', margin: 0 }}>Create your first invoice to get started</p>
          </div>
        </div>
      ) : (
        <div className="kai-card">
          <div className="kai-card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="kai-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const st = STATUS_MAP[inv.status] || STATUS_MAP.DRAFT;
                  return (
                    <tr key={inv.id}>
                      <td>
                        <span style={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
                          {inv.invoice_number || `INV-${inv.id}`}
                        </span>
                      </td>
                      <td>{getClientName(inv.client_id) || inv.client_name || '-'}</td>
                      <td>{formatCurrency(inv.subtotal || inv.amount)}</td>
                      <td>{formatCurrency(inv.tax || 0)}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(inv.total || inv.amount)}</td>
                      <td><span className={`kai-badge ${st.cls}`}>{st.label}</span></td>
                      <td style={{ fontSize: 13, color: 'var(--kai-text-muted)' }}>{formatDate(inv.created_at || inv.date)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowPreview(inv)} title="Preview">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          {(inv.status === 'DRAFT') && (
                            <button className="kai-btn kai-btn-primary kai-btn-sm" onClick={() => markAsSent(inv)} title="Send">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            </button>
                          )}
                          {(inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                            <button className="kai-btn kai-btn-success kai-btn-sm" onClick={() => markAsPaid(inv)} title="Mark Paid">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                            </button>
                          )}
                          <button className="kai-btn kai-btn-danger kai-btn-sm" onClick={() => handleDelete(inv.id)} title="Delete">
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

      {/* Invoice Preview */}
      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowPreview(null)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 'var(--kai-radius-lg)', width: 680, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--kai-shadow-lg)', color: '#10222F' }}>
            <div style={{ padding: 40 }}>
              {/* Invoice Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#146DF7', letterSpacing: -1 }}>INVOICE</div>
                  <div style={{ fontSize: 14, color: '#5B6B76', marginTop: 4 }}>{showPreview.invoice_number || `INV-${showPreview.id}`}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Know AI</div>
                  <div style={{ fontSize: 12, color: '#5B6B76', lineHeight: 1.8 }}>
                    Enterprise Resource Planning<br />
                    Date: {formatDate(showPreview.created_at || showPreview.date)}<br />
                    {showPreview.due_date && <>Due: {formatDate(showPreview.due_date)}</>}
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, color: '#5B6B76', marginBottom: 6 }}>Bill To</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{getClientName(showPreview.client_id) || showPreview.client_name || 'Client'}</div>
              </div>

              {/* Line Items */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #146DF7' }}>
                    <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#5B6B76' }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#5B6B76', width: 60 }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#5B6B76', width: 100 }}>Rate</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#5B6B76', width: 100 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(showPreview.line_items || [{ description: showPreview.notes || 'Services', quantity: 1, rate: showPreview.amount || showPreview.total, amount: showPreview.amount || showPreview.total }]).map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #E7E7E8' }}>
                      <td style={{ padding: '10px 0', fontSize: 13 }}>{item.description}</td>
                      <td style={{ padding: '10px 0', fontSize: 13, textAlign: 'right' }}>{item.quantity || 1}</td>
                      <td style={{ padding: '10px 0', fontSize: 13, textAlign: 'right' }}>{formatCurrency(item.rate || item.amount)}</td>
                      <td style={{ padding: '10px 0', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.amount || (item.quantity * item.rate))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 250 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                    <span style={{ color: '#5B6B76' }}>Subtotal</span>
                    <span>{formatCurrency(showPreview.subtotal || showPreview.amount || showPreview.total)}</span>
                  </div>
                  {(showPreview.tax > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                      <span style={{ color: '#5B6B76' }}>Tax</span>
                      <span>{formatCurrency(showPreview.tax)}</span>
                    </div>
                  )}
                  {(showPreview.discount > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                      <span style={{ color: '#5B6B76' }}>Discount</span>
                      <span>-{formatCurrency(showPreview.discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 16, fontWeight: 800, borderTop: '2px solid #10222F', marginTop: 6 }}>
                    <span>Total</span>
                    <span style={{ color: '#146DF7' }}>{formatCurrency(showPreview.total || showPreview.amount)}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <span className={`kai-badge ${(STATUS_MAP[showPreview.status] || STATUS_MAP.DRAFT).cls}`} style={{ fontSize: 14, padding: '6px 20px' }}>
                  {(STATUS_MAP[showPreview.status] || STATUS_MAP.DRAFT).label}
                </span>
              </div>
            </div>

            <div style={{ padding: '16px 40px', borderTop: '1px solid #E7E7E8', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#FAFAFA', borderRadius: '0 0 var(--kai-radius-lg) var(--kai-radius-lg)' }}>
              <button className="kai-btn kai-btn-outline" onClick={() => setShowPreview(null)}>Close</button>
              {showPreview.status === 'DRAFT' && (
                <button className="kai-btn kai-btn-primary" onClick={() => { markAsSent(showPreview); setShowPreview(null); }}>Send Invoice</button>
              )}
              {(showPreview.status === 'SENT' || showPreview.status === 'OVERDUE') && (
                <button className="kai-btn kai-btn-success" onClick={() => { markAsPaid(showPreview); setShowPreview(null); }}>Mark as Paid</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'relative', background: 'var(--kai-surface)', borderRadius: 'var(--kai-radius-lg)', width: 720, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--kai-shadow-lg)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--kai-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Create Invoice</h4>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: 24 }}>
              {/* Top Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div>
                  <label className="kai-label">Invoice #</label>
                  <input className="kai-input" value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} style={{ fontFamily: "'IBM Plex Mono', monospace" }} />
                </div>
                <div>
                  <label className="kai-label">Client *</label>
                  <select className="kai-select" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} required>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="kai-label">Due Date</label>
                  <input type="date" className="kai-input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>

              {/* Line Items */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label className="kai-label" style={{ margin: 0 }}>Line Items</label>
                  <button type="button" className="kai-btn kai-btn-outline kai-btn-sm" onClick={addLineItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Row
                  </button>
                </div>
                <div style={{ border: '1px solid var(--kai-border)', borderRadius: 'var(--kai-radius)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--kai-bg)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--kai-text-muted)' }}>Description</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--kai-text-muted)', width: 80 }}>Qty</th>
                        <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--kai-text-muted)', width: 110 }}>Rate ($)</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--kai-text-muted)', width: 110 }}>Amount</th>
                        <th style={{ width: 40 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid var(--kai-border-light)' }}>
                          <td style={{ padding: 6 }}>
                            <input className="kai-input" placeholder="Service description" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} style={{ border: 'none', background: 'transparent', padding: '4px 8px' }} />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input className="kai-input" type="number" min="1" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', e.target.value)} style={{ textAlign: 'center', border: 'none', background: 'transparent', padding: '4px 8px' }} />
                          </td>
                          <td style={{ padding: 6 }}>
                            <input className="kai-input" type="number" min="0" step="0.01" value={item.rate} onChange={e => updateLineItem(idx, 'rate', e.target.value)} style={{ textAlign: 'center', border: 'none', background: 'transparent', padding: '4px 8px' }} />
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                            {formatCurrency(calcLineAmount(item))}
                          </td>
                          <td style={{ padding: 6, textAlign: 'center' }}>
                            {lineItems.length > 1 && (
                              <button type="button" onClick={() => removeLineItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--kai-danger)', padding: 4 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals + Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
                <div>
                  <label className="kai-label">Notes</label>
                  <textarea className="kai-input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, additional notes..." style={{ resize: 'vertical' }} />
                </div>
                <div style={{ background: 'var(--kai-bg)', borderRadius: 'var(--kai-radius)', padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--kai-text-muted)' }}>Subtotal</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--kai-text-muted)' }}>Tax</span>
                      <input className="kai-input" type="number" min="0" max="100" step="0.1" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} style={{ width: 60, padding: '2px 6px', fontSize: 12, textAlign: 'center' }} />
                      <span style={{ color: 'var(--kai-text-muted)', fontSize: 12 }}>%</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(taxAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--kai-text-muted)' }}>Discount</span>
                      <input className="kai-input" type="number" min="0" step="0.01" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} style={{ width: 80, padding: '2px 6px', fontSize: 12, textAlign: 'center' }} />
                    </div>
                    <span style={{ fontWeight: 600 }}>-{formatCurrency(discountAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '2px solid var(--kai-border)', fontSize: 16 }}>
                    <span style={{ fontWeight: 800 }}>Total</span>
                    <span style={{ fontWeight: 800, color: 'var(--kai-primary)' }}>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
