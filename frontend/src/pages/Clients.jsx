import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { clientsApi } from '../services/api';

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Retail',
  'Manufacturing', 'Real Estate', 'Consulting', 'Marketing', 'Legal', 'Other'
];

const emptyClient = {
  name: '', email: '', phone: '', company: '', address: '',
  website: '', industry: '', notes: ''
};

export default function Clients() {
  const dispatch = useDispatch();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [viewMode, setViewMode] = useState('table'); // table | cards
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({ ...emptyClient });
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Clients' });
  }, [dispatch]);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (industryFilter) params.industry = industryFilter;
      const { data } = await clientsApi.list(params);
      setClients(Array.isArray(data) ? data : data.clients || data.data || []);
    } catch (err) {
      toast.error('Failed to load clients');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, industryFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Stats
  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active' || !c.status).length,
    newThisMonth: clients.filter(c => {
      if (!c.created_at) return false;
      const d = new Date(c.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    totalRevenue: clients.reduce((sum, c) => sum + (parseFloat(c.total_revenue) || 0), 0),
  };

  const openAdd = () => {
    setEditingClient(null);
    setForm({ ...emptyClient });
    setShowModal(true);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      address: client.address || '',
      website: client.website || '',
      industry: client.industry || '',
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.warning('Name is required'); return; }
    if (!form.email.trim()) { toast.warning('Email is required'); return; }

    try {
      setSaving(true);
      if (editingClient) {
        await clientsApi.update(editingClient.id, form);
        toast.success('Client updated');
      } else {
        await clientsApi.create(form);
        toast.success('Client created');
      }
      setShowModal(false);
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client?')) return;
    try {
      await clientsApi.delete(id);
      toast.success('Client deleted');
      fetchClients();
    } catch (err) {
      toast.error('Failed to delete client');
    }
  };

  const handleCSVImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) { toast.warning('CSV file is empty'); return; }
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows = lines.slice(1);
        let imported = 0;
        for (const row of rows) {
          const cols = row.split(',').map(c => c.trim());
          const record = {};
          headers.forEach((h, i) => { record[h] = cols[i] || ''; });
          if (record.name || record.company) {
            await clientsApi.create({
              name: record.name || record.company || '',
              email: record.email || '',
              phone: record.phone || '',
              company: record.company || '',
              industry: record.industry || '',
              address: record.address || '',
              website: record.website || '',
              notes: record.notes || '',
            });
            imported++;
          }
        }
        toast.success(`Imported ${imported} clients`);
        fetchClients();
      } catch (err) {
        toast.error('Failed to import CSV');
        console.error(err);
      }
    };
    input.click();
  };

  const formatCurrency = (val) => {
    const n = parseFloat(val) || 0;
    return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
  };

  const filteredClients = clients;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Clients</h1>
          <p>Manage your client relationships and contacts</p>
        </div>
        <div className="page-actions">
          <button className="kai-btn kai-btn-outline" onClick={handleCSVImport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import CSV
          </button>
          <button className="kai-btn kai-btn-primary" onClick={openAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <div className="stat-icon" style={{ background: 'rgba(20,109,247,0.1)', color: 'var(--kai-primary)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Clients</div>
        </div>
        <div className="stat-card">
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--kai-success)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
          </div>
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Active Clients</div>
        </div>
        <div className="stat-card">
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <div className="stat-icon" style={{ background: 'rgba(139,63,233,0.1)', color: 'var(--kai-secondary)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            </div>
          </div>
          <div className="stat-value">{stats.newThisMonth}</div>
          <div className="stat-label">New This Month</div>
        </div>
        <div className="stat-card">
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <div className="stat-icon" style={{ background: 'rgba(234,88,12,0.1)', color: 'var(--kai-warning)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            </div>
          </div>
          <div className="stat-value">${stats.totalRevenue.toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="kai-card" style={{ marginBottom: 24 }}>
        <div className="kai-card-body" style={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="kai-search" style={{ flex: 1, minWidth: 200 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                placeholder="Search clients..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="kai-select"
              style={{ width: 180 }}
              value={industryFilter}
              onChange={e => setIndustryFilter(e.target.value)}
            >
              <option value="">All Industries</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <div style={{ display: 'flex', border: '1px solid var(--kai-border)', borderRadius: 'var(--kai-radius)', overflow: 'hidden' }}>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '6px 12px', border: 'none', cursor: 'pointer',
                  background: viewMode === 'table' ? 'var(--kai-primary)' : 'var(--kai-surface)',
                  color: viewMode === 'table' ? '#fff' : 'var(--kai-text-muted)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '6px 12px', border: 'none', cursor: 'pointer',
                  background: viewMode === 'cards' ? 'var(--kai-primary)' : 'var(--kai-surface)',
                  color: viewMode === 'cards' ? '#fff' : 'var(--kai-text-muted)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="kai-card">
          <div className="kai-card-body" style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner-border text-primary" role="status" />
            <p style={{ marginTop: 12, color: 'var(--kai-text-muted)' }}>Loading clients...</p>
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="kai-card">
          <div className="kai-card-body" style={{ textAlign: 'center', padding: 60 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--kai-text-muted)" strokeWidth="1.5" style={{ marginBottom: 12 }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <h5 style={{ color: 'var(--kai-text)', margin: '0 0 4px' }}>No clients found</h5>
            <p style={{ color: 'var(--kai-text-muted)', margin: 0 }}>Add your first client to get started</p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="kai-card">
          <div className="kai-card-body" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="kai-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Industry</th>
                  <th>Invoices</th>
                  <th>Revenue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr key={client.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedClient(client)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="kai-avatar" style={{ background: 'var(--kai-primary)', width: 32, height: 32, fontSize: 12 }}>
                          {(client.name || '?')[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{client.name}</span>
                      </div>
                    </td>
                    <td>{client.company || '-'}</td>
                    <td>{client.email || '-'}</td>
                    <td>{client.phone || '-'}</td>
                    <td>
                      {client.industry ? (
                        <span className="kai-badge info">{client.industry}</span>
                      ) : '-'}
                    </td>
                    <td>{client.invoices_count || 0}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(client.total_revenue)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => openEdit(client)} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="kai-btn kai-btn-danger kai-btn-sm" onClick={() => handleDelete(client.id)} title="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filteredClients.map(client => (
            <div key={client.id} className="kai-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedClient(client)}>
              <div className="kai-card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div className="kai-avatar kai-avatar-lg" style={{ background: 'var(--kai-primary)' }}>
                    {(client.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--kai-text)' }}>{client.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--kai-text-muted)' }}>{client.company || 'No company'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--kai-text-secondary)' }}>
                  {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    {client.email}
                  </div>}
                  {client.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                    {client.phone}
                  </div>}
                  {client.industry && <div><span className="kai-badge info">{client.industry}</span></div>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--kai-border-light)' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Invoices</div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{client.invoices_count || 0}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Revenue</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--kai-success)' }}>{formatCurrency(client.total_revenue)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client Detail Drawer */}
      {selectedClient && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setSelectedClient(null)} />
          <div style={{ position: 'relative', width: 480, maxWidth: '90vw', background: 'var(--kai-surface)', height: '100%', overflowY: 'auto', boxShadow: 'var(--kai-shadow-lg)', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Client Details</h3>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setSelectedClient(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div className="kai-avatar kai-avatar-xl" style={{ background: 'var(--kai-primary)' }}>
                {(selectedClient.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--kai-text)' }}>{selectedClient.name}</div>
                <div style={{ color: 'var(--kai-text-muted)' }}>{selectedClient.company || 'No company'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Email', value: selectedClient.email },
                { label: 'Phone', value: selectedClient.phone },
                { label: 'Industry', value: selectedClient.industry },
                { label: 'Address', value: selectedClient.address },
                { label: 'Website', value: selectedClient.website },
                { label: 'Notes', value: selectedClient.notes },
              ].map(({ label, value }) => value ? (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, color: 'var(--kai-text)' }}>{value}</div>
                </div>
              ) : null)}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button className="kai-btn kai-btn-primary" onClick={() => { openEdit(selectedClient); setSelectedClient(null); }}>Edit Client</button>
              <button className="kai-btn kai-btn-danger" onClick={() => { handleDelete(selectedClient.id); setSelectedClient(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'relative', background: 'var(--kai-surface)', borderRadius: 'var(--kai-radius-lg)', width: 560, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--kai-shadow-lg)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--kai-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editingClient ? 'Edit Client' : 'Add Client'}</h4>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave} style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label className="kai-label">Full Name *</label>
                  <input className="kai-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" required />
                </div>
                <div>
                  <label className="kai-label">Email *</label>
                  <input className="kai-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" required />
                </div>
                <div>
                  <label className="kai-label">Phone</label>
                  <input className="kai-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
                </div>
                <div>
                  <label className="kai-label">Company</label>
                  <input className="kai-input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Acme Inc." />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="kai-label">Address</label>
                  <input className="kai-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City" />
                </div>
                <div>
                  <label className="kai-label">Website</label>
                  <input className="kai-input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
                </div>
                <div>
                  <label className="kai-label">Industry</label>
                  <select className="kai-select" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="kai-label">Notes</label>
                  <textarea className="kai-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingClient ? 'Update Client' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
