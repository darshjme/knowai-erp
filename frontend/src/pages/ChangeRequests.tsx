import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { changeRequestApi } from '../services/api';
import { Plus, Eye, ArrowRight, Check, X as XIcon, Clock, Send, FileText, ShieldCheck, Loader2 } from 'lucide-react';

const FIELD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'companyEmail', label: 'Company Email' },
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
];

const FIELD_LABELS = { email: 'Email', companyEmail: 'Company Email', firstName: 'First Name', lastName: 'Last Name' };
const FIELD_TYPE_STYLES = { email: { bg: '#DBEAFE', color: '#1D4ED8' }, companyEmail: { bg: '#EDE9FE', color: '#7C3AED' }, firstName: { bg: '#D1FAE5', color: '#059669' }, lastName: { bg: '#FEF3C7', color: '#92400E' } };
const STATUS_STYLES = { PENDING_HR: { bg: '#FFF3CD', color: '#856404', label: 'Pending HR' }, PENDING_CTO: { bg: '#D1ECF1', color: '#0C5460', label: 'Pending CTO' }, APPROVED: { bg: '#D4EDDA', color: '#155724', label: 'Approved' }, REJECTED: { bg: '#F8D7DA', color: '#721C24', label: 'Rejected' } };

const HR_ROLES = ['HR', 'ADMIN', 'CEO'];
const CTO_ROLES = ['CTO', 'CEO', 'ADMIN'];
const FILTER_TABS = [{ key: 'All', label: 'All' }, { key: 'PENDING_HR', label: 'Pending HR' }, { key: 'PENDING_CTO', label: 'Pending CTO' }, { key: 'APPROVED', label: 'Approved' }, { key: 'REJECTED', label: 'Rejected' }];

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
function initials(user) { if (!user) return '?'; return ((user.firstName || '')[0] || '') + ((user.lastName || '')[0] || '') || '?'; }
function userName(user) { if (!user) return 'Unknown'; return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'; }

const inputClass = "w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]";

function StepIndicator({ status }) {
  const steps = [{ key: 'PENDING_HR', label: 'HR Review' }, { key: 'PENDING_CTO', label: 'CTO Review' }, { key: 'APPROVED', label: 'Applied' }];
  const isRejected = status === 'REJECTED';
  const currentIdx = steps.findIndex(s => s.key === status);
  const activeIdx = isRejected ? -1 : currentIdx;

  return (
    <div className="flex items-center gap-1 text-[10px]">
      {steps.map((step, i) => {
        const done = !isRejected && activeIdx >= i;
        const isCurrent = !isRejected && activeIdx === i;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div title={step.label} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${done ? 'bg-[#7C3AED] text-white' : 'bg-[var(--border-default)] text-[var(--text-muted)]'} ${isCurrent ? 'ring-2 ring-[#7C3AED]' : ''}`}>
              {done ? <Check size={10} /> : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`w-4 h-0.5 ${done ? 'bg-[#7C3AED]' : 'bg-[var(--border-default)]'}`} />}
          </div>
        );
      })}
      {isRejected && <span className="ml-1 text-red-700 font-bold text-[10px] flex items-center gap-0.5"><XIcon size={10} /> Rejected</span>}
    </div>
  );
}

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
  const [form, setForm] = useState({ fieldName: 'email', requestedValue: '', reason: '' });

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    try { setLoading(true); const res = await changeRequestApi.list(); const rd = res.data; setRequests(Array.isArray(rd) ? rd : rd?.data || rd?.requests || []); }
    catch { toast.error('Failed to load change requests'); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => filter === 'All' ? requests : requests.filter(r => r.status === filter), [requests, filter]);
  const stats = useMemo(() => ({ total: requests.length, pendingHR: requests.filter(r => r.status === 'PENDING_HR').length, pendingCTO: requests.filter(r => r.status === 'PENDING_CTO').length, approved: requests.filter(r => r.status === 'APPROVED').length, rejected: requests.filter(r => r.status === 'REJECTED').length }), [requests]);

  const getCurrentValue = (fieldName) => {
    if (!user) return '';
    return { email: user.email || '', companyEmail: user.companyEmail || '', firstName: user.firstName || '', lastName: user.lastName || '' }[fieldName] || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requestedValue) { toast.error('Please enter the new value'); return; }
    try { setSubmitting(true); await changeRequestApi.submit({ fieldName: form.fieldName, requestedValue: form.requestedValue, reason: form.reason || undefined }); toast.success('Change request submitted'); setShowSubmitModal(false); setForm({ fieldName: 'email', requestedValue: '', reason: '' }); fetchRequests(); }
    catch (err) { toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to submit request'); }
    finally { setSubmitting(false); }
  };

  const handleHrApprove = async (req) => { try { await changeRequestApi.hrApprove(req._id || req.id, actionNote); toast.success('Approved and sent to CTO'); setActionNote(''); fetchRequests(); if (selectedRequest) setShowDetailDrawer(false); } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); } };
  const handleHrReject = async (req) => { try { await changeRequestApi.hrReject(req._id || req.id, actionNote); toast.warning('Request rejected'); setActionNote(''); fetchRequests(); if (selectedRequest) setShowDetailDrawer(false); } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject'); } };
  const handleCtoApprove = async (req) => { try { await changeRequestApi.ctoApprove(req._id || req.id, actionNote); toast.success('Change approved and applied'); setActionNote(''); fetchRequests(); if (selectedRequest) setShowDetailDrawer(false); } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); } };
  const handleCtoReject = async (req) => { try { await changeRequestApi.ctoReject(req._id || req.id, actionNote); toast.warning('Request rejected'); setActionNote(''); fetchRequests(); if (selectedRequest) setShowDetailDrawer(false); } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject'); } };

  const openDetail = (req) => { setSelectedRequest(req); setActionNote(''); setShowDetailDrawer(true); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)] m-0">Change Requests</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Request changes to your email, name, or profile information</p>
        </div>
        <button data-testid="new-request" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 flex items-center gap-1.5" onClick={() => setShowSubmitModal(true)}>
          <Plus size={14} /> New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: '#3B82F6' },
          { label: 'Pending HR', value: stats.pendingHR, color: '#D97706' },
          { label: 'Pending CTO', value: stats.pendingCTO, color: '#0891B2' },
          { label: 'Approved', value: stats.approved, color: '#16A34A' },
          { label: 'Rejected', value: stats.rejected, color: '#DC2626' },
        ].map((s, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4">
            <div className="flex items-center gap-2.5">
              <div className="text-[24px] font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[12px] text-[var(--text-secondary)]">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {FILTER_TABS.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium border ${filter === t.key ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'bg-transparent border-[var(--border-default)] text-[var(--text-secondary)]'}`}>
            {t.label}
            {t.key !== 'All' && <span className="ml-1.5 text-[11px] opacity-70">{requests.filter(r => r.status === t.key).length}</span>}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-[var(--text-muted)]"><Loader2 size={24} className="mx-auto mb-2 animate-spin" /> Loading change requests...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-[var(--text-muted)]">{requests.length === 0 ? 'No change requests yet.' : 'No requests match the selected filter.'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[var(--bg-elevated)]">
                  {['Field Changed', 'Current → New', 'Requester', 'Reason', 'Status', 'Progress', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide border-b border-[var(--border-default)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => {
                  const st = STATUS_STYLES[req.status] || STATUS_STYLES.PENDING_HR;
                  const ft = FIELD_TYPE_STYLES[req.fieldName] || FIELD_TYPE_STYLES.email;
                  return (
                    <tr key={req._id || req.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors" onClick={() => openDetail(req)}>
                      <td className="px-4 py-3"><span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: ft.bg, color: ft.color }}>{FIELD_LABELS[req.fieldName] || req.fieldName}</span></td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="flex items-center gap-1.5 text-[12px]">
                          <span className="text-[var(--text-muted)] line-through truncate max-w-[90px]" title={req.currentValue}>{req.currentValue || '(empty)'}</span>
                          <ArrowRight size={10} className="text-[var(--text-muted)] shrink-0" />
                          <span className="font-semibold text-[#7C3AED] truncate max-w-[90px]" title={req.requestedValue}>{req.requestedValue}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-[26px] h-[26px] rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[10px] font-bold shrink-0">{initials(req.requester)}</div>
                          <div><div className="text-[13px] font-medium text-[var(--text-primary)]">{userName(req.requester)}</div>{req.requester?.role && <div className="text-[10px] text-[var(--text-muted)]">{req.requester.role}</div>}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[var(--text-secondary)] max-w-[160px]"><div className="truncate" title={req.reason}>{req.reason || '-'}</div></td>
                      <td className="px-4 py-3"><span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                      <td className="px-4 py-3"><StepIndicator status={req.status} /></td>
                      <td className="px-4 py-3 text-[12px] whitespace-nowrap text-[var(--text-secondary)]">{formatDate(req.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          {isHR && req.status === 'PENDING_HR' && (<>
                            <button className="bg-green-100 text-green-700 rounded px-2 py-1 text-[11px] font-semibold hover:bg-green-200" onClick={() => handleHrApprove(req)}>Approve</button>
                            <button className="bg-red-100 text-red-700 rounded px-2 py-1 text-[11px] font-semibold hover:bg-red-200" onClick={() => handleHrReject(req)}>Reject</button>
                          </>)}
                          {isCTO && req.status === 'PENDING_CTO' && (<>
                            <button className="bg-green-100 text-green-700 rounded px-2 py-1 text-[11px] font-semibold hover:bg-green-200" onClick={() => handleCtoApprove(req)}>Approve</button>
                            <button className="bg-red-100 text-red-700 rounded px-2 py-1 text-[11px] font-semibold hover:bg-red-200" onClick={() => handleCtoReject(req)}>Reject</button>
                          </>)}
                          <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded px-2 py-1 text-[11px]" onClick={() => openDetail(req)}><Eye size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-5" onClick={e => e.target === e.currentTarget && setShowSubmitModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-full max-w-[500px] max-h-[90vh] overflow-auto shadow-2xl">
            <div className="px-5 py-4 border-b border-[var(--border-default)] flex justify-between items-center">
              <h5 className="m-0 text-[16px] font-bold text-[var(--text-primary)]">Submit Change Request</h5>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-sm" onClick={() => setShowSubmitModal(false)}><XIcon size={14} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">What do you want to change? *</label>
                  <select className={inputClass} value={form.fieldName} onChange={e => setForm(p => ({ ...p, fieldName: e.target.value, requestedValue: '' }))}>
                    {FIELD_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="p-3 bg-[var(--bg-elevated)] rounded-lg">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1">Current Value</div>
                  <div className="text-[14px] font-medium text-[var(--text-primary)]">{getCurrentValue(form.fieldName) || '(not set)'}</div>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">New Value *</label>
                  <input className={inputClass} required placeholder={form.fieldName.includes('mail') ? 'new.email@example.com' : 'New value'} type={form.fieldName.includes('mail') ? 'email' : 'text'} value={form.requestedValue} onChange={e => setForm(p => ({ ...p, requestedValue: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">Reason (optional)</label>
                  <textarea className={`${inputClass} resize-y min-h-[80px]`} rows={3} placeholder="Why do you need this change?" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-[12px] text-blue-700 font-semibold mb-1">Approval Process</div>
                  <div className="text-[11px] text-blue-600 leading-relaxed">Your request will be reviewed by HR first, then forwarded to CTO for final approval.</div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-[var(--border-default)] flex justify-end gap-2">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px]" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                <button type="submit" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 disabled:opacity-70 flex items-center gap-1.5" disabled={submitting}>
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <><Send size={14} /> Submit Request</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {showDetailDrawer && selectedRequest && (
        <div className="fixed inset-0 z-[2000] flex" onClick={e => e.target === e.currentTarget && setShowDetailDrawer(false)}>
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDetailDrawer(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-[460px] bg-[var(--bg-card)] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-default)] flex justify-between items-center shrink-0">
              <h5 className="m-0 text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-2"><FileText size={16} className="text-[#7C3AED]" /> Change Request Details</h5>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1" onClick={() => setShowDetailDrawer(false)}><XIcon size={14} /></button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <div className="flex gap-2 mb-4">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: (FIELD_TYPE_STYLES[selectedRequest.fieldName] || FIELD_TYPE_STYLES.email).bg, color: (FIELD_TYPE_STYLES[selectedRequest.fieldName] || FIELD_TYPE_STYLES.email).color }}>{FIELD_LABELS[selectedRequest.fieldName] || selectedRequest.fieldName}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: (STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.PENDING_HR).bg, color: (STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.PENDING_HR).color }}>{(STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.PENDING_HR).label}</span>
              </div>
              <div className="mb-5 p-3.5 bg-[var(--bg-elevated)] rounded-lg">
                <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-2">Approval Pipeline</div>
                <StepIndicator status={selectedRequest.status} />
              </div>
              <div className="mb-5 p-4 bg-[var(--bg-elevated)] rounded-lg">
                <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-2">Requested Change</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-[10px] text-[var(--text-muted)] mb-1">CURRENT</div>
                    <div className="text-[14px] p-2 bg-[var(--bg-card)] rounded-md border border-[var(--border-default)] text-[var(--text-muted)] line-through">{selectedRequest.currentValue || '(empty)'}</div>
                  </div>
                  <ArrowRight size={18} className="text-[#7C3AED] mt-3.5 shrink-0" />
                  <div className="flex-1">
                    <div className="text-[10px] text-[var(--text-muted)] mb-1">NEW</div>
                    <div className="text-[14px] p-2 bg-blue-50 rounded-md border border-blue-200 text-blue-700 font-semibold">{selectedRequest.requestedValue}</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5 mb-5">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1">Requester</div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[10px] font-bold">{initials(selectedRequest.requester)}</div>
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">{userName(selectedRequest.requester)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1">Submitted</div>
                  <div className="text-[13px] text-[var(--text-primary)]">{formatDateTime(selectedRequest.createdAt)}</div>
                </div>
              </div>
              {selectedRequest.reason && (
                <div className="mb-5">
                  <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1.5">Reason</div>
                  <div className="text-[13px] p-3 bg-[var(--bg-elevated)] rounded-lg leading-relaxed text-[var(--text-primary)]">{selectedRequest.reason}</div>
                </div>
              )}
              {/* Timeline */}
              <div className="mb-5">
                <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3 flex items-center gap-1.5"><Clock size={12} /> Review Timeline</div>
                <div className="flex gap-3 mb-3.5"><div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] mt-1 shrink-0" /><div><div className="font-semibold text-[13px] text-[var(--text-primary)]">Request Submitted</div><div className="text-[12px] text-[var(--text-muted)]">{formatDateTime(selectedRequest.createdAt)}</div></div></div>
                {selectedRequest.hrApprovalAt && <div className="flex gap-3 mb-3.5"><div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: (selectedRequest.status === 'REJECTED' && !selectedRequest.ctoApprovalAt) ? '#DC2626' : '#16A34A' }} /><div><div className="font-semibold text-[13px] text-[var(--text-primary)]">HR Review</div><div className="text-[12px] text-[var(--text-muted)]">{formatDateTime(selectedRequest.hrApprovalAt)}</div>{selectedRequest.hrNote && <div className="text-[12px] text-[var(--text-secondary)] mt-1 p-2 bg-[var(--bg-elevated)] rounded-md">{selectedRequest.hrNote}</div>}</div></div>}
                {selectedRequest.ctoApprovalAt && <div className="flex gap-3 mb-3.5"><div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: selectedRequest.status === 'REJECTED' ? '#DC2626' : '#16A34A' }} /><div><div className="font-semibold text-[13px] text-[var(--text-primary)]">CTO Review</div><div className="text-[12px] text-[var(--text-muted)]">{formatDateTime(selectedRequest.ctoApprovalAt)}</div>{selectedRequest.ctoNote && <div className="text-[12px] text-[var(--text-secondary)] mt-1 p-2 bg-[var(--bg-elevated)] rounded-md">{selectedRequest.ctoNote}</div>}</div></div>}
                {selectedRequest.appliedAt && <div className="flex gap-3 mb-3.5"><div className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] mt-1 shrink-0" /><div><div className="font-semibold text-[13px] text-[var(--text-primary)]">Change Applied</div><div className="text-[12px] text-[var(--text-muted)]">{formatDateTime(selectedRequest.appliedAt)}</div></div></div>}
                {!selectedRequest.hrApprovalAt && !selectedRequest.ctoApprovalAt && <div className="p-4 text-center text-[var(--text-muted)] text-[12px]"><Clock size={14} className="inline mr-1" /> Awaiting HR review...</div>}
              </div>
              {/* Action Area */}
              {((isHR && selectedRequest.status === 'PENDING_HR') || (isCTO && selectedRequest.status === 'PENDING_CTO')) && (
                <div className="border-t border-[var(--border-default)] pt-4">
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-2.5 flex items-center gap-1"><ShieldCheck size={12} /> Take Action</div>
                  <div className="mb-3">
                    <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">Note (optional)</label>
                    <textarea className={`${inputClass} resize-y`} rows={2} placeholder="Add a note..." value={actionNote} onChange={e => setActionNote(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    {isHR && selectedRequest.status === 'PENDING_HR' && (<>
                      <button className="flex-1 bg-green-100 text-green-700 rounded-lg py-2 text-[13px] font-semibold hover:bg-green-200 flex items-center justify-center gap-1" onClick={() => handleHrApprove(selectedRequest)}><Check size={14} /> Approve (Send to CTO)</button>
                      <button className="flex-1 bg-red-100 text-red-700 rounded-lg py-2 text-[13px] font-semibold hover:bg-red-200 flex items-center justify-center gap-1" onClick={() => handleHrReject(selectedRequest)}><XIcon size={14} /> Reject</button>
                    </>)}
                    {isCTO && selectedRequest.status === 'PENDING_CTO' && (<>
                      <button className="flex-1 bg-green-100 text-green-700 rounded-lg py-2 text-[13px] font-semibold hover:bg-green-200 flex items-center justify-center gap-1" onClick={() => handleCtoApprove(selectedRequest)}><Check size={14} /> Approve & Apply</button>
                      <button className="flex-1 bg-red-100 text-red-700 rounded-lg py-2 text-[13px] font-semibold hover:bg-red-200 flex items-center justify-center gap-1" onClick={() => handleCtoReject(selectedRequest)}><XIcon size={14} /> Reject</button>
                    </>)}
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
