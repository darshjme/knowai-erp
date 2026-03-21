import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { leavesApi } from '../services/api';

const LEAVE_TYPES = [
  { value: 'PAID', label: 'Paid Leave' },
  { value: 'UNPAID', label: 'Unpaid Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'WORK_FROM_HOME', label: 'Work From Home' },
];
const TYPE_COLORS = {
  'PAID': '#3B82F6', 'Paid Leave': '#3B82F6',
  'SICK': '#CB3939', 'Sick Leave': '#CB3939',
  'WORK_FROM_HOME': '#8B3FE9', 'WFH': '#8B3FE9',
  'HALF_DAY': '#EA580C', 'Half Day': '#EA580C',
  'UNPAID': '#16A34A', 'Casual Leave': '#16A34A',
  'Maternity': '#2563EB', 'Paternity': '#2563EB',
};
const typeLabel = (t) => {
  const found = LEAVE_TYPES.find(lt => lt.value === t);
  return found ? found.label : t;
};
const STATUS_STYLES = {
  PENDING: { bg: 'bg-amber-500/10', color: 'text-amber-400' },
  APPROVED: { bg: 'bg-green-500/10', color: 'text-green-400' },
  REJECTED: { bg: 'bg-red-500/10', color: 'text-red-400' },
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const isToday = (start, end) => {
  const now = new Date(); now.setHours(0,0,0,0);
  const s = new Date(start); s.setHours(0,0,0,0);
  const e = new Date(end); e.setHours(0,0,0,0);
  return now >= s && now <= e;
};

const inputClass = 'w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]';
const labelClass = 'block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5';

export default function Leaves() {
  const dispatch = useDispatch();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [view, setView] = useState('table');
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [expandedDay, setExpandedDay] = useState(null);
  const [form, setForm] = useState({ type: 'PAID', startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Leaves' });
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await leavesApi.list();
      setLeaves(Array.isArray(res.data) ? res.data : res.data?.data || res.data?.leaves || []);
    } catch (err) {
      toast.error('Failed to load leave requests');
    } finally { setLoading(false); }
  };

  const stats = useMemo(() => ({
    pending: leaves.filter(l => l.status === 'PENDING').length,
    approved: leaves.filter(l => l.status === 'APPROVED').length,
    rejected: leaves.filter(l => l.status === 'REJECTED').length,
    onLeaveToday: leaves.filter(l => l.status === 'APPROVED' && isToday(l.startDate, l.endDate)).length,
  }), [leaves]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await leavesApi.create({ type: form.type, startDate: form.startDate, endDate: form.endDate, reason: form.reason });
      toast.success('Leave request submitted');
      setShowModal(false);
      setForm({ type: 'PAID', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to submit leave request');
    }
  };

  const handleAction = async (id, status) => {
    try {
      const action = status === 'APPROVED' ? 'approve' : 'reject';
      await leavesApi.update(id, { action });
      toast.success(`Leave ${action}d`);
      fetchLeaves();
    } catch (err) {
      toast.error(`Failed to ${status.toLowerCase()} leave`);
    }
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [calendarMonth, calendarYear]);

  const leavesOnDay = (day) => {
    if (!day) return [];
    const date = new Date(calendarYear, calendarMonth, day);
    date.setHours(0, 0, 0, 0);
    return leaves.filter(l => {
      const s = new Date(l.startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(l.endDate); e.setHours(0, 0, 0, 0);
      return date >= s && date <= e;
    });
  };

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)] font-[Manrope]">Leave Management</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Track and manage employee leaves</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[var(--border-default)] rounded-lg overflow-hidden mr-2">
            <button className={`px-3 py-1.5 text-[12px] font-semibold border-none transition-colors ${view === 'table' ? 'bg-[#7C3AED] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
              onClick={() => setView('table')} data-testid="view-table">Table</button>
            <button className={`px-3 py-1.5 text-[12px] font-semibold border-none transition-colors ${view === 'calendar' ? 'bg-[#7C3AED] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
              onClick={() => setView('calendar')} data-testid="view-calendar">Calendar</button>
          </div>
          <button className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-1.5"
            onClick={() => setShowModal(true)} data-testid="request-leave-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Request Leave
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending', value: stats.pending, color: '#EA580C' },
          { label: 'Approved', value: stats.approved, color: '#16A34A' },
          { label: 'Rejected', value: stats.rejected, color: '#CB3939' },
          { label: 'On Leave Today', value: stats.onLeaveToday, color: '#3B82F6' },
        ].map((s, i) => (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4" key={i}>
            <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[12px] text-[var(--text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      {view === 'table' ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
            <h6 className="text-[14px] font-semibold text-[var(--text-primary)]">Leave Requests</h6>
            <span className="text-[11px] bg-[var(--bg-elevated)] text-[var(--text-muted)] px-2 py-0.5 rounded-full font-semibold">{leaves.length} requests</span>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-[var(--text-muted)]">Loading leave requests...</div>
            ) : leaves.length === 0 ? (
              <div className="py-16 text-center text-[var(--text-muted)]">No leave requests found.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    {['Employee','Type','Start','End','Reason','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(l => {
                    const st = STATUS_STYLES[l.status] || STATUS_STYLES.PENDING;
                    const tc = TYPE_COLORS[l.type] || '#5B6B76';
                    return (
                      <tr key={l._id || l.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer" onClick={() => setSelectedLeave(l)} data-testid="leave-row">
                        <td className="px-4 py-2.5 font-semibold text-[13px] text-[var(--text-primary)]">{l.employeeName || (l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : '-')}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${tc}15`, color: tc }}>{typeLabel(l.type)}</span>
                        </td>
                        <td className="px-4 py-2.5 text-[13px] text-[var(--text-secondary)]">{formatDate(l.startDate)}</td>
                        <td className="px-4 py-2.5 text-[13px] text-[var(--text-secondary)]">{formatDate(l.endDate)}</td>
                        <td className="px-4 py-2.5 max-w-[200px]">
                          <div className="truncate text-[13px] text-[var(--text-secondary)]" title={l.reason}>{l.reason || '-'}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${st.bg} ${st.color}`}>{l.status}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {l.status === 'PENDING' ? (
                            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                              <button className="bg-green-500/10 text-green-400 rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-green-500/20 transition-colors" onClick={() => handleAction(l._id || l.id, 'APPROVED')} data-testid="approve-leave">Approve</button>
                              <button className="bg-red-500/10 text-red-400 rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-red-500/20 transition-colors" onClick={() => handleAction(l._id || l.id, 'REJECTED')} data-testid="reject-leave">Reject</button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {l.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                              {l.reviewedBy ? ` by ${l.reviewedBy}` : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Calendar View */
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center gap-2">
            <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => {
              if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
              else setCalendarMonth(m => m - 1);
            }}>&larr;</button>
            <h6 className="min-w-[160px] text-center text-[14px] font-semibold text-[var(--text-primary)]">{MONTH_NAMES[calendarMonth]} {calendarYear}</h6>
            <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => {
              if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
              else setCalendarMonth(m => m + 1);
            }}>&rarr;</button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="py-2 px-1 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                const dayLeaves = leavesOnDay(day);
                const isCurrentDay = day && new Date().getDate() === day && new Date().getMonth() === calendarMonth && new Date().getFullYear() === calendarYear;
                const isExpanded = expandedDay === day && day;
                return (
                  <div key={i} onClick={() => day && dayLeaves.length > 0 && setExpandedDay(expandedDay === day ? null : day)}
                    className={`min-h-[80px] p-1.5 rounded-md transition-all ${day ? (isExpanded ? 'bg-[#7C3AED]/10 border-2 border-[#7C3AED] col-span-7' : isCurrentDay ? 'bg-[#7C3AED]/5 border-2 border-[#7C3AED]' : 'bg-[var(--bg-elevated)] border border-transparent') : ''} ${day && dayLeaves.length > 0 ? 'cursor-pointer' : ''}`}
                  >
                    {day && (
                      <>
                        <div className={`text-[13px] mb-1 ${isCurrentDay ? 'font-bold text-[#7C3AED]' : 'font-medium text-[var(--text-primary)]'}`}>
                          {day}
                          {dayLeaves.length > 0 && (
                            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[#7C3AED] text-white">{dayLeaves.length}</span>
                          )}
                        </div>
                        {!isExpanded && dayLeaves.slice(0, 2).map((l, j) => (
                          <div key={j} className="text-[10px] px-1 py-0.5 rounded mb-0.5 truncate" style={{ background: `${TYPE_COLORS[l.type] || '#3B82F6'}15`, color: TYPE_COLORS[l.type] || '#3B82F6' }}>
                            {l.employeeName || (l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Employee')}
                          </div>
                        ))}
                        {!isExpanded && dayLeaves.length > 2 && (
                          <div className="text-[10px] text-[var(--text-muted)]">+{dayLeaves.length - 2} more</div>
                        )}
                        {isExpanded && (
                          <div className="flex flex-col gap-1.5 mt-1.5">
                            {dayLeaves.map((l, j) => {
                              const tc = TYPE_COLORS[l.type] || '#3B82F6';
                              const st = STATUS_STYLES[l.status] || STATUS_STYLES.PENDING;
                              return (
                                <div key={j} className="flex items-center gap-2.5 px-2.5 py-1.5 bg-[var(--bg-card)] rounded-md border border-[var(--border-default)]">
                                  <div className="flex-1">
                                    <div className="font-semibold text-[13px] text-[var(--text-primary)]">
                                      {l.employeeName || (l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Employee')}
                                    </div>
                                    <div className="text-[11px] text-[var(--text-muted)]">{l.employee?.department || ''}</div>
                                  </div>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${tc}15`, color: tc }}>{typeLabel(l.type)}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${st.bg} ${st.color}`}>{l.status}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Request Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[var(--bg-primary)]/80 z-[2000] flex items-center justify-center p-5"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-full max-w-[480px] max-h-[90vh] overflow-auto shadow-2xl">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
              <h5 className="text-[16px] font-bold text-[var(--text-primary)]">Request Leave</h5>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-4 flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Leave Type *</label>
                  <select className={inputClass} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} data-testid="leave-type">
                    {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Start Date *</label>
                    <input className={inputClass} type="date" required value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} data-testid="start-date" />
                  </div>
                  <div>
                    <label className={labelClass}>End Date *</label>
                    <input className={inputClass} type="date" required value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} data-testid="end-date" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Reason *</label>
                  <textarea className={`${inputClass} resize-y min-h-[80px]`} required rows={3} placeholder="Reason for leave..." value={form.reason}
                    onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} data-testid="leave-reason" />
                </div>
              </div>
              <div className="px-4 py-3 border-t border-[var(--border-default)] flex justify-end gap-2">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors" data-testid="submit-leave">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Detail Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center"
          onClick={e => e.target === e.currentTarget && setSelectedLeave(null)}>
          <div className="absolute inset-0 bg-[var(--bg-primary)]/80" onClick={() => setSelectedLeave(null)} />
          <div className="relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[500px] max-w-[90vw] shadow-2xl z-10">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
              <h6 className="text-[14px] font-semibold text-[var(--text-primary)]">Leave Request Details</h6>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" onClick={() => setSelectedLeave(null)}>&#10005;</button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">Employee</div>
                  <div className="text-[14px] font-semibold">
                    <a href={`/profile/${selectedLeave.employeeId || selectedLeave.employee?.id}`} className="text-[#7C3AED] hover:underline">
                      {selectedLeave.employee ? `${selectedLeave.employee.firstName} ${selectedLeave.employee.lastName}` : selectedLeave.employeeName || '-'}
                    </a>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">Type</div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${TYPE_COLORS[selectedLeave.type] || '#5B6B76'}15`, color: TYPE_COLORS[selectedLeave.type] || '#5B6B76' }}>
                    {typeLabel(selectedLeave.type)}
                  </span>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">Start Date</div>
                  <div className="text-[14px] text-[var(--text-primary)]">{formatDate(selectedLeave.startDate)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">End Date</div>
                  <div className="text-[14px] text-[var(--text-primary)]">{formatDate(selectedLeave.endDate)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">Status</div>
                  {(() => { const st = STATUS_STYLES[selectedLeave.status] || STATUS_STYLES.PENDING; return (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${st.bg} ${st.color}`}>{selectedLeave.status}</span>
                  ); })()}
                </div>
                <div className="col-span-2">
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">Reason</div>
                  <div className="text-[14px] text-[var(--text-primary)] leading-relaxed">{selectedLeave.reason || 'No reason provided'}</div>
                </div>
                {selectedLeave.approverNote && (
                  <div className="col-span-2">
                    <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">Reviewer Note</div>
                    <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{selectedLeave.approverNote}</div>
                  </div>
                )}
                {(selectedLeave.approvedAt || selectedLeave.rejectedAt) && (
                  <div className="col-span-2">
                    <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase mb-1">
                      {selectedLeave.status === 'APPROVED' ? 'Approved On' : 'Rejected On'}
                    </div>
                    <div className="text-[14px] text-[var(--text-primary)]">{formatDate(selectedLeave.approvedAt || selectedLeave.rejectedAt)}</div>
                  </div>
                )}
              </div>
              {selectedLeave.status === 'PENDING' && (
                <div className="flex gap-2 justify-end border-t border-[var(--border-default)] pt-4">
                  <button className="bg-red-500/10 text-red-400 rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-red-500/20 transition-colors" onClick={() => { handleAction(selectedLeave._id || selectedLeave.id, 'REJECTED'); setSelectedLeave(null); }}>Reject</button>
                  <button className="bg-green-500/10 text-green-400 rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-green-500/20 transition-colors" onClick={() => { handleAction(selectedLeave._id || selectedLeave.id, 'APPROVED'); setSelectedLeave(null); }}>Approve</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
