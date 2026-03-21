import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Users,
  CalendarDays,
  Settings,
  BarChart3,
  Receipt,
  CreditCard,
  MessageCircle,
  Mail,
  Clock,
  Target,
  FileText,
  Briefcase,
  UserPlus,
  DollarSign,
  Film,
  Layers,
  Shield,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResultItem {
  id: string;
  name: string;
  type: 'page' | 'task' | 'project' | 'person';
  icon: LucideIcon;
  path?: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_RESULTS: ResultItem[] = [
  // Pages
  { id: 'p-dashboard', name: 'Dashboard', type: 'page', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'p-analytics', name: 'Analytics', type: 'page', icon: BarChart3, path: '/analytics' },
  { id: 'p-projects', name: 'Projects', type: 'page', icon: FolderKanban, path: '/projects' },
  { id: 'p-tasks', name: 'Tasks', type: 'page', icon: ListChecks, path: '/tasks' },
  { id: 'p-calendar', name: 'Calendar', type: 'page', icon: CalendarDays, path: '/calendar' },
  { id: 'p-time', name: 'Time Tracking', type: 'page', icon: Clock, path: '/time-tracking' },
  { id: 'p-goals', name: 'Goals', type: 'page', icon: Target, path: '/goals' },
  { id: 'p-docs', name: 'Docs', type: 'page', icon: FileText, path: '/docs' },
  { id: 'p-reviews', name: 'Content Reviews', type: 'page', icon: Film, path: '/video-reviews' },
  { id: 'p-workspace', name: 'Content Workspace', type: 'page', icon: Layers, path: '/content-workspace' },
  { id: 'p-team', name: 'Team', type: 'page', icon: Users, path: '/team' },
  { id: 'p-hr', name: 'HR Dashboard', type: 'page', icon: Briefcase, path: '/hr-dashboard' },
  { id: 'p-payroll', name: 'Payroll', type: 'page', icon: DollarSign, path: '/payroll' },
  { id: 'p-hiring', name: 'Hiring', type: 'page', icon: UserPlus, path: '/hiring' },
  { id: 'p-clients', name: 'Clients', type: 'page', icon: Users, path: '/clients' },
  { id: 'p-invoices', name: 'Invoices', type: 'page', icon: Receipt, path: '/invoices' },
  { id: 'p-expenses', name: 'Expenses', type: 'page', icon: CreditCard, path: '/expenses' },
  { id: 'p-chat', name: 'Chat', type: 'page', icon: MessageCircle, path: '/chat' },
  { id: 'p-email', name: 'Email', type: 'page', icon: Mail, path: '/email' },
  { id: 'p-admin', name: 'Admin Panel', type: 'page', icon: Shield, path: '/admin' },
  { id: 'p-settings', name: 'Settings', type: 'page', icon: Settings, path: '/settings' },
  // Tasks
  { id: 't-1', name: 'Review quarterly budget proposal', type: 'task', icon: ListChecks, path: '/tasks' },
  { id: 't-2', name: 'Update onboarding checklist', type: 'task', icon: ListChecks, path: '/tasks' },
  { id: 't-3', name: 'Design system audit', type: 'task', icon: ListChecks, path: '/tasks' },
  // Projects
  { id: 'pr-1', name: 'Website Redesign', type: 'project', icon: FolderKanban, path: '/projects' },
  { id: 'pr-2', name: 'Mobile App v2', type: 'project', icon: FolderKanban, path: '/projects' },
  { id: 'pr-3', name: 'Q1 Marketing Campaign', type: 'project', icon: FolderKanban, path: '/projects' },
  // People
  { id: 'pe-1', name: 'Darsh Joshi', type: 'person', icon: Users, path: '/team' },
  { id: 'pe-2', name: 'Priya Sharma', type: 'person', icon: Users, path: '/team' },
  { id: 'pe-3', name: 'Arjun Mehta', type: 'person', icon: Users, path: '/team' },
];

const TYPE_LABELS: Record<ResultItem['type'], string> = {
  page: 'Pages',
  task: 'Tasks',
  project: 'Projects',
  person: 'People',
};

const TYPE_ORDER: ResultItem['type'][] = ['page', 'task', 'project', 'person'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Filter results
  const filtered = useMemo(() => {
    if (!query.trim()) return MOCK_RESULTS;
    const q = query.toLowerCase();
    return MOCK_RESULTS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
    );
  }, [query]);

  // Group results by type
  const grouped = useMemo(() => {
    const groups: { type: ResultItem['type']; label: string; items: ResultItem[] }[] = [];
    for (const type of TYPE_ORDER) {
      const items = filtered.filter((r) => r.type === type);
      if (items.length > 0) {
        groups.push({ type, label: TYPE_LABELS[type], items });
      }
    }
    return groups;
  }, [filtered]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  const selectItem = useCallback(
    (item: ResultItem) => {
      if (item.path) {
        navigate(item.path);
      }
      setOpen(false);
    },
    [navigate]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(flatItems.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev <= 0 ? Math.max(flatItems.length - 1, 0) : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          selectItem(flatItems[selectedIndex]);
        }
      }
    },
    [flatItems, selectedIndex, selectItem]
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]');
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Track cumulative index across groups
  let cumulativeIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          static
          open={open}
          onClose={() => setOpen(false)}
          className="relative z-50"
        >
          {/* Overlay */}
          <DialogBackdrop className="fixed inset-0 bg-[var(--bg-primary)]/80" />

          {/* Dialog panel */}
          <div className="fixed inset-0 flex items-start justify-center pt-[15vh]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-[560px]"
            >
            <DialogPanel
              className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-modal overflow-hidden"
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
                <Search size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, tasks, projects, people..."
                  className="w-full bg-transparent text-[var(--text-primary)] text-base placeholder-[var(--text-muted)] outline-none"
                  autoFocus
                />
                <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded flex-shrink-0 select-none">
                  ESC
                </span>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="max-h-[360px] overflow-y-auto py-2"
              >
                {flatItems.length === 0 && query.trim() !== '' && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[13px] text-[var(--text-muted)]">
                      No results for &lsquo;{query}&rsquo;
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Try a different search term
                    </p>
                  </div>
                )}

                {grouped.map((group) => {
                  const startIndex = cumulativeIndex;
                  const groupItems = group.items.map((item, i) => {
                    const globalIdx = startIndex + i;
                    const isSelected = globalIdx === selectedIndex;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        data-selected={isSelected}
                        onClick={() => selectItem(item)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#7C3AED]/10'
                            : 'hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        <Icon size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                        <span className="text-[13px] text-[var(--text-primary)] truncate flex-1 text-left">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 capitalize">
                          {item.type}
                        </span>
                      </button>
                    );
                  });
                  cumulativeIndex += group.items.length;

                  return (
                    <div key={group.type} className="mb-1">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium px-4 py-1.5">
                        {group.label}
                      </p>
                      {groupItems}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="border-t border-[var(--border-subtle)] px-4 py-2 flex items-center gap-3">
                <span className="text-[10px] text-[var(--text-muted)]">
                  <kbd className="font-mono">↑↓</kbd> Navigate
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">·</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  <kbd className="font-mono">↩</kbd> Open
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">·</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  <kbd className="font-mono">esc</kbd> Close
                </span>
              </div>
            </DialogPanel>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
