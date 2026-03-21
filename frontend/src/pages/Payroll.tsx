import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { payrollApi, teamApi } from '../services/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_STYLES = {
  PENDING: { bg: 'bg-amber-500/10', color: 'text-amber-400' },
  PAID: { bg: 'bg-green-500/10', color: 'text-green-400' },
  FAILED: { bg: 'bg-red-500/10', color: 'text-red-400' },
};

const currency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);
const inputClass = 'w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]';
const labelClass = 'block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5';

export default function Payroll() {
  const dispatch = useDispatch();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', mode: 'Bank', reference: '' });
  const [createForm, setCreateForm] = useState({ employeeId: '', employeeName: '', basicPay: '', hra: '', bonus: '', deductions: '' });

  useEffect(() => { dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Payroll' }); fetchPayroll(); fetchEmployees(); }, []);
  useEffect(() => { fetchPayroll(); }, [month, year]);

  const fetchPayroll = async () => {
    try { setLoading(true); const res = await payrollApi.list({ month: month + 1, year }); setRecords(Array.isArray(res.data) ? res.data : res.data?.data || res.data?.records || []); }
    catch { toast.error('Failed to load payroll data'); } finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try { const res = await teamApi.list(); setEmployees(Array.isArray(res.data) ? res.data : res.data?.data || res.data?.members || []); } catch {}
  };

  const stats = useMemo(() => {
    const total = records.reduce((a, r) => a + (r.totalPay || r.total || 0), 0);
    const paid = records.filter(r => r.status === 'PAID').reduce((a, r) => a + (r.totalPay || r.total || 0), 0);
    const pending = records.filter(r => r.status === 'PENDING').reduce((a, r) => a + (r.totalPay || r.total || 0), 0);
    const failed = records.filter(r => r.status === 'FAILED').length;
    return { total, paid, pending, failed };
  }, [records]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const basic = Number(createForm.basicPay) || 0, hra = Number(createForm.hra) || 0, bonus = Number(createForm.bonus) || 0, deductions = Number(createForm.deductions) || 0;
    try {
      await payrollApi.create({ employeeId: createForm.employeeId, employeeName: createForm.employeeName, month: month + 1, year, basicPay: basic, hra, bonus, deductions, totalPay: basic + hra + bonus - deductions, status: 'PENDING' });
      toast.success('Payroll record created'); setShowCreateModal(false); setCreateForm({ employeeId: '', employeeName: '', basicPay: '', hra: '', bonus: '', deductions: '' }); fetchPayroll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create payroll'); }
  };

  const openPayModal = (record) => { setSelectedRecord(record); setPayForm({ amount: String(record.totalPay || record.total || 0), mode: 'Bank', reference: '' }); setShowPayModal(true); };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      await payrollApi.update(selectedRecord._id || selectedRecord.id, { status: 'PAID', paymentMode: payForm.mode, paymentReference: payForm.reference, paidAmount: Number(payForm.amount), paidAt: new Date().toISOString() });
      toast.success('Payment processed successfully'); setShowPayModal(false); fetchPayroll();
    } catch { toast.error('Payment processing failed'); }
  };

  const markFailed = async (record) => {
    try { await payrollApi.update(record._id || record.id, { status: 'FAILED' }); toast.warning('Marked as failed'); fetchPayroll(); }
    catch { toast.error('Update failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)] font-[Manrope]">Payroll Management</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Process salaries and track payments</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons data={records} pageType="payroll" title="Payroll Report" filename="payroll" />
          <button className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-1.5" onClick={() => setShowCreateModal(true)} data-testid="create-payroll">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Payroll
          </button>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <select className={`${inputClass} w-auto min-w-[140px]`} value={month} onChange={e => setMonth(Number(e.target.value))} data-testid="month-select">
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select className={`${inputClass} w-auto min-w-[100px]`} value={year} onChange={e => setYear(Number(e.target.value))} data-testid="year-select">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Payroll', value: currency(stats.total), color: '#3B82F6' },
          { label: 'Paid', value: currency(stats.paid), color: '#16A34A' },
          { label: 'Pending', value: currency(stats.pending), color: '#EA580C' },
          { label: 'Failed', value: stats.failed, color: '#CB3939' },
        ].map((s, i) => (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4" key={i}>
            <div className="font-bold" style={{ color: s.color, fontSize: i === 3 ? 28 : 22 }}>{s.value}</div>
            <div className="text-[12px] text-[var(--text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
          <h6 className="text-[14px] font-semibold text-[var(--text-primary)]">{MONTHS[month]} {year} Payroll</h6>
          <span className="text-[11px] bg-[var(--bg-elevated)] text-[var(--text-muted)] px-2 py-0.5 rounded-full font-semibold">{records.length} records</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-[var(--text-muted)]">Loading payroll data...</div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-muted)]">No payroll records for this period. Create one to get started.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Employee</th>
                  {['Basic Pay','HRA','Bonus','Deductions','Total'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-right text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                  ))}
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const st = STATUS_STYLES[r.status] || STATUS_STYLES.PENDING;
                  const total = r.totalPay || r.total || ((r.basicPay || 0) + (r.hra || 0) + (r.bonus || 0) - (r.deductions || 0));
                  return (
                    <tr key={r._id || r.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer" onClick={() => setSelectedRecord(r)} data-testid="payroll-row">
                      <td className="px-4 py-2.5">
                        <a href={`/profile/${r.employeeId || r.employee?.id}`} onClick={e => e.stopPropagation()} className="font-semibold text-[#7C3AED] hover:underline text-[13px]">
                          {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeName || '-'}
                        </a>
                        <div className="text-[11px] text-[var(--text-muted)]">{r.employee?.role || r.employee?.department || ''}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] text-[var(--text-secondary)]">{currency(r.basicPay)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] text-[var(--text-secondary)]">{currency(r.hra)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] text-[var(--text-secondary)]">{currency(r.bonus)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] text-red-400">{currency(r.deductions)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[13px] font-bold text-[var(--text-primary)]">{currency(total)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${st.bg} ${st.color}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2">
                          {r.status === 'PENDING' && (
                            <>
                              <button className="bg-green-500/10 text-green-400 rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-green-500/20 transition-colors" onClick={() => openPayModal({ ...r, totalPay: total })} data-testid="pay-btn">Pay</button>
                              <button className="bg-red-500/10 text-red-400 rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-red-500/20 transition-colors" onClick={() => markFailed(r)}>Fail</button>
                            </>
                          )}
                          {r.status === 'FAILED' && (
                            <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1 text-[12px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => openPayModal({ ...r, totalPay: total })}>Retry</button>
                          )}
                          {r.status === 'PAID' && (
                            <span className="text-[11px] text-[var(--text-muted)]">{r.paymentMode || 'Bank'} {r.paymentReference ? `#${r.paymentReference}` : ''}</span>
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

      {/* Create Payroll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-[var(--bg-primary)]/80 z-[2000] flex items-center justify-center p-5" onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-full max-w-[520px] max-h-[90vh] overflow-auto shadow-2xl">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
              <h5 className="text-[16px] font-bold text-[var(--text-primary)]">Create Payroll Record</h5>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="p-4 flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Employee *</label>
                  {employees.length > 0 ? (
                    <select className={inputClass} required value={createForm.employeeId} onChange={e => { const emp = employees.find(em => (em._id || em.id) === e.target.value); setCreateForm(p => ({ ...p, employeeId: e.target.value, employeeName: emp?.name || '' })); }} data-testid="employee-select">
                      <option value="">Select employee</option>
                      {employees.map(emp => <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name}</option>)}
                    </select>
                  ) : (
                    <input className={inputClass} required placeholder="Employee name" value={createForm.employeeName} onChange={e => setCreateForm(p => ({ ...p, employeeName: e.target.value }))} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Basic Pay *</label><input className={inputClass} type="number" required placeholder="50000" value={createForm.basicPay} onChange={e => setCreateForm(p => ({ ...p, basicPay: e.target.value }))} /></div>
                  <div><label className={labelClass}>HRA</label><input className={inputClass} type="number" placeholder="15000" value={createForm.hra} onChange={e => setCreateForm(p => ({ ...p, hra: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Bonus</label><input className={inputClass} type="number" placeholder="5000" value={createForm.bonus} onChange={e => setCreateForm(p => ({ ...p, bonus: e.target.value }))} /></div>
                  <div><label className={labelClass}>Deductions</label><input className={inputClass} type="number" placeholder="3000" value={createForm.deductions} onChange={e => setCreateForm(p => ({ ...p, deductions: e.target.value }))} /></div>
                </div>
                <div className="p-3 bg-[var(--bg-elevated)] rounded-lg text-center">
                  <div className="text-[12px] text-[var(--text-muted)]">Net Payable</div>
                  <div className="text-[24px] font-bold text-[#7C3AED]">{currency((Number(createForm.basicPay) || 0) + (Number(createForm.hra) || 0) + (Number(createForm.bonus) || 0) - (Number(createForm.deductions) || 0))}</div>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-[var(--border-default)] flex justify-end gap-2">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors" data-testid="create-payroll-submit">Create Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Process Payment Modal */}
      {showPayModal && selectedRecord && (
        <div className="fixed inset-0 bg-[var(--bg-primary)]/80 z-[2000] flex items-center justify-center p-5" onClick={e => e.target === e.currentTarget && setShowPayModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-full max-w-[440px] max-h-[90vh] overflow-auto shadow-2xl">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
              <h5 className="text-[16px] font-bold text-[var(--text-primary)]">Process Payment</h5>
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={() => setShowPayModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleProcessPayment}>
              <div className="p-4 flex flex-col gap-4">
                <div className="p-3 bg-[var(--bg-elevated)] rounded-lg">
                  <div className="font-semibold text-[var(--text-primary)]">{selectedRecord.employeeName || selectedRecord.employee?.name}</div>
                  <div className="text-[12px] text-[var(--text-muted)]">{MONTHS[month]} {year}</div>
                </div>
                <div><label className={labelClass}>Amount *</label><input className={inputClass} type="number" required value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} data-testid="pay-amount" /></div>
                <div><label className={labelClass}>Payment Mode *</label><select className={inputClass} value={payForm.mode} onChange={e => setPayForm(p => ({ ...p, mode: e.target.value }))}>{['Cash', 'Bank', 'UPI', 'Cheque'].map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div><label className={labelClass}>Reference / Transaction ID</label><input className={inputClass} placeholder="TXN12345" value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} /></div>
              </div>
              <div className="px-4 py-3 border-t border-[var(--border-default)] flex justify-end gap-2">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="bg-green-600 text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-green-700 transition-colors" data-testid="process-payment">Process Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Slip Detail Modal */}
      {selectedRecord && !showPayModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center" onClick={e => e.target === e.currentTarget && setSelectedRecord(null)}>
          <div className="absolute inset-0 bg-[var(--bg-primary)]/80" onClick={() => setSelectedRecord(null)} />
          <div className="relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[560px] max-w-[95vw] max-h-[85vh] overflow-auto z-10 shadow-2xl">
            <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-elevated)] flex items-center justify-between">
              <div>
                <h6 className="text-[14px] font-semibold text-[var(--text-primary)]">Salary Slip</h6>
                <div className="text-[12px] text-[var(--text-muted)]">{MONTHS[selectedRecord.month - 1] || MONTHS[month]} {selectedRecord.year || year}</div>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[18px]">&#10005;</button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-5 p-3 bg-[var(--bg-elevated)] rounded-lg">
                <div className="w-12 h-12 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-[18px] font-bold">
                  {(selectedRecord.employee?.firstName || '?')[0]}{(selectedRecord.employee?.lastName || '')[0]}
                </div>
                <div className="flex-1">
                  <a href={`/profile/${selectedRecord.employeeId || selectedRecord.employee?.id}`} className="font-bold text-[16px] text-[#7C3AED] hover:underline">
                    {selectedRecord.employee ? `${selectedRecord.employee.firstName} ${selectedRecord.employee.lastName}` : 'Employee'}
                  </a>
                  <div className="text-[12px] text-[var(--text-muted)]">{selectedRecord.employee?.role} &bull; {selectedRecord.employee?.department} &bull; {selectedRecord.employee?.email}</div>
                </div>
                {(() => { const st = STATUS_STYLES[selectedRecord.status] || STATUS_STYLES.PENDING; return (
                  <span className={`text-[12px] px-2.5 py-0.5 rounded-full font-semibold ${st.bg} ${st.color}`}>{selectedRecord.status}</span>
                ); })()}
              </div>

              <div className="mb-5">
                <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Salary Breakdown</div>
                <table className="w-full text-[14px]">
                  <tbody>
                    {[{ label: 'Basic Pay', value: selectedRecord.basicPay },{ label: 'HRA', value: selectedRecord.hra },{ label: 'Transport', value: selectedRecord.transport },{ label: 'Bonus', value: selectedRecord.bonus }].filter(r => r.value).map((r, i) => (
                      <tr key={i}><td className="py-1.5 text-[var(--text-secondary)]">{r.label}</td><td className="py-1.5 text-right font-mono text-green-400">+{currency(r.value)}</td></tr>
                    ))}
                    {selectedRecord.deductions > 0 && <tr><td className="py-1.5 text-[var(--text-secondary)]">Deductions</td><td className="py-1.5 text-right font-mono text-red-400">-{currency(selectedRecord.deductions)}</td></tr>}
                    <tr className="border-t-2 border-[var(--border-default)]">
                      <td className="py-2.5 font-extrabold text-[16px] text-[var(--text-primary)]">Net Pay</td>
                      <td className="py-2.5 text-right font-extrabold text-[18px] font-mono text-[#7C3AED]">{currency(selectedRecord.totalPay || ((selectedRecord.basicPay || 0) + (selectedRecord.hra || 0) + (selectedRecord.transport || 0) + (selectedRecord.bonus || 0) - (selectedRecord.deductions || 0)))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {(selectedRecord.presentDays || selectedRecord.workingDays) && (
                <div className="mb-5">
                  <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Attendance</div>
                  <div className="flex gap-4 text-[13px] text-[var(--text-secondary)]">
                    <span>Present: <strong className="text-[var(--text-primary)]">{selectedRecord.presentDays || 0}</strong></span>
                    <span>Absent: <strong className="text-[var(--text-primary)]">{selectedRecord.absentDays || 0}</strong></span>
                    <span>Leave: <strong className="text-[var(--text-primary)]">{selectedRecord.leaveDays || 0}</strong></span>
                  </div>
                </div>
              )}

              <div>
                <div className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Payment History</div>
                {(selectedRecord.logs || []).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {selectedRecord.logs.map((log, i) => (
                      <div key={log.id || i} className="p-3 bg-[var(--bg-elevated)] rounded-lg flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-[14px] text-[var(--text-primary)]">{currency(log.amount)}</div>
                          <div className="text-[12px] text-[var(--text-muted)]">via <strong>{log.mode || 'Bank'}</strong>{log.bankRef && <span> &bull; Ref: {log.bankRef}</span>}</div>
                          {log.remarks && <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">{log.remarks}</div>}
                          {log.paidBy && <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Processed by: {log.paidBy.firstName} {log.paidBy.lastName}</div>}
                        </div>
                        <div className="text-[12px] text-[var(--text-muted)] text-right">{log.paidAt || log.createdAt ? new Date(log.paidAt || log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 text-center text-[var(--text-muted)] text-[13px] bg-[var(--bg-elevated)] rounded-lg">No payments recorded yet</div>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => window.print()}>Print Salary Slip</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
