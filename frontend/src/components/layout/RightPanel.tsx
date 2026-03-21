import { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ListChecks,
  FolderKanban,
  UserPlus,
  CreditCard,
  ShieldAlert,
  Brain,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { RootState } from '../../store/store';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

interface QuickAction {
  label: string;
  icon: typeof ListChecks;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'New Task', icon: ListChecks, color: '#3B82F6' },
  { label: 'New Project', icon: FolderKanban, color: '#10B981' },
  { label: 'Add Member', icon: UserPlus, color: '#F59E0B' },
  { label: 'Log Expense', icon: CreditCard, color: '#EF4444' },
];

interface Alert {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  color: 'amber' | 'blue';
  icon: typeof ShieldAlert;
}

const ALERTS: Alert[] = [
  {
    id: 'verify',
    title: 'Verify Identity',
    subtitle: 'Complete your KYC verification',
    cta: 'Verify now',
    color: 'amber',
    icon: ShieldAlert,
  },
  {
    id: 'personality',
    title: 'Personality Test',
    subtitle: 'Take the team culture assessment',
    cta: 'Start test',
    color: 'blue',
    icon: Brain,
  },
];

interface Task {
  id: string;
  text: string;
  priority: 'High' | 'Med' | 'Low';
}

const UPCOMING_TASKS: Task[] = [
  { id: '1', text: 'Review quarterly budget proposal', priority: 'High' },
  { id: '2', text: 'Update onboarding checklist', priority: 'Med' },
  { id: '3', text: 'Schedule 1:1 with design team', priority: 'Low' },
];

const PRIORITY_COLORS: Record<string, string> = {
  High: '#EF4444',
  Med: '#F59E0B',
  Low: '#3B82F6',
};

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------

function getCurrentWeek(): { label: string; day: number; isToday: boolean; hasEvent: boolean }[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const eventDays = new Set([monday.getDate() + 2, monday.getDate() + 4]); // mock events

  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label,
      day: d.getDate(),
      isToday: d.toDateString() === now.toDateString(),
      hasEvent: eventDays.has(d.getDate()),
    };
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2 font-medium">
      {children}
    </h3>
  );
}

function QuickActionsBlock() {
  return (
    <div>
      <SectionTitle>Quick actions</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg p-2.5 text-center hover:bg-[var(--bg-primary)] hover:border-[#7C3AED]/50 transition-all duration-200 cursor-pointer"
            >
              <Icon size={18} color={action.color} className="mx-auto mb-1" />
              <span className="text-[10px] text-[var(--text-secondary)] block leading-tight">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AlertsBlock() {
  return (
    <div>
      <SectionTitle>Alerts</SectionTitle>
      <div className="flex flex-col gap-2">
        {ALERTS.map((alert) => {
          const Icon = alert.icon;
          const iconBg = alert.color === 'amber' ? 'bg-[#F59E0B]/15' : 'bg-[#3B82F6]/15';
          const iconColor = alert.color === 'amber' ? '#F59E0B' : '#3B82F6';
          return (
            <div
              key={alert.id}
              className="bg-[var(--bg-elevated)] rounded-lg p-2.5 flex gap-2.5 relative"
            >
              <div
                className={`w-7 h-7 min-w-[28px] rounded-full ${iconBg} flex items-center justify-center`}
              >
                <Icon size={14} color={iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[var(--text-primary)] leading-tight">
                  {alert.title}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">
                  {alert.subtitle}
                </p>
                <a
                  href="#"
                  className="text-[10px] text-[#3B82F6] underline mt-1 inline-block"
                  onClick={(e) => e.preventDefault()}
                >
                  {alert.cta}
                </a>
              </div>
              <button
                className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                aria-label={`Dismiss ${alert.title}`}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingTasksBlock() {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <SectionTitle>Upcoming tasks</SectionTitle>
        <button className="text-[10px] text-[#3B82F6] hover:underline cursor-pointer">
          See all
        </button>
      </div>
      <div className="flex flex-col">
        {UPCOMING_TASKS.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 py-2 border-b border-[var(--border-subtle)] last:border-0"
          >
            <span
              className="w-2 h-2 min-w-[8px] rounded-full"
              style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
            />
            <span
              className="text-[12px] text-[var(--text-primary)] truncate flex-1"
              title={task.text}
            >
              {task.text}
            </span>
            <span
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap"
              style={{
                backgroundColor: `${PRIORITY_COLORS[task.priority]}20`,
                color: PRIORITY_COLORS[task.priority],
              }}
            >
              {task.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniCalendarBlock() {
  const week = useMemo(() => getCurrentWeek(), []);

  return (
    <div>
      <SectionTitle>Calendar</SectionTitle>
      <div className="grid grid-cols-7 gap-1">
        {week.map((d) => (
          <div key={d.label} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-[var(--text-muted)]">{d.label}</span>
            <div
              className={`w-7 h-7 flex flex-col items-center justify-center rounded-md text-[11px] ${
                d.isToday
                  ? 'bg-[#7C3AED] text-white font-semibold'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              {d.day}
            </div>
            {d.hasEvent && (
              <span className="w-1 h-1 rounded-full bg-[#3B82F6]" />
            )}
            {!d.hasEvent && <span className="w-1 h-1" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RightPanel() {
  const dispatch = useDispatch();
  const collapsed = useSelector((s: RootState) => s.ui.rightPanelCollapsed);
  const { pathname } = useLocation();

  // Settings page: fully hidden
  if (pathname.startsWith('/settings')) {
    return null;
  }

  const isDashboard = pathname === '/dashboard' || pathname === '/';

  const toggle = () => dispatch({ type: 'UI_TOGGLE_RIGHT_PANEL' });

  return (
    <div className="relative flex-shrink-0 hidden lg:flex">
      {/* Toggle button */}
      <button
        onClick={toggle}
        className="absolute top-3 -left-3 z-10 w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#7C3AED]/50 transition-all cursor-pointer shadow-sm"
        aria-label={collapsed ? 'Expand right panel' : 'Collapse right panel'}
      >
        {collapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.aside
            key="right-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="h-[calc(100vh-56px)] sticky top-0 overflow-hidden border-l border-[var(--border-default)] bg-[var(--bg-card)]"
          >
            <div className="w-[280px] h-full overflow-y-auto p-4 flex flex-col gap-3">
              <QuickActionsBlock />

              {isDashboard && (
                <>
                  <AlertsBlock />
                  <UpcomingTasksBlock />
                  <MiniCalendarBlock />
                </>
              )}

              {!isDashboard && <UpcomingTasksBlock />}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
