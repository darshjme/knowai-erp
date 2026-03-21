import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { complaintsApi } from '../services/api';

const CATEGORIES = ['Workplace Harassment', 'Discrimination', 'Safety Concern', 'Policy Violation', 'Payroll Issue', 'Manager Misconduct', 'IT Issue', 'Facilities', 'Other'];
const STATUS_STYLES = {
  Open: { bg: '#EA580C20', color: '#EA580C' },
  'Under Review': { bg: '#2563EB20', color: '#2563EB' },
  Escalated: { bg: '#CB393920', color: '#CB3939' },
  Resolved: { bg: '#16A34A20', color: '#16A34A' },
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight font-[Manrope]">Complaint Management</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Track and resolve employee complaints</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="file-complaint-btn" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-2" onClick={() => setShowFileModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            File Complaint
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Open', value: stats.open, color: '#EA580C' },
          { label: 'Under Review', value: stats.underReview, color: '#2563EB' },
          { label: 'Escalated', value: stats.escalated, color: '#CB3939' },
          { label: 'Resolved', value: stats.resolved, color: '#16A34A' },
        ].map((s, i) => (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5" key={i}>
            <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[13px] text-[var(--text-secondary)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {['All', 'Open', 'Under Review', 'Escalated', 'Resolved'].map(s => (
          <button key={s}
            data-testid={`filter-${s.toLowerCase().replace(' ', '-')}`}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${statusFilter === s ? 'bg-[#7C3AED] text-white' : 'bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
            onClick={() => setStatusFilter(s)}>{s}</button>
        ))}
      </div>

      <div className="flex gap-6 flex-wrap">
        {/* Complaints Table */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl flex-[1_1_500px] min-w-0">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
            <h6 className="text-[14px] font-semibold text-[var(--text-primary)] m-0">Complaints</h6>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)]">{filtered.length} tickets</span>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-[var(--text-muted)]">Loading complaints...</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-[var(--text-muted)]">
                {complaints.length === 0 ? 'No complaints filed yet.' : 'No complaints match the selected filter.'}
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b-2 border-[var(--border-default)]">
                    {['Ticket #', 'Subject', 'Category', 'Filed By', 'Status', 'Assigned To', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const st = STATUS_STYLES[c.status] || STATUS_STYLES.Open;
                    const isActive = selectedComplaint && (selectedComplaint._id || selectedComplaint.id) === (c._id || c.id);
                    return (
                      <tr key={c._id || c.id}
                        className={`border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors ${isActive ? 'bg-[#7C3AED]/5' : ''}`}
                        onClick={() => setSelectedComplaint(c)}>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-[12px] font-semibold text-[#7C3AED]">
                            {c.ticketNumber || `TKT-${(c._id || c.id || '').slice(-6).toUpperCase()}`}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold max-w-[180px]">
                          <div className="truncate" title={c.subject}>{c.subject || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)]">{c.category || '-'}</span>
                        </td>
                        <td className="px-3 py-2.5">{c.filedBy || 'Anonymous'}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>{c.status}</span>
                        </td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)]">{c.assignedTo || '-'}</td>
                        <td className="px-3 py-2.5 text-[12px]">{formatDate(c.filedAt || c.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            {c.status !== 'Resolved' && c.status !== 'Escalated' && (
                              <button className="bg-[#CB3939] text-white rounded-lg px-2 py-1 text-[11px] font-semibold hover:bg-[#CB3939]/90 transition-colors"
                                onClick={() => handleEscalate(c)}>Escalate</button>
                            )}
                            {c.status !== 'Resolved' && (
                              <button className="bg-[#16A34A] text-white rounded-lg px-2 py-1 text-[11px] font-semibold hover:bg-[#16A34A]/90 transition-colors"
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
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[360px] flex-[0_0_360px] min-w-[280px] self-start sticky top-[88px]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <h6 className="text-[14px] font-semibold text-[var(--text-primary)] m-0">Complaint Timeline</h6>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setSelectedComplaint(null)}>&times;</button>
            </div>
            <div className="p-4">
              {/* Complaint details */}
              <div className="mb-4 pb-4 border-b border-[var(--border-subtle)]">
                <div className="font-bold text-[14px] text-[var(--text-primary)] mb-1">{selectedComplaint.subject}</div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium mb-2 inline-block" style={{
                  background: (STATUS_STYLES[selectedComplaint.status] || STATUS_STYLES.Open).bg,
                  color: (STATUS_STYLES[selectedComplaint.status] || STATUS_STYLES.Open).color,
                }}>{selectedComplaint.status}</span>
                <div className="text-[12px] text-[var(--text-muted)] mt-2">
                  <div><strong>Category:</strong> {selectedComplaint.category}</div>
                  <div><strong>Filed by:</strong> {selectedComplaint.filedBy || 'Anonymous'}</div>
                  <div><strong>Assigned to:</strong> {selectedComplaint.assignedTo || 'Unassigned'}</div>
                </div>
                {selectedComplaint.description && (
                  <div className="text-[13px] text-[var(--text-secondary)] mt-2 p-2.5 bg-[var(--bg-elevated)] rounded-md">
                    {selectedComplaint.description}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div>
                <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Activity Timeline</div>
                {(selectedComplaint.timeline && selectedComplaint.timeline.length > 0) ? (
                  <div className="relative">
                    {selectedComplaint.timeline.map((event, i) => (
                      <div key={i} className="flex gap-3 mb-4 relative">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${i === 0 ? 'bg-[#7C3AED] ring-2 ring-[#7C3AED]/30' : 'bg-[var(--border-default)]'}`} />
                          {i < selectedComplaint.timeline.length - 1 && (
                            <div className="w-px flex-1 bg-[var(--border-subtle)] mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="font-semibold text-[12px] text-[var(--text-primary)]">{event.action}</div>
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            {event.by && <span>by {event.by} &middot; </span>}
                            {formatDateTime(event.date)}
                          </div>
                          {event.note && <div className="text-[12px] text-[var(--text-secondary)] mt-1">{event.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-5 text-center text-[var(--text-muted)] text-[12px]">
                    No timeline events yet.
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {selectedComplaint.status !== 'Resolved' && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  {selectedComplaint.status !== 'Escalated' && (
                    <button className="flex-1 bg-[#CB3939] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-[#CB3939]/90 transition-colors"
                      onClick={() => handleEscalate(selectedComplaint)}>Escalate</button>
                  )}
                  <button className="flex-1 bg-[#16A34A] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-[#16A34A]/90 transition-colors"
                    onClick={() => openResolveModal(selectedComplaint)}>Resolve</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* File Complaint Modal */}
      {showFileModal && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-5"
          onClick={e => e.target === e.currentTarget && setShowFileModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-full max-w-[520px] max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <h5 className="text-[16px] font-bold text-[var(--text-primary)] m-0">File Complaint</h5>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowFileModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleFile}>
              <div className="p-4 flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Subject *</label>
                  <input data-testid="complaint-subject" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" required placeholder="Brief subject of the complaint" value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Category *</label>
                  <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Description *</label>
                  <textarea className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px] resize-y min-h-[100px]" required rows={4} placeholder="Describe the issue in detail..." value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>

                {/* Anonymous toggle */}
                <div className="flex items-center gap-2.5 p-3 bg-[var(--bg-elevated)] rounded-lg">
                  <input type="checkbox" id="anon-check" checked={form.anonymous}
                    onChange={e => setForm(p => ({ ...p, anonymous: e.target.checked }))}
                    className="w-[18px] h-[18px] accent-[#7C3AED]" />
                  <label htmlFor="anon-check" className="text-[13px] cursor-pointer text-[var(--text-primary)]">
                    <span className="font-semibold">File anonymously</span>
                    <div className="text-[11px] text-[var(--text-muted)]">Your identity will be kept confidential</div>
                  </label>
                </div>

                {!form.anonymous && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Your Name *</label>
                    <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" required={!form.anonymous} placeholder="John Doe" value={form.filedBy}
                      onChange={e => setForm(p => ({ ...p, filedBy: e.target.value }))} />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Assign To (optional)</label>
                  <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" placeholder="HR Manager name or leave blank" value={form.assignedTo}
                    onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-subtle)]">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowFileModal(false)}>Cancel</button>
                <button type="submit" data-testid="submit-complaint" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors">File Complaint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedComplaint && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-5"
          onClick={e => e.target === e.currentTarget && setShowResolveModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-full max-w-[440px] max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <h5 className="text-[16px] font-bold text-[var(--text-primary)] m-0">Resolve Complaint</h5>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowResolveModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleResolve}>
              <div className="p-4 flex flex-col gap-4">
                <div className="p-3 bg-[var(--bg-elevated)] rounded-lg">
                  <div className="font-semibold text-[var(--text-primary)] mb-1">{selectedComplaint.subject}</div>
                  <div className="text-[12px] text-[var(--text-muted)]">
                    {selectedComplaint.ticketNumber || ''} &middot; {selectedComplaint.category}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Resolution Notes *</label>
                  <textarea className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px] resize-y min-h-[100px]" required rows={4} placeholder="Describe how the complaint was resolved..." value={resolution}
                    onChange={e => setResolution(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-subtle)]">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowResolveModal(false)}>Cancel</button>
                <button type="submit" data-testid="confirm-resolve" className="bg-[#16A34A] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#16A34A]/90 transition-colors">Mark Resolved</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
