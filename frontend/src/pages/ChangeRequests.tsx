import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { changeRequestApi } from '../services/api';

/* ========================================================================
   CONSTANTS
   ======================================================================== */

const FIELD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'companyEmail', label: 'Company Email' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
];

const FIELD_LABELS = {
  email: 'Email',
  companyEmail: 'Company Email',
  firstName: 'First Name',
  lastName: 'Last Name',
};

const FIELD_TYPE_STYLES = {
  email:        { bg: '#DBEAFE', color: '#1D4ED8' },
  companyEmail: { bg: '#EDE9FE', color: '#7C3AED' },
  firstName:    { bg: '#D1FAE5', color: '#059669' },
  lastName:     { bg: '#FEF3C7', color: '#92400E' },
};

const STATUS_STYLES = {
  PENDING_HR:  { bg: '#FFF3CD', color: '#856404', label: 'Pending HR' },
  PENDING_CTO: { bg: '#D1ECF1', color: '#0C5460', label: 'Pending CTO' },
  APPROVED:    { bg: '#D4EDDA', color: '#155724', label: 'Approved' },
  REJECTED:    { bg: '#F8D7DA', color: '#721C24', label: 'Rejected' },
};

const HR_ROLES = ['HR', 'ADMIN', 'CEO'];
const CTO_ROLES = ['CTO', 'CEO', 'ADMIN'];

const FILTER_TABS = [
  { key: 'All', label: 'All' },
  { key: 'PENDING_HR', label: 'Pending HR' },
  { key: 'PENDING_CTO', label: 'Pending CTO' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

function initials(user) {
  if (!user) return '?';
  return ((user.firstName || '')[0] || '') + ((user.lastName || '')[0] || '') || '?';
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
    { key: 'PENDING_HR', label: 'HR Review' },
    { key: 'PENDING_CTO', label: 'CTO Review' },
    { key: 'APPROVED', label: 'Applied' },
  ];

  const isRejected = status === 'REJECTED';
  const currentIdx = steps.findIndex(s => s.key === status);
  const activeIdx = isRejected ? -1 : currentIdx;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
      {steps.map((step, i) => {
        const done = !isRejected && activeIdx >= i;
        const isCurrent = !isRejected && activeIdx === i;
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div title={step.label} style={{
              width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700,
              background: done ? '#111827' : 'var(--kai-border-light)',
              color: done ? '#fff' : 'var(--kai-text-muted)',
              border: isCurrent ? '2px solid #111827' : 'none',
            }}>
              {done ? <i className="bi bi-check" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 16, height: 2, background: done ? '#111827' : 'var(--kai-border-light)' }} />
            )}
          </div>
        );
      })}
      {isRejected && (
        <span style={{ marginLeft: 4, color: '#991B1B', fontWeight: 700, fontSize: 10 }}>
          <i className="bi bi-x-circle-fill" style={{ marginRight: 2 }} /> Rejected
        </span>
      )}
    </div>
  );
}

/* ========================================================================
   MAIN COMPONENT
   ======================================================================== */

export default function ChangeRequests() {
  const user = useSelector(s => s.auth?.user);
  const userRole = user?.role || 'GUY';
  const isHR = HR_ROLES.includes(userRole);
  const isCTO = CTO_ROLES.includes(userRole);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fieldName: 'email', requestedValue: '', reason: '',
  });

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await changeRequestApi.list();
      const rd = res.data;
      setRequests(Array.isArray(rd) ? rd : rd?.data || rd?.requests || []);
    } catch (err) {
      toast.error('Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'All') return requests;
    return requests.filter(r => r.status === filter);
  }, [requests, filter]);

  const stats = useMemo(() => ({
    total: requests.length,
    pendingHR: requests.filter(r => r.status === 'PENDING_HR').length,
    pendingCTO: requests.filter(r => r.status === 'PENDING_CTO').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  }), [requests]);

  /* ── Current value for auto-fill ── */
  const getCurrentValue = (fieldName) => {
    if (!user) return '';
    const map = {
      email: user.email || '',
      companyEmail: user.companyEmail || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    };
    return map[fieldName] || '';
  };

  /* ── Actions ── */

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requestedValue) {
      toast.error('Please enter the new value');
      return;
    }
    try {
      setSubmitting(true);
      await changeRequestApi.submit({
        fieldName: form.fieldName,
        requestedValue: form.requestedValue,
        reason: form.reason || undefined,
      });
      toast.success('Change request submitted');
      setShowSubmitModal(false);
      setForm({ fieldName: 'email', requestedValue: '', reason: '' });
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHrApprove = async (req) => {
    try {
      await changeRequestApi.hrApprove(req._id || req.id, actionNote);
      toast.success('Approved and sent to CTO');
      setActionNote('');
      fetchRequests();
      if (selectedRequest) setShowDetailDrawer(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); }
  };

  const handleHrReject = async (req) => {
    try {
      await changeRequestApi.hrReject(req._id || req.id, actionNote);
      toast.warning('Request rejected');
      setActionNote('');
      fetchRequests();
      if (selectedRequest) setShowDetailDrawer(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject'); }
  };

  const handleCtoApprove = async (req) => {
    try {
      await changeRequestApi.ctoApprove(req._id || req.id, actionNote);
      toast.success('Change approved and applied');
      setActionNote('');
      fetchRequests();
      if (selectedRequest) setShowDetailDrawer(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); }
  };

  const handleCtoReject = async (req) => {
    try {
      await changeRequestApi.ctoReject(req._id || req.id, actionNote);
      toast.warning('Request rejected');
      setActionNote('');
      fetchRequests();
      if (selectedRequest) setShowDetailDrawer(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject'); }
  };

  const openDetail = (req) => {
    setSelectedRequest(req);
    setActionNote('');
    setShowDetailDrawer(true);
  };

  /* ── Render ── */

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Change Requests</h1>
          <p>Request changes to your email, name, or profile information</p>
        </div>
        <div className="page-actions">
          <button className="kai-btn kai-btn-primary" onClick={() => setShowSubmitModal(true)}>
            <i className="bi bi-plus-lg" style={{ marginRight: 6 }} />
            New Request
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: stats.total, color: '#3B82F6', icon: 'bi-file-earmark-text' },
          { label: 'Pending HR', value: stats.pendingHR, color: '#D97706', icon: 'bi-hourglass-split' },
          { label: 'Pending CTO', value: stats.pendingCTO, color: '#0891B2', icon: 'bi-person-badge' },
          { label: 'Approved', value: stats.approved, color: '#16A34A', icon: 'bi-check-circle' },
          { label: 'Rejected', value: stats.rejected, color: '#DC2626', icon: 'bi-x-circle' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className={`bi ${s.icon}`} style={{ fontSize: 20, color: s.color }} />
              <div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
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

      {/* Requests Table */}
      <div className="kai-card">
        <div className="kai-card-header">
          <h6><i className="bi bi-arrow-left-right" style={{ marginRight: 8, color: '#3B82F6' }} />Change Requests</h6>
          <span className="kai-badge secondary">{filtered.length} items</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>
              <i className="bi bi-arrow-repeat" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
              Loading change requests...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>
              <i className="bi bi-inbox" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.4 }} />
              {requests.length === 0 ? 'No change requests yet.' : 'No requests match the selected filter.'}
            </div>
          ) : (
            <table className="kai-table">
              <thead>
                <tr>
                  <th>Field Changed</th>
                  <th>Current &rarr; New</th>
                  <th>Requester</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => {
                  const st = STATUS_STYLES[req.status] || STATUS_STYLES.PENDING_HR;
                  const ft = FIELD_TYPE_STYLES[req.fieldName] || FIELD_TYPE_STYLES.email;
                  const isActive = selectedRequest && (selectedRequest._id || selectedRequest.id) === (req._id || req.id);
                  return (
                    <tr key={req._id || req.id}
                      style={{ background: isActive ? 'var(--kai-primary-light)' : undefined, cursor: 'pointer' }}
                      onClick={() => openDetail(req)}>
                      <td>
                        <span className="kai-badge" style={{ background: ft.bg, color: ft.color, fontSize: 10, fontWeight: 600 }}>
                          {FIELD_LABELS[req.fieldName] || req.fieldName}
                        </span>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span style={{ color: 'var(--kai-text-muted)', textDecoration: 'line-through', maxWidth: 90 }} className="truncate" title={req.currentValue}>
                            {req.currentValue || '(empty)'}
                          </span>
                          <i className="bi bi-arrow-right" style={{ fontSize: 10, color: 'var(--kai-text-muted)' }} />
                          <span style={{ fontWeight: 600, color: '#3B82F6', maxWidth: 90 }} className="truncate" title={req.requestedValue}>
                            {req.requestedValue}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 26, height: 26, borderRadius: '50%', background: '#111827', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
                          }}>
                            {initials(req.requester)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{userName(req.requester)}</div>
                            {req.requester?.role && (
                              <div style={{ fontSize: 10, color: 'var(--kai-text-muted)' }}>{req.requester.role}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--kai-text-secondary)', maxWidth: 160 }}>
                        <div className="truncate" title={req.reason}>{req.reason || '-'}</div>
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
                                onClick={() => handleHrApprove(req)} title="HR Approve">
                                <i className="bi bi-check-lg" /> Approve
                              </button>
                              <button className="kai-btn kai-btn-danger kai-btn-sm" style={{ fontSize: 11 }}
                                onClick={() => handleHrReject(req)} title="HR Reject">
                                <i className="bi bi-x-lg" /> Reject
                              </button>
                            </>
                          )}
                          {isCTO && req.status === 'PENDING_CTO' && (
                            <>
                              <button className="kai-btn kai-btn-success kai-btn-sm" style={{ fontSize: 11 }}
                                onClick={() => handleCtoApprove(req)} title="CTO Approve">
                                <i className="bi bi-check-lg" /> Approve
                              </button>
                              <button className="kai-btn kai-btn-danger kai-btn-sm" style={{ fontSize: 11 }}
                                onClick={() => handleCtoReject(req)} title="CTO Reject">
                                <i className="bi bi-x-lg" /> Reject
                              </button>
                            </>
                          )}
                          <button className="kai-btn kai-btn-outline kai-btn-sm" style={{ fontSize: 11 }}
                            onClick={() => openDetail(req)} title="View details">
                            <i className="bi bi-eye" />
                          </button>
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

      {/* Submit Change Request Modal */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowSubmitModal(false)}>
          <div className="kai-card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="kai-card-header">
              <h5><i className="bi bi-pencil-square" style={{ marginRight: 8, color: '#3B82F6' }} />Submit Change Request</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowSubmitModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="kai-label">What do you want to change? *</label>
                  <select className="kai-input" value={form.fieldName}
                    onChange={e => setForm(p => ({ ...p, fieldName: e.target.value, requestedValue: '' }))}>
                    {FIELD_OPTIONS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ padding: 12, background: 'var(--kai-bg)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                    Current Value
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {getCurrentValue(form.fieldName) || '(not set)'}
                  </div>
                </div>

                <div>
                  <label className="kai-label">New Value *</label>
                  <input className="kai-input" required
                    placeholder={form.fieldName.includes('mail') ? 'new.email@example.com' : 'New value'}
                    type={form.fieldName.includes('mail') ? 'email' : 'text'}
                    value={form.requestedValue}
                    onChange={e => setForm(p => ({ ...p, requestedValue: e.target.value }))} />
                </div>

                <div>
                  <label className="kai-label">Reason (optional)</label>
                  <textarea className="kai-input" rows={3} placeholder="Why do you need this change?"
                    value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                    style={{ resize: 'vertical', minHeight: 80 }} />
                </div>

                {/* Info box */}
                <div style={{ padding: 12, background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: 12, color: '#1D4ED8', fontWeight: 600, marginBottom: 4 }}>
                    <i className="bi bi-info-circle" style={{ marginRight: 6 }} />Approval Process
                  </div>
                  <div style={{ fontSize: 11, color: '#1E40AF', lineHeight: 1.6 }}>
                    Your request will be reviewed by HR first, then forwarded to CTO for final approval.
                    Once approved, the change will be applied automatically.
                  </div>
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary" disabled={submitting}>
                  {submitting ? (
                    <><i className="bi bi-arrow-repeat" style={{ marginRight: 6 }} />Submitting...</>
                  ) : (
                    <><i className="bi bi-send" style={{ marginRight: 6 }} />Submit Request</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Offcanvas */}
      {showDetailDrawer && selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex' }}
          onClick={e => e.target === e.currentTarget && setShowDetailDrawer(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}
            onClick={() => setShowDetailDrawer(false)} />
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 460,
            background: 'var(--kai-card-bg, #fff)', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Drawer Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--kai-border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h5 style={{ margin: 0, fontSize: 16 }}>
                <i className="bi bi-file-earmark-text" style={{ marginRight: 8, color: '#3B82F6' }} />
                Change Request Details
              </h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowDetailDrawer(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {/* Type Badge */}
              <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                <span className="kai-badge" style={{
                  background: (FIELD_TYPE_STYLES[selectedRequest.fieldName] || FIELD_TYPE_STYLES.email).bg,
                  color: (FIELD_TYPE_STYLES[selectedRequest.fieldName] || FIELD_TYPE_STYLES.email).color,
                  fontSize: 11, fontWeight: 700,
                }}>
                  {FIELD_LABELS[selectedRequest.fieldName] || selectedRequest.fieldName}
                </span>
                <span className="kai-badge" style={{
                  background: (STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.PENDING_HR).bg,
                  color: (STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.PENDING_HR).color,
                }}>
                  {(STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.PENDING_HR).label}
                </span>
              </div>

              {/* Status Pipeline */}
              <div style={{ marginBottom: 20, padding: 14, background: 'var(--kai-bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Approval Pipeline</div>
                <StepIndicator status={selectedRequest.status} />
              </div>

              {/* Change Details */}
              <div style={{ marginBottom: 20, padding: 16, background: 'var(--kai-bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Requested Change</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: 'var(--kai-text-muted)', marginBottom: 2 }}>CURRENT</div>
                    <div style={{ fontSize: 14, padding: 8, background: 'var(--kai-card-bg, #fff)', borderRadius: 6, border: '1px solid var(--kai-border-light)', color: 'var(--kai-text-muted)', textDecoration: 'line-through' }}>
                      {selectedRequest.currentValue || '(empty)'}
                    </div>
                  </div>
                  <i className="bi bi-arrow-right" style={{ fontSize: 18, color: '#3B82F6', marginTop: 14 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: 'var(--kai-text-muted)', marginBottom: 2 }}>NEW</div>
                    <div style={{ fontSize: 14, padding: 8, background: '#EFF6FF', borderRadius: 6, border: '1px solid #BFDBFE', color: '#1D4ED8', fontWeight: 600 }}>
                      {selectedRequest.requestedValue}
                    </div>
                  </div>
                </div>
              </div>

              {/* Requester */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Requester</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: '#111827', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
                    }}>
                      {initials(selectedRequest.requester)}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{userName(selectedRequest.requester)}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Submitted</div>
                  <div style={{ fontSize: 13 }}>{formatDateTime(selectedRequest.createdAt)}</div>
                </div>
              </div>

              {/* Reason */}
              {selectedRequest.reason && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Reason</div>
                  <div style={{ fontSize: 13, padding: 12, background: 'var(--kai-bg)', borderRadius: 8, lineHeight: 1.6 }}>
                    {selectedRequest.reason}
                  </div>
                </div>
              )}

              {/* Review Timeline */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                  <i className="bi bi-clock-history" style={{ marginRight: 6 }} />Review Timeline
                </div>

                {/* Submitted event */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#111827', marginTop: 4, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      <i className="bi bi-send-check" style={{ marginRight: 4, color: '#3B82F6' }} />Request Submitted
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{formatDateTime(selectedRequest.createdAt)}</div>
                  </div>
                </div>

                {selectedRequest.hrApprovalAt && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                      background: (selectedRequest.status === 'REJECTED' && !selectedRequest.ctoApprovalAt) ? '#DC2626' : '#16A34A',
                    }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        <i className={`bi ${(selectedRequest.status === 'REJECTED' && !selectedRequest.ctoApprovalAt) ? 'bi-x-circle' : 'bi-check-circle'}`}
                          style={{ marginRight: 4, color: (selectedRequest.status === 'REJECTED' && !selectedRequest.ctoApprovalAt) ? '#DC2626' : '#16A34A' }} />
                        HR Review
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{formatDateTime(selectedRequest.hrApprovalAt)}</div>
                      {selectedRequest.hrNote && (
                        <div style={{ fontSize: 12, color: 'var(--kai-text-secondary)', marginTop: 4, padding: 8, background: 'var(--kai-bg)', borderRadius: 6 }}>
                          {selectedRequest.hrNote}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedRequest.ctoApprovalAt && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                      background: selectedRequest.status === 'REJECTED' ? '#DC2626' : '#16A34A',
                    }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        <i className={`bi ${selectedRequest.status === 'REJECTED' ? 'bi-x-circle' : 'bi-check-circle'}`}
                          style={{ marginRight: 4, color: selectedRequest.status === 'REJECTED' ? '#DC2626' : '#16A34A' }} />
                        CTO Review
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{formatDateTime(selectedRequest.ctoApprovalAt)}</div>
                      {selectedRequest.ctoNote && (
                        <div style={{ fontSize: 12, color: 'var(--kai-text-secondary)', marginTop: 4, padding: 8, background: 'var(--kai-bg)', borderRadius: 6 }}>
                          {selectedRequest.ctoNote}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedRequest.appliedAt && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#7C3AED', marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        <i className="bi bi-patch-check-fill" style={{ marginRight: 4, color: '#7C3AED' }} />Change Applied
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{formatDateTime(selectedRequest.appliedAt)}</div>
                    </div>
                  </div>
                )}

                {!selectedRequest.hrApprovalAt && !selectedRequest.ctoApprovalAt && (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--kai-text-muted)', fontSize: 12 }}>
                    <i className="bi bi-hourglass-split" style={{ marginRight: 4 }} />Awaiting HR review...
                  </div>
                )}
              </div>

              {/* Action Area */}
              {((isHR && selectedRequest.status === 'PENDING_HR') ||
                (isCTO && selectedRequest.status === 'PENDING_CTO')) && (
                <div style={{ borderTop: '1px solid var(--kai-border-light)', paddingTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                    <i className="bi bi-shield-check" style={{ marginRight: 4 }} />Take Action
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label className="kai-label">Note (optional)</label>
                    <textarea className="kai-input" rows={2} placeholder="Add a note..." value={actionNote}
                      onChange={e => setActionNote(e.target.value)} style={{ resize: 'vertical' }} />
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {isHR && selectedRequest.status === 'PENDING_HR' && (
                      <>
                        <button className="kai-btn kai-btn-success kai-btn-sm" style={{ flex: 1 }} onClick={() => handleHrApprove(selectedRequest)}>
                          <i className="bi bi-check-circle" style={{ marginRight: 4 }} /> Approve (Send to CTO)
                        </button>
                        <button className="kai-btn kai-btn-danger kai-btn-sm" style={{ flex: 1 }} onClick={() => handleHrReject(selectedRequest)}>
                          <i className="bi bi-x-circle" style={{ marginRight: 4 }} /> Reject
                        </button>
                      </>
                    )}
                    {isCTO && selectedRequest.status === 'PENDING_CTO' && (
                      <>
                        <button className="kai-btn kai-btn-success kai-btn-sm" style={{ flex: 1 }} onClick={() => handleCtoApprove(selectedRequest)}>
                          <i className="bi bi-check-circle" style={{ marginRight: 4 }} /> Approve & Apply
                        </button>
                        <button className="kai-btn kai-btn-danger kai-btn-sm" style={{ flex: 1 }} onClick={() => handleCtoReject(selectedRequest)}>
                          <i className="bi bi-x-circle" style={{ marginRight: 4 }} /> Reject
                        </button>
                      </>
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
