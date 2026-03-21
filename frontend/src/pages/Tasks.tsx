import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Plus,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  CheckSquare,
  Clock,
  AlertTriangle,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Flag,
  Link2,
  ListTodo,
  User,
  X,
  Loader2,
} from 'lucide-react';
import { tasksApi, projectsApi, teamApi } from '../services/api';
import EmptyState from '../components/ui/EmptyState';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'BLOCKED', label: 'Blocked' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const KANBAN_COLUMNS = [
  { key: 'TODO', label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'IN_REVIEW', label: 'Review' },
  { key: 'COMPLETED', label: 'Done' },
];

const TAG_COLORS: Record<string, string> = {
  CONTENT_REVIEW: 'bg-accent-blue/15 text-accent-blue',
  BUG: 'bg-accent-red/15 text-accent-red',
  FEATURE: 'bg-accent-purple/15 text-accent-purple',
  IMPROVEMENT: 'bg-accent-green/15 text-accent-green',
  REGULAR: 'bg-bg-elevated text-text-secondary',
  LOW: 'bg-bg-elevated text-text-secondary',
  MEDIUM: 'bg-accent-blue/15 text-accent-blue',
  HIGH: 'bg-accent-amber/15 text-accent-amber',
  URGENT: 'bg-accent-red/15 text-accent-red',
};

const PAGE_SIZE = 20;

const AVATAR_COLORS = [
  '#111827', '#8B3FE9', '#16A34A', '#EA580C', '#CB3939',
  '#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626',
];

function getInitials(name: string) {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dateStr: string | null | undefined) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();
}

export default function Tasks() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s: any) => s.auth.user);

  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    assignee_id: '',
    collaborators: [] as string[],
    priority: 'MEDIUM',
    status: 'TODO',
    due_date: '',
    taskType: 'REGULAR',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Tasks' });
  }, [dispatch]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = { page, limit: PAGE_SIZE };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await tasksApi.list(params);
      const data = res.data;
      if (Array.isArray(data)) {
        setTasks(data);
        setTotalCount(data.length);
      } else {
        setTasks(data?.tasks || []);
        setTotalCount(data?.total || data?.count || data?.tasks?.length || 0);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tasks');
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, priorityFilter]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await projectsApi.list();
      setProjects(Array.isArray(res.data) ? res.data : res.data?.projects || []);
    } catch {
      // non-critical
    }
  }, []);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await teamApi.list();
      setTeamMembers(Array.isArray(res.data) ? res.data : res.data?.members || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchProjects();
    fetchTeam();
  }, [fetchProjects, fetchTeam]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.warning('Task title is required');
    if (!formData.project_id) return toast.warning('Project is required');
    if (!formData.assignee_id) return toast.warning('Assignee is required');
    if (!formData.due_date) return toast.warning('Due date is required');
    try {
      setCreating(true);
      const payload = {
        title: formData.title,
        description: formData.description,
        projectId: formData.project_id,
        assigneeId: formData.assignee_id,
        collaborators: formData.collaborators,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.due_date,
        taskType: formData.taskType,
      };
      await tasksApi.create(payload);
      toast.success('Task created successfully');
      setShowCreateModal(false);
      setFormData({ title: '', description: '', project_id: '', assignee_id: '', collaborators: [], priority: 'MEDIUM', status: 'TODO', due_date: '', taskType: 'REGULAR' });
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksApi.delete(id);
      toast.success('Task deleted');
      setSelectedTasks(prev => prev.filter(sid => sid !== id));
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleSelectTask = (id: string) => {
    setSelectedTasks(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleBulkComplete = async () => {
    if (selectedTasks.length === 0) return;
    setBulkProcessing(true);
    try {
      await tasksApi.bulkUpdate(selectedTasks, { status: 'COMPLETED' });
      toast.success(`Marked ${selectedTasks.length} tasks as completed`);
      setSelectedTasks([]);
      fetchTasks();
    } catch {
      toast.error('Bulk complete failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    if (!window.confirm(`Delete ${selectedTasks.length} selected tasks? This cannot be undone.`)) return;
    setBulkProcessing(true);
    try {
      await tasksApi.bulkDelete(selectedTasks);
      toast.success(`Deleted ${selectedTasks.length} tasks`);
      setSelectedTasks([]);
      fetchTasks();
    } catch {
      toast.error('Bulk delete failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Group tasks by status for kanban columns
  const columnTasks = useMemo(() => {
    const grouped: Record<string, any[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      COMPLETED: [],
    };
    tasks.forEach(task => {
      const status = task.status || 'TODO';
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        // Map BLOCKED to TODO column
        grouped.TODO.push(task);
      }
    });
    return grouped;
  }, [tasks]);

  const getAssigneeName = (task: any) => {
    const assignee = task.assignee;
    return assignee ? `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() : task.assignee_name || '';
  };

  const getProjectName = (task: any) => {
    return task.project?.name || task.project_name || '';
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[18px] font-semibold font-heading text-text-primary m-0">Tasks</h1>
          <span className="bg-bg-elevated rounded-full px-2.5 py-0.5 text-[13px] text-text-secondary font-medium">
            {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 border border-border-default rounded-lg px-3 py-2 text-[13px] font-medium text-text-secondary bg-transparent hover:bg-bg-elevated transition-colors"
          >
            <Filter size={14} />
            Filters
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#6D28D9] transition-colors border-0"
          >
            <Plus size={14} />
            New Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="relative min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTasks()}
              className="w-full pl-9 pr-3 py-2 bg-bg-elevated border border-border-default rounded-lg text-[13px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-[13px] text-text-secondary outline-none focus:border-accent-purple transition-colors appearance-auto"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-[13px] text-text-secondary outline-none focus:border-accent-purple transition-colors appearance-auto"
          >
            {PRIORITY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedTasks.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-bg-card/90 backdrop-blur-xl border border-border-default rounded-2xl shadow-modal px-6 py-3 flex items-center gap-4 min-w-[360px]">
          <span className="text-[13px] font-bold text-text-primary whitespace-nowrap">
            {selectedTasks.length} selected
          </span>
          <div className="w-px h-6 bg-border-default" />
          <button
            disabled={bulkProcessing}
            onClick={handleBulkComplete}
            className="flex items-center gap-1.5 bg-accent-green/15 text-accent-green border-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-accent-green/25 transition-colors disabled:opacity-50"
          >
            {bulkProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Mark Complete
          </button>
          <button
            disabled={bulkProcessing}
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 bg-accent-red/15 text-accent-red border-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-accent-red/25 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            onClick={() => setSelectedTasks([])}
            className="flex items-center gap-1.5 border border-border-default bg-transparent text-text-secondary rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-bg-elevated transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-accent-purple" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-bg-card border border-border-default rounded-xl flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-accent-red text-[13px] m-0">{error}</p>
          <button
            onClick={fetchTasks}
            className="border border-border-default bg-transparent text-text-secondary rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-bg-elevated transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tasks.length === 0 && (
        <div className="bg-bg-card border border-border-default rounded-xl p-6">
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet"
            description="Create your first task to get started"
            actionLabel="New Task"
            onAction={() => setShowCreateModal(true)}
          />
        </div>
      )}

      {/* Kanban Board */}
      {!loading && !error && tasks.length > 0 && (
        <div className="flex gap-3 overflow-x-auto items-start pb-4" data-testid="kanban-board">
          {KANBAN_COLUMNS.map(col => {
            const colTasks = columnTasks[col.key] || [];
            const isDoneColumn = col.key === 'COMPLETED';

            return (
              <div
                key={col.key}
                className="min-w-[240px] flex-shrink-0 flex-1"
                data-testid={`column-${col.key.toLowerCase()}`}
              >
                {/* Column Header */}
                <div className="flex items-center gap-2 py-2 mb-1">
                  <span className="text-[12px] font-medium text-text-secondary">{col.label}</span>
                  <span className="bg-bg-elevated rounded-full px-2 py-0.5 text-[10px] text-text-muted font-medium">
                    {colTasks.length}
                  </span>
                </div>

                {/* Task Cards */}
                <div className="flex flex-col">
                  {colTasks.map(task => {
                    const assigneeName = getAssigneeName(task);
                    const projectName = getProjectName(task);
                    const dueDate = task.dueDate || task.due_date;
                    const overdue = isOverdue(dueDate) && task.status !== 'COMPLETED';
                    const taskType = task.taskType || 'REGULAR';
                    const priority = task.priority || 'MEDIUM';
                    const projectId = task.projectId || task.project_id || task.project?.id;

                    return (
                      <div
                        key={task.id}
                        data-testid={`task-card-${task.id}`}
                        className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3 mb-2 cursor-pointer hover:border-accent-purple/40 transition-colors group ${isDoneColumn ? 'opacity-60' : ''}`}
                        onClick={() => projectId && navigate(`/projects/${projectId}`)}
                      >
                        {/* Title */}
                        <div
                          className={`text-[13px] font-medium text-text-primary mb-1.5 truncate ${isDoneColumn ? 'line-through' : ''}`}
                          title={task.title}
                        >
                          {task.title}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1">
                          {taskType !== 'REGULAR' && (
                            <span className={`text-[10px] rounded px-1.5 py-0.5 ${TAG_COLORS[taskType] || TAG_COLORS.REGULAR}`}>
                              {taskType.replace('_', ' ')}
                            </span>
                          )}
                          <span className={`text-[10px] rounded px-1.5 py-0.5 ${TAG_COLORS[priority] || TAG_COLORS.MEDIUM}`}>
                            {priority}
                          </span>
                          {overdue && (
                            <span className="text-[10px] rounded px-1.5 py-0.5 bg-accent-red/15 text-accent-red">
                              Overdue
                            </span>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center mt-2">
                          {assigneeName ? (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold text-white flex-shrink-0"
                              style={{ backgroundColor: getAvatarColor(assigneeName) }}
                              title={assigneeName}
                            >
                              {getInitials(assigneeName)}
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-bg-elevated flex items-center justify-center">
                              <User size={10} className="text-text-muted" />
                            </div>
                          )}
                          <span className={`text-[10px] ${overdue ? 'text-accent-red font-medium' : 'text-text-muted'}`}>
                            {dueDate ? formatDate(dueDate) : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Task Button */}
                  <div
                    className="border border-dashed border-border-default rounded-xl p-3 flex items-center justify-center cursor-pointer hover:border-[#7C3AED]/40 transition-colors group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData(prev => ({ ...prev, status: col.key === 'COMPLETED' ? 'COMPLETED' : col.key === 'IN_REVIEW' ? 'IN_REVIEW' : col.key === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'TODO' }));
                      setShowCreateModal(true);
                    }}
                  >
                    <span className="text-[12px] text-text-muted group-hover:text-accent-purple transition-colors">+ Add task</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowCreateModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-bg-card border border-border-default rounded-xl w-full max-w-2xl mx-4 shadow-modal max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreate}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
                <h2 className="text-[18px] font-bold text-text-primary m-0 font-heading">Add New Task</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-text-muted hover:text-text-primary transition-colors bg-transparent border-0 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 grid grid-cols-12 gap-3">
                {/* Title */}
                <div className="col-span-12">
                  <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Title *</label>
                  <input
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple transition-colors"
                    placeholder="Enter task title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                {/* Description */}
                <div className="col-span-12">
                  <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple transition-colors resize-y"
                    placeholder="Describe the task..."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Project */}
                <div className="col-span-12 md:col-span-6">
                  <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Project *</label>
                  <select
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent-purple transition-colors appearance-auto"
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Assignee */}
                <div className="col-span-12 md:col-span-6">
                  <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Primary Assignee *</label>
                  <select
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent-purple transition-colors appearance-auto"
                    value={formData.assignee_id}
                    onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                    required
                  >
                    <option value="">Select Assignee</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name || m.full_name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email}</option>
                    ))}
                  </select>
                </div>

                {/* Collaborators */}
                <div className="col-span-12">
                  <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Team Members (Collaborators)</label>
                  <div className="max-h-[140px] overflow-y-auto border border-border-default rounded-lg p-2 bg-bg-elevated">
                    {teamMembers.filter(m => m.id !== formData.assignee_id).map(m => {
                      const mName = m.name || m.full_name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email;
                      return (
                        <label key={m.id} className="flex items-center gap-2 py-1 cursor-pointer text-[13px] text-text-primary">
                          <input
                            type="checkbox"
                            checked={formData.collaborators.includes(m.id)}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              collaborators: e.target.checked ? [...prev.collaborators, m.id] : prev.collaborators.filter(x => x !== m.id)
                            }))}
                            className="accent-accent-purple"
                          />
                          <span>{mName}</span>
                          {m.role && <span className="text-[10px] text-text-muted ml-auto">{m.role}</span>}
                        </label>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-text-muted mt-1 block">{formData.collaborators.length} member(s) selected</span>
                </div>

                {/* Priority */}
                <div className="col-span-12 md:col-span-4">
                  <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent-purple transition-colors appearance-auto"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                {/* Status */}
                <div className="col-span-12 md:col-span-4">
                  <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent-purple transition-colors appearance-auto"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="TODO">Todo</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                {/* Deadline */}
                <div className="col-span-12 md:col-span-4">
                  <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Deadline *</label>
                  <input
                    type="date"
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent-purple transition-colors"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                </div>

                {/* Task Type */}
                <div className="col-span-12 md:col-span-4">
                  <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Task Type</label>
                  <select
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-[13px] text-text-primary outline-none focus:border-accent-purple transition-colors appearance-auto"
                    value={formData.taskType || 'REGULAR'}
                    onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                  >
                    <option value="REGULAR">Regular Task</option>
                    <option value="CONTENT_REVIEW">Content Review</option>
                    <option value="BUG">Bug Fix</option>
                    <option value="FEATURE">Feature</option>
                    <option value="IMPROVEMENT">Improvement</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="border border-border-default bg-transparent text-text-secondary rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-bg-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-1.5 bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#6D28D9] transition-colors border-0 disabled:opacity-50"
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
