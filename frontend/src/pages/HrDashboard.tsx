import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Spinner, Alert } from 'react-bootstrap';
import Chart from 'react-apexcharts';
import {
  Users,
  CalendarCheck,
  CalendarX2,
  Clock,
  DollarSign,
  Wallet,
  UserPlus,
  Cake,
  ClipboardCheck,
  Briefcase,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Brain,
  Lock,
  Unlock,
  KeyRound,
  RotateCcw,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { dashboardApi, employeeAnalyticsApi, passwordManagementApi } from '../services/api';
import { toast } from 'react-toastify';

const AVATAR_COLORS = ['#146DF7', '#8B3FE9', '#16A34A', '#EA580C', '#2563EB', '#CB3939'];

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '--';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function HrDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [employeesByRole, setEmployeesByRole] = useState([]);
  const [leaveSummary, setLeaveSummary] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [payrollOverview, setPayrollOverview] = useState({ total: 0, pending: 0, paid: 0 });
  const [recentHires, setRecentHires] = useState([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [departmentDistribution, setDepartmentDistribution] = useState([]);
  const [attendance, setAttendance] = useState({ present: 0, absent: 0, late: 0, onLeave: 0 });
  const [totalEmployees, setTotalEmployees] = useState(0);

  // New analytics state
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [passwordUsers, setPasswordUsers] = useState([]);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Identity Verification state
  const [verificationDocs, setVerificationDocs] = useState([]);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationExpanded, setVerificationExpanded] = useState(true);
  const [verificationActionLoading, setVerificationActionLoading] = useState({});
  const [verificationNoteInput, setVerificationNoteInput] = useState({});
  const [verificationActiveAction, setVerificationActiveAction] = useState({});

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const { data } = await employeeAnalyticsApi.getTeamOverview();
      const d = data?.data || data;
      setAnalyticsData(d);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const fetchVerificationDocs = useCallback(async () => {
    setVerificationLoading(true);
    try {
      const res = await fetch('/api/document-verification?pending=true', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch verification data');
      const data = await res.json();
      const d = data?.data || data;
      setVerificationDocs(d.documents || d || []);
    } catch (err) {
      console.error('Verification fetch error:', err);
    } finally {
      setVerificationLoading(false);
    }
  }, []);

  const handleVerificationAction = async (action, documentId, note) => {
    const key = `${action}-${documentId}`;
    setVerificationActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/document-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, documentId, note }),
      });
      if (!res.ok) throw new Error('Action failed');
      const actionLabels = { approve: 'Approved', reject: 'Rejected', requestResubmit: 'Resubmit requested' };
      toast.success(actionLabels[action] || 'Action completed');
      setVerificationActiveAction({});
      setVerificationNoteInput({});
      fetchVerificationDocs();
    } catch (err) {
      toast.error(err.message || 'Verification action failed');
    } finally {
      setVerificationActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const fetchPasswordData = useCallback(async () => {
    setPasswordLoading(true);
    try {
      const { data } = await passwordManagementApi.list();
      const d = data?.data || data;
      setPasswordUsers(d.users || []);
    } catch (err) {
      console.error('Password data fetch error:', err);
    } finally {
      setPasswordLoading(false);
    }
  }, []);

  const handlePasswordAction = async (action, userId, userName) => {
    const key = `${action}-${userId}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      let res;
      if (action === 'reset') {
        res = await passwordManagementApi.resetPassword(userId);
        const d = res.data?.data || res.data;
        toast.success(`Password reset for ${userName}. Temp: ${d.tempPassword}`);
      } else if (action === 'unlock') {
        await passwordManagementApi.unlockAccount(userId);
        toast.success(`Account unlocked for ${userName}`);
      } else if (action === 'force') {
        await passwordManagementApi.forceChangePassword(userId);
        toast.success(`${userName} must change password on next login`);
      }
      fetchPasswordData();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const fetchHrData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await dashboardApi.getHrStats();
      const d = data.data || data;

      setTotalEmployees(d.totalEmployees ?? d.employeeCount ?? 0);
      setEmployeesByRole(d.employeesByRole || d.roleDistribution || []);
      setLeaveSummary({
        pending: d.leaveSummary?.pending ?? d.pendingLeaves ?? 0,
        approved: d.leaveSummary?.approved ?? d.approvedLeaves ?? 0,
        rejected: d.leaveSummary?.rejected ?? d.rejectedLeaves ?? 0,
      });
      setPayrollOverview({
        total: d.payrollOverview?.total ?? d.totalPayroll ?? 0,
        pending: d.payrollOverview?.pending ?? d.pendingPayroll ?? 0,
        paid: d.payrollOverview?.paid ?? d.paidPayroll ?? 0,
      });
      setRecentHires(d.recentHires || d.newHires || []);
      setUpcomingBirthdays(d.upcomingBirthdays || d.birthdays || []);
      setDepartmentDistribution(d.departmentDistribution || d.departments || []);
      setAttendance({
        present: d.attendance?.present ?? d.presentCount ?? 0,
        absent: d.attendance?.absent ?? d.absentCount ?? 0,
        late: d.attendance?.late ?? d.lateCount ?? 0,
        onLeave: d.attendance?.onLeave ?? d.onLeaveCount ?? 0,
      });
    } catch (err) {
      console.error('HR Dashboard fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load HR data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'HR Dashboard' });
    fetchHrData();
    fetchAnalytics();
    fetchPasswordData();
    fetchVerificationDocs();
  }, [dispatch, fetchHrData, fetchAnalytics, fetchPasswordData, fetchVerificationDocs]);

  // Employees by Role bar chart
  const roleLabels = employeesByRole.map((r) => r.role || r.label || r.name || '');
  const roleValues = employeesByRole.map((r) => r.count || r.value || 0);

  const roleBarOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: ['#146DF7'],
    plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '55%' } },
    dataLabels: { enabled: true, style: { fontSize: '12px', fontWeight: 600 } },
    xaxis: { labels: { style: { colors: '#5B6B76', fontSize: '12px' } } },
    yaxis: {
      categories: roleLabels,
      labels: { style: { colors: '#5B6B76', fontSize: '12px' } },
    },
    grid: { borderColor: '#E7E7E8', strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    tooltip: { y: { formatter: (v) => `${v} employees` } },
  };

  const roleBarSeries = [{ name: 'Employees', data: roleValues }];

  // Department distribution pie chart
  const deptLabels = departmentDistribution.map((d) => d.department || d.label || d.name || '');
  const deptValues = departmentDistribution.map((d) => d.count || d.value || 0);
  const deptColors = ['#146DF7', '#8B3FE9', '#16A34A', '#EA580C', '#2563EB', '#CB3939', '#5B6B76', '#0148A7'];

  const deptPieOptions = {
    chart: { type: 'pie', fontFamily: 'inherit' },
    colors: deptColors.slice(0, deptLabels.length),
    labels: deptLabels,
    legend: { position: 'bottom', fontSize: '13px', labels: { colors: '#5B6B76' } },
    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(0)}%` },
    stroke: { width: 2, colors: ['#fff'] },
    tooltip: { y: { formatter: (v) => `${v} employees` } },
  };

  // Attendance summary
  const totalAttendance = attendance.present + attendance.absent + attendance.late + attendance.onLeave;

  const quickActions = [
    { label: 'Process Payroll', icon: <Wallet size={16} />, path: '/payroll', color: '#16A34A' },
    { label: 'Approve Leave', icon: <CalendarCheck size={16} />, path: '/leaves', color: '#146DF7' },
    { label: 'Post Job', icon: <Briefcase size={16} />, path: '/hiring', color: '#8B3FE9' },
  ];

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: 400 }}>
        <Spinner animation="border" style={{ color: 'var(--kai-primary)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <div><h1>HR Dashboard</h1><p>Human resources overview</p></div>
        </div>
        <Alert variant="danger" className="d-flex align-items-center gap-2">
          <AlertCircle size={18} />
          <div>
            <strong>Error loading HR data.</strong> {error}
            <button className="kai-btn kai-btn-outline kai-btn-sm ms-3" onClick={fetchHrData}>Retry</button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>HR Dashboard</h1>
          <p>Human resources overview</p>
        </div>
        <div className="page-actions">
          <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={fetchHrData}>Refresh</button>
        </div>
      </div>

      {/* Top Stats Row */}
      <Row className="g-3 mb-4">
        {/* Total Employees */}
        <Col xs={12} sm={6} lg={3}>
          <div className="stat-card">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div className="stat-icon" style={{ background: '#EBF3FF', color: '#146DF7' }}><Users /></div>
            </div>
            <div className="stat-value">{totalEmployees}</div>
            <div className="stat-label">Total Employees</div>
          </div>
        </Col>

        {/* Leave Summary */}
        <Col xs={12} sm={6} lg={3}>
          <div className="stat-card">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div className="stat-icon" style={{ background: '#FFF4ED', color: '#EA580C' }}><CalendarX2 /></div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--kai-warning)' }}>{leaveSummary.pending}</div>
                <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>Pending</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--kai-success)' }}>{leaveSummary.approved}</div>
                <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>Approved</div>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--kai-danger)' }}>{leaveSummary.rejected}</div>
                <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>Rejected</div>
              </div>
            </div>
            <div className="stat-label">Leave Summary</div>
          </div>
        </Col>

        {/* Payroll Overview */}
        <Col xs={12} sm={6} lg={3}>
          <div className="stat-card">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div className="stat-icon" style={{ background: '#E8F9EF', color: '#16A34A' }}><DollarSign /></div>
            </div>
            <div className="stat-value" style={{ fontSize: 22 }}>{formatCurrency(payrollOverview.total)}</div>
            <div className="stat-label" style={{ marginBottom: 8 }}>Total Payroll This Month</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span className="kai-badge warning" style={{ fontSize: 10 }}>
                <Clock size={10} /> Pending: {formatCurrency(payrollOverview.pending)}
              </span>
              <span className="kai-badge success" style={{ fontSize: 10 }}>
                <CheckCircle2 size={10} /> Paid: {formatCurrency(payrollOverview.paid)}
              </span>
            </div>
          </div>
        </Col>

        {/* Attendance Overview */}
        <Col xs={12} sm={6} lg={3}>
          <div className="stat-card">
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div className="stat-icon" style={{ background: '#F3EAFF', color: '#8B3FE9' }}><ClipboardCheck /></div>
            </div>
            <div className="stat-label" style={{ marginBottom: 8, fontWeight: 600 }}>Attendance Today</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Present', value: attendance.present, color: '#16A34A' },
                { label: 'Absent', value: attendance.absent, color: '#CB3939' },
                { label: 'Late', value: attendance.late, color: '#EA580C' },
                { label: 'On Leave', value: attendance.onLeave, color: '#8B3FE9' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--kai-text-muted)', flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--kai-text)' }}>{item.value}</span>
                  {totalAttendance > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>
                      ({((item.value / totalAttendance) * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row className="g-3 mb-4">
        {/* Employees by Role */}
        <Col xs={12} lg={7}>
          <div className="kai-card" style={{ height: '100%' }}>
            <div className="kai-card-header">
              <h6>Employees by Role</h6>
              <span className="kai-badge secondary">{employeesByRole.length} roles</span>
            </div>
            <div className="kai-card-body">
              {roleValues.length > 0 && roleValues.some((v) => v > 0) ? (
                <Chart
                  options={{ ...roleBarOptions, xaxis: { ...roleBarOptions.xaxis, categories: roleLabels } }}
                  series={roleBarSeries}
                  type="bar"
                  height={320}
                />
              ) : (
                <div className="flex-center text-muted" style={{ height: 320 }}>No employee role data available</div>
              )}
            </div>
          </div>
        </Col>

        {/* Department Distribution */}
        <Col xs={12} lg={5}>
          <div className="kai-card" style={{ height: '100%' }}>
            <div className="kai-card-header">
              <h6>Department Distribution</h6>
            </div>
            <div className="kai-card-body">
              {deptValues.length > 0 && deptValues.some((v) => v > 0) ? (
                <Chart options={deptPieOptions} series={deptValues} type="pie" height={320} />
              ) : (
                <div className="flex-center text-muted" style={{ height: 320 }}>No department data available</div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Bottom Row */}
      <Row className="g-3">
        {/* Recent Hires */}
        <Col xs={12} lg={4}>
          <div className="kai-card" style={{ height: '100%' }}>
            <div className="kai-card-header">
              <h6>Recent Hires</h6>
              <UserPlus size={16} style={{ color: 'var(--kai-primary)' }} />
            </div>
            <div className="kai-card-body">
              {recentHires.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {recentHires.slice(0, 5).map((hire, idx) => {
                    const name = hire.name || hire.employeeName || `Employee ${idx + 1}`;
                    const role = hire.role || hire.position || hire.title || '';
                    const joinDate = hire.joinDate || hire.hireDate || hire.startDate || hire.date || '';
                    return (
                      <div key={hire.id || idx} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div
                          className="kai-avatar"
                          style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length], width: 36, height: 36, fontSize: 13 }}
                        >
                          {getInitials(name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text)' }} className="truncate">{name}</div>
                          <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{role}</div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--kai-text-muted)', flexShrink: 0 }}>
                          {joinDate ? new Date(joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-muted flex-center" style={{ height: 120 }}>No recent hires</div>
              )}
            </div>
          </div>
        </Col>

        {/* Upcoming Birthdays */}
        <Col xs={12} lg={4}>
          <div className="kai-card" style={{ height: '100%' }}>
            <div className="kai-card-header">
              <h6>Upcoming Birthdays</h6>
              <Cake size={16} style={{ color: '#EA580C' }} />
            </div>
            <div className="kai-card-body">
              {upcomingBirthdays.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {upcomingBirthdays.slice(0, 5).map((person, idx) => {
                    const name = person.name || person.employeeName || `Employee ${idx + 1}`;
                    const bday = person.birthday || person.date || person.dob || '';
                    const department = person.department || person.team || '';
                    const bdayDate = bday ? new Date(bday) : null;
                    const isToday = bdayDate && bdayDate.getMonth() === new Date().getMonth() && bdayDate.getDate() === new Date().getDate();
                    return (
                      <div
                        key={person.id || idx}
                        style={{
                          display: 'flex',
                          gap: 12,
                          alignItems: 'center',
                          padding: isToday ? '8px 10px' : 0,
                          background: isToday ? '#FFF4ED' : 'transparent',
                          borderRadius: 8,
                        }}
                      >
                        <div
                          className="kai-avatar"
                          style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length], width: 36, height: 36, fontSize: 13 }}
                        >
                          {getInitials(name)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text)' }} className="truncate">
                            {name} {isToday && <span style={{ fontSize: 11, color: '#EA580C', fontWeight: 700 }}>(Today!)</span>}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{department}</div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--kai-text-muted)', flexShrink: 0 }}>
                          {bdayDate ? bdayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-muted flex-center" style={{ height: 120 }}>No upcoming birthdays</div>
              )}
            </div>
          </div>
        </Col>

        {/* Quick Actions */}
        <Col xs={12} lg={4}>
          <div className="kai-card" style={{ height: '100%' }}>
            <div className="kai-card-header">
              <h6>Quick Actions</h6>
            </div>
            <div className="kai-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    className="kai-btn kai-btn-outline"
                    style={{ justifyContent: 'flex-start', width: '100%' }}
                    onClick={() => navigate(action.path)}
                  >
                    <span style={{ color: action.color }}>{action.icon}</span>
                    {action.label}
                    <ArrowRight size={14} style={{ marginLeft: 'auto', color: 'var(--kai-text-muted)' }} />
                  </button>
                ))}
              </div>

              {/* Leave Quick Stats */}
              <div style={{ marginTop: 24, padding: 16, background: 'var(--kai-bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--kai-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Leave Requests
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: '#FFF3CD', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#856404' }}>{leaveSummary.pending}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#856404' }}>PENDING</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: '#D4EDDA', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#155724' }}>{leaveSummary.approved}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#155724' }}>APPROVED</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: '#F8D7DA', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#721C24' }}>{leaveSummary.rejected}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#721C24' }}>REJECTED</div>
                  </div>
                </div>
              </div>

              {/* Payroll Quick Stats */}
              <div style={{ marginTop: 16, padding: 16, background: 'var(--kai-bg)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--kai-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Payroll Status
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>Total</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--kai-text)' }}>{formatCurrency(payrollOverview.total)}</span>
                </div>
                {payrollOverview.total > 0 && (
                  <div style={{ width: '100%', height: 8, background: 'var(--kai-border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${(payrollOverview.paid / payrollOverview.total) * 100}%`,
                        height: '100%',
                        background: 'var(--kai-success)',
                        borderRadius: 4,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--kai-success)' }}>Paid: {formatCurrency(payrollOverview.paid)}</span>
                  <span style={{ fontSize: 11, color: 'var(--kai-warning)' }}>Pending: {formatCurrency(payrollOverview.pending)}</span>
                </div>
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {/* ── Personality & Behavioral Analytics Section ──────────────── */}
      {analyticsData && (
        <>
          {/* Personality Test Completion + Distribution Row */}
          <Row className="g-3 mb-4" style={{ marginTop: 24 }}>
            {/* Personality Test Completion */}
            <Col xs={12} lg={4}>
              <div className="kai-card" style={{ height: '100%' }}>
                <div className="kai-card-header">
                  <h6 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Brain size={18} style={{ color: '#8B3FE9' }} /> Test Completion
                  </h6>
                </div>
                <div className="kai-card-body">
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ fontSize: 40, fontWeight: 800, color: '#146DF7' }}>
                      {analyticsData.testsTaken}
                      <span style={{ fontSize: 16, fontWeight: 500, color: '#9CA3AF' }}> / {analyticsData.totalEmployees}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#5B6B76', marginBottom: 16 }}>employees completed the test</div>
                    <div style={{ height: 10, background: '#E5E7EB', borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
                      <div
                        style={{
                          width: analyticsData.totalEmployees > 0 ? `${(analyticsData.testsTaken / analyticsData.totalEmployees) * 100}%` : '0%',
                          height: '100%',
                          background: 'linear-gradient(90deg, #146DF7, #8B3FE9)',
                          borderRadius: 5,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF' }}>
                      <span>{analyticsData.totalEmployees > 0 ? Math.round((analyticsData.testsTaken / analyticsData.totalEmployees) * 100) : 0}% complete</span>
                      <span>{analyticsData.testsRemaining} remaining</span>
                    </div>
                  </div>
                  <button
                    className="kai-btn kai-btn-outline kai-btn-sm"
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={() => toast.info('Reminder sent to employees who have not taken the test')}
                  >
                    <Send size={14} /> Send Reminder
                  </button>
                </div>
              </div>
            </Col>

            {/* Personality Type Distribution Pie Chart */}
            <Col xs={12} lg={8}>
              <div className="kai-card" style={{ height: '100%' }}>
                <div className="kai-card-header">
                  <h6 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Brain size={18} style={{ color: '#146DF7' }} /> Personality Distribution
                  </h6>
                  <span className="kai-badge secondary">{Object.keys(analyticsData.personalityDistribution || {}).length} types</span>
                </div>
                <div className="kai-card-body">
                  {Object.keys(analyticsData.personalityDistribution || {}).length > 0 ? (
                    <Chart
                      options={{
                        chart: { type: 'pie', fontFamily: 'inherit' },
                        colors: ['#146DF7', '#8B3FE9', '#16A34A', '#EA580C', '#2563EB', '#CB3939', '#0D9488', '#D97706', '#7C3AED', '#4F46E5', '#C026D3', '#6366F1', '#059669', '#DC2626', '#0891B2', '#78716C'],
                        labels: Object.keys(analyticsData.personalityDistribution),
                        legend: { position: 'bottom', fontSize: '12px', labels: { colors: '#5B6B76' } },
                        dataLabels: { enabled: true, formatter: (val, opts) => `${opts.w.globals.labels[opts.seriesIndex]}: ${val.toFixed(0)}%` },
                        stroke: { width: 2, colors: ['#fff'] },
                        tooltip: { y: { formatter: (v) => `${v} employees` } },
                      }}
                      series={Object.values(analyticsData.personalityDistribution)}
                      type="pie"
                      height={320}
                    />
                  ) : (
                    <div className="flex-center text-muted" style={{ height: 320 }}>No personality data yet. Employees need to take the test.</div>
                  )}
                </div>
              </div>
            </Col>
          </Row>

          {/* Employee Behavioral Table */}
          <Row className="g-3 mb-4">
            <Col xs={12}>
              <div className="kai-card">
                <div className="kai-card-header">
                  <h6>Employee Behavioral Overview</h6>
                  <span className="kai-badge secondary">{analyticsData.employees?.length || 0} employees</span>
                </div>
                <div className="kai-card-body" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                        {['Name', 'Personality', 'Complaints Filed', 'Complaints Against', 'Leaves Taken', 'Behavior Score', 'Salary'].map((h) => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#5B6B76', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsData.employees || []).slice(0, 20).map((emp, idx) => (
                        <tr key={emp.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="kai-avatar" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length], width: 30, height: 30, fontSize: 11 }}>
                                {getInitials(emp.name)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#10222F' }}>{emp.name}</div>
                                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{emp.role}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {emp.personalityType ? (
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                background: '#146DF715',
                                color: '#146DF7',
                              }}>
                                {emp.personalityType}
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: '#9CA3AF' }}>Not taken</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{emp.complaintsFiled}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontWeight: 600, color: emp.complaintsAgainst > 0 ? '#CB3939' : 'inherit' }}>
                              {emp.complaintsAgainst}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{emp.leavesTaken}</td>
                          <td style={{ padding: '10px 12px' }}>
                            {emp.behaviorScore !== null && emp.behaviorScore !== undefined ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 50, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{
                                    width: `${Math.min(emp.behaviorScore, 100)}%`,
                                    height: '100%',
                                    background: emp.behaviorScore >= 70 ? '#16A34A' : emp.behaviorScore >= 40 ? '#EA580C' : '#CB3939',
                                    borderRadius: 3,
                                  }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{emp.behaviorScore}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: '#9CA3AF' }}>--</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                            {emp.salary ? formatCurrency(emp.salary) : '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!analyticsData.employees || analyticsData.employees.length === 0) && (
                    <div className="flex-center text-muted" style={{ padding: 40 }}>No employee data available</div>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </>
      )}

      {analyticsLoading && (
        <div className="flex-center" style={{ padding: 40 }}>
          <Spinner size="sm" animation="border" style={{ color: '#146DF7' }} />
          <span style={{ marginLeft: 8, color: '#5B6B76', fontSize: 13 }}>Loading analytics...</span>
        </div>
      )}

      {/* ── Password Management Section ────────────────────────────── */}
      <Row className="g-3 mb-4" style={{ marginTop: analyticsData ? 0 : 24 }}>
        <Col xs={12}>
          <div className="kai-card">
            <div className="kai-card-header">
              <h6 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={18} style={{ color: '#EA580C' }} /> Password Management
              </h6>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={fetchPasswordData}>
                <RotateCcw size={12} /> Refresh
              </button>
            </div>
            <div className="kai-card-body" style={{ overflowX: 'auto' }}>
              {passwordLoading ? (
                <div className="flex-center" style={{ padding: 40 }}>
                  <Spinner size="sm" animation="border" style={{ color: '#146DF7' }} />
                </div>
              ) : passwordUsers.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                      {['Name', 'Role', 'Last Changed', 'Status', 'Failed Attempts', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#5B6B76', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {passwordUsers.map((u, idx) => {
                      const isLocked = u.accountLocked;
                      const needsReset = u.passwordResetRequired;
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid #F3F4F6', background: isLocked ? '#FEF2F210' : 'transparent' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="kai-avatar" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length], width: 28, height: 28, fontSize: 10 }}>
                                {getInitials(u.name)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#10222F' }}>{u.name}</div>
                                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: 12 }}>{u.role}</td>
                          <td style={{ padding: '10px 12px', fontSize: 12, color: '#5B6B76' }}>
                            {u.passwordLastChanged ? new Date(u.passwordLastChanged).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {isLocked && (
                                <span className="kai-badge danger" style={{ fontSize: 10 }}>
                                  <Lock size={10} /> Locked
                                </span>
                              )}
                              {needsReset && (
                                <span className="kai-badge warning" style={{ fontSize: 10 }}>
                                  <ShieldAlert size={10} /> Reset Required
                                </span>
                              )}
                              {!isLocked && !needsReset && (
                                <span className="kai-badge success" style={{ fontSize: 10 }}>
                                  <CheckCircle2 size={10} /> Active
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontWeight: 600, color: u.failedLoginAttempts > 3 ? '#CB3939' : 'inherit' }}>
                              {u.failedLoginAttempts}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="kai-btn kai-btn-outline kai-btn-sm"
                                style={{ fontSize: 11, padding: '4px 8px' }}
                                onClick={() => handlePasswordAction('reset', u.id, u.name)}
                                disabled={actionLoading[`reset-${u.id}`]}
                                title="Reset Password"
                              >
                                {actionLoading[`reset-${u.id}`] ? <Spinner size="sm" animation="border" /> : <><KeyRound size={12} /> Reset</>}
                              </button>
                              {isLocked && (
                                <button
                                  className="kai-btn kai-btn-outline kai-btn-sm"
                                  style={{ fontSize: 11, padding: '4px 8px', borderColor: '#16A34A', color: '#16A34A' }}
                                  onClick={() => handlePasswordAction('unlock', u.id, u.name)}
                                  disabled={actionLoading[`unlock-${u.id}`]}
                                  title="Unlock Account"
                                >
                                  {actionLoading[`unlock-${u.id}`] ? <Spinner size="sm" animation="border" /> : <><Unlock size={12} /> Unlock</>}
                                </button>
                              )}
                              {!needsReset && (
                                <button
                                  className="kai-btn kai-btn-outline kai-btn-sm"
                                  style={{ fontSize: 11, padding: '4px 8px', borderColor: '#EA580C', color: '#EA580C' }}
                                  onClick={() => handlePasswordAction('force', u.id, u.name)}
                                  disabled={actionLoading[`force-${u.id}`]}
                                  title="Force Password Change"
                                >
                                  {actionLoading[`force-${u.id}`] ? <Spinner size="sm" animation="border" /> : <><ShieldAlert size={12} /> Force Change</>}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex-center text-muted" style={{ padding: 40 }}>No user data available</div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* ── Identity Verification Section ────────────────────────────── */}
      {(() => {
        const pendingDocs = verificationDocs.filter((d) => d.status === 'pending' || !d.status);
        const reviewedDocs = verificationDocs.filter((d) => d.status && d.status !== 'pending');
        const approvedToday = verificationDocs.filter((d) => {
          if (d.status !== 'approved' || !d.reviewedAt) return false;
          const rev = new Date(d.reviewedAt);
          const now = new Date();
          return rev.toDateString() === now.toDateString();
        });
        const totalVerified = verificationDocs.filter((d) => d.status === 'approved').length;

        return (
          <Row className="g-3 mb-4" style={{ marginTop: 0 }}>
            <Col xs={12}>
              <div className="kai-card">
                <div
                  className="kai-card-header"
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setVerificationExpanded((v) => !v)}
                >
                  <h6 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ClipboardCheck size={18} style={{ color: '#2563EB' }} /> Identity Verification
                  </h6>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {pendingDocs.length > 0 && (
                      <span className="kai-badge warning" style={{ fontSize: 10 }}>
                        {pendingDocs.length} pending
                      </span>
                    )}
                    <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={(e) => { e.stopPropagation(); fetchVerificationDocs(); }}>
                      <RotateCcw size={12} /> Refresh
                    </button>
                    <span style={{ fontSize: 16, color: 'var(--kai-text-muted)', transition: 'transform 0.2s', transform: verificationExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                      <ArrowRight size={14} style={{ transform: 'rotate(90deg)' }} />
                    </span>
                  </div>
                </div>

                {verificationExpanded && (
                  <div className="kai-card-body">
                    {verificationLoading ? (
                      <div className="flex-center" style={{ padding: 40 }}>
                        <Spinner size="sm" animation="border" style={{ color: '#146DF7' }} />
                        <span style={{ marginLeft: 8, color: '#5B6B76', fontSize: 13 }}>Loading verification data...</span>
                      </div>
                    ) : (
                      <>
                        {/* Stats Row */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 140, textAlign: 'center', padding: '14px 12px', background: '#FFF3CD', borderRadius: 10 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#856404' }}>{pendingDocs.length}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#856404', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Review</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 140, textAlign: 'center', padding: '14px 12px', background: '#D4EDDA', borderRadius: 10 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#155724' }}>{approvedToday.length}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#155724', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approved Today</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 140, textAlign: 'center', padding: '14px 12px', background: '#EBF3FF', borderRadius: 10 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: '#146DF7' }}>{totalVerified}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#146DF7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Verified</div>
                          </div>
                        </div>

                        {/* Pending Documents Table */}
                        {pendingDocs.length > 0 && (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kai-text)', marginBottom: 12 }}>
                              Pending Documents
                            </div>
                            <div style={{ overflowX: 'auto', marginBottom: 24 }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                                    {['Employee', 'Document Type', 'Submitted', 'Preview', 'Actions'].map((h) => (
                                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#5B6B76', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {pendingDocs.map((doc, idx) => {
                                    const name = doc.employeeName || doc.name || 'Unknown';
                                    const docType = doc.documentType || doc.type || 'Document';
                                    const submitted = doc.submittedDate || doc.submittedAt || doc.createdAt || '';
                                    const previewUrl = doc.fileUrl || doc.previewUrl || doc.url || '#';
                                    const docId = doc.id || doc._id || idx;
                                    const activeAction = verificationActiveAction[docId];
                                    const noteValue = verificationNoteInput[docId] || '';

                                    return (
                                      <tr key={docId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={{ padding: '10px 12px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="kai-avatar" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length], width: 32, height: 32, fontSize: 11 }}>
                                              {getInitials(name)}
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--kai-text)' }}>{name}</span>
                                          </div>
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                          <span style={{
                                            padding: '3px 8px',
                                            borderRadius: 6,
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: docType === 'Passport' ? '#EBF3FF' : docType === 'Aadhaar' ? '#F3EAFF' : docType === 'PAN Card' ? '#FFF4ED' : '#E8F9EF',
                                            color: docType === 'Passport' ? '#146DF7' : docType === 'Aadhaar' ? '#8B3FE9' : docType === 'PAN Card' ? '#EA580C' : '#16A34A',
                                          }}>
                                            {docType}
                                          </span>
                                        </td>
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#5B6B76' }}>
                                          {submitted ? new Date(submitted).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--'}
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                          <a
                                            href={previewUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: 12, color: '#146DF7', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                          >
                                            <ArrowRight size={12} /> View File
                                          </a>
                                        </td>
                                        <td style={{ padding: '10px 12px' }}>
                                          {!activeAction ? (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                              <button
                                                className="kai-btn kai-btn-sm"
                                                style={{ fontSize: 11, padding: '4px 10px', background: '#16A34A', color: '#fff', border: 'none', borderRadius: 6 }}
                                                onClick={() => setVerificationActiveAction((prev) => ({ ...prev, [docId]: 'approve' }))}
                                              >
                                                <CheckCircle2 size={12} /> Approve
                                              </button>
                                              <button
                                                className="kai-btn kai-btn-sm"
                                                style={{ fontSize: 11, padding: '4px 10px', background: '#CB3939', color: '#fff', border: 'none', borderRadius: 6 }}
                                                onClick={() => setVerificationActiveAction((prev) => ({ ...prev, [docId]: 'reject' }))}
                                              >
                                                <AlertCircle size={12} /> Reject
                                              </button>
                                              <button
                                                className="kai-btn kai-btn-sm"
                                                style={{ fontSize: 11, padding: '4px 10px', background: '#EA580C', color: '#fff', border: 'none', borderRadius: 6 }}
                                                onClick={() => setVerificationActiveAction((prev) => ({ ...prev, [docId]: 'requestResubmit' }))}
                                              >
                                                <RotateCcw size={12} /> Resubmit
                                              </button>
                                            </div>
                                          ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                              <div style={{ fontSize: 11, fontWeight: 600, color: activeAction === 'approve' ? '#16A34A' : activeAction === 'reject' ? '#CB3939' : '#EA580C', textTransform: 'capitalize' }}>
                                                {activeAction === 'requestResubmit' ? 'Request Resubmit' : activeAction} - Add a note:
                                              </div>
                                              <input
                                                type="text"
                                                placeholder="Optional note..."
                                                value={noteValue}
                                                onChange={(e) => setVerificationNoteInput((prev) => ({ ...prev, [docId]: e.target.value }))}
                                                style={{
                                                  width: '100%',
                                                  padding: '5px 8px',
                                                  fontSize: 12,
                                                  border: '1px solid var(--kai-border, #E5E7EB)',
                                                  borderRadius: 6,
                                                  outline: 'none',
                                                  color: 'var(--kai-text)',
                                                  background: 'var(--kai-bg, #fff)',
                                                }}
                                              />
                                              <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                  className="kai-btn kai-btn-sm"
                                                  style={{
                                                    fontSize: 11,
                                                    padding: '4px 10px',
                                                    background: activeAction === 'approve' ? '#16A34A' : activeAction === 'reject' ? '#CB3939' : '#EA580C',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: 6,
                                                  }}
                                                  disabled={verificationActionLoading[`${activeAction}-${docId}`]}
                                                  onClick={() => handleVerificationAction(activeAction, docId, noteValue)}
                                                >
                                                  {verificationActionLoading[`${activeAction}-${docId}`] ? (
                                                    <Spinner size="sm" animation="border" />
                                                  ) : (
                                                    'Confirm'
                                                  )}
                                                </button>
                                                <button
                                                  className="kai-btn kai-btn-outline kai-btn-sm"
                                                  style={{ fontSize: 11, padding: '4px 10px' }}
                                                  onClick={() => {
                                                    setVerificationActiveAction((prev) => { const n = { ...prev }; delete n[docId]; return n; });
                                                    setVerificationNoteInput((prev) => { const n = { ...prev }; delete n[docId]; return n; });
                                                  }}
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                        {pendingDocs.length === 0 && !verificationLoading && (
                          <div className="flex-center text-muted" style={{ padding: 20, marginBottom: 16, background: '#F9FAFB', borderRadius: 8 }}>
                            <CheckCircle2 size={16} style={{ marginRight: 8, color: '#16A34A' }} />
                            No pending verifications. All caught up!
                          </div>
                        )}

                        {/* Recently Reviewed */}
                        {reviewedDocs.length > 0 && (
                          <>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--kai-text)', marginBottom: 12 }}>
                              Recently Reviewed
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {reviewedDocs.slice(0, 10).map((doc, idx) => {
                                const name = doc.employeeName || doc.name || 'Unknown';
                                const docType = doc.documentType || doc.type || 'Document';
                                const reviewedAt = doc.reviewedAt || doc.updatedAt || '';
                                const status = doc.status;
                                const statusConfig = {
                                  approved: { bg: '#D4EDDA', color: '#155724', label: 'Approved' },
                                  rejected: { bg: '#F8D7DA', color: '#721C24', label: 'Rejected' },
                                  resubmit: { bg: '#FFF3CD', color: '#856404', label: 'Resubmit Requested' },
                                  requestResubmit: { bg: '#FFF3CD', color: '#856404', label: 'Resubmit Requested' },
                                };
                                const sc = statusConfig[status] || { bg: '#E5E7EB', color: '#5B6B76', label: status };
                                return (
                                  <div key={doc.id || doc._id || idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#F9FAFB', borderRadius: 8 }}>
                                    <div className="kai-avatar" style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length], width: 28, height: 28, fontSize: 10 }}>
                                      {getInitials(name)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text)' }}>{name}</span>
                                      <span style={{ fontSize: 12, color: 'var(--kai-text-muted)', marginLeft: 8 }}>{docType}</span>
                                    </div>
                                    <span style={{
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: sc.bg,
                                      color: sc.color,
                                    }}>
                                      {sc.label}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--kai-text-muted)', flexShrink: 0 }}>
                                      {reviewedAt ? new Date(reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </Col>
          </Row>
        );
      })()}
    </div>
  );
}
