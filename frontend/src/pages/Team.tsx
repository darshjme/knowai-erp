import ExportButtons from '../components/ui/ExportButtons';
import VerifiedBadge from '../components/ui/VerifiedBadge';
import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { Plus, Search, Users, Star, BookOpen, Heart, LayoutGrid, List, X, Mail, Phone } from 'lucide-react';
import { teamApi } from '../services/api';

const ROLES = ['All', 'Manager', 'Engineer', 'Designer', 'HR', 'Finance', 'Marketing', 'Intern'];
const DEPARTMENTS = ['All', 'Engineering', 'Design', 'Human Resources', 'Finance', 'Marketing', 'Operations', 'Sales'];
const ROLE_COLORS = {
  Manager: '#8B3FE9', Engineer: '#3B82F6', Designer: '#EA580C',
  HR: '#16A34A', Finance: '#2563EB', Marketing: '#CB3939', Intern: '#5B6B76',
};

const avatarBg = (name) => {
  const colors = ['#111827','#8B3FE9','#16A34A','#EA580C','#CB3939','#2563EB'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const initials = (name) => (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const statusBadge = (status) => {
  if (status === 'active' || status === 'online') return 'bg-[#10B981]/15 text-[#10B981]';
  if (status === 'on_leave' || status === 'leave') return 'bg-[#F59E0B]/15 text-[#F59E0B]';
  return 'bg-bg-elevated text-text-muted';
};

const statusLabel = (status) => {
  if (status === 'active' || status === 'online') return 'Active';
  if (status === 'on_leave' || status === 'leave') return 'On Leave';
  return 'Inactive';
};

export default function Team() {
  const dispatch = useDispatch();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // grid | table
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', role: 'Engineer', department: 'Engineering', status: 'active',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Team' });
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await teamApi.list();
      setMembers(Array.isArray(res.data) ? res.data : res.data?.data || res.data?.members || []);
    } catch (err) {
      toast.error('Failed to load team members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchSearch = !search || [m.name, m.email, m.role, m.department]
        .some(f => (f || '').toLowerCase().includes(search.toLowerCase()));
      const matchRole = roleFilter === 'All' || m.role === roleFilter;
      const matchDept = deptFilter === 'All' || m.department === deptFilter;
      return matchSearch && matchRole && matchDept;
    });
  }, [members, search, roleFilter, deptFilter]);

  const stats = useMemo(() => ({
    total: members.length,
    managers: members.filter(m => m.role === 'Manager').length,
    engineers: members.filter(m => m.role === 'Engineer').length,
    hr: members.filter(m => m.role === 'HR').length,
  }), [members]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await teamApi.create(formData);
      toast.success('Team member added successfully');
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', role: 'Engineer', department: 'Engineering', status: 'active' });
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this team member?')) return;
    try {
      await teamApi.delete(id);
      toast.success('Member removed');
      fetchMembers();
    } catch (err) {
      toast.error('Failed to remove member');
    }
  };

  const statItems = [
    { label: 'Total Members', value: stats.total, color: '#3B82F6', Icon: Users },
    { label: 'Managers', value: stats.managers, color: '#8B3FE9', Icon: Star },
    { label: 'Engineers', value: stats.engineers, color: '#16A34A', Icon: BookOpen },
    { label: 'HR Team', value: stats.hr, color: '#EA580C', Icon: Heart },
  ];

  return (
    <div data-testid="team-page">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6" data-testid="team-header">
        <div className="flex items-center gap-3">
          <h1 className="text-page-title font-heading text-text-primary tracking-[-0.4px]">Team</h1>
          <span className="text-caption font-medium bg-accent-purple/15 text-accent-purple px-2 py-0.5 rounded-full">
            {members.length}
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
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>
          <ExportButtons data={filtered} pageType="team" title="Team Directory" filename="team" />
          <button
            className="flex items-center gap-1.5 bg-[#7C3AED] text-white text-btn px-3.5 py-2 rounded-lg hover:bg-[#6D28D9] transition-colors"
            onClick={() => setShowModal(true)}
            data-testid="add-member-btn"
          >
            <Plus size={16} />
            Add Member
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" data-testid="team-stats">
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

      {/* Filters */}
      <div className="bg-bg-card border border-border-default rounded-xl p-3 mb-6" data-testid="team-filters">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="w-full bg-bg-elevated border border-border-default rounded-lg pl-9 pr-3 py-2 text-body text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple transition-colors"
              placeholder="Search team members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="team-search"
            />
          </div>
          <select
            className="bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary outline-none focus:border-accent-purple transition-colors appearance-auto min-w-[140px]"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            data-testid="role-filter"
          >
            {ROLES.map(r => <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>)}
          </select>
          <select
            className="bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary outline-none focus:border-accent-purple transition-colors appearance-auto min-w-[160px]"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            data-testid="dept-filter"
          >
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
          </select>
        </div>
      </div>

      {/* Team Grid / Table */}
      {loading ? (
        <div className="text-center py-16 text-text-muted text-body" data-testid="team-loading">Loading team members...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-card border border-border-default rounded-xl">
          <div className="text-center py-16 text-text-muted text-body" data-testid="team-empty">
            {members.length === 0 ? 'No team members yet. Add your first member!' : 'No members match your filters.'}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-bg-card border border-border-default rounded-xl overflow-hidden" data-testid="team-table">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-caption text-text-muted uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-caption text-text-muted uppercase tracking-wider px-4 py-3">Role</th>
                  <th className="text-caption text-text-muted uppercase tracking-wider px-4 py-3">Department</th>
                  <th className="text-caption text-text-muted uppercase tracking-wider px-4 py-3">Email</th>
                  <th className="text-caption text-text-muted uppercase tracking-wider px-4 py-3">Phone</th>
                  <th className="text-caption text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-caption text-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(member => (
                  <tr key={member._id || member.id} className="border-b border-border-subtle hover:bg-bg-elevated transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                          style={{ background: avatarBg(member.name) }}
                        >
                          {member.avatar ? <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" /> : initials(member.name)}
                        </div>
                        <span className="text-body font-semibold text-text-primary truncate max-w-[160px]" title={member.name}>{member.name}</span>
                        <VerifiedBadge verified={member.verified} size={14} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-block"
                        style={{ background: `${ROLE_COLORS[member.role] || '#3B82F6'}15`, color: ROLE_COLORS[member.role] || '#3B82F6' }}
                      >
                        {member.role || 'Member'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-body text-text-secondary truncate max-w-[140px]" title={member.department}>{member.department || '-'}</td>
                    <td className="px-4 py-3 text-body text-text-secondary truncate max-w-[180px]" title={member.email}>{member.email || '-'}</td>
                    <td className="px-4 py-3 text-body text-text-secondary">{member.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block ${statusBadge(member.status)}`}>
                        {statusLabel(member.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-caption text-accent-red hover:text-red-400 transition-colors px-2 py-1 rounded-md hover:bg-accent-red/10"
                        onClick={() => handleDelete(member._id || member.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="team-grid">
          {filtered.map(member => (
            <motion.div
              key={member._id || member.id}
              className="bg-bg-card border border-border-default rounded-xl p-5 text-center relative cursor-default"
              whileHover={{ y: -2, borderColor: 'rgba(124, 58, 237, 0.4)' }}
              transition={{ duration: 0.15 }}
              data-testid="team-member-card"
            >
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[14px] font-semibold mx-auto"
                style={{ background: member.avatar ? 'transparent' : avatarBg(member.name) }}
              >
                {member.avatar ? <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full object-cover" /> : initials(member.name)}
              </div>

              {/* Name */}
              <div className="flex items-center justify-center gap-1.5 mt-2.5">
                <span className="text-[14px] font-medium text-text-primary truncate max-w-[180px]" title={member.name}>
                  {member.name}
                </span>
                <VerifiedBadge verified={member.verified} size={14} />
              </div>

              {/* Role */}
              <div className="text-[11px] text-text-muted mt-0.5 truncate" title={member.role || 'Member'}>
                {member.role || 'Member'} {member.department ? `· ${member.department}` : ''}
              </div>

              {/* Status Badge */}
              <div className="mt-2">
                <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge(member.status)}`}>
                  {statusLabel(member.status)}
                </span>
              </div>

              {/* Contact Info */}
              <div className="border-t border-border-subtle mt-3.5 pt-3 -mx-5 px-5">
                <div className="flex items-center gap-1.5 text-[11px] text-text-secondary mb-1">
                  <Mail size={12} className="text-text-muted shrink-0" />
                  <span className="truncate" title={member.email}>{member.email || '-'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <Phone size={12} className="text-text-muted shrink-0" />
                  <span>{member.phone || '-'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex justify-center">
                <button
                  className="text-caption text-accent-red hover:text-red-400 transition-colors px-2.5 py-1 rounded-md hover:bg-accent-red/10 border border-transparent hover:border-accent-red/20"
                  onClick={() => handleDelete(member._id || member.id)}
                >
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-5"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
          data-testid="add-member-modal"
        >
          <div className="bg-bg-card border border-border-default rounded-xl w-full max-w-[520px] max-h-[90vh] overflow-auto shadow-modal">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
              <h5 className="text-section font-heading text-text-primary">Add Team Member</h5>
              <button
                className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
                onClick={() => setShowModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <label className="block text-label text-text-muted uppercase mb-1.5">Full Name *</label>
                  <input
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple transition-colors"
                    required
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-label text-text-muted uppercase mb-1.5">Email *</label>
                  <input
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple transition-colors"
                    type="email"
                    required
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-label text-text-muted uppercase mb-1.5">Phone</label>
                  <input
                    className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple transition-colors"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-label text-text-muted uppercase mb-1.5">Role *</label>
                    <select
                      className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary outline-none focus:border-accent-purple transition-colors appearance-auto"
                      value={formData.role}
                      onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                    >
                      {ROLES.filter(r => r !== 'All').map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-label text-text-muted uppercase mb-1.5">Department *</label>
                    <select
                      className="w-full bg-bg-elevated border border-border-default rounded-lg px-3 py-2 text-body text-text-primary outline-none focus:border-accent-purple transition-colors appearance-auto"
                      value={formData.department}
                      onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                    >
                      {DEPARTMENTS.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-default">
                <button
                  type="button"
                  className="text-btn text-text-secondary px-3.5 py-2 rounded-lg border border-border-default hover:bg-bg-elevated transition-colors"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-btn bg-[#7C3AED] text-white px-3.5 py-2 rounded-lg hover:bg-[#6D28D9] transition-colors"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
