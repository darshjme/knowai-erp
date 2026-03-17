import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { requestsApi, projectsApi } from '../services/api';

/* ========================================================================
   CONSTANTS
   ======================================================================== */

const TYPES = ['PASSWORD', 'SUBSCRIPTION', 'TOOL', 'SOFTWARE', 'HARDWARE', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];

const HR_ROLES = ['CTO', 'CEO', 'ADMIN', 'HR'];
const MANAGER_ROLES = ['CTO', 'CEO', 'ADMIN', 'PRODUCT_OWNER', 'BRAND_FACE', 'CFO'];

const STATUS_STYLES = {
  PENDING_HR:      { bg: '#FFF3CD', color: '#856404', label: 'Pending HR' },
  PENDING_MANAGER: { bg: '#D1ECF1', color: '#0C5460', label: 'Pending Manager' },
  APPROVED:        { bg: '#D4EDDA', color: '#155724', label: 'Approved' },
  PROVISIONED:     { bg: '#CCE5FF', color: '#004085', label: 'Provisioned' },
  REJECTED:        { bg: '#F8D7DA', color: '#721C24', label: 'Rejected' },
};

const TYPE_STYLES = {
  PASSWORD:     { bg: '#EDE9FE', color: '#7C3AED' },
  SUBSCRIPTION: { bg: '#DBEAFE', color: '#2563EB' },
  TOOL:         { bg: '#D1FAE5', color: '#059669' },
  SOFTWARE:     { bg: '#FEF3C7', color: '#92400E' },
  HARDWARE:     { bg: '#FCE7F3', color: '#BE185D' },
  OTHER:        { bg: '#F3F4F6', color: '#374151' },
};

const PRIORITY_STYLES = {
  LOW:    { bg: '#F3F4F6', color: '#6B7280' },
  MEDIUM: { bg: '#FEF3C7', color: '#92400E' },
  HIGH:   { bg: '#FED7AA', color: '#C2410C' },
  URGENT: { bg: '#FEE2E2', color: '#991B1B' },
};

const FILTER_TABS = [
  { key: 'All', label: 'All' },
  { key: 'PENDING_HR', label: 'Pending HR' },
  { key: 'PENDING_MANAGER', label: 'Pending Manager' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'PROVISIONED', label: 'Provisioned' },
  { key: 'REJECTED', label: 'Rejected' },
];

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

function initials(user) {
  if (!user) return '?';
  const f = user.firstName || '';
  const l = user.lastName || '';
  return (f[0] || '') + (l[0] || '') || '?';
}

function userName(user) {
  if (!user) return 'Unknown';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
}

/* ========================================================================
   STEP INDICATOR
   ======================================================================== */

function StepIndicator({ status }) {
  const steps = [
    { key: 'PENDING_HR', label: 'HR' },
    { key: 'PENDING_MANAGER', label: 'Manager' },
    { key: 'APPROVED', label: 'Approved' },
    { key: 'PROVISIONED', label: 'Provisioned' },
  ];

  const isRejected = status === 'REJECTED';
  const currentIdx = steps.findIndex(s => s.key === status);
  const activeIdx = isRejected ? -1 : currentIdx;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10 }}>
      {steps.map((step, i) => {
        const done = !isRejected && activeIdx >= i;
        const isCurrent = !isRejected && activeIdx === i;
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700,
              background: done ? 'var(--kai-primary)' : 'var(--kai-border-light)',
              color: done ? '#fff' : 'var(--kai-text-muted)',
              border: isCurrent ? '2px solid var(--kai-primary)' : 'none',
            }}>
              {done ? '\u2713' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 14, height: 2, background: done ? 'var(--kai-primary)' : 'var(--kai-border-light)' }} />
            )}
          </div>
        );
      })}
      {isRejected && (
        <span style={{ marginLeft: 4, color: '#991B1B', fontWeight: 700, fontSize: 10 }}>Rejected</span>
      )}
    </div>
  );
}

/* ========================================================================
   MAIN COMPONENT
   ======================================================================== */

export default function Requests() {
  const dispatch = useDispatch();
  const user = useSelector(s => s.auth?.user);
  const userRole = user?.role || 'GUY';
  const isHR = HR_ROLES.includes(userRole);
  const isManager = MANAGER_ROLES.includes(userRole);

  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, pendingHR: 0, pendingManager: 0, approved: 0, provisioned: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [credentialLink, setCredentialLink] = useState('');
  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'SOFTWARE', title: '', purpose: '', url: '', cost: '', currency: 'INR', projectId: '', priority: 'MEDIUM',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Resource Requests' });
    fetchRequests();
    fetchProjects();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await requestsApi.list();
      const rd = res.data;
      const list = rd?.requests || rd?.data || (Array.isArray(rd) ? rd : []);
      setRequests(list);
      if (rd?.stats) setStats(rd.stats);
      else {
        setStats({
          total: list.length,
          pendingHR: list.filter(r => r.status === 'PENDING_HR').length,
          pendingManager: list.filter(r => r.status === 'PENDING_MANAGER').length,
          approved: list.filter(r => r.status === 'APPROVED').length,
          provisioned: list.filter(r => r.status === 'PROVISIONED').length,
        });
      }
    } catch (err) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await projectsApi.list();
      const rd = res.data;
      setProjects(Array.isArray(rd) ? rd : rd?.data || rd?.projects || []);
    } catch { /* ignore */ }
  };

  const filtered = useMemo(() => {
    if (filter === 'All') return requests;
    return requests.filter(r => r.status === filter);
  }, [requests, filter]);

  /* ── Actions ── */

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.purpose || !form.type) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setSubmitting(true);
      await requestsApi.submit({
        ...form,
        cost: form.cost ? parseFloat(form.cost) : undefined,
        projectId: form.projectId || undefined,
      });
      toast.success('Request submitted successfully');
      setShowSubmitModal(false);
      setForm({ type: 'SOFTWARE', title: '', purpose: '', url: '', cost: '', currency: 'INR', projectId: '', priority: 'MEDIUM' });
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHrApprove = async (req) => {
    try {
      await requestsApi.hrApprove(req._id || req.id, actionNote);
      toast.success('Approved and sent to manager');
      setActionNote('');
      fetchRequests();
      if (selectedRequest) setShowDetailDrawer(false);
    } catch (err) { toast.error(err.message || 'Failed to approve'); }
  };

  const handleHrReject = async (req) => {
    try {
      await requestsApi.hrReject(req._id || req.id, actionNote);
      toast.warning('Request rejected');
      setActionNote('');
      fetchRequests();
      if (selectedRequest) setShowDetailDrawer(false);
    } catch (err) { toast.error(err.message || 'Failed to reject'); }
  };

  const handleManagerApprove = async (req) => {
    try {
      await requestsApi.managerApprove(req._id || req.id, actionNote);
      toast.success('Request approved');
      setActionNote('');
      fetchRequests();
      if (selectedRequest) setShowDetailDrawer(false);
    } catch (err) { toast.error(err.message || 'Failed to approve'); }
  };

  const handleManagerReject = async (req) => {
    try {
      await requestsApi.managerReject(req._id || req.id, actionNote);
      toast.warning('Request rejected');
      setActionNote('');
      fetchRequests();
      if (selectedRequest) setShowDetailDrawer(false);
    } catch (err) { toast.error(err.message || 'Failed to reject'); }
  };

  const handleProvision = async (req) => {
    try {
      await requestsApi.provision(req._id || req.id, actionNote, credentialLink || undefined);
      toast.success('Access provisioned');
      setActionNote('');
      setCredentialLink('');
      fetchRequests();
      if (selectedRequest) setShowDetailDrawer(false);
    } catch (err) { toast.error(err.message || 'Failed to provision'); }
  };

  const openDetail = (req) => {
    setSelectedRequest(req);
    setActionNote('');
    setCredentialLink('');
    setShowDetailDrawer(true);
  };

  /* ── Render ── */

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Resource Requests</h1>
          <p>Request access to tools, software, subscriptions, and hardware</p>
        </div>
        <div className="page-actions">
          <button className="kai-btn kai-btn-primary" onClick={() => setShowSubmitModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Request
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: stats.total, color: '#2563EB' },
          { label: 'Pending HR', value: stats.pendingHR, color: '#D97706' },
          { label: 'Pending Manager', value: stats.pendingManager, color: '#0891B2' },
          { label: 'Approved', value: stats.approved, color: '#16A34A' },
          { label: 'Provisioned', value: stats.provisioned, color: '#7C3AED' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {FILTER_TABS.map(t => (
          <button key={t.key}
            className={`kai-btn kai-btn-sm ${filter === t.key ? 'kai-btn-primary' : 'kai-btn-outline'}`}
            onClick={() => setFilter(t.key)}>
            {t.label}
            {t.key !== 'All' && (
              <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}>
                {requests.filter(r => r.status === t.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Request Table */}
      <div className="kai-card">
        <div className="kai-card-header">
          <h6>Requests</h6>
          <span className="kai-badge secondary">{filtered.length} items</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>Loading requests...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>
              {requests.length === 0 ? 'No requests yet. Submit your first request!' : 'No requests match the selected filter.'}
            </div>
          ) : (
            <table className="kai-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Requester</th>
                  <th>Priority</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th>Pipeline</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => {
                  const st = STATUS_STYLES[req.status] || STATUS_STYLES.PENDING_HR;
                  const tp = TYPE_STYLES[req.type] || TYPE_STYLES.OTHER;
                  const pr = PRIORITY_STYLES[req.priority] || PRIORITY_STYLES.MEDIUM;
                  const isActive = selectedRequest && (selectedRequest._id || selectedRequest.id) === (req._id || req.id);
                  return (
                    <tr key={req._id || req.id}
                      style={{ background: isActive ? 'var(--kai-primary-light)' : undefined, cursor: 'pointer' }}
                      onClick={() => openDetail(req)}>
                      <td style={{ fontWeight: 600, maxWidth: 200 }}>
                        <div className="truncate" title={req.title}>{req.title}</div>
                        {req.purpose && (
                          <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', marginTop: 2 }} className="truncate" title={req.purpose}>
                            {req.purpose}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="kai-badge" style={{ background: tp.bg, color: tp.color, fontSize: 10, fontWeight: 600 }}>
                          {req.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {req.requester?.avatar ? (
                            <img src={req.requester.avatar} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{
                              width: 26, height: 26, borderRadius: '50%', background: 'var(--kai-primary)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
                            }}>
                              {initials(req.requester)}
                            </div>
                          )}
                          <span style={{ fontSize: 13 }}>{userName(req.requester)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="kai-badge" style={{ background: pr.bg, color: pr.color, fontSize: 10, fontWeight: 600 }}>
                          {req.priority || 'MEDIUM'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                        {req.cost ? `${req.currency || 'INR'} ${Number(req.cost).toLocaleString()}` : '-'}
                      </td>
                      <td>
                        <span className="kai-badge" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <StepIndicator status={req.status} />
                      </td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(req.createdAt)}</td>
                      <td>
                        <div className="flex-gap-8" onClick={e => e.stopPropagation()}>
                          {isHR && req.status === 'PENDING_HR' && (
                            <>
                              <button className="kai-btn kai-btn-success kai-btn-sm" style={{ fontSize: 11 }}
                                onClick={() => handleHrApprove(req)}>Approve</button>
                              <button className="kai-btn kai-btn-danger kai-btn-sm" style={{ fontSize: 11 }}
                                onClick={() => handleHrReject(req)}>Reject</button>
                            </>
                          )}
                          {isManager && req.status === 'PENDING_MANAGER' && (
                            <>
                              <button className="kai-btn kai-btn-success kai-btn-sm" style={{ fontSize: 11 }}
                                onClick={() => handleManagerApprove(req)}>Approve</button>
                              <button className="kai-btn kai-btn-danger kai-btn-sm" style={{ fontSize: 11 }}
                                onClick={() => handleManagerReject(req)}>Reject</button>
                            </>
                          )}
                          {isHR && req.status === 'APPROVED' && (
                            <button className="kai-btn kai-btn-primary kai-btn-sm" style={{ fontSize: 11 }}
                              onClick={() => openDetail(req)}>Provision</button>
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

      {/* Submit Request Modal */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowSubmitModal(false)}>
          <div className="kai-card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="kai-card-header">
              <h5>Submit Resource Request</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowSubmitModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="kai-label">Type *</label>
                    <select className="kai-input" value={form.type}
                      onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                      {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="kai-label">Priority *</label>
                    <select className="kai-input" value={form.priority}
                      onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="kai-label">Title *</label>
                  <input className="kai-input" required placeholder="e.g. Adobe Creative Suite License" value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                </div>

                <div>
                  <label className="kai-label">Purpose *</label>
                  <textarea className="kai-input" required rows={3} placeholder="Why do you need this resource?"
                    value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                    style={{ resize: 'vertical', minHeight: 80 }} />
                </div>

                <div>
                  <label className="kai-label">URL (optional)</label>
                  <input className="kai-input" placeholder="https://..." value={form.url}
                    onChange={e => setForm(p => ({ ...p, url: e.target.value }))} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 16 }}>
                  <div>
                    <label className="kai-label">Cost (optional)</label>
                    <input className="kai-input" type="number" step="0.01" placeholder="0.00" value={form.cost}
                      onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} />
                  </div>
                  <div>
                    <label className="kai-label">Currency</label>
                    <select className="kai-input" value={form.currency}
                      onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="kai-label">Project (optional)</label>
                  <select className="kai-input" value={form.projectId}
                    onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}>
                    <option value="">-- No project --</option>
                    {projects.map(p => (
                      <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer (Offcanvas) */}
      {showDetailDrawer && selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex' }}
          onClick={e => e.target === e.currentTarget && setShowDetailDrawer(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}
            onClick={() => setShowDetailDrawer(false)} />
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 480,
            background: 'var(--kai-card-bg, #fff)', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Drawer Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--kai-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 style={{ margin: 0, fontSize: 16 }}>Request Details</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowDetailDrawer(false)}>&times;</button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {/* Title and Type */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span className="kai-badge" style={{
                    background: (TYPE_STYLES[selectedRequest.type] || TYPE_STYLES.OTHER).bg,
                    color: (TYPE_STYLES[selectedRequest.type] || TYPE_STYLES.OTHER).color,
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {selectedRequest.type}
                  </span>
                  <span className="kai-badge" style={{
                    background: (PRIORITY_STYLES[selectedRequest.priority] || PRIORITY_STYLES.MEDIUM).bg,
                    color: (PRIORITY_STYLES[selectedRequest.priority] || PRIORITY_STYLES.MEDIUM).color,
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {selectedRequest.priority || 'MEDIUM'}
                  </span>
                </div>
                <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedRequest.title}</h4>
              </div>

              {/* Status & Pipeline */}
              <div style={{ marginBottom: 20, padding: 14, background: 'var(--kai-bg)', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase' }}>Status</span>
                  <span className="kai-badge" style={{
                    background: (STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.PENDING_HR).bg,
                    color: (STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.PENDING_HR).color,
                  }}>
                    {(STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.PENDING_HR).label}
                  </span>
                </div>
                <StepIndicator status={selectedRequest.status} />
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Requester</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: 'var(--kai-primary)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
                    }}>
                      {initials(selectedRequest.requester)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{userName(selectedRequest.requester)}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Date</div>
                  <div style={{ fontSize: 13 }}>{formatDateTime(selectedRequest.createdAt)}</div>
                </div>
                {selectedRequest.cost && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Cost</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedRequest.currency || 'INR'} {Number(selectedRequest.cost).toLocaleString()}</div>
                  </div>
                )}
                {selectedRequest.project && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Project</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{selectedRequest.project.name}</div>
                  </div>
                )}
              </div>

              {/* Purpose */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Purpose</div>
                <div style={{ fontSize: 13, padding: 12, background: 'var(--kai-bg)', borderRadius: 8, lineHeight: 1.6 }}>
                  {selectedRequest.purpose}
                </div>
              </div>

              {selectedRequest.url && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>URL</div>
                  <a href={selectedRequest.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13, color: 'var(--kai-primary)', wordBreak: 'break-all' }}>
                    {selectedRequest.url}
                  </a>
                </div>
              )}

              {/* Review Timeline */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Review Timeline</div>

                {/* HR Review */}
                {selectedRequest.hrReviewedAt && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedRequest.status === 'REJECTED' && !selectedRequest.managerReviewedAt ? '#DC2626' : '#16A34A', marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>HR Review</div>
                      <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{formatDateTime(selectedRequest.hrReviewedAt)}</div>
                      {selectedRequest.hrNote && (
                        <div style={{ fontSize: 12, color: 'var(--kai-text-secondary)', marginTop: 4, padding: 8, background: 'var(--kai-bg)', borderRadius: 6 }}>
                          {selectedRequest.hrNote}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Manager Review */}
                {selectedRequest.managerReviewedAt && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedRequest.status === 'REJECTED' ? '#DC2626' : '#16A34A', marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Manager Review</div>
                      <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{formatDateTime(selectedRequest.managerReviewedAt)}</div>
                      {selectedRequest.managerNote && (
                        <div style={{ fontSize: 12, color: 'var(--kai-text-secondary)', marginTop: 4, padding: 8, background: 'var(--kai-bg)', borderRadius: 6 }}>
                          {selectedRequest.managerNote}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Provisioned */}
                {selectedRequest.provisionedAt && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#7C3AED', marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Provisioned</div>
                      <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{formatDateTime(selectedRequest.provisionedAt)}</div>
                      {selectedRequest.provisionNote && (
                        <div style={{ fontSize: 12, color: 'var(--kai-text-secondary)', marginTop: 4, padding: 8, background: 'var(--kai-bg)', borderRadius: 6 }}>
                          {selectedRequest.provisionNote}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* No activity yet */}
                {!selectedRequest.hrReviewedAt && !selectedRequest.managerReviewedAt && !selectedRequest.provisionedAt && (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--kai-text-muted)', fontSize: 12 }}>
                    Awaiting review...
                  </div>
                )}
              </div>

              {/* Action Area */}
              {((isHR && selectedRequest.status === 'PENDING_HR') ||
                (isManager && selectedRequest.status === 'PENDING_MANAGER') ||
                (isHR && selectedRequest.status === 'APPROVED')) && (
                <div style={{ borderTop: '1px solid var(--kai-border-light)', paddingTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                    Take Action
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label className="kai-label">Note (optional)</label>
                    <textarea className="kai-input" rows={2} placeholder="Add a note..." value={actionNote}
                      onChange={e => setActionNote(e.target.value)} style={{ resize: 'vertical' }} />
                  </div>

                  {isHR && selectedRequest.status === 'APPROVED' && (
                    <div style={{ marginBottom: 12 }}>
                      <label className="kai-label">Credential ID (optional)</label>
                      <input className="kai-input" placeholder="Link to credential in Password Manager" value={credentialLink}
                        onChange={e => setCredentialLink(e.target.value)} />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    {isHR && selectedRequest.status === 'PENDING_HR' && (
                      <>
                        <button className="kai-btn kai-btn-success kai-btn-sm" style={{ flex: 1 }} onClick={() => handleHrApprove(selectedRequest)}>
                          Approve (Send to Manager)
                        </button>
                        <button className="kai-btn kai-btn-danger kai-btn-sm" style={{ flex: 1 }} onClick={() => handleHrReject(selectedRequest)}>
                          Reject
                        </button>
                      </>
                    )}
                    {isManager && selectedRequest.status === 'PENDING_MANAGER' && (
                      <>
                        <button className="kai-btn kai-btn-success kai-btn-sm" style={{ flex: 1 }} onClick={() => handleManagerApprove(selectedRequest)}>
                          Approve
                        </button>
                        <button className="kai-btn kai-btn-danger kai-btn-sm" style={{ flex: 1 }} onClick={() => handleManagerReject(selectedRequest)}>
                          Reject
                        </button>
                      </>
                    )}
                    {isHR && selectedRequest.status === 'APPROVED' && (
                      <button className="kai-btn kai-btn-primary" style={{ flex: 1 }} onClick={() => handleProvision(selectedRequest)}>
                        Mark as Provisioned
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
