import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { goalsApi } from '../services/api';
import {
  Target, Plus, ChevronRight, Loader2, AlertCircle, X, Trash2, Edit3,
  CheckCircle2, Clock, TrendingUp, Flag, Calendar
} from 'lucide-react';

const TYPE_BADGES = {
  OBJECTIVE: { bg: '#DBEAFE', color: '#1E40AF', label: 'Objective' },
  KEY_RESULT: { bg: '#FEF3C7', color: '#92400E', label: 'Key Result' },
  TARGET: { bg: '#D1FAE5', color: '#065F46', label: 'Target' },
};

const STATUS_CONFIG = {
  ON_TRACK: { bg: '#D1FAE5', color: '#065F46', label: 'On Track' },
  AT_RISK: { bg: '#FEF3C7', color: '#92400E', label: 'At Risk' },
  BEHIND: { bg: '#FEE2E2', color: '#991B1B', label: 'Behind' },
  COMPLETED: { bg: '#DBEAFE', color: '#1E40AF', label: 'Completed' },
};

const SCOPE_LABELS = {
  PERSONAL: 'Personal',
  TEAM: 'Team',
  COMPANY: 'Company',
};

export default function Goals() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('MY'); // MY, TEAM, COMPANY, ALL

  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', type: 'OBJECTIVE', scope: 'PERSONAL', metricTarget: '', endDate: '', description: '',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Goals' });
    fetchGoals();
  }, [activeTab]);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab === 'MY') { params.ownerId = user?.id; }
      else if (activeTab === 'TEAM') { params.scope = 'TEAM'; }
      else if (activeTab === 'COMPANY') { params.scope = 'COMPANY'; }
      else if (['PROFESSIONAL', 'PERSONAL', 'HEALTH', 'WEALTH'].includes(activeTab)) {
        params.ownerId = user?.id;
        params.category = activeTab;
      }
      const res = await goalsApi.list(params);
      const items = Array.isArray(res.data) ? res.data : [];
      setGoals(items);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, msg) => {
    if (type === 'success') { setSuccess(msg); setError(''); }
    else { setError(msg); setSuccess(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await goalsApi.create({
        title: form.title,
        type: form.type,
        scope: form.scope || 'PERSONAL',
        category: form.category || 'PROFESSIONAL',
        metricTarget: form.metricTarget ? parseFloat(form.metricTarget) : undefined,
        endDate: form.endDate || undefined,
        description: form.description,
      });
      const newGoal = res.data;
      setGoals(prev => [newGoal, ...prev]);
      setForm({ title: '', type: 'OBJECTIVE', scope: 'PERSONAL', category: 'PROFESSIONAL', metricTarget: '', endDate: '', description: '' });
      setShowAddModal(false);
      showMsg('success', 'Goal created successfully');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goal) => {
    if (!window.confirm(`Delete "${goal.title}"?`)) return;
    try {
      await goalsApi.delete(goal._id || goal.id);
      setGoals(prev => prev.filter(g => (g._id || g.id) !== (goal._id || goal.id)));
      if (selectedGoal && (selectedGoal._id || selectedGoal.id) === (goal._id || goal.id)) {
        setSelectedGoal(null);
      }
      showMsg('success', 'Goal deleted');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to delete goal');
    }
  };

  const handleUpdateProgress = async (goal, newProgress) => {
    const id = goal._id || goal.id;
    try {
      await goalsApi.update(id, { progress: newProgress });
      setGoals(prev => prev.map(g =>
        (g._id || g.id) === id ? { ...g, progress: newProgress } : g
      ));
      if (selectedGoal && (selectedGoal._id || selectedGoal.id) === id) {
        setSelectedGoal(prev => ({ ...prev, progress: newProgress }));
      }
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to update progress');
    }
  };

  const getStatus = (goal) => {
    const s = goal.status || 'ON_TRACK';
    return STATUS_CONFIG[s] || STATUS_CONFIG['ON_TRACK'];
  };

  const getTypeBadge = (type) => {
    return TYPE_BADGES[type] || TYPE_BADGES['OBJECTIVE'];
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const progressColor = (pct) => {
    if (pct >= 75) return '#10B981';
    if (pct >= 40) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Goals</h1>
          <p>Track your professional, personal, health, and wealth goals</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="kai-btn kai-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'MY', label: 'My Goals' },
          { key: 'PROFESSIONAL', label: 'Professional' },
          { key: 'PERSONAL', label: 'Personal' },
          { key: 'HEALTH', label: 'Health' },
          { key: 'WEALTH', label: 'Wealth' },
          { key: 'TEAM', label: 'Team Goals' },
          { key: 'COMPANY', label: 'Company Goals' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`kai-btn ${activeTab === tab.key ? 'kai-btn-primary' : 'kai-btn-outline'}`}
            style={{ fontSize: 13 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {(success || error) && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500,
          background: success ? '#d4edda' : '#f8d7da', color: success ? '#155724' : '#721c24',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {success || error}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowAddModal(false)}>
          <div className="kai-card" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
            <div className="kai-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#10222F', margin: 0 }}>Add Goal</h3>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5B6B76' }}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreate}>
                <div style={{ marginBottom: 16 }}>
                  <label className="kai-label">Goal Title</label>
                  <input className="kai-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="What do you want to achieve?" required autoFocus />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label className="kai-label">Type</label>
                    <select className="kai-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="OBJECTIVE">Objective</option>
                      <option value="KEY_RESULT">Key Result</option>
                      <option value="TARGET">Target</option>
                    </select>
                  </div>
                  <div>
                    <label className="kai-label">Category</label>
                    <select className="kai-input" value={form.category || 'PROFESSIONAL'} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      <option value="PROFESSIONAL">Professional</option>
                      <option value="PERSONAL">Personal</option>
                      <option value="HEALTH">Health</option>
                      <option value="WEALTH">Wealth</option>
                    </select>
                  </div>
                  <div>
                    <label className="kai-label">Due Date</label>
                    <input className="kai-input" type="date" value={form.endDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="kai-label">Target Value</label>
                  <input className="kai-input" type="number" value={form.metricTarget} onChange={e => setForm(f => ({ ...f, metricTarget: e.target.value }))}
                    placeholder="e.g., 100 (for percentage), 5000000 (for revenue)" />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="kai-label">Description</label>
                  <textarea className="kai-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe this goal..." rows={3} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="kai-btn">Cancel</button>
                  <button type="submit" className="kai-btn kai-btn-primary" disabled={saving}>
                    {saving ? 'Creating...' : 'Create Goal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Goal Detail Panel */}
      {selectedGoal && (
        <div className="kai-card" style={{ marginBottom: 20 }}>
          <div className="kai-card-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#10222F', margin: 0 }}>{selectedGoal.title}</h3>
                  {(() => { const tb = getTypeBadge(selectedGoal.type); return (
                    <span className="kai-badge" style={{ background: tb.bg, color: tb.color, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                      {selectedGoal.type}
                    </span>
                  ); })()}
                </div>
                {selectedGoal.description && (
                  <p style={{ fontSize: 14, color: '#5B6B76', margin: '4px 0 0' }}>{selectedGoal.description}</p>
                )}
              </div>
              <button onClick={() => setSelectedGoal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
              {selectedGoal.targetMetric && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: '#5B6B76' }}>Target: </span>
                  <span style={{ fontWeight: 600, color: '#10222F' }}>{selectedGoal.targetMetric}</span>
                </div>
              )}
              <div style={{ fontSize: 13 }}>
                <span style={{ color: '#5B6B76' }}>Due: </span>
                <span style={{ fontWeight: 600, color: '#10222F' }}>{formatDate(selectedGoal.dueDate)}</span>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: '#5B6B76' }}>Status: </span>
                {(() => { const st = getStatus(selectedGoal); return (
                  <span style={{ fontWeight: 600, color: st.color }}>{st.label}</span>
                ); })()}
              </div>
            </div>

            {/* Progress slider */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#4C5963' }}>Progress</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#10222F' }}>{selectedGoal.progress || 0}%</span>
              </div>
              <div style={{ position: 'relative', height: 8, background: '#E8EBED', borderRadius: 4 }}>
                <div style={{
                  height: '100%', borderRadius: 4, transition: 'width 0.3s',
                  width: `${selectedGoal.progress || 0}%`,
                  background: progressColor(selectedGoal.progress || 0),
                }} />
              </div>
              <input type="range" min={0} max={100} value={selectedGoal.progress || 0}
                onChange={e => handleUpdateProgress(selectedGoal, parseInt(e.target.value))}
                style={{ width: '100%', marginTop: 8, accentColor: '#146DF7' }} />
            </div>

            {/* Key Results */}
            {selectedGoal.keyResults && selectedGoal.keyResults.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#10222F', marginBottom: 12 }}>Key Results</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedGoal.keyResults.map((kr, i) => (
                    <div key={kr._id || kr.id || i} style={{
                      padding: '12px 16px', background: '#F8F9FA', borderRadius: 8,
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <CheckCircle2 size={18} style={{ color: (kr.progress || 0) >= 100 ? '#10B981' : '#CBD5E0', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#10222F', marginBottom: 4 }}>{kr.name || kr.title}</div>
                        <div style={{ height: 4, background: '#E8EBED', borderRadius: 2 }}>
                          <div style={{
                            height: '100%', borderRadius: 2, width: `${kr.progress || 0}%`,
                            background: progressColor(kr.progress || 0),
                          }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#4C5963', minWidth: 36, textAlign: 'right' }}>
                        {kr.progress || 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Goals List */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#146DF7' }} />
        </div>
      ) : goals.length === 0 ? (
        <div className="kai-card">
          <div className="kai-card-body" style={{ textAlign: 'center', padding: 60, color: '#5B6B76' }}>
            <Target size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>No goals yet</p>
            <p style={{ fontSize: 13 }}>Create your first goal to start tracking progress</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {goals.map(goal => {
            const id = goal._id || goal.id;
            const status = getStatus(goal);
            const typeBadge = getTypeBadge(goal.type);
            const progress = goal.progress || 0;
            const isSelected = selectedGoal && (selectedGoal._id || selectedGoal.id) === id;

            return (
              <div key={id} className="kai-card" style={{
                cursor: 'pointer', border: isSelected ? '2px solid #146DF7' : '2px solid transparent',
                transition: 'border-color 0.15s',
              }}
                onClick={() => setSelectedGoal(goal)}>
                <div className="kai-card-body" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: `${typeBadge.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Target size={20} style={{ color: typeBadge.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#10222F' }}>{goal.title}</span>
                        <span className="kai-badge" style={{
                          background: typeBadge.bg, color: typeBadge.color,
                          padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        }}>
                          {typeBadge.label || goal.type}
                        </span>
                        {goal.category && (
                          <span className="kai-badge" style={{
                            background: goal.category === 'HEALTH' ? '#DCFCE7' : goal.category === 'WEALTH' ? '#FEF3C7' : goal.category === 'PERSONAL' ? '#EDE9FE' : '#DBEAFE',
                            color: goal.category === 'HEALTH' ? '#166534' : goal.category === 'WEALTH' ? '#92400E' : goal.category === 'PERSONAL' ? '#6B21A8' : '#1E40AF',
                            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                          }}>
                            {goal.category}
                          </span>
                        )}
                        {goal.owner && goal.owner.id !== user?.id && (
                          <span style={{ fontSize: 11, color: '#5B6B76' }}>
                            by {goal.owner.firstName}
                          </span>
                        )}
                        <span className="kai-badge" style={{
                          background: status.bg, color: status.color,
                          padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        }}>
                          {status.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ flex: 1, maxWidth: 300 }}>
                          <div style={{ height: 6, background: '#E8EBED', borderRadius: 3 }}>
                            <div style={{
                              height: '100%', borderRadius: 3, width: `${progress}%`,
                              background: progressColor(progress), transition: 'width 0.3s',
                            }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#4C5963', minWidth: 36 }}>{progress}%</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      {goal.dueDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#5B6B76' }}>
                          <Calendar size={13} />
                          {formatDate(goal.dueDate)}
                        </div>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(goal); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                        <Trash2 size={15} />
                      </button>
                      <ChevronRight size={16} style={{ color: '#9CA3AF' }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
