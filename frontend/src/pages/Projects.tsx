import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
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
  LayoutGrid,
  List,
  X,
  Loader2,
} from 'lucide-react';
import { projectsApi, teamApi } from '../services/api';
import EmptyState from '../components/ui/EmptyState';

const STATUS_CONFIG = {
  PLANNING: { bg: 'bg-bg-elevated', text: 'text-text-muted', label: 'Planning', progressColor: 'var(--text-muted, #8B95A5)' },
  ACTIVE: { bg: 'bg-[#3B82F6]/15', text: 'text-[#3B82F6]', label: 'Active', progressColor: '#3B82F6' },
  IN_REVIEW: { bg: 'bg-[#F59E0B]/15', text: 'text-[#F59E0B]', label: 'In Review', progressColor: '#F59E0B' },
  COMPLETED: { bg: 'bg-[#10B981]/15', text: 'text-[#10B981]', label: 'Completed', progressColor: '#10B981' },
  ON_HOLD: { bg: 'bg-[#EF4444]/15', text: 'text-[#EF4444]', label: 'On Hold', progressColor: '#EF4444' },
};

const FILTER_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PLANNING', label: 'Planning' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'ON_HOLD', label: 'On Hold' },
];

const PROJECT_ICON_COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EA580C', '#8B5CF6', '#06B6D4'];

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

function getProjectIconColor(name) {
  if (!name) return PROJECT_ICON_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PROJECT_ICON_COLORS[Math.abs(hash) % PROJECT_ICON_COLORS.length];
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.PLANNING;
}

function getStatusHoverBorder(status) {
  const map = {
    ACTIVE: 'rgba(59, 130, 246, 0.4)',
    IN_REVIEW: 'rgba(245, 158, 11, 0.4)',
    COMPLETED: 'rgba(16, 185, 129, 0.4)',
    ON_HOLD: 'rgba(239, 68, 68, 0.4)',
    PLANNING: 'rgba(124, 58, 237, 0.4)',
  };
  return map[status] || map.PLANNING;
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

  const statItems = [
    { label: 'Total Projects', value: stats.total, color: '#7C3AED', Icon: FolderKanban },
    { label: 'Active', value: stats.active, color: '#3B82F6', Icon: Clock },
    { label: 'Completed', value: stats.completed, color: '#10B981', Icon: CheckCircle2 },
    { label: 'On Hold', value: stats.onHold, color: '#EF4444', Icon: Users },
  ];

  return (
    <div data-testid="projects-page">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6" data-testid="projects-header">
        <div className="flex items-center gap-3">
          <h1 className="text-page-title font-heading text-text-primary tracking-[-0.4px]">Projects</h1>
          <span className="text-caption font-medium bg-accent-purple/15 text-accent-purple px-2 py-0.5 rounded-full">
            {projects.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-bg-elevated rounded-lg p-0.5 border border-border-default">
            <button
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
              onClick={() => setViewMode('table')}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
          <button
            className="flex items-center gap-1.5 bg-[#7C3AED] text-white text-btn px-3.5 py-2 rounded-lg hover:bg-[#6D28D9] transition-colors"
            onClick={() => setShowCreateModal(true)}
            data-testid="new-project-btn"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" data-testid="projects-stats">
        {statItems.map((s, i) => (
          <div key={i} className="bg-bg-card border border-border-default rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${s.color}15` }}
              >
                <s.Icon size={18} style={{ color: s.color }} />
              </div>
            </div>
            <div className="text-stat-lg text-text-primary font-body" style={{ fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
            <div className="text-caption text-text-muted mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Search */}
      <div className="bg-bg-card border border-border-default rounded-xl px-5 py-3 mb-6" data-testid="projects-filters">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                className={`text-btn px-3 py-1.5 rounded-lg transition-colors ${
                  activeFilter === tab.key
                    ? 'bg-accent-purple text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                }`}
                onClick={() => setActiveFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="w-full bg-bg-elevated border border-border-default rounded-lg pl-9 pr-3 py-2 text-body text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple transition-colors"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
              data-testid="projects-search"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16" data-testid="projects-loading">
          <Loader2 size={24} className="animate-spin text-accent-purple" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-bg-card border border-border-default rounded-xl" data-testid="projects-error">
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-accent-red text-body m-0">{error}</p>
            <button
              className="text-btn text-text-secondary px-3.5 py-2 rounded-lg border border-border-default hover:bg-bg-elevated transition-colors"
              onClick={fetchProjects}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProjects.length === 0 && (
        <div className="bg-bg-card border border-border-default rounded-xl" data-testid="projects-empty">
          <div className="p-6">
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

      {/* Table / List View */}
      {!loading && !error && filteredProjects.length > 0 && viewMode === 'table' && (
        <div className="flex flex-col gap-2" data-testid="projects-list">
          {filteredProjects.map((project) => {
            const progress = project.progress || 0;
            const taskCount = project.task_count || project.tasks_count || 0;
            const sc = getStatusConfig(project.status);
            const iconColor = getProjectIconColor(project.name);

            return (
              <motion.div
                key={project.id}
                className="bg-bg-card border border-border-default rounded-xl p-4 flex items-center gap-3.5 cursor-pointer"
                whileHover={{ borderColor: getStatusHoverBorder(project.status) }}
                transition={{ duration: 0.15 }}
                onClick={() => navigate(`/projects/${project.id}`)}
                data-testid="project-list-item"
              >
                {/* Project Icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: iconColor }}
                >
                  <FolderKanban size={18} className="text-white" />
                </div>

                {/* Title + Meta */}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-text-primary truncate" title={project.name}>
                    {project.name}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {taskCount} tasks · Due {formatDate(project.due_date)}
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${sc.bg} ${sc.text}`}>
                  {sc.label}
                </span>

                {/* Progress */}
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <div className="flex-1 h-1 rounded-full bg-bg-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%`, background: sc.progressColor }}
                    />
                  </div>
                  <span className="text-[11px] text-text-muted w-8 text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{progress}%</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    className="p-1.5 rounded-md text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                    onClick={() => handleDelete(project.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Grid View */}
      {!loading && !error && filteredProjects.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="projects-grid">
          {filteredProjects.map((project) => {
            const progress = project.progress || 0;
            const teamAvatars = project.members || project.team || [];
            const taskCount = project.task_count || project.tasks_count || 0;
            const sc = getStatusConfig(project.status);

            return (
              <motion.div
                key={project.id}
                className="bg-bg-card border border-border-default rounded-xl cursor-pointer flex flex-col"
                whileHover={{ y: -2, borderColor: getStatusHoverBorder(project.status) }}
                transition={{ duration: 0.15 }}
                onClick={() => navigate(`/projects/${project.id}`)}
                data-testid="project-card"
              >
                <div className="p-5 flex-1 flex flex-col">
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                      {sc.label}
                    </span>
                    <div className="relative">
                      <button
                        className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === project.id ? null : project.id);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === project.id && (
                        <div className="absolute right-0 top-full mt-1 bg-bg-card border border-border-default rounded-lg shadow-modal z-10 min-w-[140px] overflow-hidden">
                          <button
                            className="flex items-center gap-2 px-3.5 py-2 w-full text-left text-body text-text-primary hover:bg-bg-elevated transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${project.id}`);
                            }}
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                          <button
                            className="flex items-center gap-2 px-3.5 py-2 w-full text-left text-body text-accent-red hover:bg-bg-elevated transition-colors"
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
                  <h6 className="text-[16px] font-bold text-text-primary mb-1 truncate" title={project.name}>
                    {project.name}
                  </h6>
                  <p className="text-body text-text-muted mb-4 flex-1 line-clamp-2">
                    {project.description || 'No description provided'}
                  </p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] font-semibold text-text-secondary">Progress</span>
                      <span className="text-[12px] font-bold text-accent-purple" style={{ fontVariantNumeric: 'tabular-nums' }}>{progress}%</span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-bg-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%`, background: progress >= 100 ? '#10B981' : '#7C3AED' }}
                      />
                    </div>
                  </div>

                  {/* Footer: Team Avatars + Meta */}
                  <div className="flex items-center justify-between border-t border-border-subtle pt-3">
                    <div className="flex items-center">
                      {teamAvatars.slice(0, 4).map((member, i) => (
                        <div
                          key={member.id || i}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-semibold border-2 border-bg-card"
                          style={{
                            background: getAvatarColor(member.name || member.full_name),
                            marginLeft: i > 0 ? -8 : 0,
                            zIndex: 4 - i,
                            position: 'relative',
                          }}
                          title={member.name || member.full_name}
                        >
                          {getInitials(member.name || member.full_name)}
                        </div>
                      ))}
                      {teamAvatars.length > 4 && (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-text-muted text-[9px] font-medium bg-bg-elevated border-2 border-bg-card relative"
                          style={{ marginLeft: -8 }}
                        >
                          +{teamAvatars.length - 4}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-text-muted">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {taskCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(project.due_date)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-5"
          onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}
          data-testid="create-project-modal"
        >
          <div className="bg-bg-card border border-border-default rounded-xl w-full max-w-[640px] max-h-[90vh] overflow-auto shadow-modal">
            <form onSubmit={handleCreate}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
                <h5 className="text-[18px] font-bold font-heading text-text-primary">Create New Project</h5>
                <button
                  type="button"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <label className="block text-label text-text-muted uppercase mb-1.5">Project Name *</label>
                  <input
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple transition-colors"
                    placeholder="Enter project name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-label text-text-muted uppercase mb-1.5">Description</label>
                  <textarea
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple transition-colors resize-y"
                    placeholder="Describe the project..."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-label text-text-muted uppercase mb-1.5">Due Date</label>
                    <input
                      type="date"
                      className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary outline-none focus:border-accent-purple transition-colors"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-label text-text-muted uppercase mb-1.5">Assign Manager</label>
                    <select
                      className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary outline-none focus:border-accent-purple transition-colors appearance-auto"
                      value={formData.manager_id}
                      onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                    >
                      <option value="">Select a manager</option>
                      {teamMembers.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.full_name || m.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-label text-text-muted uppercase mb-1.5">Status</label>
                    <select
                      className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary outline-none focus:border-accent-purple transition-colors appearance-auto"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="PLANNING">Planning</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-label text-text-muted uppercase mb-1.5">Project Members</label>
                  <div className="max-h-[150px] overflow-y-auto border border-border-default rounded-lg p-2">
                    {teamMembers.map(m => {
                      const mName = m.name || m.full_name || `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email;
                      return (
                        <label key={m.id} className="flex items-center gap-2 py-1 cursor-pointer text-body text-text-primary hover:bg-bg-elevated rounded px-1">
                          <input
                            type="checkbox"
                            className="accent-accent-purple"
                            checked={formData.members.includes(m.id)}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              members: e.target.checked ? [...prev.members, m.id] : prev.members.filter(x => x !== m.id)
                            }))}
                          />
                          <span className="truncate">{mName}</span>
                          <span className="text-[10px] text-text-muted ml-auto shrink-0">{m.role}</span>
                        </label>
                      );
                    })}
                  </div>
                  <span className="text-caption text-text-muted mt-1 block">{formData.members.length} member(s)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-label text-text-muted uppercase mb-1.5">Discussion Time</label>
                    <input
                      type="time"
                      className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary outline-none focus:border-accent-purple transition-colors"
                      value={formData.discussionTime}
                      onChange={(e) => setFormData({ ...formData, discussionTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-label text-text-muted uppercase mb-1.5">Discussion Frequency</label>
                    <select
                      className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary outline-none focus:border-accent-purple transition-colors appearance-auto"
                      value={formData.discussionFrequency}
                      onChange={(e) => setFormData({ ...formData, discussionFrequency: e.target.value })}
                    >
                      <option value="">None</option>
                      <option value="DAILY">Daily</option>
                      <option value="ALTERNATE_DAYS">Alternate Days</option>
                      <option value="TWICE_A_WEEK">Twice a Week</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="BIWEEKLY">Once in 2 Weeks</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default">
                <button
                  type="button"
                  className="text-btn text-text-secondary px-3.5 py-2 rounded-lg border border-border-default hover:bg-bg-elevated transition-colors"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-btn bg-[#7C3AED] text-white px-3.5 py-2 rounded-lg hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
