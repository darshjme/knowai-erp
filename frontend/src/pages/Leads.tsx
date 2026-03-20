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
  if (s >= 80) return { label: 'Hot', cls: 'danger' };
  if (s >= 50) return { label: 'Warm', cls: 'warning' };
  return { label: 'Cold', cls: 'info' };
}

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

  // Stats
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

    // Optimistic update
    setLeads(prev => prev.map(l => String(l.id) === draggableId ? { ...l, status: newStatus } : l));
    try {
      await leadsApi.update(lead.id, { status: newStatus });
      toast.success(`Lead moved to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update lead');
      fetchLeads();
    }
  };

  const openAdd = () => {
    setForm({ ...emptyLead });
    setShowModal(true);
  };

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
    } finally {
      setSaving(false);
    }
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

  const clearFilters = () => {
    setFilters({ status: '', source: '', assignee: '', dateFrom: '', dateTo: '' });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Sales Pipeline</h1>
          <p>Track and manage your sales leads through each stage</p>
        </div>
        <div className="page-actions">
          <button className="kai-btn kai-btn-outline" onClick={() => setShowFilters(!showFilters)} style={{ position: 'relative' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Filters
            {activeFilterCount > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--kai-danger)', color: '#fff', fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          <button className="kai-btn kai-btn-primary" onClick={openAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="kai-card" style={{ marginBottom: 20 }}>
          <div className="kai-card-body">
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label className="kai-label">Status</label>
                <select className="kai-select" style={{ width: 150 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                  <option value="">All</option>
                  {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="kai-label">Source</label>
                <select className="kai-select" style={{ width: 150 }} value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}>
                  <option value="">All</option>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="kai-label">From</label>
                <input type="date" className="kai-input" style={{ width: 150 }} value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
              </div>
              <div>
                <label className="kai-label">To</label>
                <input type="date" className="kai-input" style={{ width: 150 }} value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
              </div>
              <div>
                <label className="kai-label">Assignee</label>
                <input className="kai-input" style={{ width: 150 }} placeholder="Agent name" value={filters.assignee} onChange={e => setFilters(f => ({ ...f, assignee: e.target.value }))} />
              </div>
              {activeFilterCount > 0 && (
                <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={clearFilters}>Clear All</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--kai-primary-light, rgba(17,24,39,0.08))', color: 'var(--kai-primary)', marginBottom: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Leads</div>
          <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', marginTop: 4 }}>${stats.totalValue.toLocaleString()} pipeline</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1', marginBottom: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </div>
          <div className="stat-value">{stats.new}</div>
          <div className="stat-label">New Leads</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139,63,233,0.1)', color: 'var(--kai-secondary)', marginBottom: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="stat-value">{stats.qualified}</div>
          <div className="stat-label">Qualified</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--kai-success)', marginBottom: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div className="stat-value">{stats.won.length}</div>
          <div className="stat-label">Won This Month</div>
          <div style={{ fontSize: 12, color: 'var(--kai-success)', marginTop: 4, fontWeight: 600 }}>${stats.wonValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="kai-card">
          <div className="kai-card-body" style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner-border text-primary" role="status" />
            <p style={{ marginTop: 12, color: 'var(--kai-text-muted)' }}>Loading pipeline...</p>
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="kanban-scroll" style={{ width: '100%', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', gap: 10, paddingBottom: 16, minWidth: 0 }}>
            {PIPELINE_STAGES.map(stage => {
              const stageLeads = getLeadsByStage(stage.key);
              const stageValue = stageLeads.reduce((s, l) => s + (parseFloat(l.value) || 0), 0);
              return (
                <div key={stage.key} style={{ flex: '1 1 0', minWidth: 140 }}>
                  {/* Column Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--kai-text)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {stage.label}
                      </span>
                      <span style={{ background: 'var(--kai-bg)', color: 'var(--kai-text-muted)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--kai-radius-pill)' }}>
                        {stageLeads.length}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--kai-text-muted)', fontWeight: 600 }}>
                      ${stageValue.toLocaleString()}
                    </span>
                  </div>

                  <Droppable droppableId={stage.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          background: snapshot.isDraggingOver ? 'var(--kai-primary-light, rgba(17,24,39,0.04))' : 'var(--kai-bg)',
                          borderRadius: 'var(--kai-radius-lg)',
                          padding: 8,
                          minHeight: 200,
                          border: snapshot.isDraggingOver ? '2px dashed var(--kai-primary)' : '2px dashed transparent',
                          transition: 'all 0.2s ease',
                        }}
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
                                  style={{
                                    ...provided.draggableProps.style,
                                    background: 'var(--kai-surface)',
                                    border: '1px solid var(--kai-border)',
                                    borderRadius: 'var(--kai-radius)',
                                    padding: 14,
                                    marginBottom: 8,
                                    boxShadow: snapshot.isDragging ? 'var(--kai-shadow-lg)' : 'var(--kai-shadow-sm)',
                                    cursor: 'grab',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--kai-text)', flex: 1 }}>{lead.title}</div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--kai-text-muted)', padding: 2 }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                  </div>
                                  {lead.client_id && (
                                    <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', marginBottom: 6 }}>
                                      {getClientName(lead.client_id) || `Client #${lead.client_id}`}
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--kai-success)' }}>
                                      ${(parseFloat(lead.value) || 0).toLocaleString()}
                                    </span>
                                    {lead.score !== undefined && lead.score !== null && (
                                      <span className={`kai-badge ${score.cls}`}>{score.label} ({lead.score})</span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {lead.source && (
                                      <span style={{ fontSize: 11, color: 'var(--kai-text-muted)', background: 'var(--kai-bg)', padding: '2px 8px', borderRadius: 'var(--kai-radius-pill)' }}>
                                        {lead.source}
                                      </span>
                                    )}
                                    {lead.next_follow_up && (
                                      <span style={{ fontSize: 11, color: 'var(--kai-warning)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                        {new Date(lead.next_follow_up).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  {lead.assigned_to && (
                                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--kai-border-light)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--kai-text-muted)' }}>
                                      <div className="kai-avatar kai-avatar-sm" style={{ background: stage.color, width: 20, height: 20, fontSize: 9 }}>
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
                          <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--kai-text-muted)', fontSize: 12 }}>
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowModal(false)} />
          <div style={{ position: 'relative', background: 'var(--kai-surface)', borderRadius: 'var(--kai-radius-lg)', width: 520, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--kai-shadow-lg)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--kai-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Add New Lead</h4>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave} style={{ padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="kai-label">Lead Title *</label>
                  <input className="kai-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Enterprise SaaS Deal" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="kai-label">Client</label>
                    <select className="kai-select" value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
                      <option value="">Select client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="kai-label">Deal Value ($)</label>
                    <input className="kai-input" type="number" min="0" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="10000" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="kai-label">Source</label>
                    <select className="kai-select" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                      <option value="">Select source</option>
                      {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="kai-label">Next Follow-up</label>
                    <input type="date" className="kai-input" value={form.next_follow_up} onChange={e => setForm(f => ({ ...f, next_follow_up: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="kai-label">Assigned To</label>
                  <input className="kai-input" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="Agent name" />
                </div>
                <div>
                  <label className="kai-label">Notes</label>
                  <textarea className="kai-input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional context..." style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary" disabled={saving}>
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
