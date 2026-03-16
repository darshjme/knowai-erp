import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  Plus,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
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
} from 'lucide-react';
import { tasksApi, projectsApi, teamApi } from '../services/api';

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

const STATUS_BADGE = {
  TODO: { bg: '#e3e7ed', color: '#596882' },
  IN_PROGRESS: { bg: '#cce5ff', color: '#004085' },
  IN_REVIEW: { bg: '#fff3cd', color: '#856404' },
  COMPLETED: { bg: '#d4edda', color: '#155724' },
  BLOCKED: { bg: '#f8d7da', color: '#721c24' },
};

const PRIORITY_BADGE = {
  LOW: { bg: '#e3e7ed', color: '#596882' },
  MEDIUM: { bg: '#cce5ff', color: '#004085' },
  HIGH: { bg: '#fff3cd', color: '#856404' },
  URGENT: { bg: '#f8d7da', color: '#721c24' },
};

const FILTER_TABS = [
  { key: 'ALL', label: 'All Tasks' },
  { key: 'MY', label: 'My Tasks' },
  { key: 'TEAM', label: 'Team' },
  { key: 'BLOCKED', label: 'Blocked' },
];

const PAGE_SIZE = 20;

const AVATAR_COLORS = [
  '#146DF7', '#8B3FE9', '#16A34A', '#EA580C', '#CB3939',
  '#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626',
];

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();
}

export default function Tasks() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    assignee_id: '',
    priority: 'MEDIUM',
    status: 'TODO',
    due_date: '',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Tasks' });
  }, [dispatch]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: PAGE_SIZE };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (activeFilter === 'MY' && user?.id) params.assignee_id = user.id;
      if (activeFilter === 'BLOCKED') params.status = 'BLOCKED';
      const res = await tasksApi.list(params);
      const data = res.data;
      if (Array.isArray(data)) {
        setTasks(data);
        setTotalCount(data.length);
      } else {
        setTasks(data?.tasks || []);
        setTotalCount(data?.total || data?.count || data?.tasks?.length || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks');
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, priorityFilter, activeFilter, user]);

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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.warning('Task title is required');
      return;
    }
    try {
      setCreating(true);
      await tasksApi.create(formData);
      toast.success('Task created successfully');
      setShowCreateModal(false);
      setFormData({ title: '', description: '', project_id: '', assignee_id: '', priority: 'MEDIUM', status: 'TODO', due_date: '' });
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksApi.delete(id);
      toast.success('Task deleted');
      setSelectedTasks(prev => prev.filter(sid => sid !== id));
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksApi.update(taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(t => t.id));
    }
  };

  const handleSelectTask = (id) => {
    setSelectedTasks(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedTasks.length === 0) return;
    setBulkProcessing(true);
    try {
      if (bulkAction.startsWith('status:')) {
        const newStatus = bulkAction.split(':')[1];
        await Promise.all(selectedTasks.map(id => tasksApi.update(id, { status: newStatus })));
        toast.success(`Updated ${selectedTasks.length} tasks`);
      } else if (bulkAction.startsWith('assign:')) {
        const assigneeId = bulkAction.split(':')[1];
        await Promise.all(selectedTasks.map(id => tasksApi.update(id, { assignee_id: assigneeId })));
        toast.success(`Assigned ${selectedTasks.length} tasks`);
      }
      setSelectedTasks([]);
      setBulkAction('');
      fetchTasks();
    } catch {
      toast.error('Bulk action failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const stats = {
    total: totalCount || tasks.length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    overdue: tasks.filter(t => isOverdue(t.due_date) && t.status !== 'COMPLETED').length,
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p>Track and manage all tasks across projects</p>
        </div>
        <div className="page-actions">
          <button className="kai-btn kai-btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus /> New Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <div className="stat-card">
            <div className="flex-between mb-2">
              <div className="stat-icon" style={{ background: 'rgba(20,109,247,0.1)', color: 'var(--kai-primary)' }}>
                <ListTodo />
              </div>
            </div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="stat-card">
            <div className="flex-between mb-2">
              <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--kai-info)' }}>
                <Clock />
              </div>
            </div>
            <div className="stat-value">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="stat-card">
            <div className="flex-between mb-2">
              <div className="stat-icon" style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--kai-success)' }}>
                <CheckCircle2 />
              </div>
            </div>
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="stat-card">
            <div className="flex-between mb-2">
              <div className="stat-icon" style={{ background: 'rgba(203,57,57,0.1)', color: 'var(--kai-danger)' }}>
                <AlertTriangle />
              </div>
            </div>
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </Col>
      </Row>

      {/* Filter Tabs + Search + Dropdowns */}
      <div className="kai-card mb-4">
        <div className="kai-card-body" style={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 4 }}>
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`kai-btn kai-btn-sm ${activeFilter === tab.key ? 'kai-btn-primary' : 'kai-btn-outline'}`}
                  onClick={() => { setActiveFilter(tab.key); setPage(1); }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filters Row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="kai-search" style={{ minWidth: 200 }}>
                <Search />
                <input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchTasks()}
                />
              </div>
              <select
                className="kai-input"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                style={{ appearance: 'auto', width: 'auto', minWidth: 140 }}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                className="kai-input"
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                style={{ appearance: 'auto', width: 'auto', minWidth: 140 }}
              >
                {PRIORITY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedTasks.length > 0 && (
        <div className="kai-card mb-3" style={{ borderColor: 'var(--kai-primary)' }}>
          <div className="kai-card-body" style={{ padding: '10px 20px' }}>
            <div className="flex-between">
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex-gap-8">
                <select
                  className="kai-input"
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  style={{ appearance: 'auto', width: 'auto', minWidth: 180 }}
                >
                  <option value="">Choose action...</option>
                  <optgroup label="Change Status">
                    <option value="status:TODO">Set to Todo</option>
                    <option value="status:IN_PROGRESS">Set to In Progress</option>
                    <option value="status:IN_REVIEW">Set to In Review</option>
                    <option value="status:COMPLETED">Set to Completed</option>
                  </optgroup>
                  <optgroup label="Assign To">
                    {teamMembers.map(m => (
                      <option key={m.id} value={`assign:${m.id}`}>
                        {m.name || m.full_name || m.email}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <button
                  className="kai-btn kai-btn-primary kai-btn-sm"
                  disabled={!bulkAction || bulkProcessing}
                  onClick={handleBulkAction}
                >
                  {bulkProcessing ? <Spinner animation="border" size="sm" /> : 'Apply'}
                </button>
                <button
                  className="kai-btn kai-btn-outline kai-btn-sm"
                  onClick={() => setSelectedTasks([])}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex-center" style={{ padding: 60 }}>
          <Spinner animation="border" style={{ color: 'var(--kai-primary)' }} />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="kai-card">
          <div className="kai-card-body flex-center" style={{ padding: 60, flexDirection: 'column', gap: 12 }}>
            <p style={{ color: 'var(--kai-danger)', margin: 0 }}>{error}</p>
            <button className="kai-btn kai-btn-outline" onClick={fetchTasks}>Try Again</button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tasks.length === 0 && (
        <div className="kai-card">
          <div className="kai-card-body flex-center" style={{ padding: 60, flexDirection: 'column', gap: 12 }}>
            <ListTodo size={48} style={{ color: 'var(--kai-text-muted)' }} />
            <p style={{ color: 'var(--kai-text-muted)', margin: 0 }}>No tasks found</p>
            <button className="kai-btn kai-btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus /> Create Your First Task
            </button>
          </div>
        </div>
      )}

      {/* Task Table */}
      {!loading && !error && tasks.length > 0 && (
        <div className="kai-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="kai-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedTasks.length === tasks.length && tasks.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Assignee</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const assigneeName = task.assignee_name || task.assignee?.name || '';
                  const projectName = task.project_name || task.project?.name || '';
                  const overdue = isOverdue(task.due_date) && task.status !== 'COMPLETED';
                  const hasBlocker = task.blocked_by || task.dependencies?.length > 0 || task.status === 'BLOCKED';

                  return (
                    <tr key={task.id}>
                      {/* Checkbox */}
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => handleSelectTask(task.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Title */}
                      <td>
                        <div className="flex-gap-8">
                          {hasBlocker && (
                            <Link2 size={14} style={{ color: 'var(--kai-danger)', flexShrink: 0 }} title="Has dependencies / Blocked" />
                          )}
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{task.title}</span>
                        </div>
                      </td>

                      {/* Project */}
                      <td>
                        {projectName ? (
                          <span
                            style={{ fontSize: 12, color: 'var(--kai-primary)', cursor: 'pointer', fontWeight: 500 }}
                            onClick={() => task.project_id && navigate(`/projects/${task.project_id}`)}
                          >
                            {projectName}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>--</span>
                        )}
                      </td>

                      {/* Assignee */}
                      <td>
                        {assigneeName ? (
                          <div className="flex-gap-8">
                            <div
                              className="kai-avatar kai-avatar-sm"
                              style={{ background: getAvatarColor(assigneeName), width: 24, height: 24, fontSize: 10 }}
                            >
                              {getInitials(assigneeName)}
                            </div>
                            <span style={{ fontSize: 13 }}>{assigneeName}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <select
                          className="kai-badge"
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          style={{
                            background: STATUS_BADGE[task.status]?.bg || '#e3e7ed',
                            color: STATUS_BADGE[task.status]?.color || '#596882',
                            border: 'none',
                            cursor: 'pointer',
                            appearance: 'auto',
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 'var(--kai-radius-pill)',
                          }}
                        >
                          <option value="TODO">Todo</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="IN_REVIEW">In Review</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="BLOCKED">Blocked</option>
                        </select>
                      </td>

                      {/* Priority */}
                      <td>
                        <span
                          className="kai-badge"
                          style={{
                            background: PRIORITY_BADGE[task.priority]?.bg || '#e3e7ed',
                            color: PRIORITY_BADGE[task.priority]?.color || '#596882',
                          }}
                        >
                          <Flag size={10} />
                          {task.priority || 'MEDIUM'}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td>
                        <span
                          className="flex-gap-8"
                          style={{
                            fontSize: 12,
                            color: overdue ? 'var(--kai-danger)' : 'var(--kai-text-muted)',
                            fontWeight: overdue ? 600 : 400,
                          }}
                        >
                          <Calendar size={12} />
                          {formatDate(task.due_date)}
                          {overdue && <AlertTriangle size={12} />}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="flex-gap-8">
                          <button
                            className="kai-btn kai-btn-sm kai-btn-outline"
                            style={{ padding: '4px 6px', border: 'none' }}
                            title="Delete"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 size={14} style={{ color: 'var(--kai-danger)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="kai-card-footer">
              <div className="flex-between">
                <span style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>
                  Showing {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
                </span>
                <div className="flex-gap-8">
                  <button
                    className="kai-btn kai-btn-sm kai-btn-outline"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`kai-btn kai-btn-sm ${page === pageNum ? 'kai-btn-primary' : 'kai-btn-outline'}`}
                        onClick={() => setPage(pageNum)}
                        style={{ minWidth: 32 }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    className="kai-btn kai-btn-sm kai-btn-outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered size="lg">
        <form onSubmit={handleCreate}>
          <Modal.Header closeButton style={{ borderBottom: '1px solid var(--kai-border)', padding: '16px 20px' }}>
            <Modal.Title style={{ fontSize: 18, fontWeight: 700 }}>Add New Task</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: 20 }}>
            <Row className="g-3">
              <Col xs={12}>
                <label className="kai-label">Title *</label>
                <input
                  className="kai-input"
                  placeholder="Enter task title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </Col>
              <Col xs={12}>
                <label className="kai-label">Description</label>
                <textarea
                  className="kai-input"
                  placeholder="Describe the task..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </Col>
              <Col xs={12} md={6}>
                <label className="kai-label">Project</label>
                <select
                  className="kai-input"
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  style={{ appearance: 'auto' }}
                >
                  <option value="">No Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Col>
              <Col xs={12} md={6}>
                <label className="kai-label">Assignee</label>
                <select
                  className="kai-input"
                  value={formData.assignee_id}
                  onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                  style={{ appearance: 'auto' }}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.full_name || m.email}</option>
                  ))}
                </select>
              </Col>
              <Col xs={12} md={4}>
                <label className="kai-label">Priority</label>
                <select
                  className="kai-input"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  style={{ appearance: 'auto' }}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </Col>
              <Col xs={12} md={4}>
                <label className="kai-label">Status</label>
                <select
                  className="kai-input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ appearance: 'auto' }}
                >
                  <option value="TODO">Todo</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </Col>
              <Col xs={12} md={4}>
                <label className="kai-label">Due Date</label>
                <input
                  type="date"
                  className="kai-input"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid var(--kai-border)', padding: '12px 20px', gap: 8 }}>
            <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button type="submit" className="kai-btn kai-btn-primary" disabled={creating}>
              {creating ? <Spinner animation="border" size="sm" /> : <Plus size={16} />}
              {creating ? 'Creating...' : 'Create Task'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
