import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { requestsApi, projectsApi } from '../services/api';

const TYPES = ['PASSWORD', 'SUBSCRIPTION', 'TOOL', 'SOFTWARE', 'HARDWARE', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
const HR_ROLES = ['CTO', 'CEO', 'ADMIN', 'HR'];
const MANAGER_ROLES = ['CTO', 'CEO', 'ADMIN', 'PRODUCT_OWNER', 'BRAND_FACE', 'CFO'];

const STATUS_STYLES = {
  PENDING_HR:      { bg: 'bg-amber-500/10', color: 'text-amber-400', label: 'Pending HR' },
  PENDING_MANAGER: { bg: 'bg-cyan-500/10', color: 'text-cyan-400', label: 'Pending Manager' },
  APPROVED:        { bg: 'bg-green-500/10', color: 'text-green-400', label: 'Approved' },
  PROVISIONED:     { bg: 'bg-blue-500/10', color: 'text-blue-400', label: 'Provisioned' },
  REJECTED:        { bg: 'bg-red-500/10', color: 'text-red-400', label: 'Rejected' },
};

const TYPE_STYLES = {
  PASSWORD: { bg: 'bg-purple-500/10', color: 'text-purple-400' },
  SUBSCRIPTION: { bg: 'bg-blue-500/10', color: 'text-blue-400' },
  TOOL: { bg: 'bg-green-500/10', color: 'text-green-400' },
  SOFTWARE: { bg: 'bg-amber-500/10', color: 'text-amber-400' },
  HARDWARE: { bg: 'bg-pink-500/10', color: 'text-pink-400' },
  OTHER: { bg: 'bg-gray-500/10', color: 'text-gray-400' },
};

const PRIORITY_STYLES = {
  LOW: { bg: 'bg-gray-500/10', color: 'text-gray-400' },
  MEDIUM: { bg: 'bg-amber-500/10', color: 'text-amber-400' },
  HIGH: { bg: 'bg-orange-500/10', color: 'text-orange-400' },
  URGENT: { bg: 'bg-red-500/10', color: 'text-red-400' },
};

const FILTER_TABS = [
  { key: 'All', label: 'All' }, { key: 'PENDING_HR', label: 'Pending HR' },
  { key: 'PENDING_MANAGER', label: 'Pending Manager' }, { key: 'APPROVED', label: 'Approved' },
  { key: 'PROVISIONED', label: 'Provisioned' }, { key: 'REJECTED', label: 'Rejected' },
];

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
function initials(user) { if (!user) return '?'; return ((user.firstName || '')[0] || '') + ((user.lastName || '')[0] || '') || '?'; }
function userName(user) { if (!user) return 'Unknown'; return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'; }

const inputClass = 'w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]';
const labelClass = 'block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5';

function StepIndicator({ status }) {
  const steps = [{ key: 'PENDING_HR', label: 'HR' },{ key: 'PENDING_MANAGER', label: 'Manager' },{ key: 'APPROVED', label: 'Approved' },{ key: 'PROVISIONED', label: 'Provisioned' }];
  const isRejected = status === 'REJECTED';
  const currentIdx = steps.findIndex(s => s.key === status);
  const activeIdx = isRejected ? -1 : currentIdx;
  return (
    <div className="flex items-center gap-0.5 text-[10px]">
      {steps.map((step, i) => {
        const done = !isRejected && activeIdx >= i;
        const isCurrent = !isRejected && activeIdx === i;
        return (
          <div key={step.key} className="flex items-center gap-0.5">
            <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold ${done ? 'bg-[#7C3AED] text-white' : 'bg-[var(--border-default)] text-[var(--text-muted)]'} ${isCurrent ? 'ring-2 ring-[#7C3AED]' : ''}`}>
              {done ? '\u2713' : i + 1}
            </div>
            {i < steps.length - 1 && <div className={`w-3.5 h-0.5 ${done ? 'bg-[#7C3AED]' : 'bg-[var(--border-default)]'}`} />}
          </div>
        );
      })}
      {isRejected && <span className="ml-1 text-red-400 font-bold text-[10px]">Rejected</span>}
    </div>
  );
}

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
  const [form, setForm] = useState({ type: 'SOFTWARE', title: '', purpose: '', url: '', cost: '', currency: 'INR', projectId: '', priority: 'MEDIUM' });

  useEffect(() => { dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Resource Requests' }); fetchRequests(); fetchProjects(); }, []);

  const fetchRequests = async () => {
    try { setLoading(true); const res = await requestsApi.list(); const rd = res.data; const list = rd?.requests || rd?.data || (Array.isArray(rd) ? rd : []);
      setRequests(list);
      if (rd?.stats) setStats(rd.stats);
      else setStats({ total: list.length, pendingHR: list.filter(r => r.status === 'PENDING_HR').length, pendingManager: list.filter(r => r.status === 'PENDING_MANAGER').length, approved: list.filter(r => r.status === 'APPROVED').length, provisioned: list.filter(r => r.status === 'PROVISIONED').length });
    } catch { toast.error('Failed to load requests'); } finally { setLoading(false); }
  };

  const fetchProjects = async () => { try { const res = await projectsApi.list(); const rd = res.data; setProjects(Array.isArray(rd) ? rd : rd?.data || rd?.projects || []); } catch {} };

  const filtered = useMemo(() => filter === 'All' ? requests : requests.filter(r => r.status === filter), [requests, filter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.purpose || !form.type) { toast.error('Please fill in all required fields'); return; }
    try { setSubmitting(true); await requestsApi.submit({ ...form, cost: form.cost ? parseFloat(form.cost) : undefined, projectId: form.projectId || undefined });
      toast.success('Request submitted successfully'); setShowSubmitModal(false); setForm({ type: 'SOFTWARE', title: '', purpose: '', url: '', cost: '', currency: 'INR', projectId: '', priority: 'MEDIUM' }); fetchRequests();
    } catch (err) { toast.error(err.message || 'Failed to submit request'); } finally { setSubmitting(false); }
  };

  const handleHrApprove = async (req) => { try { await requestsApi.hrApprove(req._id || req.id, actionNote); toast.success('Approved and sent to manager'); setActionNote(''); fetchRequests(); if (selectedRequest) setShowDetailDrawer(false); } catch (err) { toast.error(err.message || 'Failed to approve'); } };
  const handleHrReject = async (req) => { try { await requestsApi.hrReject(req._id || req.id, actionNote); toast.warning('Request rejected'); setActionNote(''); fetchRequests(); if (selectedRequest) setShowDetailDrawer(false); } catch (err) { toast.error(err.message || 'Failed to reject'); } };
  const handleManagerApprove = async (req) => { try { await requestsApi.managerApprove(req._id || req.id, actionNote); toast.success('Request approved'); setActionNote(''); fetchRequests(); if (selectedRequest) setShowDetailDrawer(false); } catch (err) { toast.error(err.message || 'Failed to approve'); } };
  const handleManagerReject = async (req) => { try { await requestsApi.managerReject(req._id || req.id, actionNote); toast.warning('Request rejected'); setActionNote(''); fetchRequests(); if (selectedRequest) setShowDetailDrawer(false); } catch (err) { toast.error(err.message || 'Failed to reject'); } };
  const handleProvision = async (req) => { try { await requestsApi.provision(req._id || req.id, actionNote, credentialLink || undefined); toast.success('Access provisioned'); setActionNote(''); setCredentialLink(''); fetchRequests(); if (selectedRequest) setShowDetailDrawer(false); } catch (err) { toast.error(err.message || 'Failed to provision'); } };

  const openDetail = (req) => { setSelectedRequest(req); setActionNote(''); setCredentialLink(''); setShowDetailDrawer(true); };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)] font-[Manrope]">Resource Requests</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Request access to tools, software, subscriptions, and hardware</p>
        </div>
        <button className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-1.5" onClick={() => setShowSubmitModal(true)} data-testid="new-request-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[{ label: 'Total', value: stats.total, color: '#2563EB' },{ label: 'Pending HR', value: stats.pendingHR, color: '#D97706' },{ label: 'Pending Manager', value: stats.pendingManager, color: '#0891B2' },{ label: 'Approved', value: stats.approved, color: '#16A34A' },{ label: 'Provisioned', value: stats.provisioned, color: '#7C3AED' }].map((s, i) => (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4" key={i}>
            <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[12px] text-[var(--text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2 flex-wrap" data-testid="filter-tabs">
        {FILTER_TABS.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${filter === t.key ? 'bg-[#7C3AED] text-white' : 'bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}>
            {t.label}
            {t.key !== 'All' && <span className="ml-1.5 opacity-70 text-[11px]">{requests.filter(r => r.status === t.key).length}</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
          <h6 className="text-[14px] font-semibold text-[var(--text-primary)]">Requests</h6>
          <span className="text-[11px] bg-[var(--bg-elevated)] text-[var(--text-muted)] px-2 py-0.5 rounded-full font-semibold">{filtered.length} items</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-[var(--text-muted)]">Loading requests...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-muted)]">{requests.length === 0 ? 'No requests yet. Submit your first request!' : 'No requests match the selected filter.'}</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  {['Title','Type','Requester','Priority','Cost','Status','Pipeline','Date','Actions'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => {
                  const st = STATUS_STYLES[req.status] || STATUS_STYLES.PENDING_HR;
                  const tp = TYPE_STYLES[req.type] || TYPE_STYLES.OTHER;
                  const pr = PRIORITY_STYLES[req.priority] || PRIORITY_STYLES.MEDIUM;
                  return (
                    <tr key={req._id || req.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer" onClick={() => openDetail(req)} data-testid="request-row">
                      <td className="px-4 py-2.5 font-semibold text-[13px] max-w-[200px]">
                        <div className="truncate text-[var(--text-primary)]" title={req.title}>{req.title}</div>
                        {req.purpose && <div className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate" title={req.purpose}>{req.purpose}</div>}
                      </td>
                      <td className="px-4 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${tp.bg} ${tp.color}`}>{req.type}</span></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-[26px] h-[26px] rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[10px] font-bold">{initials(req.requester)}</div>
                          <span className="text-[13px] text-[var(--text-primary)]">{userName(req.requester)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pr.bg} ${pr.color}`}>{req.priority || 'MEDIUM'}</span></td>
                      <td className="px-4 py-2.5 text-[13px] text-[var(--text-secondary)] whitespace-nowrap">{req.cost ? `${req.currency || 'INR'} ${Number(req.cost).toLocaleString()}` : '-'}</td>
                      <td className="px-4 py-2.5"><span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${st.bg} ${st.color}`}>{st.label}</span></td>
                      <td className="px-4 py-2.5"><StepIndicator status={req.status} /></td>
                      <td className="px-4 py-2.5 text-[12px] text-[var(--text-muted)] whitespace-nowrap">{formatDate(req.createdAt)}</td>
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                          {isHR && req.status === 'PENDING_HR' && (<><button className="bg-green-500/10 text-green-400 rounded-lg px-2 py-1 text-[11px] font-semibold" onClick={() => handleHrApprove(req)}>Approve</button><button className="bg-red-500/10 text-red-400 rounded-lg px-2 py-1 text-[11px] font-semibold" onClick={() => handleHrReject(req)}>Reject</button></>)}
                          {isManager && req.status === 'PENDING_MANAGER' && (<><button className="bg-green-500/10 text-green-400 rounded-lg px-2 py-1 text-[11px] font-semibold" onClick={() => handleManagerApprove(req)}>Approve</button><button className="bg-red-500/10 text-red-400 rounded-lg px-2 py-1 text-[11px] font-semibold" onClick={() => handleManagerReject(req)}>Reject</button></>)}
                          {isHR && req.status === 'APPROVED' && <button className="bg-[#7C3AED]/10 text-[#7C3AED] rounded-lg px-2 py-1 text-[11px] font-semibold" onClick={() => openDetail(req)}>Provision</button>}
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

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-[var(--bg-primary)]/80 z-[2000] flex items-center justify-center p-5" onClick={e => e.target === e.currentTarget && setShowSubmitModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-full max-w-[560px] max-h-[90vh] overflow-auto shadow-2xl">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
              <h5 className="text-[16px] font-bold text-[var(--text-primary)]">Submit Resource Request</h5>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => setShowSubmitModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Type *</label><select className={inputClass} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>{TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select></div>
                  <div><label className={labelClass}>Priority *</label><select className={inputClass} value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>{PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                </div>
                <div><label className={labelClass}>Title *</label><input className={inputClass} required placeholder="e.g. Adobe Creative Suite License" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} data-testid="request-title" /></div>
                <div><label className={labelClass}>Purpose *</label><textarea className={`${inputClass} resize-y min-h-[80px]`} required rows={3} placeholder="Why do you need this resource?" value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} /></div>
                <div><label className={labelClass}>URL (optional)</label><input className={inputClass} placeholder="https://..." value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} /></div>
                <div className="grid grid-cols-[1fr_120px] gap-4">
                  <div><label className={labelClass}>Cost (optional)</label><input className={inputClass} type="number" step="0.01" placeholder="0.00" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} /></div>
                  <div><label className={labelClass}>Currency</label><select className={inputClass} value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                </div>
                <div><label className={labelClass}>Project (optional)</label><select className={inputClass} value={form.projectId} onChange={e => setForm(p => ({ ...p, projectId: e.target.value }))}><option value="">-- No project --</option>{projects.map(p => <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>)}</select></div>
              </div>
              <div className="px-4 py-3 border-t border-[var(--border-default)] flex justify-end gap-2">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                <button type="submit" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors disabled:opacity-50" disabled={submitting} data-testid="submit-request">{submitting ? 'Submitting...' : 'Submit Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {showDetailDrawer && selectedRequest && (
        <div className="fixed inset-0 z-[2000] flex" onClick={e => e.target === e.currentTarget && setShowDetailDrawer(false)}>
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDetailDrawer(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-[480px] bg-[var(--bg-card)] shadow-2xl flex flex-col overflow-hidden border-l border-[var(--border-default)]">
            <div className="px-5 py-4 border-b border-[var(--border-default)] flex justify-between items-center shrink-0">
              <h5 className="text-[16px] font-bold text-[var(--text-primary)]">Request Details</h5>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => setShowDetailDrawer(false)}>&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <div className="mb-5">
                <div className="flex gap-2 items-center mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${(TYPE_STYLES[selectedRequest.type] || TYPE_STYLES.OTHER).bg} ${(TYPE_STYLES[selectedRequest.type] || TYPE_STYLES.OTHER).color}`}>{selectedRequest.type}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${(PRIORITY_STYLES[selectedRequest.priority] || PRIORITY_STYLES.MEDIUM).bg} ${(PRIORITY_STYLES[selectedRequest.priority] || PRIORITY_STYLES.MEDIUM).color}`}>{selectedRequest.priority || 'MEDIUM'}</span>
                </div>
                <h4 className="text-[18px] font-bold text-[var(--text-primary)]">{selectedRequest.title}</h4>
              </div>

              <div className="mb-5 p-3.5 bg-[var(--bg-elevated)] rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase">Status</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${(STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.PENDING_HR).bg} ${(STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.PENDING_HR).color}`}>{(STATUS_STYLES[selectedRequest.status] || STATUS_STYLES.PENDING_HR).label}</span>
                </div>
                <StepIndicator status={selectedRequest.status} />
              </div>

              <div className="grid grid-cols-2 gap-3.5 mb-5">
                <div><div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1">Requester</div><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-[#7C3AED] text-white flex items-center justify-center text-[10px] font-bold">{initials(selectedRequest.requester)}</div><span className="text-[13px] font-medium text-[var(--text-primary)]">{userName(selectedRequest.requester)}</span></div></div>
                <div><div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1">Date</div><div className="text-[13px] text-[var(--text-primary)]">{formatDateTime(selectedRequest.createdAt)}</div></div>
                {selectedRequest.cost && <div><div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1">Cost</div><div className="text-[14px] font-semibold text-[var(--text-primary)]">{selectedRequest.currency || 'INR'} {Number(selectedRequest.cost).toLocaleString()}</div></div>}
                {selectedRequest.project && <div><div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1">Project</div><div className="text-[13px] font-medium text-[var(--text-primary)]">{selectedRequest.project.name}</div></div>}
              </div>

              <div className="mb-5"><div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1.5">Purpose</div><div className="text-[13px] p-3 bg-[var(--bg-elevated)] rounded-lg leading-relaxed text-[var(--text-primary)]">{selectedRequest.purpose}</div></div>

              {selectedRequest.url && <div className="mb-5"><div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase mb-1.5">URL</div><a href={selectedRequest.url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#7C3AED] break-all hover:underline">{selectedRequest.url}</a></div>}

              {/* Review Timeline */}
              <div className="mb-5">
                <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Review Timeline</div>
                {selectedRequest.hrReviewedAt && (
                  <div className="flex gap-3 mb-3.5"><div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${selectedRequest.status === 'REJECTED' && !selectedRequest.managerReviewedAt ? 'bg-red-500' : 'bg-green-500'}`} /><div><div className="font-semibold text-[13px] text-[var(--text-primary)]">HR Review</div><div className="text-[12px] text-[var(--text-muted)]">{formatDateTime(selectedRequest.hrReviewedAt)}</div>{selectedRequest.hrNote && <div className="text-[12px] text-[var(--text-secondary)] mt-1 p-2 bg-[var(--bg-elevated)] rounded-md">{selectedRequest.hrNote}</div>}</div></div>
                )}
                {selectedRequest.managerReviewedAt && (
                  <div className="flex gap-3 mb-3.5"><div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${selectedRequest.status === 'REJECTED' ? 'bg-red-500' : 'bg-green-500'}`} /><div><div className="font-semibold text-[13px] text-[var(--text-primary)]">Manager Review</div><div className="text-[12px] text-[var(--text-muted)]">{formatDateTime(selectedRequest.managerReviewedAt)}</div>{selectedRequest.managerNote && <div className="text-[12px] text-[var(--text-secondary)] mt-1 p-2 bg-[var(--bg-elevated)] rounded-md">{selectedRequest.managerNote}</div>}</div></div>
                )}
                {selectedRequest.provisionedAt && (
                  <div className="flex gap-3 mb-3.5"><div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0 bg-purple-500" /><div><div className="font-semibold text-[13px] text-[var(--text-primary)]">Provisioned</div><div className="text-[12px] text-[var(--text-muted)]">{formatDateTime(selectedRequest.provisionedAt)}</div>{selectedRequest.provisionNote && <div className="text-[12px] text-[var(--text-secondary)] mt-1 p-2 bg-[var(--bg-elevated)] rounded-md">{selectedRequest.provisionNote}</div>}</div></div>
                )}
                {!selectedRequest.hrReviewedAt && !selectedRequest.managerReviewedAt && !selectedRequest.provisionedAt && <div className="py-4 text-center text-[var(--text-muted)] text-[12px]">Awaiting review...</div>}
              </div>

              {/* Action Area */}
              {((isHR && selectedRequest.status === 'PENDING_HR') || (isManager && selectedRequest.status === 'PENDING_MANAGER') || (isHR && selectedRequest.status === 'APPROVED')) && (
                <div className="border-t border-[var(--border-default)] pt-4">
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">Take Action</div>
                  <div className="mb-3"><label className={labelClass}>Note (optional)</label><textarea className={`${inputClass} resize-y`} rows={2} placeholder="Add a note..." value={actionNote} onChange={e => setActionNote(e.target.value)} /></div>
                  {isHR && selectedRequest.status === 'APPROVED' && <div className="mb-3"><label className={labelClass}>Credential ID (optional)</label><input className={inputClass} placeholder="Link to credential in Password Manager" value={credentialLink} onChange={e => setCredentialLink(e.target.value)} /></div>}
                  <div className="flex gap-2">
                    {isHR && selectedRequest.status === 'PENDING_HR' && (<><button className="flex-1 bg-green-500/10 text-green-400 rounded-lg px-3 py-2 text-[12px] font-semibold hover:bg-green-500/20 transition-colors" onClick={() => handleHrApprove(selectedRequest)}>Approve (Send to Manager)</button><button className="flex-1 bg-red-500/10 text-red-400 rounded-lg px-3 py-2 text-[12px] font-semibold hover:bg-red-500/20 transition-colors" onClick={() => handleHrReject(selectedRequest)}>Reject</button></>)}
                    {isManager && selectedRequest.status === 'PENDING_MANAGER' && (<><button className="flex-1 bg-green-500/10 text-green-400 rounded-lg px-3 py-2 text-[12px] font-semibold hover:bg-green-500/20 transition-colors" onClick={() => handleManagerApprove(selectedRequest)}>Approve</button><button className="flex-1 bg-red-500/10 text-red-400 rounded-lg px-3 py-2 text-[12px] font-semibold hover:bg-red-500/20 transition-colors" onClick={() => handleManagerReject(selectedRequest)}>Reject</button></>)}
                    {isHR && selectedRequest.status === 'APPROVED' && <button className="flex-1 bg-[#7C3AED] text-white rounded-lg px-3 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors" onClick={() => handleProvision(selectedRequest)}>Mark as Provisioned</button>}
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
