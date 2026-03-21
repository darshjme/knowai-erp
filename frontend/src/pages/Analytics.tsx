import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
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
  { key: 'totalRevenue', label: 'Total Revenue', icon: DollarSign, color: '#10B981', bg: 'bg-[#10B981]/15', format: 'currency' as const },
  { key: 'clientGrowth', label: 'Client Growth', icon: Users, color: '#3B82F6', bg: 'bg-[#3B82F6]/15', format: 'percent' as const },
  { key: 'taskCompletionRate', label: 'Task Completion Rate', icon: CheckCircle2, color: '#7C3AED', bg: 'bg-[#7C3AED]/15', format: 'percent' as const },
  { key: 'avgProjectDuration', label: 'Avg Project Duration', icon: Clock, color: '#F59E0B', bg: 'bg-[#F59E0B]/15', format: 'days' as const },
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

const DARK_CHART_DEFAULTS = {
  theme: { mode: 'dark' as const },
  chart: { background: 'transparent' },
  grid: { borderColor: 'var(--border-subtle)', strokeDashArray: 4 },
  tooltip: {
    theme: 'dark',
    style: { fontSize: '12px' },
  },
};

export default function Analytics() {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodTab, setPeriodTab] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
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
    ...DARK_CHART_DEFAULTS,
    chart: { ...DARK_CHART_DEFAULTS.chart, type: 'area' as const, toolbar: { show: false }, fontFamily: "'Inter', sans-serif", zoom: { enabled: false } },
    colors: ['#3B82F6'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' as const, width: 2.5 },
    xaxis: {
      categories: revenueTrend.map((r) => r.month || r.label || r.name || ''),
      labels: { style: { colors: 'var(--text-muted)', fontSize: '12px' } },
      axisBorder: { color: 'var(--border-subtle)' },
      axisTicks: { color: 'var(--border-subtle)' },
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--text-muted)', fontSize: '12px' },
        formatter: (v) => `$${(v / 1000).toFixed(0)}k`,
      },
    },
    grid: { ...DARK_CHART_DEFAULTS.grid },
    tooltip: {
      ...DARK_CHART_DEFAULTS.tooltip,
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
  const taskStatusColors = ['#F59E0B', '#3B82F6', '#7C3AED', '#10B981', '#2563EB', '#EF4444'];

  const taskBarOptions = {
    ...DARK_CHART_DEFAULTS,
    chart: { ...DARK_CHART_DEFAULTS.chart, type: 'bar' as const, toolbar: { show: false }, fontFamily: "'Inter', sans-serif" },
    colors: taskStatusColors.slice(0, taskStatusLabels.length),
    plotOptions: { bar: { borderRadius: 6, columnWidth: '55%', distributed: true } },
    dataLabels: { enabled: true, style: { fontSize: '12px', fontWeight: 600, colors: ['#F9FAFB'] } },
    xaxis: {
      categories: taskStatusLabels,
      labels: { style: { colors: 'var(--text-muted)', fontSize: '12px' } },
      axisBorder: { color: 'var(--border-subtle)' },
      axisTicks: { color: 'var(--border-subtle)' },
    },
    yaxis: { labels: { style: { colors: 'var(--text-muted)', fontSize: '12px' } } },
    grid: { ...DARK_CHART_DEFAULTS.grid },
    legend: { show: false },
    tooltip: {
      ...DARK_CHART_DEFAULTS.tooltip,
      y: { formatter: (v) => `${v} tasks` },
    },
  };

  const taskBarSeries = [{ name: 'Tasks', data: taskStatusValues }];

  // Expenses pie chart
  const expenseLabels = expensesByCategory.map((e) => e.category || e.label || e.name || '');
  const expenseValues = expensesByCategory.map((e) => e.amount || e.value || e.total || 0);
  const expensePieColors = ['#3B82F6', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#2563EB', '#8B95A5'];

  const expensePieOptions = {
    ...DARK_CHART_DEFAULTS,
    chart: { ...DARK_CHART_DEFAULTS.chart, type: 'pie' as const, fontFamily: "'Inter', sans-serif" },
    colors: expensePieColors.slice(0, expenseLabels.length),
    labels: expenseLabels,
    legend: { position: 'bottom' as const, fontSize: '13px', labels: { colors: 'var(--text-secondary)' } },
    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%`, style: { colors: ['#F9FAFB'] } },
    stroke: { width: 2, colors: ['var(--bg-card)'] },
    tooltip: {
      ...DARK_CHART_DEFAULTS.tooltip,
      y: { formatter: (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v) },
    },
  };

  const periodTabs = [
    { key: 'monthly' as const, label: 'Monthly' },
    { key: 'quarterly' as const, label: 'Quarterly' },
    { key: 'yearly' as const, label: 'Yearly' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="analytics-loading">
        <div className="w-8 h-8 border-2 border-[var(--text-muted)] border-t-[#7C3AED] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="analytics-page">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4" data-testid="analytics-header">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)] font-[Manrope] tracking-[-0.4px]">Analytics</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Business insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg hover:text-[var(--text-primary)] transition-colors"
            onClick={handleExportCSV}
            data-testid="export-csv-btn"
          >
            <Table2 size={14} />
            <span>CSV</span>
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg hover:text-[var(--text-primary)] transition-colors"
            onClick={handleExportPDF}
            data-testid="export-pdf-btn"
          >
            <FileText size={14} />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 mb-4" data-testid="date-range-picker">
        <div className="flex items-center gap-4 flex-wrap">
          <CalendarRange size={18} className="text-[#7C3AED]" />
          <span className="text-[13px] font-semibold text-[var(--text-secondary)]">Date Range:</span>
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            maxDate={endDate}
            className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[#7C3AED] w-[160px]"
            dateFormat="MMM d, yyyy"
          />
          <span className="text-[13px] text-[var(--text-muted)]">to</span>
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            maxDate={new Date()}
            className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-[13px] text-[var(--text-primary)] outline-none focus:border-[#7C3AED] w-[160px]"
            dateFormat="MMM d, yyyy"
          />
          <button
            className="px-4 py-1.5 text-[13px] font-semibold text-white bg-[#7C3AED] rounded-lg hover:bg-[#6D28D9] transition-colors"
            onClick={fetchAnalytics}
            data-testid="apply-date-btn"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-4 mb-4 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-[var(--text-primary)]" data-testid="analytics-error">
          <AlertCircle size={18} className="text-[#EF4444] shrink-0" />
          <div className="flex-1 text-[13px]">
            <strong>Error loading analytics.</strong> {error}
          </div>
          <button
            className="px-3 py-1 text-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg hover:text-[var(--text-primary)] transition-colors"
            onClick={fetchAnalytics}
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2 max-sm:grid-cols-1" data-testid="kpi-row">
        {KPI_CONFIG.map((cfg) => {
          const Icon = cfg.icon;
          const value = kpis[cfg.key];
          const delta = kpis[`${cfg.key}Delta`];
          const isUp = delta >= 0;
          return (
            <div
              key={cfg.key}
              className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4"
              data-testid={`kpi-card-${cfg.key}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-[20px] h-[20px] rounded-full flex items-center justify-center ${cfg.bg}`}
                  style={{ width: 32, height: 32 }}
                >
                  <Icon size={16} style={{ color: cfg.color }} />
                </div>
              </div>
              <div className="text-[22px] font-bold text-[var(--text-primary)] truncate" title={String(formatKpiValue(value, cfg.format))}>
                {formatKpiValue(value, cfg.format)}
              </div>
              {delta !== undefined && delta !== null && (
                <div className={`flex items-center gap-1 text-[10px] mt-1 ${isUp ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{isUp ? '+' : ''}{delta}%</span>
                </div>
              )}
              <div className="text-[10px] text-[var(--text-muted)] mt-1 truncate uppercase tracking-[0.08em]" title={cfg.label}>
                {cfg.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Trend — Main Chart */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden mt-3" data-testid="revenue-trend-chart">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex justify-between items-center">
          <h2 className="text-[13px] font-medium text-[var(--text-primary)]">Revenue Trend</h2>
          <div className="flex items-center gap-1" data-testid="period-toggle">
            {periodTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setPeriodTab(tab.key)}
                className={`text-[12px] px-3 py-1 rounded-full transition-colors ${
                  periodTab === tab.key
                    ? 'bg-[#3B82F6]/20 text-[#3B82F6]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                data-testid={`period-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-[140px] p-4">
          {revenueTrendSeries[0].data.length > 0 ? (
            <Chart options={revenueTrendOptions} series={revenueTrendSeries} type="area" height={360} />
          ) : (
            <div className="flex items-center justify-center text-[var(--text-muted)] text-[13px] h-[360px]">
              No revenue trend data available
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row — Task Completion Rate + Expense Breakdown */}
      <div className="flex gap-3 mt-3 max-md:flex-col" data-testid="bottom-charts-row">
        {/* Task Completion Rate */}
        <div className="flex-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden" data-testid="task-completion-chart">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex justify-between items-center">
            <h2 className="text-[13px] font-medium text-[var(--text-primary)]">Task Completion Rate</h2>
          </div>
          <div className="min-h-[140px] p-4">
            {taskStatusValues.length > 0 && taskStatusValues.some((v) => v > 0) ? (
              <Chart options={taskBarOptions} series={taskBarSeries} type="bar" height={320} />
            ) : (
              <div className="flex items-center justify-center text-[var(--text-muted)] text-[13px] h-[320px]">
                No task status data available
              </div>
            )}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="flex-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden" data-testid="expense-breakdown-chart">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex justify-between items-center">
            <h2 className="text-[13px] font-medium text-[var(--text-primary)]">Expense Breakdown</h2>
          </div>
          <div className="min-h-[140px] p-4">
            {expenseValues.length > 0 && expenseValues.some((v) => v > 0) ? (
              <Chart options={expensePieOptions} series={expenseValues} type="pie" height={320} />
            ) : (
              <div className="flex items-center justify-center text-[var(--text-muted)] text-[13px] h-[320px]">
                No expense data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden mt-3" data-testid="team-performance-table">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex justify-between items-center">
          <h2 className="text-[13px] font-medium text-[var(--text-primary)]">Team Performance</h2>
          <span className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
            {teamPerformance.length} members
          </span>
        </div>
        <div>
          {teamPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" data-testid="team-table">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">Agent</th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">Tasks Completed</th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">Hours Logged</th>
                    <th className="text-left px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.08em]">Efficiency Score</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.map((member, idx) => {
                    const name = member.name || member.agentName || `Agent ${idx + 1}`;
                    const tasks = member.tasksCompleted ?? member.tasks ?? 0;
                    const hours = member.hoursLogged ?? member.hours ?? 0;
                    const efficiency = member.efficiencyScore ?? member.efficiency ?? 0;
                    const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                    const avatarColors = ['#111827', '#7C3AED', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'];
                    const avatarColor = avatarColors[idx % avatarColors.length];

                    let effColor = 'text-[var(--text-muted)]';
                    let effBg = 'bg-[var(--bg-elevated)]';
                    if (efficiency >= 90) { effColor = 'text-[#10B981]'; effBg = 'bg-[#10B981]/15'; }
                    else if (efficiency >= 70) { effColor = 'text-[#3B82F6]'; effBg = 'bg-[#3B82F6]/15'; }
                    else if (efficiency >= 50) { effColor = 'text-[#F59E0B]'; effBg = 'bg-[#F59E0B]/15'; }
                    else if (efficiency > 0) { effColor = 'text-[#EF4444]'; effBg = 'bg-[#EF4444]/15'; }

                    return (
                      <tr key={member.id || idx} className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--bg-elevated)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white shrink-0"
                              style={{ backgroundColor: avatarColor }}
                            >
                              {initials}
                            </div>
                            <span className="font-semibold text-[var(--text-primary)] truncate" title={name}>{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-[var(--text-primary)] tabular-nums">{tasks}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-[var(--text-secondary)] tabular-nums">{hours}h</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${effColor} ${effBg}`}>
                            {efficiency}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center text-[var(--text-muted)] text-[13px] py-10">
              No team performance data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
