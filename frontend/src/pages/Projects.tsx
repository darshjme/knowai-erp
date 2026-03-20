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
  Users,
  CheckCircle2,
  Clock,
  MoreVertical,
  Trash2,
  Edit3,
  FolderKanban,
} from 'lucide-react';
import { projectsApi, teamApi } from '../services/api';
import EmptyState from '../components/ui/EmptyState';

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

const STATUS_BADGE_CLASS = {
  PLANNING: 'secondary',
  ACTIVE: 'info',
  IN_REVIEW: 'warning',
  COMPLETED: 'success',
  ON_HOLD: 'danger',
};

const FILTER_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PLANNING', label: 'Planning' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'ON_HOLD', label: 'On Hold' },
];

const AVATAR_COLORS = [
  '#111827', '#8B3FE9', '#16A34A', '#EA580C', '#CB3939',
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

export default function Projects() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid | table
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    due_date: '',
    manager_id: '',
    status: 'PLANNING',
    members: [],
    discussionTime: '',
    discussionFrequency: '',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Projects' });
  }, [dispatch]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (activeFilter !== 'ALL') params.status = activeFilter;
      if (searchQuery) params.search = searchQuery;
      const res = await projectsApi.list(params);
      setProjects(Array.isArray(res.data) ? res.data : res.data?.projects || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery]);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await teamApi.list();
      setTeamMembers(Array.isArray(res.data) ? res.data : res.data?.members || []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning('Project name is required');
      return;
    }
    try {
      setCreating(true);
      await projectsApi.create(formData);
      toast.success('Project created successfully');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', due_date: '', manager_id: '', status: 'PLANNING', members: [], discussionTime: '', discussionFrequency: '' });
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectsApi.delete(id);
      toast.success('Project deleted');
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const filteredProjects = projects;

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'ACTIVE').length,
    completed: projects.filter(p => p.status === 'COMPLETED').length,
    onHold: projects.filter(p => p.status === 'ON_HOLD').length,
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p>Manage and track all your projects</p>
        </div>
        <div className="page-actions">
          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
            <button className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} title="List View">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
          <button className="kai-btn kai-btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus /> New Project
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <div className="stat-card">
            <div className="flex-between mb-2">
              <div className="stat-icon" style={{ background: 'var(--kai-primary-light, rgba(17,24,39,0.08))', color: 'var(--kai-primary)' }}>
                <FolderKanban />
              </div>
            </div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Projects</div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="stat-card">
            <div className="flex-between mb-2">
              <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--kai-info)' }}>
                <Clock />
              </div>
            </div>
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active</div>
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
                <Users />
              </div>
            </div>
            <div className="stat-value">{stats.onHold}</div>
            <div className="stat-label">On Hold</div>
          </div>
        </Col>
      </Row>

      {/* Filter Tabs + Search */}
      <div className="kai-card mb-4">
        <div className="kai-card-body" style={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`kai-btn kai-btn-sm ${activeFilter === tab.key ? 'kai-btn-primary' : 'kai-btn-outline'}`}
                  onClick={() => setActiveFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="kai-search" style={{ minWidth: 240 }}>
              <Search />
              <input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
              />
            </div>
          </div>
        </div>
      </div>

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
            <button className="kai-btn kai-btn-outline" onClick={fetchProjects}>Try Again</button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProjects.length === 0 && (
        <div className="kai-card">
          <div className="kai-card-body">
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create a project to organize your team's work"
              actionLabel="New Project"
              onAction={() => setShowCreateModal(true)}
            />
          </div>
        </div>
      )}

      {/* Project Cards Grid / Table */}
      {!loading && !error && filteredProjects.length > 0 && viewMode === 'table' && (
        <div className="kai-card">
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="kai-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Tasks</th>
                  <th>Due Date</th>
                  <th>Team</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => {
                  const progress = project.progress || 0;
                  const taskCount = project.task_count || project.tasks_count || 0;
                  const teamAvatars = project.members || project.team || [];
                  return (
                    <tr key={project.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${project.id}`)}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{project.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.description || 'No description'}
                        </div>
                      </td>
                      <td>
                        <span className="kai-badge" style={{ background: STATUS_COLORS[project.status] || '#e3e7ed', color: STATUS_TEXT_COLORS[project.status] || '#596882' }}>
                          {(project.status || 'PLANNING').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--kai-border-light)', borderRadius: 'var(--kai-radius-pill)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? 'var(--kai-success)' : 'var(--kai-primary)', borderRadius: 'var(--kai-radius-pill)' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--kai-primary)' }}>{progress}%</span>
                        </div>
                      </td>
                      <td>{taskCount}</td>
                      <td style={{ fontSize: 12, color: 'var(--kai-text-muted)', whiteSpace: 'nowrap' }}>{formatDate(project.due_date)}</td>
                      <td>
                        <div style={{ display: 'flex' }}>
                          {teamAvatars.slice(0, 3).map((member, i) => (
                            <div key={member.id || i} className="kai-avatar kai-avatar-sm" style={{ background: getAvatarColor(member.name || member.full_name), marginLeft: i > 0 ? -8 : 0, border: '2px solid var(--kai-surface)', zIndex: 3 - i }} title={member.name || member.full_name}>
                              {getInitials(member.name || member.full_name)}
                            </div>
                          ))}
                          {teamAvatars.length > 3 && <span style={{ fontSize: 11, color: 'var(--kai-text-muted)', marginLeft: 4, alignSelf: 'center' }}>+{teamAvatars.length - 3}</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                          <button className="kai-btn kai-btn-outline kai-btn-sm" style={{ padding: '4px 6px', border: 'none' }} onClick={() => navigate(`/projects/${project.id}`)}><Edit3 size={14} /></button>
                          <button className="kai-btn kai-btn-outline kai-btn-sm" style={{ padding: '4px 6px', border: 'none', color: 'var(--kai-danger)' }} onClick={() => handleDelete(project.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && filteredProjects.length > 0 && viewMode === 'grid' && (
        <Row className="g-3">
          {filteredProjects.map((project) => {
            const progress = project.progress || 0;
            const teamAvatars = project.members || project.team || [];
            const taskCount = project.task_count || project.tasks_count || 0;

            return (
              <Col key={project.id} xs={12} md={6} lg={4}>
                <div
                  className="kai-card"
                  style={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="kai-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Header Row */}
                    <div className="flex-between" style={{ marginBottom: 12 }}>
                      <span
                        className="kai-badge"
                        style={{
                          background: STATUS_COLORS[project.status] || '#e3e7ed',
                          color: STATUS_TEXT_COLORS[project.status] || '#596882',
                        }}
                      >
                        {(project.status || 'PLANNING').replace(/_/g, ' ')}
                      </span>
                      <div style={{ position: 'relative' }}>
                        <button
                          className="kai-btn kai-btn-sm kai-btn-outline"
                          style={{ padding: '4px 6px', border: 'none' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === project.id ? null : project.id);
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenuId === project.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              background: 'var(--kai-surface)',
                              border: '1px solid var(--kai-border)',
                              borderRadius: 'var(--kai-radius)',
                              boxShadow: 'var(--kai-shadow-lg)',
                              zIndex: 10,
                              minWidth: 140,
                              overflow: 'hidden',
                            }}
                          >
                            <button
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                                width: '100%', border: 'none', background: 'none', cursor: 'pointer',
                                fontSize: 13, color: 'var(--kai-text)',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/projects/${project.id}`);
                              }}
                            >
                              <Edit3 size={14} /> Edit
                            </button>
                            <button
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                                width: '100%', border: 'none', background: 'none', cursor: 'pointer',
                                fontSize: 13, color: 'var(--kai-danger)',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleDelete(project.id);
                              }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Title + Description */}
                    <h6 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: 'var(--kai-text)' }}>
                      {project.name}
                    </h6>
                    <p style={{
                      fontSize: 13,
                      color: 'var(--kai-text-muted)',
                      marginBottom: 16,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      flex: 1,
                    }}>
                      {project.description || 'No description provided'}
                    </p>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: 16 }}>
                      <div className="flex-between" style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--kai-text-secondary)' }}>Progress</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--kai-primary)' }}>{progress}%</span>
                      </div>
                      <div style={{
                        height: 6,
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

                    {/* Footer: Team Avatars + Meta */}
                    <div className="flex-between" style={{ borderTop: '1px solid var(--kai-border-light)', paddingTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {teamAvatars.slice(0, 4).map((member, i) => (
                          <div
                            key={member.id || i}
                            className="kai-avatar kai-avatar-sm"
                            style={{
                              background: getAvatarColor(member.name || member.full_name),
                              marginLeft: i > 0 ? -8 : 0,
                              border: '2px solid var(--kai-surface)',
                              zIndex: 4 - i,
                            }}
                            title={member.name || member.full_name}
                          >
                            {getInitials(member.name || member.full_name)}
                          </div>
                        ))}
                        {teamAvatars.length > 4 && (
                          <div
                            className="kai-avatar kai-avatar-sm"
                            style={{
                              background: 'var(--kai-border)',
                              color: 'var(--kai-text-muted)',
                              marginLeft: -8,
                              border: '2px solid var(--kai-surface)',
                              fontSize: 10,
                            }}
                          >
                            +{teamAvatars.length - 4}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--kai-text-muted)' }}>
                        <span className="flex-gap-8">
                          <CheckCircle2 size={13} />
                          {taskCount} tasks
                        </span>
                        <span className="flex-gap-8">
                          <Calendar size={13} />
                          {formatDate(project.due_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Create Project Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered size="lg">
        <form onSubmit={handleCreate}>
          <Modal.Header
            closeButton
            style={{ borderBottom: '1px solid var(--kai-border)', padding: '16px 20px' }}
          >
            <Modal.Title style={{ fontSize: 18, fontWeight: 700 }}>Create New Project</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: 20 }}>
            <Row className="g-3">
              <Col xs={12}>
                <label className="kai-label">Project Name *</label>
                <input
                  className="kai-input"
                  placeholder="Enter project name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Col>
              <Col xs={12}>
                <label className="kai-label">Description</label>
                <textarea
                  className="kai-input"
                  placeholder="Describe the project..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </Col>
              <Col xs={12} md={6}>
                <label className="kai-label">Due Date</label>
                <input
                  type="date"
                  className="kai-input"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </Col>
              <Col xs={12} md={6}>
                <label className="kai-label">Assign Manager</label>
                <select
                  className="kai-input"
                  value={formData.manager_id}
                  onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                  style={{ appearance: 'auto' }}
                >
                  <option value="">Select a manager</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.full_name || m.email}
                    </option>
                  ))}
                </select>
              </Col>
              <Col xs={12} md={6}>
                <label className="kai-label">Status</label>
                <select
                  className="kai-input"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ appearance: 'auto' }}
                >
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                </select>
              </Col>
              <Col xs={12}>
                <label className="kai-label">Project Members</label>
                <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--kai-border)', borderRadius: 8, padding: 8 }}>
                  {teamMembers.map(m => {
                    const mName = m.name || m.full_name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email;
                    return (
                      <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={formData.members.includes(m.id)}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            members: e.target.checked ? [...prev.members, m.id] : prev.members.filter(x => x !== m.id)
                          }))} />
                        <span>{mName}</span>
                        <span style={{ fontSize: 10, color: 'var(--kai-text-muted)', marginLeft: 'auto' }}>{m.role}</span>
                      </label>
                    );
                  })}
                </div>
                <small style={{ color: 'var(--kai-text-muted)' }}>{formData.members.length} member(s)</small>
              </Col>
              <Col xs={12} md={4}>
                <label className="kai-label">Discussion Time</label>
                <input
                  type="time"
                  className="kai-input"
                  value={formData.discussionTime}
                  onChange={(e) => setFormData({ ...formData, discussionTime: e.target.value })}
                />
              </Col>
              <Col xs={12} md={4}>
                <label className="kai-label">Discussion Frequency</label>
                <select
                  className="kai-input"
                  value={formData.discussionFrequency}
                  onChange={(e) => setFormData({ ...formData, discussionFrequency: e.target.value })}
                  style={{ appearance: 'auto' }}
                >
                  <option value="">None</option>
                  <option value="DAILY">Daily</option>
                  <option value="ALTERNATE_DAYS">Alternate Days</option>
                  <option value="TWICE_A_WEEK">Twice a Week</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Once in 2 Weeks</option>
                </select>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid var(--kai-border)', padding: '12px 20px', gap: 8 }}>
            <button
              type="button"
              className="kai-btn kai-btn-outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="kai-btn kai-btn-primary" disabled={creating}>
              {creating ? <Spinner animation="border" size="sm" /> : <Plus size={16} />}
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
