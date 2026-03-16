import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { complaintsApi } from '../services/api';

const CATEGORIES = ['Workplace Harassment', 'Discrimination', 'Safety Concern', 'Policy Violation', 'Payroll Issue', 'Manager Misconduct', 'IT Issue', 'Facilities', 'Other'];
const STATUS_STYLES = {
  Open: { bg: '#fff3cd', color: '#856404' },
  'Under Review': { bg: '#d1ecf1', color: '#0c5460' },
  Escalated: { bg: '#f8d7da', color: '#721c24' },
  Resolved: { bg: '#d4edda', color: '#155724' },
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export default function Complaints() {
  const dispatch = useDispatch();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [resolution, setResolution] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [form, setForm] = useState({
    subject: '', category: 'Other', description: '', filedBy: '', anonymous: false, assignedTo: '',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Complaints' });
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await complaintsApi.list();
      setComplaints(Array.isArray(res.data) ? res.data : res.data?.data || res.data?.complaints || []);
    } catch (err) {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return complaints.filter(c => statusFilter === 'All' || c.status === statusFilter);
  }, [complaints, statusFilter]);

  const stats = useMemo(() => ({
    open: complaints.filter(c => c.status === 'Open').length,
    underReview: complaints.filter(c => c.status === 'Under Review').length,
    escalated: complaints.filter(c => c.status === 'Escalated').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
  }), [complaints]);

  const handleFile = async (e) => {
    e.preventDefault();
    try {
      await complaintsApi.file({
        ...form,
        filedBy: form.anonymous ? 'Anonymous' : form.filedBy,
        status: 'Open',
        ticketNumber: `TKT-${Date.now().toString(36).toUpperCase()}`,
        filedAt: new Date().toISOString(),
        timeline: [{
          action: 'Complaint Filed',
          by: form.anonymous ? 'Anonymous' : form.filedBy,
          date: new Date().toISOString(),
          note: 'Complaint was submitted.',
        }],
      });
      toast.success('Complaint filed successfully');
      setShowFileModal(false);
      setForm({ subject: '', category: 'Other', description: '', filedBy: '', anonymous: false, assignedTo: '' });
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to file complaint');
    }
  };

  const handleEscalate = async (complaint) => {
    try {
      await complaintsApi.escalate(complaint._id || complaint.id);
      toast.warning('Complaint escalated');
      fetchComplaints();
      if (selectedComplaint && (selectedComplaint._id || selectedComplaint.id) === (complaint._id || complaint.id)) {
        setSelectedComplaint({ ...selectedComplaint, status: 'Escalated' });
      }
    } catch (err) {
      toast.error('Failed to escalate complaint');
    }
  };

  const openResolveModal = (complaint) => {
    setSelectedComplaint(complaint);
    setResolution('');
    setShowResolveModal(true);
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    try {
      await complaintsApi.resolve(selectedComplaint._id || selectedComplaint.id, resolution);
      toast.success('Complaint resolved');
      setShowResolveModal(false);
      fetchComplaints();
      if (selectedComplaint) {
        setSelectedComplaint({ ...selectedComplaint, status: 'Resolved' });
      }
    } catch (err) {
      toast.error('Failed to resolve complaint');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Complaint Management</h1>
          <p>Track and resolve employee complaints</p>
        </div>
        <div className="page-actions">
          <button className="kai-btn kai-btn-primary" onClick={() => setShowFileModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            File Complaint
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Open', value: stats.open, color: '#EA580C' },
          { label: 'Under Review', value: stats.underReview, color: '#2563EB' },
          { label: 'Escalated', value: stats.escalated, color: '#CB3939' },
          { label: 'Resolved', value: stats.resolved, color: '#16A34A' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['All', 'Open', 'Under Review', 'Escalated', 'Resolved'].map(s => (
          <button key={s}
            className={`kai-btn kai-btn-sm ${statusFilter === s ? 'kai-btn-primary' : 'kai-btn-outline'}`}
            onClick={() => setStatusFilter(s)}>{s}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Complaints Table */}
        <div className="kai-card" style={{ flex: '1 1 500px', minWidth: 0 }}>
          <div className="kai-card-header">
            <h6>Complaints</h6>
            <span className="kai-badge secondary">{filtered.length} tickets</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>Loading complaints...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>
                {complaints.length === 0 ? 'No complaints filed yet.' : 'No complaints match the selected filter.'}
              </div>
            ) : (
              <table className="kai-table">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Filed By</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const st = STATUS_STYLES[c.status] || STATUS_STYLES.Open;
                    const isActive = selectedComplaint && (selectedComplaint._id || selectedComplaint.id) === (c._id || c.id);
                    return (
                      <tr key={c._id || c.id}
                        style={{ background: isActive ? 'var(--kai-primary-light)' : undefined, cursor: 'pointer' }}
                        onClick={() => setSelectedComplaint(c)}>
                        <td>
                          <span className="font-mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--kai-primary)' }}>
                            {c.ticketNumber || `TKT-${(c._id || c.id || '').slice(-6).toUpperCase()}`}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, maxWidth: 180 }}>
                          <div className="truncate" title={c.subject}>{c.subject || '-'}</div>
                        </td>
                        <td>
                          <span className="kai-badge secondary">{c.category || '-'}</span>
                        </td>
                        <td style={{ fontSize: 13 }}>{c.filedBy || 'Anonymous'}</td>
                        <td>
                          <span className="kai-badge" style={{ background: st.bg, color: st.color }}>{c.status}</span>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--kai-text-muted)' }}>{c.assignedTo || '-'}</td>
                        <td style={{ fontSize: 12 }}>{formatDate(c.filedAt || c.createdAt)}</td>
                        <td>
                          <div className="flex-gap-8" onClick={e => e.stopPropagation()}>
                            {c.status !== 'Resolved' && c.status !== 'Escalated' && (
                              <button className="kai-btn kai-btn-danger kai-btn-sm" style={{ fontSize: 11 }}
                                onClick={() => handleEscalate(c)}>Escalate</button>
                            )}
                            {c.status !== 'Resolved' && (
                              <button className="kai-btn kai-btn-success kai-btn-sm" style={{ fontSize: 11 }}
                                onClick={() => openResolveModal(c)}>Resolve</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Timeline Panel */}
        {selectedComplaint && (
          <div className="kai-card" style={{ width: 360, flex: '0 0 360px', minWidth: 280, alignSelf: 'flex-start', position: 'sticky', top: 88 }}>
            <div className="kai-card-header">
              <h6>Complaint Timeline</h6>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setSelectedComplaint(null)}>&times;</button>
            </div>
            <div className="kai-card-body">
              {/* Complaint details */}
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--kai-border-light)' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{selectedComplaint.subject}</div>
                <span className="kai-badge" style={{
                  background: (STATUS_STYLES[selectedComplaint.status] || STATUS_STYLES.Open).bg,
                  color: (STATUS_STYLES[selectedComplaint.status] || STATUS_STYLES.Open).color,
                  marginBottom: 8,
                }}>{selectedComplaint.status}</span>
                <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', marginTop: 8 }}>
                  <div><strong>Category:</strong> {selectedComplaint.category}</div>
                  <div><strong>Filed by:</strong> {selectedComplaint.filedBy || 'Anonymous'}</div>
                  <div><strong>Assigned to:</strong> {selectedComplaint.assignedTo || 'Unassigned'}</div>
                </div>
                {selectedComplaint.description && (
                  <div style={{ fontSize: 13, color: 'var(--kai-text-secondary)', marginTop: 8, padding: 10, background: 'var(--kai-bg)', borderRadius: 6 }}>
                    {selectedComplaint.description}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Activity Timeline</div>
                {(selectedComplaint.timeline && selectedComplaint.timeline.length > 0) ? (
                  <div style={{ position: 'relative' }}>
                    {selectedComplaint.timeline.map((event, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, position: 'relative' }}>
                        {/* Timeline dot and line */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: i === 0 ? 'var(--kai-primary)' : 'var(--kai-border)',
                            border: i === 0 ? '2px solid var(--kai-primary-light)' : 'none',
                            flexShrink: 0,
                          }} />
                          {i < selectedComplaint.timeline.length - 1 && (
                            <div style={{ width: 1, flex: 1, background: 'var(--kai-border-light)', marginTop: 4 }} />
                          )}
                        </div>
                        {/* Event content */}
                        <div style={{ flex: 1, paddingBottom: 4 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--kai-text)' }}>{event.action}</div>
                          <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', marginTop: 2 }}>
                            {event.by && <span>by {event.by} &middot; </span>}
                            {formatDateTime(event.date)}
                          </div>
                          {event.note && <div style={{ fontSize: 12, color: 'var(--kai-text-secondary)', marginTop: 4 }}>{event.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--kai-text-muted)', fontSize: 12 }}>
                    No timeline events yet.
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {selectedComplaint.status !== 'Resolved' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--kai-border-light)' }}>
                  {selectedComplaint.status !== 'Escalated' && (
                    <button className="kai-btn kai-btn-danger kai-btn-sm" style={{ flex: 1 }}
                      onClick={() => handleEscalate(selectedComplaint)}>Escalate</button>
                  )}
                  <button className="kai-btn kai-btn-success kai-btn-sm" style={{ flex: 1 }}
                    onClick={() => openResolveModal(selectedComplaint)}>Resolve</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* File Complaint Modal */}
      {showFileModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowFileModal(false)}>
          <div className="kai-card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="kai-card-header">
              <h5>File Complaint</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowFileModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleFile}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="kai-label">Subject *</label>
                  <input className="kai-input" required placeholder="Brief subject of the complaint" value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
                </div>
                <div>
                  <label className="kai-label">Category *</label>
                  <select className="kai-input" value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="kai-label">Description *</label>
                  <textarea className="kai-input" required rows={4} placeholder="Describe the issue in detail..." value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    style={{ resize: 'vertical', minHeight: 100 }} />
                </div>

                {/* Anonymous toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--kai-bg)', borderRadius: 8 }}>
                  <input type="checkbox" id="anon-check" checked={form.anonymous}
                    onChange={e => setForm(p => ({ ...p, anonymous: e.target.checked }))}
                    style={{ width: 18, height: 18, accentColor: 'var(--kai-primary)' }} />
                  <label htmlFor="anon-check" style={{ fontSize: 13, cursor: 'pointer' }}>
                    <span style={{ fontWeight: 600 }}>File anonymously</span>
                    <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>Your identity will be kept confidential</div>
                  </label>
                </div>

                {!form.anonymous && (
                  <div>
                    <label className="kai-label">Your Name *</label>
                    <input className="kai-input" required={!form.anonymous} placeholder="John Doe" value={form.filedBy}
                      onChange={e => setForm(p => ({ ...p, filedBy: e.target.value }))} />
                  </div>
                )}

                <div>
                  <label className="kai-label">Assign To (optional)</label>
                  <input className="kai-input" placeholder="HR Manager name or leave blank" value={form.assignedTo}
                    onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} />
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowFileModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary">File Complaint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedComplaint && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowResolveModal(false)}>
          <div className="kai-card" style={{ width: '100%', maxWidth: 440, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="kai-card-header">
              <h5>Resolve Complaint</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowResolveModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleResolve}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 12, background: 'var(--kai-bg)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedComplaint.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>
                    {selectedComplaint.ticketNumber || ''} &middot; {selectedComplaint.category}
                  </div>
                </div>
                <div>
                  <label className="kai-label">Resolution Notes *</label>
                  <textarea className="kai-input" required rows={4} placeholder="Describe how the complaint was resolved..." value={resolution}
                    onChange={e => setResolution(e.target.value)}
                    style={{ resize: 'vertical', minHeight: 100 }} />
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowResolveModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-success">Mark Resolved</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
