import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { payrollApi, teamApi } from '../services/api';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_STYLES = {
  PENDING: { bg: '#fff3cd', color: '#856404' },
  PAID: { bg: '#d4edda', color: '#155724' },
  FAILED: { bg: '#f8d7da', color: '#721c24' },
};

const currency = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

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
  const [createForm, setCreateForm] = useState({
    employeeId: '', employeeName: '', basicPay: '', hra: '', bonus: '', deductions: '',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Payroll' });
    fetchPayroll();
    fetchEmployees();
  }, []);

  useEffect(() => { fetchPayroll(); }, [month, year]);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const res = await payrollApi.list({ month: month + 1, year });
      setRecords(Array.isArray(res.data) ? res.data : res.data?.data || res.data?.records || []);
    } catch (err) {
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await teamApi.list();
      setEmployees(Array.isArray(res.data) ? res.data : res.data?.data || res.data?.members || []);
    } catch {}
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
    const basic = Number(createForm.basicPay) || 0;
    const hra = Number(createForm.hra) || 0;
    const bonus = Number(createForm.bonus) || 0;
    const deductions = Number(createForm.deductions) || 0;
    try {
      await payrollApi.create({
        employeeId: createForm.employeeId,
        employeeName: createForm.employeeName,
        month: month + 1,
        year,
        basicPay: basic,
        hra,
        bonus,
        deductions,
        totalPay: basic + hra + bonus - deductions,
        status: 'PENDING',
      });
      toast.success('Payroll record created');
      setShowCreateModal(false);
      setCreateForm({ employeeId: '', employeeName: '', basicPay: '', hra: '', bonus: '', deductions: '' });
      fetchPayroll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create payroll');
    }
  };

  const openPayModal = (record) => {
    setSelectedRecord(record);
    setPayForm({ amount: String(record.totalPay || record.total || 0), mode: 'Bank', reference: '' });
    setShowPayModal(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      await payrollApi.update(selectedRecord._id || selectedRecord.id, {
        status: 'PAID',
        paymentMode: payForm.mode,
        paymentReference: payForm.reference,
        paidAmount: Number(payForm.amount),
        paidAt: new Date().toISOString(),
      });
      toast.success('Payment processed successfully');
      setShowPayModal(false);
      fetchPayroll();
    } catch (err) {
      toast.error('Payment processing failed');
    }
  };

  const markFailed = async (record) => {
    try {
      await payrollApi.update(record._id || record.id, { status: 'FAILED' });
      toast.warning('Marked as failed');
      fetchPayroll();
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payroll Management</h1>
          <p>Process salaries and track payments</p>
        </div>
        <div className="page-actions">
          <ExportButtons data={records} pageType="payroll" title="Payroll Report" filename="payroll" />
          <button className="kai-btn kai-btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Payroll
          </button>
        </div>
      </div>

      {/* Month/Year Selector + Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="kai-input" style={{ width: 'auto', minWidth: 140 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select className="kai-input" style={{ width: 'auto', minWidth: 100 }} value={year} onChange={e => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Payroll', value: currency(stats.total), color: '#146DF7' },
          { label: 'Paid', value: currency(stats.paid), color: '#16A34A' },
          { label: 'Pending', value: currency(stats.pending), color: '#EA580C' },
          { label: 'Failed', value: stats.failed, color: '#CB3939' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-value" style={{ color: s.color, fontSize: i === 3 ? 28 : 22 }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Payroll Table */}
      <div className="kai-card">
        <div className="kai-card-header">
          <h6>{MONTHS[month]} {year} Payroll</h6>
          <span className="kai-badge secondary">{records.length} records</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>Loading payroll data...</div>
          ) : records.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>No payroll records for this period. Create one to get started.</div>
          ) : (
            <table className="kai-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th style={{ textAlign: 'right' }}>Basic Pay</th>
                  <th style={{ textAlign: 'right' }}>HRA</th>
                  <th style={{ textAlign: 'right' }}>Bonus</th>
                  <th style={{ textAlign: 'right' }}>Deductions</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const st = STATUS_STYLES[r.status] || STATUS_STYLES.PENDING;
                  const total = r.totalPay || r.total || ((r.basicPay || 0) + (r.hra || 0) + (r.bonus || 0) - (r.deductions || 0));
                  return (
                    <tr key={r._id || r.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord(r)}>
                      <td>
                        <a href={`/profile/${r.employeeId || r.employee?.id}`} onClick={e => e.stopPropagation()} style={{ fontWeight: 600, color: 'var(--kai-primary)', textDecoration: 'none' }}>
                          {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeName || '-'}
                        </a>
                        <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>{r.employee?.role || r.employee?.department || ''}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{currency(r.basicPay)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{currency(r.hra)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{currency(r.bonus)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--kai-danger)' }}>{currency(r.deductions)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{currency(total)}</td>
                      <td>
                        <span className="kai-badge" style={{ background: st.bg, color: st.color }}>{r.status}</span>
                      </td>
                      <td>
                        <div className="flex-gap-8">
                          {r.status === 'PENDING' && (
                            <>
                              <button className="kai-btn kai-btn-success kai-btn-sm" onClick={() => openPayModal({ ...r, totalPay: total })}>Pay</button>
                              <button className="kai-btn kai-btn-danger kai-btn-sm" onClick={() => markFailed(r)}>Fail</button>
                            </>
                          )}
                          {r.status === 'FAILED' && (
                            <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => openPayModal({ ...r, totalPay: total })}>Retry</button>
                          )}
                          {r.status === 'PAID' && (
                            <span style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>
                              {r.paymentMode || 'Bank'} {r.paymentReference ? `#${r.paymentReference}` : ''}
                            </span>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="kai-card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="kai-card-header">
              <h5>Create Payroll Record</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="kai-label">Employee *</label>
                  {employees.length > 0 ? (
                    <select className="kai-input" required value={createForm.employeeId}
                      onChange={e => {
                        const emp = employees.find(em => (em._id || em.id) === e.target.value);
                        setCreateForm(p => ({ ...p, employeeId: e.target.value, employeeName: emp?.name || '' }));
                      }}>
                      <option value="">Select employee</option>
                      {employees.map(emp => (
                        <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="kai-input" required placeholder="Employee name" value={createForm.employeeName}
                      onChange={e => setCreateForm(p => ({ ...p, employeeName: e.target.value }))} />
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="kai-label">Basic Pay *</label>
                    <input className="kai-input" type="number" required placeholder="50000" value={createForm.basicPay}
                      onChange={e => setCreateForm(p => ({ ...p, basicPay: e.target.value }))} />
                  </div>
                  <div>
                    <label className="kai-label">HRA</label>
                    <input className="kai-input" type="number" placeholder="15000" value={createForm.hra}
                      onChange={e => setCreateForm(p => ({ ...p, hra: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="kai-label">Bonus</label>
                    <input className="kai-input" type="number" placeholder="5000" value={createForm.bonus}
                      onChange={e => setCreateForm(p => ({ ...p, bonus: e.target.value }))} />
                  </div>
                  <div>
                    <label className="kai-label">Deductions</label>
                    <input className="kai-input" type="number" placeholder="3000" value={createForm.deductions}
                      onChange={e => setCreateForm(p => ({ ...p, deductions: e.target.value }))} />
                  </div>
                </div>
                <div style={{ padding: 12, background: 'var(--kai-bg)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>Net Payable</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--kai-primary)' }}>
                    {currency((Number(createForm.basicPay) || 0) + (Number(createForm.hra) || 0) + (Number(createForm.bonus) || 0) - (Number(createForm.deductions) || 0))}
                  </div>
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary">Create Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Process Payment Modal */}
      {showPayModal && selectedRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowPayModal(false)}>
          <div className="kai-card" style={{ width: '100%', maxWidth: 440, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="kai-card-header">
              <h5>Process Payment</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowPayModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleProcessPayment}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 12, background: 'var(--kai-bg)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600 }}>{selectedRecord.employeeName || selectedRecord.employee?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{MONTHS[month]} {year}</div>
                </div>
                <div>
                  <label className="kai-label">Amount *</label>
                  <input className="kai-input" type="number" required value={payForm.amount}
                    onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="kai-label">Payment Mode *</label>
                  <select className="kai-input" value={payForm.mode}
                    onChange={e => setPayForm(p => ({ ...p, mode: e.target.value }))}>
                    {['Cash', 'Bank', 'UPI', 'Cheque'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="kai-label">Reference / Transaction ID</label>
                  <input className="kai-input" placeholder="TXN12345" value={payForm.reference}
                    onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} />
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-success">Process Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Slip Detail Modal */}
      {selectedRecord && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setSelectedRecord(null)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedRecord(null)} />
          <div className="kai-card" style={{ position: 'relative', width: 560, maxWidth: '95vw', maxHeight: '85vh', overflow: 'auto', zIndex: 1 }}>
            <div className="kai-card-header" style={{ background: '#146DF7', color: '#fff' }}>
              <div>
                <h6 style={{ margin: 0, color: '#fff' }}>Salary Slip</h6>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{MONTHS[selectedRecord.month - 1] || MONTHS[month]} {selectedRecord.year || year}</div>
              </div>
              <button onClick={() => setSelectedRecord(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div className="kai-card-body">
              {/* Employee Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: 12, background: 'var(--kai-bg)', borderRadius: 8 }}>
                <div className="kai-avatar" style={{ background: '#146DF7', width: 48, height: 48, fontSize: 18 }}>
                  {(selectedRecord.employee?.firstName || '?')[0]}{(selectedRecord.employee?.lastName || '')[0]}
                </div>
                <div>
                  <a href={`/profile/${selectedRecord.employeeId || selectedRecord.employee?.id}`} style={{ fontWeight: 700, fontSize: 16, color: 'var(--kai-primary)', textDecoration: 'none' }}>
                    {selectedRecord.employee ? `${selectedRecord.employee.firstName} ${selectedRecord.employee.lastName}` : 'Employee'}
                  </a>
                  <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>
                    {selectedRecord.employee?.role} • {selectedRecord.employee?.department} • {selectedRecord.employee?.email}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  {(() => { const st = STATUS_STYLES[selectedRecord.status] || STATUS_STYLES.PENDING; return (
                    <span className="kai-badge" style={{ background: st.bg, color: st.color, fontSize: 12 }}>{selectedRecord.status}</span>
                  ); })()}
                </div>
              </div>

              {/* Salary Breakdown */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Salary Breakdown</div>
                <table style={{ width: '100%', fontSize: 14 }}>
                  <tbody>
                    {[
                      { label: 'Basic Pay', value: selectedRecord.basicPay, type: 'earning' },
                      { label: 'HRA', value: selectedRecord.hra, type: 'earning' },
                      { label: 'Transport', value: selectedRecord.transport, type: 'earning' },
                      { label: 'Bonus', value: selectedRecord.bonus, type: 'earning' },
                    ].filter(r => r.value).map((r, i) => (
                      <tr key={i}>
                        <td style={{ padding: '6px 0', color: 'var(--kai-text-secondary)' }}>{r.label}</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'monospace', color: '#16A34A' }}>+{currency(r.value)}</td>
                      </tr>
                    ))}
                    {selectedRecord.deductions > 0 && (
                      <tr>
                        <td style={{ padding: '6px 0', color: 'var(--kai-text-secondary)' }}>Deductions</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontFamily: 'monospace', color: '#CB3939' }}>-{currency(selectedRecord.deductions)}</td>
                      </tr>
                    )}
                    <tr style={{ borderTop: '2px solid var(--kai-border)' }}>
                      <td style={{ padding: '10px 0', fontWeight: 800, fontSize: 16 }}>Net Pay</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800, fontSize: 18, fontFamily: 'monospace', color: '#146DF7' }}>
                        {currency(selectedRecord.totalPay || ((selectedRecord.basicPay || 0) + (selectedRecord.hra || 0) + (selectedRecord.transport || 0) + (selectedRecord.bonus || 0) - (selectedRecord.deductions || 0)))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Attendance */}
              {(selectedRecord.presentDays || selectedRecord.workingDays) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Attendance</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                    <span>Present: <strong>{selectedRecord.presentDays || 0}</strong></span>
                    <span>Absent: <strong>{selectedRecord.absentDays || 0}</strong></span>
                    <span>Leave: <strong>{selectedRecord.leaveDays || 0}</strong></span>
                  </div>
                </div>
              )}

              {/* Payment History */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Payment History</div>
                {(selectedRecord.logs || []).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedRecord.logs.map((log, i) => (
                      <div key={log.id || i} style={{ padding: 12, background: 'var(--kai-bg)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{currency(log.amount)}</div>
                          <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>
                            via <strong>{log.mode || 'Bank'}</strong>
                            {log.bankRef && <span> • Ref: {log.bankRef}</span>}
                          </div>
                          {log.remarks && <div style={{ fontSize: 12, color: 'var(--kai-text-secondary)', marginTop: 2 }}>{log.remarks}</div>}
                          {log.paidBy && <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', marginTop: 2 }}>Processed by: {log.paidBy.firstName} {log.paidBy.lastName}</div>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', textAlign: 'right' }}>
                          {log.paidAt || log.createdAt ? new Date(log.paidAt || log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--kai-text-muted)', fontSize: 13, background: 'var(--kai-bg)', borderRadius: 8 }}>
                    No payments recorded yet
                  </div>
                )}
              </div>

              {/* Print button */}
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="kai-btn kai-btn-outline" onClick={() => window.print()}>Print Salary Slip</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
