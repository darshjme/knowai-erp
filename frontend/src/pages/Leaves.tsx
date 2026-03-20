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
  PENDING: { bg: '#fff3cd', color: '#856404' },
  APPROVED: { bg: '#d4edda', color: '#155724' },
  REJECTED: { bg: '#f8d7da', color: '#721c24' },
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const isToday = (start, end) => {
  const now = new Date(); now.setHours(0,0,0,0);
  const s = new Date(start); s.setHours(0,0,0,0);
  const e = new Date(end); e.setHours(0,0,0,0);
  return now >= s && now <= e;
};

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
  const [form, setForm] = useState({
    type: 'PAID', startDate: '', endDate: '', reason: '',
  });

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
    } finally {
      setLoading(false);
    }
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
      await leavesApi.create({
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });
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

  // Calendar helpers
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
      <div className="page-header">
        <div>
          <h1>Leave Management</h1>
          <p>Track and manage employee leaves</p>
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', border: '1px solid var(--kai-border)', borderRadius: 'var(--kai-radius)', overflow: 'hidden', marginRight: 8 }}>
            <button className={`kai-btn kai-btn-sm ${view === 'table' ? 'kai-btn-primary' : 'kai-btn-outline'}`}
              style={{ borderRadius: 0, border: 'none' }} onClick={() => setView('table')}>Table</button>
            <button className={`kai-btn kai-btn-sm ${view === 'calendar' ? 'kai-btn-primary' : 'kai-btn-outline'}`}
              style={{ borderRadius: 0, border: 'none' }} onClick={() => setView('calendar')}>Calendar</button>
          </div>
          <button className="kai-btn kai-btn-primary" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Request Leave
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Pending', value: stats.pending, color: '#EA580C' },
          { label: 'Approved', value: stats.approved, color: '#16A34A' },
          { label: 'Rejected', value: stats.rejected, color: '#CB3939' },
          { label: 'On Leave Today', value: stats.onLeaveToday, color: '#3B82F6' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {view === 'table' ? (
        /* Table View */
        <div className="kai-card">
          <div className="kai-card-header">
            <h6>Leave Requests</h6>
            <span className="kai-badge secondary">{leaves.length} requests</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>Loading leave requests...</div>
            ) : leaves.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>No leave requests found.</div>
            ) : (
              <table className="kai-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(l => {
                    const st = STATUS_STYLES[l.status] || STATUS_STYLES.PENDING;
                    const tc = TYPE_COLORS[l.type] || '#5B6B76';
                    return (
                      <tr key={l._id || l.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLeave(l)}>
                        <td style={{ fontWeight: 600 }}>{l.employeeName || (l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : '-')}</td>
                        <td>
                          <span className="kai-badge" style={{ background: `${tc}15`, color: tc }}>{typeLabel(l.type)}</span>
                        </td>
                        <td>{formatDate(l.startDate)}</td>
                        <td>{formatDate(l.endDate)}</td>
                        <td style={{ maxWidth: 200 }}>
                          <div className="truncate" title={l.reason}>{l.reason || '-'}</div>
                        </td>
                        <td>
                          <span className="kai-badge" style={{ background: st.bg, color: st.color }}>{l.status}</span>
                        </td>
                        <td>
                          {l.status === 'PENDING' ? (
                            <div className="flex-gap-8">
                              <button className="kai-btn kai-btn-success kai-btn-sm" onClick={() => handleAction(l._id || l.id, 'APPROVED')}>Approve</button>
                              <button className="kai-btn kai-btn-danger kai-btn-sm" onClick={() => handleAction(l._id || l.id, 'REJECTED')}>Reject</button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>
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
        <div className="kai-card">
          <div className="kai-card-header">
            <div className="flex-gap-8">
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => {
                if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
                else setCalendarMonth(m => m - 1);
              }}>&larr;</button>
              <h6 style={{ minWidth: 160, textAlign: 'center' }}>{MONTH_NAMES[calendarMonth]} {calendarYear}</h6>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => {
                if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
                else setCalendarMonth(m => m + 1);
              }}>&rarr;</button>
            </div>
          </div>
          <div className="kai-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} style={{ padding: '8px 4px', fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                const dayLeaves = leavesOnDay(day);
                const isCurrentDay = day && new Date().getDate() === day && new Date().getMonth() === calendarMonth && new Date().getFullYear() === calendarYear;
                const isExpanded = expandedDay === day && day;
                return (
                  <div key={i} onClick={() => day && dayLeaves.length > 0 && setExpandedDay(expandedDay === day ? null : day)} style={{
                    minHeight: 80, padding: 6, borderRadius: 6, cursor: day && dayLeaves.length > 0 ? 'pointer' : 'default',
                    background: day ? (isExpanded ? 'var(--kai-accent-light)' : isCurrentDay ? 'var(--kai-primary-light)' : 'var(--kai-bg)') : 'transparent',
                    border: isExpanded ? '2px solid var(--kai-primary)' : isCurrentDay ? '2px solid var(--kai-primary)' : '1px solid transparent',
                    gridColumn: isExpanded ? '1 / -1' : undefined,
                  }}>
                    {day && (
                      <>
                        <div style={{ fontSize: 13, fontWeight: isCurrentDay ? 700 : 500, color: isCurrentDay ? 'var(--kai-primary)' : 'var(--kai-text)', marginBottom: 4 }}>
                          {day}
                          {dayLeaves.length > 0 && (
                            <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 8, background: 'var(--kai-primary)', color: '#fff' }}>
                              {dayLeaves.length}
                            </span>
                          )}
                        </div>
                        {!isExpanded && dayLeaves.slice(0, 2).map((l, j) => (
                          <div key={j} style={{
                            fontSize: 10, padding: '2px 4px', borderRadius: 3, marginBottom: 2,
                            background: `${TYPE_COLORS[l.type] || '#3B82F6'}15`,
                            color: TYPE_COLORS[l.type] || '#3B82F6',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{l.employeeName || (l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Employee')}</div>
                        ))}
                        {!isExpanded && dayLeaves.length > 2 && (
                          <div style={{ fontSize: 10, color: 'var(--kai-text-muted)' }}>+{dayLeaves.length - 2} more</div>
                        )}
                        {isExpanded && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                            {dayLeaves.map((l, j) => {
                              const tc = TYPE_COLORS[l.type] || '#3B82F6';
                              const st = STATUS_STYLES[l.status] || STATUS_STYLES.PENDING;
                              return (
                                <div key={j} style={{
                                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                                  background: 'var(--kai-surface)', borderRadius: 6, border: '1px solid var(--kai-border)',
                                }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--kai-text)' }}>
                                      {l.employeeName || (l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : 'Employee')}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>
                                      {l.employee?.department || ''}
                                    </div>
                                  </div>
                                  <span className="kai-badge" style={{ background: `${tc}15`, color: tc, fontSize: 10 }}>{typeLabel(l.type)}</span>
                                  <span className="kai-badge" style={{ background: st.bg, color: st.color, fontSize: 10 }}>{l.status}</span>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="kai-card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="kai-card-header">
              <h5>Request Leave</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="kai-label">Leave Type *</label>
                  <select className="kai-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="kai-label">Start Date *</label>
                    <input className="kai-input" type="date" required value={form.startDate}
                      onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="kai-label">End Date *</label>
                    <input className="kai-input" type="date" required value={form.endDate}
                      onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="kai-label">Reason *</label>
                  <textarea className="kai-input" required rows={3} placeholder="Reason for leave..." value={form.reason}
                    onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                    style={{ resize: 'vertical', minHeight: 80 }} />
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Detail Modal */}
      {selectedLeave && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setSelectedLeave(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedLeave(null)} />
          <div className="kai-card" style={{ position: 'relative', width: 500, maxWidth: '90vw', zIndex: 1 }}>
            <div className="kai-card-header">
              <h6 style={{ margin: 0 }}>Leave Request Details</h6>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setSelectedLeave(null)}>✕</button>
            </div>
            <div className="kai-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Employee</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    <a href={`/profile/${selectedLeave.employeeId || selectedLeave.employee?.id}`} style={{ color: 'var(--kai-primary)' }}>
                      {selectedLeave.employee ? `${selectedLeave.employee.firstName} ${selectedLeave.employee.lastName}` : selectedLeave.employeeName || '-'}
                    </a>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Type</div>
                  <span className="kai-badge" style={{ background: `${TYPE_COLORS[selectedLeave.type] || '#5B6B76'}15`, color: TYPE_COLORS[selectedLeave.type] || '#5B6B76' }}>
                    {typeLabel(selectedLeave.type)}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Start Date</div>
                  <div style={{ fontSize: 14 }}>{formatDate(selectedLeave.startDate)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>End Date</div>
                  <div style={{ fontSize: 14 }}>{formatDate(selectedLeave.endDate)}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                  {(() => { const st = STATUS_STYLES[selectedLeave.status] || STATUS_STYLES.PENDING; return (
                    <span className="kai-badge" style={{ background: st.bg, color: st.color }}>{selectedLeave.status}</span>
                  ); })()}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Reason</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>{selectedLeave.reason || 'No reason provided'}</div>
                </div>
                {selectedLeave.approverNote && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Reviewer Note</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--kai-text-secondary)' }}>{selectedLeave.approverNote}</div>
                  </div>
                )}
                {(selectedLeave.approvedAt || selectedLeave.rejectedAt) && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                      {selectedLeave.status === 'APPROVED' ? 'Approved On' : 'Rejected On'}
                    </div>
                    <div style={{ fontSize: 14 }}>{formatDate(selectedLeave.approvedAt || selectedLeave.rejectedAt)}</div>
                  </div>
                )}
              </div>
              {selectedLeave.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--kai-border)', paddingTop: 16 }}>
                  <button className="kai-btn kai-btn-danger" onClick={() => { handleAction(selectedLeave._id || selectedLeave.id, 'REJECTED'); setSelectedLeave(null); }}>Reject</button>
                  <button className="kai-btn kai-btn-success" onClick={() => { handleAction(selectedLeave._id || selectedLeave.id, 'APPROVED'); setSelectedLeave(null); }}>Approve</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
