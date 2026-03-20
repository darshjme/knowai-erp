import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Spinner, Alert } from 'react-bootstrap';
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

const STAT_CARD_CONFIG = [
  { key: 'totalTeam', label: 'Total Team', icon: Users, color: '#146DF7', bg: '#EBF3FF', widget: 'team' },
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
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s, box-shadow 0.15s' }} onMouseEnter={e => { if(onClick) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--kai-shadow)'; }}} onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='var(--kai-shadow-sm)'; }}>
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <div className="stat-icon" style={{ background: config.bg, color: config.color }}>
          <Icon />
        </div>
        {delta !== undefined && delta !== null && (
          <span className={`stat-delta ${isUp ? 'up' : 'down'}`}>
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isUp ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <div className="stat-value">{formatValue(value, config.format)}</div>
      <div className="stat-label">{config.label}</div>
    </div>
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

  // Determine column size based on visible card count
  const statColSize = useMemo(() => {
    const count = visibleStatCards.length;
    if (count <= 2) return 6;
    if (count <= 4) return 3;
    return 2;
  }, [visibleStatCards]);

  // Quick actions filtered by role
  const allQuickActions = [
    { label: 'New Project', icon: <FolderKanban size={16} />, path: '/projects', color: '#8B3FE9', widget: 'projects' },
    { label: 'Add Task', icon: <Plus size={16} />, path: '/tasks', color: '#EA580C', widget: 'tasks' },
    { label: 'New Invoice', icon: <FileText size={16} />, path: '/invoices', color: '#16A34A', widget: 'revenue' },
    { label: 'Add Team Member', icon: <UserPlus size={16} />, path: '/team', color: '#146DF7', widget: 'team' },
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

      setRevenueChart(d.revenueChart || d.monthlyRevenue || []);
      setTaskDistribution(d.taskDistribution || d.tasksByStatus || []);
      setRecentActivity(d.recentActivity || d.activity || []);
      setDeadlines(d.upcomingDeadlines || d.deadlines || []);
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
    colors: ['#146DF7'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: revenueChart.length > 0
        ? revenueChart.map((r) => r.month || r.label || r.name || '')
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      labels: { style: { colors: '#5B6B76', fontSize: '12px' } },
    },
    yaxis: {
      labels: {
        style: { colors: '#5B6B76', fontSize: '12px' },
        formatter: (v) => `₹${(v / 1000).toFixed(0)}k`,
      },
    },
    grid: { borderColor: '#E7E7E8', strokeDashArray: 4 },
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
    colors: ['#EA580C', '#146DF7', '#8B3FE9', '#16A34A'],
    labels: taskLabels,
    legend: { position: 'bottom', fontSize: '13px', labels: { colors: '#5B6B76' } },
    dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(0)}%` },
    plotOptions: { pie: { donut: { size: '60%' } } },
    stroke: { width: 2, colors: ['#fff'] },
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
      case 'team': return '#146DF7';
      case 'leave': return '#CB3939';
      default: return '#5B6B76';
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
          <div><h1>Dashboard</h1><p>Welcome back to Know AI ERP</p></div>
        </div>
        <Alert variant="danger" className="d-flex align-items-center gap-2">
          <AlertCircle size={18} />
          <div>
            <strong>Error loading dashboard.</strong> {error}
            <button className="kai-btn kai-btn-outline kai-btn-sm ms-3" onClick={fetchDashboard}>
              Retry
            </button>
          </div>
        </Alert>
      </div>
    );
  }

  // Greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : hour < 21 ? 'Good Evening' : 'Good Night';
  const greetingEmoji = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : hour < 21 ? '🌅' : '🌙';
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

  return (
    <div>
      {/* Greeting Widget */}
      <div style={{
        background: 'linear-gradient(135deg, #146DF7 0%, #0148A7 60%, #05121B 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 100, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, letterSpacing: -0.5 }}>
              {greetingEmoji} {greeting}, {user?.firstName || 'there'}!
            </div>
            <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 12 }}>
              {dateStr}
              <span style={{ margin: '0 8px', opacity: 0.4 }}>|</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{timeStr}</span>
              <span style={{ margin: '0 8px', opacity: 0.4 }}>|</span>
              <span style={{ background: `${roleColor}40`, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{roleLabel}</span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.7, fontStyle: 'italic', maxWidth: 500, lineHeight: 1.5 }}>
              "{todayQuote}"
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div onClick={() => navigate('/tasks')} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 20px', textAlign: 'center', minWidth: 90, backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{todayTasks.length || stats.openTasks || 0}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Today's Tasks</div>
            </div>
            <div onClick={() => navigate('/tasks?view=blocked')} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 20px', textAlign: 'center', minWidth: 90, backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#FCD34D' }}>{backlogTasks.length || 0}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Backlog</div>
            </div>
            <div onClick={() => navigate('/calendar')} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 20px', textAlign: 'center', minWidth: 90, backdropFilter: 'blur(10px)' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#86EFAC' }}>{upcomingTasks.length || 0}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Upcoming</div>
            </div>
          </div>
        </div>
      </div>

      {/* Personality Test Banner */}
      {!personalityBannerDismissed && user && user.personalityTestTaken === false && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '14px 20px',
            background: 'linear-gradient(90deg, #146DF710 0%, #8B3FE910 100%)',
            border: '1px solid #146DF730',
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #146DF7, #8B3FE9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Activity size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#10222F', marginBottom: 2 }}>
              Take your personality assessment!
            </div>
            <div style={{ fontSize: 13, color: '#5B6B76' }}>
              Discover your work style and improve team collaboration.
            </div>
          </div>
          <button
            className="kai-btn kai-btn-primary kai-btn-sm"
            onClick={() => navigate('/personality-test')}
            style={{ flexShrink: 0 }}
          >
            Take Test
          </button>
          <button
            onClick={() => setPersonalityBannerDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: 4,
              fontSize: 18,
              lineHeight: 1,
              flexShrink: 0,
            }}
            title="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {/* Identity Verification Banner */}
      {verificationStatus && !user?.verified && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(20,109,247,0.08), rgba(124,58,237,0.08))',
          border: '1px solid rgba(20,109,247,0.2)',
          borderRadius: 12, padding: '14px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <i className="bi bi-shield-check" style={{ fontSize: 24, color: '#146DF7' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--kai-text)' }}>Verify Your Identity</div>
            <div style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>Upload your government ID and PAN card to get verified</div>
          </div>
          <button onClick={() => navigate('/settings')} style={{
            background: '#146DF7', color: '#fff', border: 'none', borderRadius: 8,
            padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>Verify Now</button>
        </div>
      )}

      {/* Stat Cards */}
      {visibleStatCards.length > 0 && (
        <Row className="g-3 mb-4">
          {visibleStatCards.map((cfg) => (
            <Col key={cfg.key} xs={12} sm={6} lg={4} xl={statColSize}>
              <StatCard
                config={cfg}
                value={stats[cfg.key]}
                delta={stats[`${cfg.key}Delta`]}
                onClick={() => navigate(STAT_NAVIGATE[cfg.key] || '/dashboard')}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Charts Row */}
      {showChartsRow && (
        <Row className="g-3 mb-4">
          {showRevenueChart && (
            <Col xs={12} lg={showTaskDistribution ? 8 : 12}>
              <div className="kai-card">
                <div className="kai-card-header">
                  <h6>Monthly Revenue</h6>
                </div>
                <div className="kai-card-body">
                  {revenueChartSeries[0].data.length > 0 ? (
                    <Chart options={revenueChartOptions} series={revenueChartSeries} type="bar" height={320} />
                  ) : (
                    <div className="flex-center text-muted" style={{ height: 320 }}>
                      No revenue data available
                    </div>
                  )}
                </div>
              </div>
            </Col>
          )}
          {showTaskDistribution && (
            <Col xs={12} lg={showRevenueChart ? 4 : 6}>
              <div className="kai-card">
                <div className="kai-card-header">
                  <h6>Task Distribution</h6>
                </div>
                <div className="kai-card-body">
                  {taskValues.length > 0 && taskValues.some((v) => v > 0) ? (
                    <Chart options={taskDonutOptions} series={taskValues} type="donut" height={320} />
                  ) : (
                    <div className="flex-center text-muted" style={{ height: 320 }}>
                      No task data available
                    </div>
                  )}
                </div>
              </div>
            </Col>
          )}
        </Row>
      )}

      {/* Accountability Alerts */}
      <div style={{ marginBottom: 16 }}>
        <AccountabilityWidget />
      </div>

      {/* Bottom Row: Activity, Quick Actions, Deadlines */}
      {showBottomRow && (
        <Row className="g-3">
          {/* Recent Activity */}
          {showRecentActivity && (
            <Col xs={12} lg={showQuickActions ? 5 : 6}>
              <div className="kai-card" style={{ height: '100%' }}>
                <div className="kai-card-header">
                  <h6>Recent Activity</h6>
                  <span className="kai-badge secondary">{recentActivity.length} events</span>
                </div>
                <div className="kai-card-body" style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {recentActivity.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {recentActivity.slice(0, 10).map((item, idx) => (
                        <div key={item.id || idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: `${getActivityColor(item.type)}15`,
                              color: getActivityColor(item.type),
                              flexShrink: 0,
                            }}
                          >
                            {getActivityIcon(item.type)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--kai-text)' }}>
                              {item.title || item.message || item.description || 'Activity'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', marginTop: 2 }}>
                              {item.user && <span style={{ fontWeight: 600 }}>{item.user} &middot; </span>}
                              {item.time || item.createdAt || item.date || ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted flex-center" style={{ height: 120 }}>
                      No recent activity
                    </div>
                  )}
                </div>
              </div>
            </Col>
          )}

          {/* Quick Actions */}
          {showQuickActions && (
            <Col xs={12} lg={3}>
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
                </div>
              </div>
            </Col>
          )}

          {/* Upcoming Deadlines */}
          {showDeadlines && (
            <Col xs={12} lg={4}>
              <div className="kai-card" style={{ height: '100%' }}>
                <div className="kai-card-header">
                  <h6>Upcoming Deadlines</h6>
                  <Clock size={16} style={{ color: 'var(--kai-text-muted)' }} />
                </div>
                <div className="kai-card-body" style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {deadlines.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {deadlines.slice(0, 8).map((item, idx) => {
                        const dueDate = item.dueDate || item.deadline || item.date || '';
                        const isOverdue = dueDate && new Date(dueDate) < new Date();
                        return (
                          <div
                            key={item.id || idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              background: isOverdue ? '#FEF2F2' : 'var(--kai-bg)',
                              borderRadius: 8,
                              border: `1px solid ${isOverdue ? '#FECACA' : 'var(--kai-border-light)'}`,
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text)' }} className="truncate">
                                {item.title || item.name || 'Untitled'}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', marginTop: 2 }}>
                                {item.project || item.type || ''}
                              </div>
                            </div>
                            <span className={`kai-badge ${isOverdue ? 'danger' : 'warning'}`} style={{ flexShrink: 0 }}>
                              {isOverdue ? 'Overdue' : dueDate ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-muted flex-center" style={{ height: 120 }}>
                      No upcoming deadlines
                    </div>
                  )}
                </div>
              </div>
            </Col>
          )}
        </Row>
      )}
    </div>
  );
}
