import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Chart from 'react-apexcharts';
import {
  Users,
  FolderKanban,
  CheckSquare,
  DollarSign,
  CalendarOff,
  Receipt,
  TrendingUp,
  TrendingDown,
  Plus,
  FileText,
  UserPlus,
  Clock,
  AlertCircle,
  Activity,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { dashboardApi } from '../services/api';
import AccountabilityWidget from '../components/dashboard/AccountabilityWidget';
import { canSeeWidget, ROLE_LABELS, ROLE_COLORS } from '../utils/roleConfig';
import Skeleton from '../components/ui/Skeleton';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Greeting skeleton */}
      <Skeleton width="100%" height={140} borderRadius={16} />

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <Skeleton width={48} height={48} borderRadius={16} />
              <Skeleton width={50} height={16} borderRadius={8} />
            </div>
            <Skeleton width="60%" height={28} borderRadius={8} style={{ marginBottom: 8 }} />
            <Skeleton width="80%" height={14} borderRadius={6} />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="flex gap-3 flex-col lg:flex-row">
        <div className="flex-[3] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <Skeleton width={140} height={18} borderRadius={6} />
          </div>
          <div className="p-4">
            <Skeleton width="100%" height={320} borderRadius={12} />
          </div>
        </div>
        <div className="flex-[2] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <Skeleton width={140} height={18} borderRadius={6} />
          </div>
          <div className="p-4">
            <Skeleton width="100%" height={320} borderRadius={12} />
          </div>
        </div>
      </div>

      {/* Activity feed skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <Skeleton width={120} height={18} borderRadius={6} />
          </div>
          <div className="p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 mb-3.5">
                <Skeleton width={32} height={32} borderRadius={8} />
                <div className="flex-1">
                  <Skeleton width="90%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                  <Skeleton width="50%" height={12} borderRadius={6} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <Skeleton width={110} height={18} borderRadius={6} />
          </div>
          <div className="p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={40} borderRadius={8} style={{ marginBottom: 10 }} />
            ))}
          </div>
        </div>
        <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <Skeleton width={150} height={18} borderRadius={6} />
          </div>
          <div className="p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={48} borderRadius={8} style={{ marginBottom: 12 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const STAT_CARD_CONFIG = [
  { key: 'totalTeam', label: 'Total Team', icon: Users, color: '#111827', bg: '#F3F4F6', widget: 'team' },
  { key: 'activeProjects', label: 'Active Projects', icon: FolderKanban, color: '#8B3FE9', bg: '#F3EAFF', widget: 'projects' },
  { key: 'openTasks', label: 'Open Tasks', icon: CheckSquare, color: '#EA580C', bg: '#FFF4ED', widget: 'tasks' },
  { key: 'revenue', label: 'Revenue', icon: DollarSign, color: '#16A34A', bg: '#E8F9EF', format: 'currency', widget: 'revenue' },
  { key: 'pendingLeaves', label: 'Pending Leaves', icon: CalendarOff, color: '#CB3939', bg: '#FDECEC', widget: 'leaves' },
  { key: 'expensesThisMonth', label: 'Expenses This Month', icon: Receipt, color: '#2563EB', bg: '#EBF3FF', format: 'currency', widget: 'expenses' },
  { key: 'pendingVerifications', label: 'Pending Verifications', icon: Shield, color: '#7C3AED', bg: '#F3EAFF', widget: 'team' },
];

function formatCurrency(value, currency = 'INR') {
  const locale = currency === 'INR' ? 'en-IN' : currency === 'CNY' ? 'zh-CN' : currency === 'EUR' ? 'de-DE' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function formatValue(value, format) {
  if (value === null || value === undefined) return '--';
  if (format === 'currency') {
    return formatCurrency(value, 'INR');
  }
  if (typeof value === 'number' && value >= 1000) {
    return new Intl.NumberFormat('en-IN').format(value);
  }
  return value;
}

function StatCard({ config, value, delta, onClick }) {
  const Icon = config.icon;
  const isUp = delta >= 0;
  return (
    <motion.div
      className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 flex flex-col gap-3 transition-shadow"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
      data-testid={`stat-card-${config.key}`}
    >
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: config.bg, color: config.color }}
        >
          <Icon size={20} />
        </div>
        {delta !== undefined && delta !== null && (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full leading-none"
            style={{
              color: isUp ? '#059669' : '#DC2626',
              background: isUp ? '#05966915' : '#DC262615',
            }}
          >
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isUp ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <div
        className="text-[clamp(13px,1.2vw,22px)] font-bold text-[var(--text-primary)] leading-tight tracking-tight overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ fontVariantNumeric: 'tabular-nums' }}
        title={String(formatValue(value, config.format))}
      >
        {formatValue(value, config.format)}
      </div>
      <div className="text-[13px] text-[var(--text-secondary)] font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={config.label}>
        {config.label}
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);

  const userRole = user?.role || 'GUY';
  const roleLabel = ROLE_LABELS[userRole] || userRole;
  const roleColor = ROLE_COLORS[userRole] || '#6B7280';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [personalityBannerDismissed, setPersonalityBannerDismissed] = useState(false);
  const [revenueChart, setRevenueChart] = useState([]);
  const [taskDistribution, setTaskDistribution] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [deadlines, setDeadlines] = useState([]);

  // Filter stat cards based on role
  const visibleStatCards = useMemo(() => {
    return STAT_CARD_CONFIG.filter(cfg => canSeeWidget(userRole, cfg.widget));
  }, [userRole]);

  // Quick actions filtered by role
  const allQuickActions = [
    { label: 'New Project', icon: <FolderKanban size={16} />, path: '/projects', color: '#8B3FE9', widget: 'projects' },
    { label: 'Add Task', icon: <Plus size={16} />, path: '/tasks', color: '#EA580C', widget: 'tasks' },
    { label: 'New Invoice', icon: <FileText size={16} />, path: '/invoices', color: '#16A34A', widget: 'revenue' },
    { label: 'Add Team Member', icon: <UserPlus size={16} />, path: '/team', color: '#111827', widget: 'team' },
  ];

  const quickActions = useMemo(() => {
    return allQuickActions.filter(a => canSeeWidget(userRole, a.widget));
  }, [userRole]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await dashboardApi.getStats();
      const d = data.data || data;

      setStats({
        totalTeam: d.totalTeam ?? d.teamCount ?? d.totalMembers ?? 0,
        activeProjects: d.activeProjects ?? d.projectCount ?? 0,
        openTasks: d.openTasks ?? d.taskCount ?? 0,
        revenue: d.revenue ?? d.totalRevenue ?? 0,
        pendingLeaves: d.pendingLeaves ?? 0,
        expensesThisMonth: d.expensesThisMonth ?? d.expenses ?? 0,
        totalTeamDelta: d.totalTeamDelta ?? d.deltas?.totalTeam ?? null,
        activeProjectsDelta: d.activeProjectsDelta ?? d.deltas?.activeProjects ?? null,
        openTasksDelta: d.openTasksDelta ?? d.deltas?.openTasks ?? null,
        revenueDelta: d.revenueDelta ?? d.deltas?.revenue ?? null,
        pendingLeavesDelta: d.pendingLeavesDelta ?? d.deltas?.pendingLeaves ?? null,
        expensesThisMonthDelta: d.expensesThisMonthDelta ?? d.deltas?.expenses ?? null,
        pendingVerifications: d.pendingVerifications ?? 0,
        // Task breakdown
        todayTasks: d.todayTasks || [],
        backlogTasks: d.backlogTasks || [],
        upcomingTasks: d.upcomingTasks || [],
        inProgressTasks: d.inProgressTasks || [],
      });

      setRevenueChart(d.revenueVsExpenses || d.revenueChart || d.monthlyRevenue || []);
      setTaskDistribution(d.taskStatusDistribution || d.taskDistribution || d.tasksByStatus || []);

      // Map activity feed from backend notifications
      const rawActivity = d.recentActivityAll || d.activityFeed || d.recentActivity || d.activity || [];
      const mappedActivity = rawActivity.map((item) => {
        // If already in the expected format, pass through
        if (item.title && item.type) return item;
        // Map notification objects to activity feed format
        const userName = item.user
          ? `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim()
          : '';
        const notifType = (item.type || '').toLowerCase();
        const activityType = notifType.includes('task') ? 'task'
          : notifType.includes('project') ? 'project'
          : notifType.includes('invoice') ? 'invoice'
          : notifType.includes('leave') ? 'leave'
          : notifType.includes('team') || notifType.includes('member') ? 'team'
          : 'task';
        return {
          id: item.id,
          type: activityType,
          title: item.title || item.message || 'Activity',
          message: item.message,
          user: userName,
          time: item.createdAt
            ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '',
          createdAt: item.createdAt,
        };
      });
      setRecentActivity(mappedActivity);

      setDeadlines(d.upcomingDeadlines || d.deadlines || d.overdueTasks || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Dashboard' });
    fetchDashboard();
  }, [dispatch, fetchDashboard]);

  useEffect(() => {
    fetch('/api/document-verification', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const data = d?.data || d;
        setVerificationStatus(data);
      })
      .catch(() => {});
  }, []);

  // Revenue bar chart config
  const revenueChartOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: ['#7C3AED'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: revenueChart.length > 0
        ? revenueChart.map((r) => r.month || r.label || r.name || '')
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      labels: { style: { colors: 'var(--text-secondary)', fontSize: '12px' } },
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--text-secondary)', fontSize: '12px' },
        formatter: (v) => `₹${(v / 1000).toFixed(0)}k`,
      },
    },
    grid: { borderColor: 'var(--border-default)', strokeDashArray: 4 },
    tooltip: {
      y: { formatter: (v) => formatCurrency(v, 'INR') },
    },
  };

  const revenueChartSeries = [{
    name: 'Revenue',
    data: revenueChart.length > 0
      ? revenueChart.map((r) => r.value || r.amount || r.revenue || 0)
      : [],
  }];

  // Task distribution donut chart
  const taskLabels = taskDistribution.length > 0
    ? taskDistribution.map((t) => t.status || t.label || t.name || '')
    : ['To Do', 'In Progress', 'In Review', 'Completed'];

  const taskValues = taskDistribution.length > 0
    ? taskDistribution.map((t) => t.count || t.value || 0)
    : [];

  const taskDonutOptions = {
    chart: { type: 'donut', fontFamily: 'inherit' },
    colors: ['#EA580C', '#3B82F6', '#8B3FE9', '#16A34A'],
    labels: taskLabels,
    legend: { position: 'bottom', fontSize: '13px', labels: { colors: 'var(--text-secondary)' } },
    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(0)}%` },
    plotOptions: { pie: { donut: { size: '60%' } } },
    stroke: { width: 2, colors: ['var(--bg-card)'] },
    tooltip: { y: { formatter: (v) => `${v} tasks` } },
  };

  // Activity icon mapper
  function getActivityIcon(type) {
    switch (type) {
      case 'project': return <FolderKanban size={16} />;
      case 'task': return <CheckSquare size={16} />;
      case 'invoice': return <FileText size={16} />;
      case 'team': return <Users size={16} />;
      case 'leave': return <CalendarOff size={16} />;
      default: return <Activity size={16} />;
    }
  }

  function getActivityColor(type) {
    switch (type) {
      case 'project': return '#8B3FE9';
      case 'task': return '#EA580C';
      case 'invoice': return '#16A34A';
      case 'team': return '#F9FAFB';
      case 'leave': return '#CB3939';
      default: return '#9CA3AF';
    }
  }

  // Widget visibility helpers
  const showRevenueChart = canSeeWidget(userRole, 'revenueChart');
  const showTaskDistribution = canSeeWidget(userRole, 'taskDistribution');
  const showRecentActivity = canSeeWidget(userRole, 'recentActivity');
  const showQuickActions = canSeeWidget(userRole, 'quickActions') && quickActions.length > 0;
  const showDeadlines = canSeeWidget(userRole, 'deadlines');

  // Determine if we show the charts row at all
  const showChartsRow = showRevenueChart || showTaskDistribution;
  // Determine if we show the bottom row at all
  const showBottomRow = showRecentActivity || showQuickActions || showDeadlines;

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-[var(--text-primary)] font-heading">Dashboard</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Welcome back to Know AI ERP</p>
        </div>
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-[var(--text-primary)]" data-testid="dashboard-error">
          <AlertCircle size={18} className="text-[var(--accent-red)] shrink-0" />
          <div className="text-[13px]">
            <strong>Error loading dashboard.</strong> {error}
            <button
              className="ml-3 px-3 py-1 text-xs font-semibold border border-[var(--border-default)] rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] transition-colors"
              onClick={fetchDashboard}
              data-testid="dashboard-retry"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour <= 11
    ? 'Good morning'
    : hour >= 12 && hour <= 16
    ? 'Good afternoon'
    : hour >= 17 && hour <= 20
    ? 'Good evening'
    : 'Good night';
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const QUOTES = [
    "Great things never come from comfort zones.",
    "The only way to do great work is to love what you do.",
    "Success is not final, failure is not fatal — it is the courage to continue that counts.",
    "Stay focused, go after your dreams and keep moving toward your goals.",
    "Your work is going to fill a large part of your life. Make it great.",
    "Productivity is never an accident. It is always the result of intelligent effort.",
    "The secret of getting ahead is getting started.",
  ];
  const todayQuote = QUOTES[now.getDate() % QUOTES.length];

  // Tasks from dashboard data
  const todayTasks = stats.todayTasks || [];
  const backlogTasks = stats.backlogTasks || [];
  const upcomingTasks = stats.upcomingTasks || [];

  // Navigate map for stat cards
  const STAT_NAVIGATE = {
    totalTeam: '/team', activeProjects: '/projects', openTasks: '/tasks',
    revenue: '/invoices', pendingLeaves: '/leaves', expensesThisMonth: '/expenses',
    pendingVerifications: '/hr-dashboard',
  };

  const overdueCount = backlogTasks.length || 0;

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Hero / Greeting Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl p-5 px-6" data-testid="hero-card">
        <div className="flex justify-between flex-wrap gap-5">
          {/* Left side */}
          <div className="min-w-0 flex-1">
            <h1
              className="text-2xl font-bold font-heading text-[var(--text-primary)] leading-tight tracking-tight mb-1 overflow-hidden text-ellipsis whitespace-nowrap"
              title={`${greeting}, ${user?.firstName || 'there'}!`}
            >
              {greeting}, {user?.firstName || 'there'}!
            </h1>
            <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] mb-3 flex-wrap">
              <span>{dateStr}</span>
              <span className="opacity-40">|</span>
              <span className="font-mono font-semibold">{timeStr}</span>
              <span className="opacity-40">|</span>
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400"
              >
                {roleLabel}
              </span>
            </div>
            <p className="text-xs italic text-[var(--text-muted)] max-w-[500px] leading-relaxed">
              &ldquo;{todayQuote}&rdquo;
            </p>
          </div>

          {/* Right side — metric pills */}
          <div className="flex gap-3 items-start flex-wrap">
            <div
              className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-2.5 px-4 text-center min-w-[90px] cursor-pointer hover:border-[var(--accent-purple)] transition-colors"
              onClick={() => navigate('/tasks')}
              data-testid="metric-today-tasks"
            >
              <div className="text-xl font-bold text-[var(--text-primary)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {todayTasks.length || stats.openTasks || 0}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Today Tasks</div>
            </div>
            <div
              className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-2.5 px-4 text-center min-w-[90px] cursor-pointer hover:border-[var(--accent-purple)] transition-colors"
              onClick={() => navigate('/tasks?view=blocked')}
              data-testid="metric-overdue"
            >
              <div
                className={`text-xl font-bold ${overdueCount > 0 ? 'text-[var(--accent-red)]' : 'text-[var(--text-primary)]'}`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {overdueCount}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Overdue</div>
            </div>
            <div
              className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl p-2.5 px-4 text-center min-w-[90px] cursor-pointer hover:border-[var(--accent-purple)] transition-colors"
              onClick={() => navigate('/calendar')}
              data-testid="metric-upcoming"
            >
              <div className="text-xl font-bold text-[var(--text-primary)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {upcomingTasks.length || 0}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Upcoming</div>
            </div>
          </div>
        </div>
      </div>

      {/* Personality Test Banner */}
      {!personalityBannerDismissed && user && user.personalityTestTaken === false && (
        <div
          className="flex items-center gap-4 p-3.5 px-5 bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20 rounded-xl"
          data-testid="personality-banner"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#111827] to-[#8B3FE9] flex items-center justify-center shrink-0">
            <Activity size={20} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              Take your personality assessment!
            </div>
            <div className="text-[13px] text-[var(--text-secondary)]">
              Discover your work style and improve team collaboration.
            </div>
          </div>
          <button
            className="shrink-0 px-4 py-1.5 text-[13px] font-semibold bg-[var(--accent-purple)] text-white rounded-lg hover:opacity-90 transition-opacity"
            onClick={() => navigate('/personality-test')}
            data-testid="personality-take-test"
          >
            Take Test
          </button>
          <button
            onClick={() => setPersonalityBannerDismissed(true)}
            className="shrink-0 p-1 text-lg leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-transparent border-none cursor-pointer"
            title="Dismiss"
            data-testid="personality-dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {/* Identity Verification Banner */}
      {verificationStatus && !user?.verified && (
        <div
          className="flex items-center gap-3 p-3.5 px-5 bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20 rounded-xl"
          data-testid="verification-banner"
        >
          <Shield size={24} className="text-[var(--accent-blue)] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-[var(--text-primary)]">Verify Your Identity</div>
            <div className="text-xs text-[var(--text-muted)]">Upload your government ID and PAN card to get verified</div>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="shrink-0 px-4 py-1.5 text-[13px] font-semibold bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-lg hover:opacity-90 transition-opacity border-none cursor-pointer"
            data-testid="verify-now"
          >
            Verify Now
          </button>
        </div>
      )}

      {/* Stat Cards — ALL in one row with CSS grid */}
      {visibleStatCards.length > 0 && (
        <div
          className="gap-2"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          }}
          data-testid="stat-cards-grid"
        >
          <style>{`
            @media (max-width: 1199px) {
              [data-testid="stat-cards-grid"] {
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              }
            }
            @media (max-width: 767px) {
              [data-testid="stat-cards-grid"] {
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              }
            }
          `}</style>
          {visibleStatCards.map((cfg) => (
            <StatCard
              key={cfg.key}
              config={cfg}
              value={stats[cfg.key]}
              delta={stats[`${cfg.key}Delta`]}
              onClick={() => navigate(STAT_NAVIGATE[cfg.key] || '/dashboard')}
            />
          ))}
        </div>
      )}

      {/* Charts Row */}
      {showChartsRow && (
        <div className="flex gap-3 flex-col lg:flex-row" data-testid="charts-row">
          {showRevenueChart && (
            <div className="flex-[3] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl min-w-0">
              <div className="p-4 border-b border-[var(--border-subtle)]">
                <h6 className="text-sm font-semibold text-[var(--text-secondary)]">Monthly Revenue</h6>
              </div>
              <div className="p-4">
                {revenueChartSeries[0].data.length > 0 ? (
                  <Chart options={revenueChartOptions} series={revenueChartSeries} type="bar" height={320} />
                ) : (
                  <div className="flex items-center justify-center text-[var(--text-muted)] text-[13px] h-[320px]">
                    No revenue data available
                  </div>
                )}
              </div>
            </div>
          )}
          {showTaskDistribution && (
            <div className="flex-[2] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl min-w-0">
              <div className="p-4 border-b border-[var(--border-subtle)]">
                <h6 className="text-sm font-semibold text-[var(--text-secondary)]">Task Distribution</h6>
              </div>
              <div className="p-4">
                {taskValues.length > 0 && taskValues.some((v) => v > 0) ? (
                  <Chart options={taskDonutOptions} series={taskValues} type="donut" height={320} />
                ) : (
                  <div className="flex items-center justify-center text-[var(--text-muted)] text-[13px] h-[320px]">
                    No task data available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accountability Alerts */}
      <div data-testid="accountability-widget">
        <AccountabilityWidget />
      </div>

      {/* Bottom Row: Activity, Quick Actions, Deadlines */}
      {showBottomRow && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3" data-testid="bottom-row">
          {/* Recent Activity */}
          {showRecentActivity && (
            <div className={`${showQuickActions ? 'lg:col-span-5' : 'lg:col-span-6'} bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl flex flex-col`}>
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <h6 className="text-sm font-semibold text-[var(--text-secondary)]">Recent Activity</h6>
                <span className="text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full">
                  {recentActivity.length} events
                </span>
              </div>
              <div className="p-4 max-h-[380px] overflow-y-auto flex-1">
                {recentActivity.length > 0 ? (
                  <div className="flex flex-col gap-3.5">
                    {recentActivity.slice(0, 10).map((item, idx) => (
                      <div key={item.id || idx} className="flex gap-3 items-start">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: `${getActivityColor(item.type)}15`,
                            color: getActivityColor(item.type),
                          }}
                        >
                          {getActivityIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-[var(--text-primary)] overflow-hidden text-ellipsis whitespace-nowrap" title={item.title || item.message || item.description || 'Activity'}>
                            {item.title || item.message || item.description || 'Activity'}
                          </div>
                          <div className="text-xs text-[var(--text-muted)] mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                            {item.user && <span className="font-semibold">{typeof item.user === 'string' ? item.user : `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim()} &middot; </span>}
                            {item.time || item.createdAt || item.date || ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-[var(--text-muted)] text-[13px] h-[120px]">
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {showQuickActions && (
            <div className="lg:col-span-3 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl flex flex-col">
              <div className="p-4 border-b border-[var(--border-subtle)]">
                <h6 className="text-sm font-semibold text-[var(--text-secondary)]">Quick Actions</h6>
              </div>
              <div className="p-4 flex-1">
                <div className="flex flex-col gap-2.5">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-left text-[13px] font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-primary)] hover:border-[var(--accent-purple)]/50 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      onClick={() => navigate(action.path)}
                      data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <span style={{ color: action.color }}>{action.icon}</span>
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{action.label}</span>
                      <ArrowRight size={14} className="ml-auto text-[var(--text-muted)] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Deadlines */}
          {showDeadlines && (
            <div className="lg:col-span-4 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl flex flex-col">
              <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <h6 className="text-sm font-semibold text-[var(--text-secondary)]">Upcoming Deadlines</h6>
                <Clock size={16} className="text-[var(--text-muted)]" />
              </div>
              <div className="p-4 max-h-[380px] overflow-y-auto flex-1">
                {deadlines.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {deadlines.slice(0, 8).map((item, idx) => {
                      const dueDate = item.dueDate || item.deadline || item.date || '';
                      const isOverdue = dueDate && new Date(dueDate) < new Date();
                      return (
                        <div
                          key={item.id || idx}
                          className={`flex justify-between items-center p-2.5 px-3 rounded-lg border ${
                            isOverdue
                              ? 'bg-[var(--accent-red)]/8 border-[var(--accent-red)]/20'
                              : 'bg-[var(--bg-elevated)] border-[var(--border-default)]'
                          }`}
                        >
                          <div className="min-w-0 flex-1 mr-2">
                            <div className="text-[13px] font-semibold text-[var(--text-primary)] overflow-hidden text-ellipsis whitespace-nowrap" title={item.title || item.name || 'Untitled'}>
                              {item.title || item.name || 'Untitled'}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                              {item.project || item.type || ''}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isOverdue
                                ? 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {isOverdue ? 'Overdue' : dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-[var(--text-muted)] text-[13px] h-[120px]">
                    No upcoming deadlines
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
