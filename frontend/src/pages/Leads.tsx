import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { leadsApi, clientsApi } from '../services/api';

const PIPELINE_STAGES = [
  { key: 'NEW', label: 'New', color: '#6366F1' },
  { key: 'CONTACTED', label: 'Contacted', color: '#2563EB' },
  { key: 'QUALIFIED', label: 'Qualified', color: '#8B3FE9' },
  { key: 'PROPOSAL', label: 'Proposal', color: '#EA580C' },
  { key: 'NEGOTIATION', label: 'Negotiation', color: '#D97706' },
  { key: 'WON', label: 'Won', color: '#16A34A' },
  { key: 'LOST', label: 'Lost', color: '#CB3939' },
];

const SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Email Campaign', 'Trade Show', 'Social Media', 'Other'];

const emptyLead = { title: '', client_id: '', value: '', source: '', notes: '', assigned_to: '', next_follow_up: '' };

function getScoreBadge(score) {
  const s = parseInt(score) || 0;
  if (s >= 80) return { label: 'Hot', cls: 'bg-red-500/10 text-red-400' };
  if (s >= 50) return { label: 'Warm', cls: 'bg-amber-500/10 text-amber-400' };
  return { label: 'Cold', cls: 'bg-blue-500/10 text-blue-400' };
}

const inputClass = 'w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]';
const labelClass = 'block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5';

export default function Leads() {
  const dispatch = useDispatch();
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyLead });
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ status: '', source: '', assignee: '', dateFrom: '', dateTo: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Leads' });
  }, [dispatch]);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.source) params.source = filters.source;
      if (filters.assignee) params.assigned_to = filters.assignee;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      const { data } = await leadsApi.list(params);
      setLeads(Array.isArray(data) ? data : data.leads || data.data || []);
    } catch (err) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await clientsApi.list();
      setClients(Array.isArray(data) ? data : data.clients || data.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'NEW').length,
    qualified: leads.filter(l => l.status === 'QUALIFIED').length,
    won: leads.filter(l => {
      if (l.status !== 'WON') return false;
      const d = new Date(l.updated_at || l.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }),
    totalValue: leads.reduce((s, l) => s + (parseFloat(l.value) || 0), 0),
    wonValue: leads.filter(l => l.status === 'WON').reduce((s, l) => s + (parseFloat(l.value) || 0), 0),
  };

  const getLeadsByStage = (stage) => leads.filter(l => l.status === stage);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const lead = leads.find(l => String(l.id) === draggableId);
    if (!lead || lead.status === newStatus) return;
    setLeads(prev => prev.map(l => String(l.id) === draggableId ? { ...l, status: newStatus } : l));
    try {
      await leadsApi.update(lead.id, { status: newStatus });
      toast.success(`Lead moved to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update lead');
      fetchLeads();
    }
  };

  const openAdd = () => { setForm({ ...emptyLead }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.warning('Title is required'); return; }
    try {
      setSaving(true);
      await leadsApi.create({ ...form, status: 'NEW', value: parseFloat(form.value) || 0 });
      toast.success('Lead created');
      setShowModal(false);
      fetchLeads();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create lead');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await leadsApi.delete(id);
      toast.success('Lead deleted');
      fetchLeads();
    } catch { toast.error('Failed to delete lead'); }
  };

  const getClientName = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    return c ? c.name : '';
  };

  const clearFilters = () => setFilters({ status: '', source: '', assignee: '', dateFrom: '', dateTo: '' });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)] font-[Manrope]">Sales Pipeline</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Track and manage your sales leads through each stage</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1.5"
            onClick={() => setShowFilters(!showFilters)} data-testid="filter-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-1.5"
            onClick={openAdd} data-testid="add-lead-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl mb-5">
          <div className="p-4">
            <div className="flex gap-3 items-end flex-wrap">
              <div>
                <label className={labelClass}>Status</label>
                <select className={`${inputClass} w-[150px]`} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} data-testid="filter-status">
                  <option value="">All</option>
                  {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Source</label>
                <select className={`${inputClass} w-[150px]`} value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}>
                  <option value="">All</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>From</label>
                <input type="date" className={`${inputClass} w-[150px]`} value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>To</label>
                <input type="date" className={`${inputClass} w-[150px]`} value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Assignee</label>
                <input className={`${inputClass} w-[150px]`} placeholder="Agent name" value={filters.assignee} onChange={e => setFilters(f => ({ ...f, assignee: e.target.value }))} />
              </div>
              {activeFilterCount > 0 && (
                <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1.5 text-[12px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={clearFilters} data-testid="clear-filters">Clear All</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-primary)] flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div className="text-[22px] font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-[12px] text-[var(--text-muted)]">Total Leads</div>
          <div className="text-[12px] text-[var(--text-muted)] mt-1">${stats.totalValue.toLocaleString()} pipeline</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </div>
          <div className="text-[22px] font-bold text-[var(--text-primary)]">{stats.new}</div>
          <div className="text-[12px] text-[var(--text-muted)]">New Leads</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="text-[22px] font-bold text-[var(--text-primary)]">{stats.qualified}</div>
          <div className="text-[12px] text-[var(--text-muted)]">Qualified</div>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div className="text-[22px] font-bold text-[var(--text-primary)]">{stats.won.length}</div>
          <div className="text-[12px] text-[var(--text-muted)]">Won This Month</div>
          <div className="text-[12px] text-green-400 mt-1 font-semibold">${stats.wonValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
          <div className="text-center py-16">
            <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-3 text-[var(--text-muted)]">Loading pipeline...</p>
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="w-full overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex gap-2.5 pb-4 min-w-0">
            {PIPELINE_STAGES.map(stage => {
              const stageLeads = getLeadsByStage(stage.key);
              const stageValue = stageLeads.reduce((s, l) => s + (parseFloat(l.value) || 0), 0);
              return (
                <div key={stage.key} className="flex-1 min-w-[140px]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                      <span className="text-[13px] font-bold text-[var(--text-primary)] uppercase tracking-wide">
                        {stage.label}
                      </span>
                      <span className="bg-[var(--bg-elevated)] text-[var(--text-muted)] text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {stageLeads.length}
                      </span>
                    </div>
                    <span className="text-[12px] text-[var(--text-muted)] font-semibold">
                      ${stageValue.toLocaleString()}
                    </span>
                  </div>

                  <Droppable droppableId={stage.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`rounded-xl p-2 min-h-[200px] transition-all duration-200 ${snapshot.isDraggingOver ? 'bg-[#7C3AED]/5 border-2 border-dashed border-[#7C3AED]' : 'bg-[var(--bg-elevated)] border-2 border-dashed border-transparent'}`}
                      >
                        {stageLeads.map((lead, index) => {
                          const score = getScoreBadge(lead.score);
                          return (
                            <Draggable key={String(lead.id)} draggableId={String(lead.id)} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-3.5 mb-2 cursor-grab transition-shadow ${snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'}`}
                                  style={provided.draggableProps.style}
                                  data-testid="lead-card"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="font-semibold text-[13.5px] text-[var(--text-primary)] flex-1 truncate">{lead.title}</div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}
                                      className="text-[var(--text-muted)] hover:text-red-400 p-0.5 transition-colors"
                                      data-testid="delete-lead"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                  </div>
                                  {lead.client_id && (
                                    <div className="text-[12px] text-[var(--text-muted)] mb-1.5">
                                      {getClientName(lead.client_id) || `Client #${lead.client_id}`}
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-[15px] text-green-400">
                                      ${(parseFloat(lead.value) || 0).toLocaleString()}
                                    </span>
                                    {lead.score !== undefined && lead.score !== null && (
                                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${score.cls}`}>{score.label} ({lead.score})</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {lead.source && (
                                      <span className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
                                        {lead.source}
                                      </span>
                                    )}
                                    {lead.next_follow_up && (
                                      <span className="text-[11px] text-amber-400 flex items-center gap-1">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                        {new Date(lead.next_follow_up).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  {lead.assigned_to && (
                                    <div className="mt-2 pt-2 border-t border-[var(--border-default)] flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: stage.color }}>
                                        {(lead.assigned_to || '?')[0].toUpperCase()}
                                      </div>
                                      {lead.assigned_to}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {stageLeads.length === 0 && (
                          <div className="text-center py-6 text-[var(--text-muted)] text-[12px]">
                            No leads
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
          </div>
        </DragDropContext>
      )}

      {/* Add Lead Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-[var(--bg-primary)]/80" onClick={() => setShowModal(false)} />
          <div className="relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[520px] max-w-[90vw] max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-[var(--border-default)] flex justify-between items-center">
              <h4 className="text-[16px] font-bold text-[var(--text-primary)]">Add New Lead</h4>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6">
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Lead Title *</label>
                  <input className={inputClass} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Enterprise SaaS Deal" required data-testid="lead-title" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Client</label>
                    <select className={inputClass} value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
                      <option value="">Select client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Deal Value ($)</label>
                    <input className={inputClass} type="number" min="0" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="10000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Source</label>
                    <select className={inputClass} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                      <option value="">Select source</option>
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Next Follow-up</label>
                    <input type="date" className={inputClass} value={form.next_follow_up} onChange={e => setForm(f => ({ ...f, next_follow_up: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Assigned To</label>
                  <input className={inputClass} value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="Agent name" />
                </div>
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea className={`${inputClass} resize-y`} rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional context..." />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors disabled:opacity-50" disabled={saving} data-testid="create-lead-btn">
                  {saving ? 'Creating...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
