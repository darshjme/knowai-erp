import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { teamApi } from '../services/api';

const ROLES = ['All', 'Manager', 'Engineer', 'Designer', 'HR', 'Finance', 'Marketing', 'Intern'];
const DEPARTMENTS = ['All', 'Engineering', 'Design', 'Human Resources', 'Finance', 'Marketing', 'Operations', 'Sales'];
const ROLE_COLORS = {
  Manager: '#8B3FE9', Engineer: '#146DF7', Designer: '#EA580C',
  HR: '#16A34A', Finance: '#2563EB', Marketing: '#CB3939', Intern: '#5B6B76',
};

const avatarBg = (name) => {
  const colors = ['#146DF7','#8B3FE9','#16A34A','#EA580C','#CB3939','#2563EB'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const initials = (name) => (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Team Directory</h1>
          <p>Manage your team members and roles</p>
        </div>
        <div className="page-actions">
          <div className="view-toggle">
            <button className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
            <button className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} title="Table View">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
          <button className="kai-btn kai-btn-primary" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Member
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Members', value: stats.total, color: '#146DF7', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
          { label: 'Managers', value: stats.managers, color: '#8B3FE9', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
          { label: 'Engineers', value: stats.engineers, color: '#16A34A', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z' },
          { label: 'HR Team', value: stats.hr, color: '#EA580C', icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div className="stat-icon" style={{ background: `${s.color}15` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={s.icon} />
                </svg>
              </div>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="kai-card" style={{ marginBottom: 24 }}>
        <div className="kai-card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="kai-search" style={{ flex: '1 1 250px', minWidth: 200 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              placeholder="Search team members..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="kai-input" style={{ width: 'auto', minWidth: 140 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>)}
          </select>
          <select className="kai-input" style={{ width: 'auto', minWidth: 160 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
          </select>
        </div>
      </div>

      {/* Team Grid / Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--kai-text-muted)' }}>Loading team members...</div>
      ) : filtered.length === 0 ? (
        <div className="kai-card">
          <div className="kai-card-body" style={{ textAlign: 'center', padding: 60, color: 'var(--kai-text-muted)' }}>
            {members.length === 0 ? 'No team members yet. Add your first member!' : 'No members match your filters.'}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="kai-card">
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="kai-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(member => (
                  <tr key={member._id || member.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="kai-avatar" style={{ background: avatarBg(member.name), width: 32, height: 32, fontSize: 12 }}>
                          {member.avatar ? <img src={member.avatar} alt={member.name} /> : initials(member.name)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{member.name}</span>
                      </div>
                    </td>
                    <td><span className="kai-badge" style={{ background: `${ROLE_COLORS[member.role] || '#146DF7'}15`, color: ROLE_COLORS[member.role] || '#146DF7' }}>{member.role || 'Member'}</span></td>
                    <td>{member.department || '-'}</td>
                    <td>{member.email || '-'}</td>
                    <td>{member.phone || '-'}</td>
                    <td>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: member.status === 'active' || member.status === 'online' ? '#16A34A' : '#9ca3af', display: 'inline-block' }} />
                    </td>
                    <td>
                      <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => handleDelete(member._id || member.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(member => (
            <div className="kai-card" key={member._id || member.id} style={{ position: 'relative' }}>
              <div className="kai-card-body" style={{ textAlign: 'center', paddingTop: 28 }}>
                {/* Status dot */}
                <div style={{
                  position: 'absolute', top: 16, right: 16,
                  width: 10, height: 10, borderRadius: '50%',
                  background: member.status === 'active' || member.status === 'online' ? '#16A34A' : '#9ca3af',
                  boxShadow: member.status === 'active' || member.status === 'online' ? '0 0 0 3px rgba(22,163,74,0.2)' : 'none',
                }} title={member.status === 'active' || member.status === 'online' ? 'Online' : 'Offline'} />

                {/* Avatar */}
                <div className="kai-avatar kai-avatar-xl" style={{
                  background: member.avatar ? 'transparent' : avatarBg(member.name),
                  margin: '0 auto 12px',
                }}>
                  {member.avatar ? <img src={member.avatar} alt={member.name} /> : initials(member.name)}
                </div>

                <h6 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: 'var(--kai-text)' }}>{member.name}</h6>
                <span className="kai-badge primary" style={{ marginBottom: 10, background: `${ROLE_COLORS[member.role] || '#146DF7'}15`, color: ROLE_COLORS[member.role] || '#146DF7' }}>
                  {member.role || 'Member'}
                </span>

                <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', marginTop: 8 }}>
                  {member.department || 'No department'}
                </div>
                <div style={{ borderTop: '1px solid var(--kai-border-light)', margin: '14px -20px 0', padding: '12px 20px 0' }}>
                  <div style={{ fontSize: 12, color: 'var(--kai-text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <span className="truncate">{member.email || '-'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--kai-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>{member.phone || '-'}</span>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => handleDelete(member._id || member.id)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="kai-card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="kai-card-header">
              <h5>Add Team Member</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="kai-label">Full Name *</label>
                  <input className="kai-input" required placeholder="John Doe" value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="kai-label">Email *</label>
                  <input className="kai-input" type="email" required placeholder="john@company.com" value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <label className="kai-label">Phone</label>
                  <input className="kai-input" placeholder="+91 9876543210" value={formData.phone}
                    onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="kai-label">Role *</label>
                    <select className="kai-input" value={formData.role}
                      onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}>
                      {ROLES.filter(r => r !== 'All').map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="kai-label">Department *</label>
                    <select className="kai-input" value={formData.department}
                      onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}>
                      {DEPARTMENTS.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
