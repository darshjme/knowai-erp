import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { clientsApi } from '../services/api';

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Retail',
  'Manufacturing', 'Real Estate', 'Agriculture', 'Media', 'Other'
];

const emptyClient = {
  name: '', email: '', phone: '', company: '', address: '',
  website: '', industry: '', contactPerson: '', gstNumber: '', notes: ''
};

export default function Clients() {
  const dispatch = useDispatch();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [viewMode, setViewMode] = useState('table');
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

  const openAdd = () => { setEditingClient(null); setForm({ ...emptyClient }); setShowModal(true); };
  const openEdit = (client) => {
    setEditingClient(client);
    setForm({ name: client.name || '', email: client.email || '', phone: client.phone || '', company: client.company || '', address: client.address || '', website: client.website || '', industry: client.industry || '', contactPerson: client.contactPerson || '', gstNumber: client.gstNumber || '', notes: client.notes || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.warning('Name is required'); return; }
    if (!form.email.trim()) { toast.warning('Email is required'); return; }
    if (!form.phone.trim()) { toast.warning('Phone is required'); return; }
    if (!form.company.trim()) { toast.warning('Company is required'); return; }
    if (!form.industry) { toast.warning('Industry is required'); return; }
    try {
      setSaving(true);
      if (editingClient) { await clientsApi.update(editingClient.id, form); toast.success('Client updated'); }
      else { await clientsApi.create(form); toast.success('Client created'); }
      setShowModal(false);
      fetchClients();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save client'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this client?')) return;
    try { await clientsApi.delete(id); toast.success('Client deleted'); fetchClients(); }
    catch (err) { toast.error('Failed to delete client'); }
  };

  const handleCSVImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv';
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
            await clientsApi.create({ name: record.name || record.company || '', email: record.email || '', phone: record.phone || '', company: record.company || '', industry: record.industry || '', address: record.address || '', website: record.website || '', notes: record.notes || '' });
            imported++;
          }
        }
        toast.success(`Imported ${imported} clients`);
        fetchClients();
      } catch (err) { toast.error('Failed to import CSV'); console.error(err); }
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight font-[Manrope]">Clients</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Manage your client relationships and contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="import-csv" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-2" onClick={handleCSVImport}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import CSV
          </button>
          <button data-testid="add-client" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-2" onClick={openAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Clients', value: stats.total, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>, bg: 'rgba(124,58,237,0.1)', color: '#7C3AED' },
          { label: 'Active Clients', value: stats.active, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, bg: 'rgba(22,163,74,0.1)', color: '#16A34A' },
          { label: 'New This Month', value: stats.newThisMonth, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>, bg: 'rgba(139,63,233,0.1)', color: '#8B3FE9' },
          { label: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>, bg: 'rgba(234,88,12,0.1)', color: '#EA580C' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            </div>
            <div className="text-[22px] font-bold text-[var(--text-primary)]">{s.value}</div>
            <div className="text-[13px] text-[var(--text-secondary)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl mb-6">
        <div className="px-5 py-3">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input data-testid="search-clients" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg pl-9 pr-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px] w-[180px]" value={industryFilter} onChange={e => setIndustryFilter(e.target.value)}>
              <option value="">All Industries</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <div className="flex border border-[var(--border-default)] rounded-lg overflow-hidden">
              <button data-testid="view-table" onClick={() => setViewMode('table')} className={`px-3 py-1.5 border-none cursor-pointer transition-colors ${viewMode === 'table' ? 'bg-[#7C3AED] text-white' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
              <button data-testid="view-cards" onClick={() => setViewMode('cards')} className={`px-3 py-1.5 border-none cursor-pointer transition-colors ${viewMode === 'cards' ? 'bg-[#7C3AED] text-white' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-3 text-[var(--text-muted)]">Loading clients...</p>
          </div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
          <div className="text-center py-16">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mx-auto mb-3"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <h5 className="text-[var(--text-primary)] font-semibold mb-1">No clients found</h5>
            <p className="text-[var(--text-muted)] text-[13px]">Add your first client to get started</p>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-[var(--border-default)]">
                  {['Name', 'Company', 'Email', 'Phone', 'Industry', 'Invoices', 'Revenue', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr key={client.id} className="border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setSelectedClient(client)}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[12px] font-semibold flex-shrink-0">
                          {(client.name || '?')[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-[var(--text-primary)]">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">{client.company || '-'}</td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">{client.email || '-'}</td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">{client.phone || '-'}</td>
                    <td className="px-3 py-2.5">{client.industry ? <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#2563EB]/10 text-[#2563EB]">{client.industry}</span> : '-'}</td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">{client.invoices_count || 0}</td>
                    <td className="px-3 py-2.5 font-semibold text-[var(--text-primary)]">{formatCurrency(client.total_revenue)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => openEdit(client)} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="bg-[#CB3939] text-white rounded-lg px-2 py-1 hover:bg-[#CB3939]/90 transition-colors" onClick={() => handleDelete(client.id)} title="Delete">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map(client => (
            <div key={client.id} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl cursor-pointer hover:border-[#7C3AED]/30 transition-colors" onClick={() => setSelectedClient(client)}>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[16px] font-bold flex-shrink-0">
                    {(client.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-[15px] text-[var(--text-primary)]">{client.name}</div>
                    <div className="text-[13px] text-[var(--text-muted)]">{client.company || 'No company'}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-[13px] text-[var(--text-secondary)]">
                  {client.email && <div className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>{client.email}</div>}
                  {client.phone && <div className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>{client.phone}</div>}
                  {client.industry && <div><span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#2563EB]/10 text-[#2563EB]">{client.industry}</span></div>}
                </div>
                <div className="flex justify-between mt-4 pt-3 border-t border-[var(--border-subtle)]">
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Invoices</div>
                    <div className="font-bold text-[16px] text-[var(--text-primary)]">{client.invoices_count || 0}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Revenue</div>
                    <div className="font-bold text-[16px] text-[#16A34A]">{formatCurrency(client.total_revenue)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Client Detail Drawer */}
      {selectedClient && (
        <div className="fixed inset-0 z-[2000] flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedClient(null)} />
          <div className="relative w-[480px] max-w-[90vw] bg-[var(--bg-card)] h-full overflow-y-auto shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[18px] font-bold text-[var(--text-primary)] m-0">Client Details</h3>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1.5 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setSelectedClient(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[24px] font-bold flex-shrink-0">
                {(selectedClient.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <div className="text-[20px] font-bold text-[var(--text-primary)]">{selectedClient.name}</div>
                <div className="text-[var(--text-muted)]">{selectedClient.company || 'No company'}</div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Email', value: selectedClient.email },
                { label: 'Phone', value: selectedClient.phone },
                { label: 'Industry', value: selectedClient.industry },
                { label: 'Contact Person', value: selectedClient.contactPerson },
                { label: 'GST Number', value: selectedClient.gstNumber },
                { label: 'Address', value: selectedClient.address },
                { label: 'Website', value: selectedClient.website },
                { label: 'Notes', value: selectedClient.notes },
              ].map(({ label, value }) => value ? (
                <div key={label}>
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</div>
                  <div className="text-[14px] text-[var(--text-primary)]">{value}</div>
                </div>
              ) : null)}
            </div>
            <div className="flex gap-2 mt-6">
              <button className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors" onClick={() => { openEdit(selectedClient); setSelectedClient(null); }}>Edit Client</button>
              <button className="bg-[#CB3939] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#CB3939]/90 transition-colors" onClick={() => { handleDelete(selectedClient.id); setSelectedClient(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[560px] max-w-[90vw] max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex justify-between items-center">
              <h4 className="text-[16px] font-bold text-[var(--text-primary)] m-0">{editingClient ? 'Edit Client' : 'Add Client'}</h4>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1.5 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', key: 'name', required: true, placeholder: 'John Doe' },
                  { label: 'Email', key: 'email', required: true, placeholder: 'john@company.com', type: 'email' },
                  { label: 'Phone', key: 'phone', required: true, placeholder: '+1 (555) 000-0000' },
                  { label: 'Company', key: 'company', required: true, placeholder: 'Acme Inc.' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">{f.label} {f.required && <span className="text-[#CB3939]">*</span>}</label>
                    <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} required={f.required} type={f.type || 'text'} />
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Industry <span className="text-[#CB3939]">*</span></label>
                  <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px]" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} required>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Contact Person</label>
                  <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} placeholder="Primary contact name" />
                </div>
                <div className="col-span-full">
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Address</label>
                  <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main St, City" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Website</label>
                  <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">GST Number</label>
                  <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} placeholder="e.g. 22AAAAA0000A1Z5" />
                </div>
                <div className="col-span-full">
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px] resize-y" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" data-testid="save-client" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors" disabled={saving}>
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
