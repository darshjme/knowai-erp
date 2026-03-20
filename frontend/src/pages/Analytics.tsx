import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Row, Col, Spinner, Alert } from 'react-bootstrap';
import Chart from 'react-apexcharts';
import DatePicker from 'react-datepicker';
import {
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  Table2,
  AlertCircle,
  CalendarRange,
} from 'lucide-react';
import { reportsApi } from '../services/api';

const KPI_CONFIG = [
  { key: 'totalRevenue', label: 'Total Revenue', icon: DollarSign, color: '#16A34A', bg: '#E8F9EF', format: 'currency' },
  { key: 'clientGrowth', label: 'Client Growth', icon: Users, color: '#3B82F6', bg: '#EBF5FF', format: 'percent' },
  { key: 'taskCompletionRate', label: 'Task Completion Rate', icon: CheckCircle2, color: '#8B3FE9', bg: '#F3EAFF', format: 'percent' },
  { key: 'avgProjectDuration', label: 'Avg Project Duration', icon: Clock, color: '#EA580C', bg: '#FFF4ED', format: 'days' },
];

function formatKpiValue(value, format) {
  if (value === null || value === undefined) return '--';
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
    case 'percent':
      return `${typeof value === 'number' ? value.toFixed(1) : value}%`;
    case 'days':
      return `${value} days`;
    default:
      return value;
  }
}

export default function Analytics() {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());

  const [kpis, setKpis] = useState({});
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [tasksByStatus, setTasksByStatus] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [teamPerformance, setTeamPerformance] = useState([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await reportsApi.getAnalytics({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      const d = data.data || data;

      setKpis({
        totalRevenue: d.totalRevenue ?? d.kpis?.totalRevenue ?? 0,
        totalRevenueDelta: d.totalRevenueDelta ?? d.kpis?.totalRevenueDelta ?? null,
        clientGrowth: d.clientGrowth ?? d.kpis?.clientGrowth ?? 0,
        clientGrowthDelta: d.clientGrowthDelta ?? d.kpis?.clientGrowthDelta ?? null,
        taskCompletionRate: d.taskCompletionRate ?? d.kpis?.taskCompletionRate ?? 0,
        taskCompletionRateDelta: d.taskCompletionRateDelta ?? d.kpis?.taskCompletionRateDelta ?? null,
        avgProjectDuration: d.avgProjectDuration ?? d.kpis?.avgProjectDuration ?? 0,
        avgProjectDurationDelta: d.avgProjectDurationDelta ?? d.kpis?.avgProjectDurationDelta ?? null,
      });

      setRevenueTrend(d.revenueTrend || d.monthlyRevenue || []);
      setTasksByStatus(d.tasksByStatus || d.taskDistribution || []);
      setExpensesByCategory(d.expensesByCategory || d.expenseBreakdown || []);
      setTeamPerformance(d.teamPerformance || d.agentPerformance || []);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Analytics' });
  }, [dispatch]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Export handlers
  function handleExportCSV() {
    if (teamPerformance.length === 0) return;
    const headers = ['Name', 'Tasks Completed', 'Hours Logged', 'Efficiency Score'];
    const rows = teamPerformance.map((m) => [
      m.name || m.agentName || '',
      m.tasksCompleted ?? m.tasks ?? 0,
      m.hoursLogged ?? m.hours ?? 0,
      m.efficiencyScore ?? m.efficiency ?? 0,
    ]);
    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPDF() {
    window.print();
  }

  // Revenue trend area chart
  const revenueTrendOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', zoom: { enabled: false } },
    colors: ['#3B82F6'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5 },
    xaxis: {
      categories: revenueTrend.map((r) => r.month || r.label || r.name || ''),
      labels: { style: { colors: '#5B6B76', fontSize: '12px' } },
    },
    yaxis: {
      labels: {
        style: { colors: '#5B6B76', fontSize: '12px' },
        formatter: (v) => `$${(v / 1000).toFixed(0)}k`,
      },
    },
    grid: { borderColor: '#E7E7E8', strokeDashArray: 4 },
    tooltip: {
      y: { formatter: (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v) },
    },
  };

  const revenueTrendSeries = [{
    name: 'Revenue',
    data: revenueTrend.map((r) => r.value || r.amount || r.revenue || 0),
  }];

  // Tasks by status bar chart
  const taskStatusLabels = tasksByStatus.map((t) => t.status || t.label || t.name || '');
  const taskStatusValues = tasksByStatus.map((t) => t.count || t.value || 0);
  const taskStatusColors = ['#EA580C', '#3B82F6', '#8B3FE9', '#16A34A', '#2563EB', '#CB3939'];

  const taskBarOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: taskStatusColors.slice(0, taskStatusLabels.length),
    plotOptions: { bar: { borderRadius: 6, columnWidth: '55%', distributed: true } },
    dataLabels: { enabled: true, style: { fontSize: '12px', fontWeight: 600 } },
    xaxis: {
      categories: taskStatusLabels,
      labels: { style: { colors: '#5B6B76', fontSize: '12px' } },
    },
    yaxis: { labels: { style: { colors: '#5B6B76', fontSize: '12px' } } },
    grid: { borderColor: '#E7E7E8', strokeDashArray: 4 },
    legend: { show: false },
    tooltip: { y: { formatter: (v) => `${v} tasks` } },
  };

  const taskBarSeries = [{ name: 'Tasks', data: taskStatusValues }];

  // Expenses pie chart
  const expenseLabels = expensesByCategory.map((e) => e.category || e.label || e.name || '');
  const expenseValues = expensesByCategory.map((e) => e.amount || e.value || e.total || 0);
  const expensePieColors = ['#3B82F6', '#8B3FE9', '#16A34A', '#EA580C', '#CB3939', '#2563EB', '#5B6B76'];

  const expensePieOptions = {
    chart: { type: 'pie', fontFamily: 'inherit' },
    colors: expensePieColors.slice(0, expenseLabels.length),
    labels: expenseLabels,
    legend: { position: 'bottom', fontSize: '13px', labels: { colors: '#5B6B76' } },
    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
    stroke: { width: 2, colors: ['#fff'] },
    tooltip: {
      y: { formatter: (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v) },
    },
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: 400 }}>
        <Spinner animation="border" style={{ color: 'var(--kai-primary)' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>Business insights and performance metrics</p>
        </div>
        <div className="page-actions">
          <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={handleExportCSV}>
            <Table2 size={14} /> CSV
          </button>
          <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={handleExportPDF}>
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="kai-card mb-4">
        <div className="kai-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <CalendarRange size={18} style={{ color: 'var(--kai-primary)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Date Range:</span>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            maxDate={endDate}
            className="kai-input"
            dateFormat="MMM d, yyyy"
            style={{ width: 160 }}
          />
          <span style={{ color: 'var(--kai-text-muted)', fontSize: 13 }}>to</span>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            maxDate={new Date()}
            className="kai-input"
            dateFormat="MMM d, yyyy"
            style={{ width: 160 }}
          />
          <button className="kai-btn kai-btn-primary kai-btn-sm" onClick={fetchAnalytics}>
            Apply
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="d-flex align-items-center gap-2 mb-4">
          <AlertCircle size={18} />
          <div>
            <strong>Error loading analytics.</strong> {error}
            <button className="kai-btn kai-btn-outline kai-btn-sm ms-3" onClick={fetchAnalytics}>Retry</button>
          </div>
        </Alert>
      )}

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        {KPI_CONFIG.map((cfg) => {
          const Icon = cfg.icon;
          const value = kpis[cfg.key];
          const delta = kpis[`${cfg.key}Delta`];
          const isUp = delta >= 0;
          return (
            <Col key={cfg.key} xs={12} sm={6} xl={3}>
              <div className="stat-card">
                <div className="flex-between" style={{ marginBottom: 16 }}>
                  <div className="stat-icon" style={{ background: cfg.bg, color: cfg.color }}>
                    <Icon />
                  </div>
                  {delta !== undefined && delta !== null && (
                    <span className={`stat-delta ${isUp ? 'up' : 'down'}`}>
                      {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {isUp ? '+' : ''}{delta}%
                    </span>
                  )}
                </div>
                <div className="stat-value">{formatKpiValue(value, cfg.format)}</div>
                <div className="stat-label">{cfg.label}</div>
              </div>
            </Col>
          );
        })}
      </Row>

      {/* Revenue Trend Chart */}
      <div className="kai-card mb-4">
        <div className="kai-card-header">
          <h6>Revenue Trend</h6>
          <span className="kai-badge primary">12 Months</span>
        </div>
        <div className="kai-card-body">
          {revenueTrendSeries[0].data.length > 0 ? (
            <Chart options={revenueTrendOptions} series={revenueTrendSeries} type="area" height={360} />
          ) : (
            <div className="flex-center text-muted" style={{ height: 360 }}>No revenue trend data available</div>
          )}
        </div>
      </div>

      {/* Task Status + Expense Breakdown */}
      <Row className="g-3 mb-4">
        <Col xs={12} lg={7}>
          <div className="kai-card" style={{ height: '100%' }}>
            <div className="kai-card-header">
              <h6>Tasks by Status</h6>
            </div>
            <div className="kai-card-body">
              {taskStatusValues.length > 0 && taskStatusValues.some((v) => v > 0) ? (
                <Chart options={taskBarOptions} series={taskBarSeries} type="bar" height={320} />
              ) : (
                <div className="flex-center text-muted" style={{ height: 320 }}>No task status data available</div>
              )}
            </div>
          </div>
        </Col>
        <Col xs={12} lg={5}>
          <div className="kai-card" style={{ height: '100%' }}>
            <div className="kai-card-header">
              <h6>Expenses by Category</h6>
            </div>
            <div className="kai-card-body">
              {expenseValues.length > 0 && expenseValues.some((v) => v > 0) ? (
                <Chart options={expensePieOptions} series={expenseValues} type="pie" height={320} />
              ) : (
                <div className="flex-center text-muted" style={{ height: 320 }}>No expense data available</div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Team Performance Table */}
      <div className="kai-card">
        <div className="kai-card-header">
          <h6>Team Performance</h6>
          <span className="kai-badge secondary">{teamPerformance.length} members</span>
        </div>
        <div className="kai-card-body" style={{ padding: 0 }}>
          {teamPerformance.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="kai-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Tasks Completed</th>
                    <th>Hours Logged</th>
                    <th>Efficiency Score</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.map((member, idx) => {
                    const name = member.name || member.agentName || `Agent ${idx + 1}`;
                    const tasks = member.tasksCompleted ?? member.tasks ?? 0;
                    const hours = member.hoursLogged ?? member.hours ?? 0;
                    const efficiency = member.efficiencyScore ?? member.efficiency ?? 0;
                    const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                    const avatarColors = ['#111827', '#8B3FE9', '#16A34A', '#EA580C', '#2563EB', '#CB3939'];
                    const avatarColor = avatarColors[idx % avatarColors.length];

                    let effBadgeClass = 'secondary';
                    if (efficiency >= 90) effBadgeClass = 'success';
                    else if (efficiency >= 70) effBadgeClass = 'primary';
                    else if (efficiency >= 50) effBadgeClass = 'warning';
                    else if (efficiency > 0) effBadgeClass = 'danger';

                    return (
                      <tr key={member.id || idx}>
                        <td>
                          <div className="flex-gap-8">
                            <div className="kai-avatar" style={{ background: avatarColor, width: 32, height: 32, fontSize: 12 }}>
                              {initials}
                            </div>
                            <span style={{ fontWeight: 600 }}>{name}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{tasks}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{hours}h</span>
                        </td>
                        <td>
                          <span className={`kai-badge ${effBadgeClass}`}>{efficiency}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-muted flex-center" style={{ padding: 40 }}>
              No team performance data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
