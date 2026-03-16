import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Modal, Spinner, Nav } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit3,
  Trash2,
  ListTodo,
  FileText,
  Target,
  User,
  Flag,
  BarChart3,
} from 'lucide-react';
import { projectsApi, tasksApi, teamApi } from '../services/api';

const STATUS_COLORS = {
  PLANNING: '#e3e7ed',
  ACTIVE: '#cce5ff',
  IN_REVIEW: '#fff3cd',
  COMPLETED: '#d4edda',
  ON_HOLD: '#f8d7da',
};

const STATUS_TEXT_COLORS = {
  PLANNING: '#596882',
  ACTIVE: '#004085',
  IN_REVIEW: '#856404',
  COMPLETED: '#155724',
  ON_HOLD: '#721c24',
};

const PRIORITY_COLORS = {
  LOW: { bg: '#e3e7ed', color: '#596882' },
  MEDIUM: { bg: '#cce5ff', color: '#004085' },
  HIGH: { bg: '#fff3cd', color: '#856404' },
  URGENT: { bg: '#f8d7da', color: '#721c24' },
};

const KANBAN_COLUMNS = [
  { id: 'TODO', title: 'Todo', color: '#e3e7ed', textColor: '#596882' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: '#cce5ff', textColor: '#004085' },
  { id: 'IN_REVIEW', title: 'In Review', color: '#fff3cd', textColor: '#856404' },
  { id: 'COMPLETED', title: 'Completed', color: '#d4edda', textColor: '#155724' },
];

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

export default function ProjectDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddTask, setShowAddTask] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignee_id: '',
    priority: 'MEDIUM',
    status: 'TODO',
    due_date: '',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: project?.name || 'Project Detail' });
  }, [dispatch, project?.name]);

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await projectsApi.get(id);
      // API returns array even for single ID - extract first item
      let data = res.data;
      if (Array.isArray(data)) data = data[0];
      if (data?.project) data = data.project;
      setProject(data);
      if (data?.name) dispatch({ type: 'UI_SET_PAGE_TITLE', payload: data.name });
      // Use embedded tasks if available (has assignee info)
      if (data?.tasks && data.tasks.length > 0) {
        setTasks(data.tasks);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project');
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await tasksApi.list({ projectId: id });
      setTasks(Array.isArray(res.data) ? res.data : res.data?.tasks || []);
    } catch {
      // non-critical
    }
  }, [id]);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await teamApi.list();
      setTeamMembers(Array.isArray(res.data) ? res.data : res.data?.members || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchTeam();
  }, [fetchProject, fetchTasks, fetchTeam]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      toast.warning('Task title is required');
      return;
    }
    try {
      setCreatingTask(true);
      await tasksApi.create({ ...taskForm, projectId: id });
      toast.success('Task created');
      setShowAddTask(false);
      setTaskForm({ title: '', description: '', assignee_id: '', priority: 'MEDIUM', status: 'TODO', due_date: '' });
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDragEnd = async (result) => {
    const { draggableId, destination, source } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    const taskId = draggableId;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id?.toString() === taskId ? { ...t, status: newStatus } : t));

    try {
      await tasksApi.update(taskId, { status: newStatus });
    } catch (err) {
      toast.error('Failed to update task status');
      fetchTasks(); // revert
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksApi.delete(taskId);
      toast.success('Task deleted');
      fetchTasks();
    } catch {
      toast.error('Failed to delete task');
    }
  };

  // Organize tasks by status for kanban
  const kanbanData = {};
  KANBAN_COLUMNS.forEach(col => {
    kanbanData[col.id] = tasks.filter(t => t.status === col.id);
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const progress = project?.progress || (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

  if (loading) {
    return (
      <div className="flex-center" style={{ padding: 80 }}>
        <Spinner animation="border" style={{ color: 'var(--kai-primary)' }} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div>
        <div className="page-header">
          <div className="flex-gap-8">
            <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => navigate('/projects')}>
              <ArrowLeft size={16} /> Back
            </button>
          </div>
        </div>
        <div className="kai-card">
          <div className="kai-card-body flex-center" style={{ padding: 60, flexDirection: 'column', gap: 12 }}>
            <AlertCircle size={48} style={{ color: 'var(--kai-danger)' }} />
            <p style={{ color: 'var(--kai-danger)' }}>{error || 'Project not found'}</p>
            <button className="kai-btn kai-btn-outline" onClick={fetchProject}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  const projectTeam = project.members || project.team || [];

  return (
    <div>
      {/* Project Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          className="kai-btn kai-btn-outline kai-btn-sm"
          onClick={() => navigate('/projects')}
          style={{ marginBottom: 16 }}
        >
          <ArrowLeft size={16} /> Back to Projects
        </button>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="flex-gap-8" style={{ marginBottom: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{project.name}</h1>
              <span
                className="kai-badge"
                style={{
                  background: STATUS_COLORS[project.status] || '#e3e7ed',
                  color: STATUS_TEXT_COLORS[project.status] || '#596882',
                }}
              >
                {(project.status || 'PLANNING').replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex-gap-16" style={{ fontSize: 13, color: 'var(--kai-text-muted)', flexWrap: 'wrap' }}>
              <span className="flex-gap-8"><Calendar size={14} /> Due: {formatDate(project.dueDate || project.due_date)}</span>
              <span className="flex-gap-8"><User size={14} /> Lead: {project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : '--'}</span>
              <span className="flex-gap-8"><BarChart3 size={14} /> {progress}% complete</span>
              <span className="flex-gap-8"><Users size={14} /> {tasks.length} tasks • {completedTasks} done • {tasks.filter(t => t.status === 'TODO').length} backlog</span>
              <span className="flex-gap-8"><Clock size={14} /> Created: {formatDate(project.createdAt || project.created_at)}</span>
            </div>
          </div>
          <div className="page-actions">
            <button className="kai-btn kai-btn-primary" onClick={() => setShowAddTask(true)}>
              <Plus size={16} /> Add Task
            </button>
          </div>
        </div>
        {/* Progress Bar */}
        <div style={{ marginTop: 16 }}>
          <div style={{
            height: 8,
            background: 'var(--kai-border-light)',
            borderRadius: 'var(--kai-radius-pill)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: progress >= 100 ? 'var(--kai-success)' : 'var(--kai-primary)',
              borderRadius: 'var(--kai-radius-pill)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="kai-card" style={{ marginBottom: 24 }}>
        <div style={{ padding: '0 20px', borderBottom: '1px solid var(--kai-border)' }}>
          <nav style={{ display: 'flex', gap: 0 }}>
            {[
              { key: 'overview', label: 'Overview', icon: <FileText size={15} /> },
              { key: 'tasks', label: 'Tasks', icon: <ListTodo size={15} /> },
              { key: 'team', label: 'Team', icon: <Users size={15} /> },
              { key: 'files', label: 'Files', icon: <FileText size={15} /> },
              { key: 'timeline', label: 'Timeline', icon: <Clock size={15} /> },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '14px 16px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: activeTab === tab.key ? 'var(--kai-primary)' : 'var(--kai-text-muted)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--kai-primary)' : '2px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div>
          {/* Stats */}
          <Row className="g-3 mb-4">
            <Col xs={6} md={3}>
              <div className="stat-card">
                <div className="stat-value">{totalTasks}</div>
                <div className="stat-label">Total Tasks</div>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--kai-success)' }}>{completedTasks}</div>
                <div className="stat-label">Completed</div>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--kai-primary)' }}>{inProgressTasks}</div>
                <div className="stat-label">In Progress</div>
              </div>
            </Col>
            <Col xs={6} md={3}>
              <div className="stat-card">
                <div className="stat-value" style={{ color: 'var(--kai-warning)' }}>
                  {tasks.filter(t => t.status === 'TODO').length}
                </div>
                <div className="stat-label">Todo</div>
              </div>
            </Col>
          </Row>

          {/* Description Card */}
          <Row className="g-3">
            <Col xs={12} lg={8}>
              <div className="kai-card">
                <div className="kai-card-header">
                  <h6>Description</h6>
                </div>
                <div className="kai-card-body">
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--kai-text-secondary)', margin: 0 }}>
                    {project.description || 'No description provided for this project.'}
                  </p>
                </div>
              </div>

              {/* Milestones */}
              <div className="kai-card" style={{ marginTop: 16 }}>
                <div className="kai-card-header">
                  <h6>Milestones</h6>
                </div>
                <div className="kai-card-body">
                  {(project.milestones && project.milestones.length > 0) ? (
                    project.milestones.map((ms, i) => (
                      <div key={i} className="flex-between" style={{ padding: '10px 0', borderBottom: i < project.milestones.length - 1 ? '1px solid var(--kai-border-light)' : 'none' }}>
                        <div className="flex-gap-8">
                          <Target size={16} style={{ color: ms.completed ? 'var(--kai-success)' : 'var(--kai-text-muted)' }} />
                          <span style={{ fontSize: 13, fontWeight: 500, textDecoration: ms.completed ? 'line-through' : 'none', color: ms.completed ? 'var(--kai-text-muted)' : 'var(--kai-text)' }}>
                            {ms.title || ms.name}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{formatDate(ms.due_date)}</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--kai-text-muted)', fontSize: 13, margin: 0, textAlign: 'center', padding: 20 }}>
                      No milestones defined yet
                    </p>
                  )}
                </div>
              </div>
            </Col>

            {/* Sidebar Info */}
            <Col xs={12} lg={4}>
              <div className="kai-card">
                <div className="kai-card-header">
                  <h6>Project Info</h6>
                </div>
                <div className="kai-card-body">
                  {[
                    { label: 'Status', value: (project.status || 'PLANNING').replace(/_/g, ' ') },
                    { label: 'Created', value: formatDate(project.createdAt || project.created_at) },
                    { label: 'Due Date', value: formatDate(project.dueDate || project.due_date) },
                    { label: 'Project Lead', value: project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : '--', link: project.manager ? `/profile/${project.manager.id}` : null },
                    { label: 'Team Members', value: `${new Set(tasks.map(t => t.assigneeId || t.assignee?.id).filter(Boolean)).size} people` },
                    { label: 'Completed', value: `${completedTasks} of ${totalTasks} tasks` },
                    { label: 'Backlog', value: `${tasks.filter(t => t.status === 'TODO').length} tasks` },
                    { label: 'In Progress', value: `${inProgressTasks} tasks` },
                    { label: 'Overdue', value: `${tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length} tasks`, color: 'var(--kai-danger)' },
                  ].map((item, i) => (
                    <div key={i} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--kai-border-light)' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--kai-text-muted)' }}>{item.label}</span>
                      {item.link ? (
                        <a href={item.link} style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-primary)', textDecoration: 'none' }}>{item.value}</a>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 500, color: item.color || 'var(--kai-text)' }}>{item.value}</span>
                      )}
                    </div>
                  ))}

                  {/* Team members who worked on this project */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                      Team Members
                    </div>
                    {(() => {
                      const memberMap = {};
                      tasks.forEach(t => {
                        const a = t.assignee;
                        if (a) {
                          const id = a.id || a._id;
                          if (!memberMap[id]) {
                            memberMap[id] = { ...a, taskCount: 0, completedCount: 0, overdueCount: 0 };
                          }
                          memberMap[id].taskCount++;
                          if (t.status === 'COMPLETED') memberMap[id].completedCount++;
                          if (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED') memberMap[id].overdueCount++;
                        }
                      });
                      const members = Object.values(memberMap);
                      if (members.length === 0) return <p style={{ fontSize: 12, color: 'var(--kai-text-muted)', margin: 0 }}>No tasks assigned yet</p>;
                      return members.map((m, i) => (
                        <a key={i} href={`/profile/${m.id || m._id}`} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                          borderBottom: i < members.length - 1 ? '1px solid var(--kai-border-light)' : 'none',
                          textDecoration: 'none', color: 'inherit',
                        }}>
                          <div className="kai-avatar kai-avatar-sm" style={{ background: `hsl(${(m.firstName || '').charCodeAt(0) * 37 % 360}, 60%, 50%)` }}>
                            {(m.firstName || '?')[0]}{(m.lastName || '')[0]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{m.firstName} {m.lastName}</div>
                            <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>
                              {m.completedCount}/{m.taskCount} done
                              {m.overdueCount > 0 && <span style={{ color: 'var(--kai-danger)', marginLeft: 6 }}>⚠ {m.overdueCount} late</span>}
                            </div>
                          </div>
                        </a>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="kai-card" style={{ marginTop: 16 }}>
                <div className="kai-card-header">
                  <h6>Recent Activity</h6>
                </div>
                <div className="kai-card-body">
                  {(project.activities || project.activity || []).length > 0 ? (
                    (project.activities || project.activity || []).slice(0, 5).map((act, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--kai-border-light)', fontSize: 13 }}>
                        <span style={{ fontWeight: 500 }}>{act.user_name || 'System'}</span>{' '}
                        <span style={{ color: 'var(--kai-text-muted)' }}>{act.message || act.action}</span>
                        <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', marginTop: 2 }}>{formatDate(act.created_at)}</div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--kai-text-muted)', fontSize: 13, margin: 0, textAlign: 'center', padding: 20 }}>
                      No recent activity
                    </p>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </div>
      )}

      {/* TASKS TAB - Kanban */}
      {activeTab === 'tasks' && (
        <div>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h6 style={{ margin: 0, fontWeight: 600 }}>Task Board</h6>
            <button className="kai-btn kai-btn-primary kai-btn-sm" onClick={() => setShowAddTask(true)}>
              <Plus size={14} /> Add Task
            </button>
          </div>
          <DragDropContext onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
              {KANBAN_COLUMNS.map(column => (
                <div
                  key={column.id}
                  style={{
                    flex: '1 1 0',
                    minWidth: 260,
                    background: 'var(--kai-bg)',
                    borderRadius: 'var(--kai-radius-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Column Header */}
                  <div style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '2px solid ' + column.color,
                  }}>
                    <div className="flex-gap-8">
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: column.textColor,
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--kai-text)' }}>
                        {column.title}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--kai-text-muted)',
                        background: 'var(--kai-border-light)',
                        padding: '1px 8px',
                        borderRadius: 'var(--kai-radius-pill)',
                      }}>
                        {kanbanData[column.id]?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          padding: 8,
                          flex: 1,
                          minHeight: 120,
                          background: snapshot.isDraggingOver ? 'rgba(20,109,247,0.04)' : 'transparent',
                          borderRadius: '0 0 var(--kai-radius-lg) var(--kai-radius-lg)',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        {kanbanData[column.id]?.map((task, index) => (
                          <Draggable
                            key={task.id?.toString()}
                            draggableId={task.id?.toString()}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  marginBottom: 8,
                                  background: 'var(--kai-surface)',
                                  border: '1px solid var(--kai-border)',
                                  borderRadius: 'var(--kai-radius)',
                                  padding: 12,
                                  boxShadow: snapshot.isDragging ? 'var(--kai-shadow-lg)' : 'var(--kai-shadow-sm)',
                                  transition: 'box-shadow 0.2s ease',
                                }}
                              >
                                {/* Task Title */}
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--kai-text)' }}>
                                  {task.title}
                                </div>

                                {/* Priority Badge */}
                                {task.priority && (
                                  <span
                                    className="kai-badge"
                                    style={{
                                      background: PRIORITY_COLORS[task.priority]?.bg || '#e3e7ed',
                                      color: PRIORITY_COLORS[task.priority]?.color || '#596882',
                                      marginBottom: 8,
                                      fontSize: 10,
                                    }}
                                  >
                                    <Flag size={10} />
                                    {task.priority}
                                  </span>
                                )}

                                {/* Footer: Assignee + Due */}
                                <div className="flex-between" style={{ marginTop: 8 }}>
                                  <div className="flex-gap-8">
                                    {task.assignee_name || task.assignee?.name ? (
                                      <div
                                        className="kai-avatar kai-avatar-sm"
                                        style={{ background: getAvatarColor(task.assignee_name || task.assignee?.name), width: 22, height: 22, fontSize: 9 }}
                                        title={task.assignee_name || task.assignee?.name}
                                      >
                                        {getInitials(task.assignee_name || task.assignee?.name)}
                                      </div>
                                    ) : (
                                      <div className="kai-avatar kai-avatar-sm" style={{ background: 'var(--kai-border)', width: 22, height: 22, fontSize: 9, color: 'var(--kai-text-muted)' }}>
                                        ?
                                      </div>
                                    )}
                                  </div>
                                  {task.due_date && (
                                    <span style={{ fontSize: 11, color: 'var(--kai-text-muted)' }} className="flex-gap-8">
                                      <Calendar size={11} />
                                      {formatDate(task.due_date)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {(!kanbanData[column.id] || kanbanData[column.id].length === 0) && (
                          <div style={{
                            textAlign: 'center',
                            padding: '20px 12px',
                            color: 'var(--kai-text-muted)',
                            fontSize: 12,
                          }}>
                            No tasks
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* TEAM TAB */}
      {activeTab === 'team' && (
        <div>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h6 style={{ margin: 0, fontWeight: 600 }}>Team Members ({projectTeam.length})</h6>
          </div>
          {projectTeam.length > 0 ? (
            <Row className="g-3">
              {projectTeam.map((member, i) => {
                const name = member.name || member.full_name || 'Unknown';
                return (
                  <Col key={member.id || i} xs={12} sm={6} md={4} lg={3}>
                    <div className="kai-card" style={{ textAlign: 'center' }}>
                      <div className="kai-card-body" style={{ padding: 24 }}>
                        <div
                          className="kai-avatar kai-avatar-lg"
                          style={{
                            background: getAvatarColor(name),
                            margin: '0 auto 12px',
                          }}
                        >
                          {member.avatar ? (
                            <img src={member.avatar} alt={name} />
                          ) : (
                            getInitials(name)
                          )}
                        </div>
                        <h6 style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{name}</h6>
                        <p style={{ fontSize: 12, color: 'var(--kai-text-muted)', margin: 0 }}>
                          {member.role || member.designation || member.position || 'Team Member'}
                        </p>
                        {member.email && (
                          <p style={{ fontSize: 11, color: 'var(--kai-text-muted)', margin: '4px 0 0' }}>{member.email}</p>
                        )}
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          ) : (
            <div className="kai-card">
              <div className="kai-card-body flex-center" style={{ padding: 60, flexDirection: 'column', gap: 8 }}>
                <Users size={40} style={{ color: 'var(--kai-text-muted)' }} />
                <p style={{ color: 'var(--kai-text-muted)', margin: 0 }}>No team members assigned</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FILES TAB */}
      {activeTab === 'files' && (
        <div className="kai-card">
          <div className="kai-card-body flex-center" style={{ padding: 60, flexDirection: 'column', gap: 8 }}>
            <FileText size={40} style={{ color: 'var(--kai-text-muted)' }} />
            <p style={{ color: 'var(--kai-text-muted)', margin: 0 }}>Project files will appear here</p>
            <p style={{ color: 'var(--kai-text-muted)', fontSize: 12, margin: 0 }}>Upload files in the Files module and link them to this project</p>
          </div>
        </div>
      )}

      {/* TIMELINE TAB */}
      {activeTab === 'timeline' && (
        <div className="kai-card">
          <div className="kai-card-header">
            <h6>Project Timeline</h6>
          </div>
          <div className="kai-card-body">
            {(project.activities || project.activity || []).length > 0 ? (
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                <div style={{
                  position: 'absolute',
                  left: 8,
                  top: 4,
                  bottom: 4,
                  width: 2,
                  background: 'var(--kai-border)',
                }} />
                {(project.activities || project.activity || []).map((act, i) => (
                  <div key={i} style={{ position: 'relative', paddingBottom: 20, paddingLeft: 16 }}>
                    <div style={{
                      position: 'absolute',
                      left: -20,
                      top: 4,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: 'var(--kai-primary)',
                      border: '2px solid var(--kai-surface)',
                    }} />
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{act.message || act.action}</div>
                    <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', marginTop: 2 }}>
                      {act.user_name || 'System'} - {formatDate(act.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-center" style={{ padding: 40, flexDirection: 'column', gap: 8 }}>
                <Clock size={40} style={{ color: 'var(--kai-text-muted)' }} />
                <p style={{ color: 'var(--kai-text-muted)', margin: 0 }}>No timeline events yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      <Modal show={showAddTask} onHide={() => setShowAddTask(false)} centered size="lg">
        <form onSubmit={handleAddTask}>
          <Modal.Header closeButton style={{ borderBottom: '1px solid var(--kai-border)', padding: '16px 20px' }}>
            <Modal.Title style={{ fontSize: 18, fontWeight: 700 }}>Add Task</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: 20 }}>
            <Row className="g-3">
              <Col xs={12}>
                <label className="kai-label">Title *</label>
                <input
                  className="kai-input"
                  placeholder="Task title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />
              </Col>
              <Col xs={12}>
                <label className="kai-label">Description</label>
                <textarea
                  className="kai-input"
                  placeholder="Describe the task..."
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </Col>
              <Col xs={12} md={6}>
                <label className="kai-label">Assignee</label>
                <select
                  className="kai-input"
                  value={taskForm.assignee_id}
                  onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                  style={{ appearance: 'auto' }}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.full_name || m.email}</option>
                  ))}
                </select>
              </Col>
              <Col xs={12} md={6}>
                <label className="kai-label">Priority</label>
                <select
                  className="kai-input"
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  style={{ appearance: 'auto' }}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </Col>
              <Col xs={12} md={6}>
                <label className="kai-label">Status</label>
                <select
                  className="kai-input"
                  value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                  style={{ appearance: 'auto' }}
                >
                  <option value="TODO">Todo</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </Col>
              <Col xs={12} md={6}>
                <label className="kai-label">Due Date</label>
                <input
                  type="date"
                  className="kai-input"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid var(--kai-border)', padding: '12px 20px', gap: 8 }}>
            <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowAddTask(false)}>Cancel</button>
            <button type="submit" className="kai-btn kai-btn-primary" disabled={creatingTask}>
              {creatingTask ? <Spinner animation="border" size="sm" /> : <Plus size={16} />}
              {creatingTask ? 'Creating...' : 'Add Task'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
