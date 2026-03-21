import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { goalsApi } from '../services/api';
import {
  Target, Plus, ChevronRight, Loader2, AlertCircle, X, Trash2, Edit3,
  CheckCircle2, Clock, TrendingUp, Flag, Calendar
} from 'lucide-react';

const TYPE_BADGES = {
  OBJECTIVE: { bg: '#2563EB20', color: '#2563EB', label: 'Objective' },
  KEY_RESULT: { bg: '#EA580C20', color: '#EA580C', label: 'Key Result' },
  TARGET: { bg: '#16A34A20', color: '#16A34A', label: 'Target' },
};

const STATUS_CONFIG = {
  ON_TRACK: { bg: '#16A34A20', color: '#16A34A', label: 'On Track' },
  AT_RISK: { bg: '#EA580C20', color: '#EA580C', label: 'At Risk' },
  BEHIND: { bg: '#CB393920', color: '#CB3939', label: 'Behind' },
  COMPLETED: { bg: '#2563EB20', color: '#2563EB', label: 'Completed' },
};

export default function Goals() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('MY');

  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '', type: 'OBJECTIVE', scope: 'PERSONAL', category: 'PROFESSIONAL', metricTarget: '', endDate: '', description: '',
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
      else if (['PROFESSIONAL', 'PERSONAL', 'HEALTH', 'WEALTH'].includes(activeTab)) { params.ownerId = user?.id; params.category = activeTab; }
      const res = await goalsApi.list(params);
      setGoals(Array.isArray(res.data) ? res.data : []);
    } catch (err) { setError(err.response?.data?.error || 'Failed to load goals'); }
    finally { setLoading(false); }
  };

  const showMsg = (type, msg) => {
    if (type === 'success') { setSuccess(msg); setError(''); } else { setError(msg); setSuccess(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await goalsApi.create({ title: form.title, type: form.type, scope: form.scope || 'PERSONAL', category: form.category || 'PROFESSIONAL', metricTarget: form.metricTarget ? parseFloat(form.metricTarget) : undefined, endDate: form.endDate || undefined, description: form.description });
      setGoals(prev => [res.data, ...prev]);
      setForm({ title: '', type: 'OBJECTIVE', scope: 'PERSONAL', category: 'PROFESSIONAL', metricTarget: '', endDate: '', description: '' });
      setShowAddModal(false); showMsg('success', 'Goal created successfully');
    } catch (err) { showMsg('error', err.response?.data?.error || 'Failed to create goal'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (goal) => {
    if (!window.confirm(`Delete "${goal.title}"?`)) return;
    try {
      await goalsApi.delete(goal._id || goal.id);
      setGoals(prev => prev.filter(g => (g._id || g.id) !== (goal._id || goal.id)));
      if (selectedGoal && (selectedGoal._id || selectedGoal.id) === (goal._id || goal.id)) setSelectedGoal(null);
      showMsg('success', 'Goal deleted');
    } catch (err) { showMsg('error', err.response?.data?.error || 'Failed to delete goal'); }
  };

  const handleUpdateProgress = async (goal, newProgress) => {
    const id = goal._id || goal.id;
    try {
      await goalsApi.update(id, { progress: newProgress });
      setGoals(prev => prev.map(g => (g._id || g.id) === id ? { ...g, progress: newProgress } : g));
      if (selectedGoal && (selectedGoal._id || selectedGoal.id) === id) setSelectedGoal(prev => ({ ...prev, progress: newProgress }));
    } catch (err) { showMsg('error', err.response?.data?.error || 'Failed to update progress'); }
  };

  const getStatus = (goal) => STATUS_CONFIG[goal.status || 'ON_TRACK'] || STATUS_CONFIG['ON_TRACK'];
  const getTypeBadge = (type) => TYPE_BADGES[type] || TYPE_BADGES['OBJECTIVE'];
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
  const progressColor = (pct) => pct >= 75 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight font-[Manrope]">My Goals</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Track your professional, personal, health, and wealth goals</p>
        </div>
        <button data-testid="new-goal" onClick={() => setShowAddModal(true)} className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-1.5">
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {[
          { key: 'MY', label: 'My Goals' }, { key: 'PROFESSIONAL', label: 'Professional' },
          { key: 'PERSONAL', label: 'Personal' }, { key: 'HEALTH', label: 'Health' },
          { key: 'WEALTH', label: 'Wealth' }, { key: 'TEAM', label: 'Team Goals' },
          { key: 'COMPANY', label: 'Company Goals' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${activeTab === tab.key ? 'bg-[#7C3AED] text-white' : 'bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {(success || error) && (
        <div className={`px-4 py-3 rounded-lg mb-4 text-[13px] font-medium flex items-center gap-2 ${success ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#CB3939]/10 text-[#CB3939]'}`}>
          {success || error}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center" onClick={() => setShowAddModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[500px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[18px] font-semibold text-[var(--text-primary)] m-0">Add Goal</h3>
                <button onClick={() => setShowAddModal(false)} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)]"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Goal Title</label>
                  <input data-testid="goal-title" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What do you want to achieve?" required autoFocus />
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Type</label>
                    <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px]" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="OBJECTIVE">Objective</option><option value="KEY_RESULT">Key Result</option><option value="TARGET">Target</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Category</label>
                    <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px]" value={form.category || 'PROFESSIONAL'} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      <option value="PROFESSIONAL">Professional</option><option value="PERSONAL">Personal</option><option value="HEALTH">Health</option><option value="WEALTH">Wealth</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Due Date</label>
                    <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px]" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Target Value</label>
                  <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] outline-none text-[13px]" type="number" value={form.metricTarget} onChange={e => setForm(f => ({ ...f, metricTarget: e.target.value }))} placeholder="e.g., 100, 5000000" />
                </div>
                <div className="mb-5">
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Description</label>
                  <textarea className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] outline-none text-[13px] resize-y" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this goal..." rows={3} />
                </div>
                <div className="flex gap-2.5 justify-end">
                  <button type="button" onClick={() => setShowAddModal(false)} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors">Cancel</button>
                  <button type="submit" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors" disabled={saving}>{saving ? 'Creating...' : 'Create Goal'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Goal Detail Panel */}
      {selectedGoal && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl mb-5">
          <div className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h3 className="text-[20px] font-bold text-[var(--text-primary)] m-0">{selectedGoal.title}</h3>
                  {(() => { const tb = getTypeBadge(selectedGoal.type); return (<span className="text-[11px] px-2.5 py-0.5 rounded-md font-semibold" style={{ background: tb.bg, color: tb.color }}>{selectedGoal.type}</span>); })()}
                </div>
                {selectedGoal.description && <p className="text-[14px] text-[var(--text-secondary)] mt-1">{selectedGoal.description}</p>}
              </div>
              <button onClick={() => setSelectedGoal(null)} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)]"><X size={20} /></button>
            </div>
            <div className="flex gap-6 mb-5">
              {selectedGoal.targetMetric && <div className="text-[13px]"><span className="text-[var(--text-secondary)]">Target: </span><span className="font-semibold text-[var(--text-primary)]">{selectedGoal.targetMetric}</span></div>}
              <div className="text-[13px]"><span className="text-[var(--text-secondary)]">Due: </span><span className="font-semibold text-[var(--text-primary)]">{formatDate(selectedGoal.dueDate)}</span></div>
              <div className="text-[13px]"><span className="text-[var(--text-secondary)]">Status: </span>{(() => { const st = getStatus(selectedGoal); return <span className="font-semibold" style={{ color: st.color }}>{st.label}</span>; })()}</div>
            </div>
            <div className="mb-3">
              <div className="flex justify-between mb-1.5">
                <span className="text-[13px] font-medium text-[var(--text-secondary)]">Progress</span>
                <span className="text-[13px] font-bold text-[var(--text-primary)]">{selectedGoal.progress || 0}%</span>
              </div>
              <div className="relative h-2 bg-[var(--bg-elevated)] rounded">
                <div className="h-full rounded transition-all duration-300" style={{ width: `${selectedGoal.progress || 0}%`, background: progressColor(selectedGoal.progress || 0) }} />
              </div>
              <input type="range" min={0} max={100} value={selectedGoal.progress || 0} onChange={e => handleUpdateProgress(selectedGoal, parseInt(e.target.value))} className="w-full mt-2 accent-[#7C3AED]" />
            </div>
            {selectedGoal.keyResults && selectedGoal.keyResults.length > 0 && (
              <div className="mt-5">
                <h4 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">Key Results</h4>
                <div className="flex flex-col gap-2.5">
                  {selectedGoal.keyResults.map((kr, i) => (
                    <div key={kr._id || kr.id || i} className="p-3 bg-[var(--bg-elevated)] rounded-lg flex items-center gap-3">
                      <CheckCircle2 size={18} className="flex-shrink-0" style={{ color: (kr.progress || 0) >= 100 ? '#10B981' : 'var(--text-muted)' }} />
                      <div className="flex-1">
                        <div className="text-[13px] font-medium text-[var(--text-primary)] mb-1">{kr.name || kr.title}</div>
                        <div className="h-1 bg-[var(--border-default)] rounded-sm">
                          <div className="h-full rounded-sm" style={{ width: `${kr.progress || 0}%`, background: progressColor(kr.progress || 0) }} />
                        </div>
                      </div>
                      <span className="text-[12px] font-semibold text-[var(--text-secondary)] min-w-[36px] text-right">{kr.progress || 0}%</span>
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
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#7C3AED]" />
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-center py-16 text-[var(--text-muted)]">
          <Target size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-[15px] font-medium">No goals yet</p>
          <p className="text-[13px]">Create your first goal to start tracking progress</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {goals.map(goal => {
            const id = goal._id || goal.id;
            const status = getStatus(goal);
            const typeBadge = getTypeBadge(goal.type);
            const progress = goal.progress || 0;
            const isSelected = selectedGoal && (selectedGoal._id || selectedGoal.id) === id;
            return (
              <div key={id} className={`bg-[var(--bg-card)] border-2 rounded-xl cursor-pointer transition-colors hover:border-[#7C3AED]/30 ${isSelected ? 'border-[#7C3AED]' : 'border-[var(--border-default)]'}`}
                onClick={() => setSelectedGoal(goal)}>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-[42px] h-[42px] rounded-[10px] flex-shrink-0 flex items-center justify-center" style={{ background: `${typeBadge.color}12` }}>
                      <Target size={20} style={{ color: typeBadge.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-[14px] text-[var(--text-primary)]">{goal.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold" style={{ background: typeBadge.bg, color: typeBadge.color }}>{typeBadge.label || goal.type}</span>
                        {goal.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-semibold" style={{
                            background: goal.category === 'HEALTH' ? '#16A34A15' : goal.category === 'WEALTH' ? '#EA580C15' : goal.category === 'PERSONAL' ? '#8B3FE915' : '#2563EB15',
                            color: goal.category === 'HEALTH' ? '#16A34A' : goal.category === 'WEALTH' ? '#EA580C' : goal.category === 'PERSONAL' ? '#8B3FE9' : '#2563EB',
                          }}>{goal.category}</span>
                        )}
                        {goal.owner && goal.owner.id !== user?.id && <span className="text-[11px] text-[var(--text-muted)]">by {goal.owner.firstName}</span>}
                        <span className="text-[10px] px-2 py-0.5 rounded font-semibold" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 max-w-[300px]">
                          <div className="h-1.5 bg-[var(--bg-elevated)] rounded-sm">
                            <div className="h-full rounded-sm transition-all duration-300" style={{ width: `${progress}%`, background: progressColor(progress) }} />
                          </div>
                        </div>
                        <span className="text-[12px] font-semibold text-[var(--text-secondary)] min-w-[36px]">{progress}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {goal.dueDate && (
                        <div className="flex items-center gap-1 text-[12px] text-[var(--text-muted)]">
                          <Calendar size={13} />
                          {formatDate(goal.dueDate)}
                        </div>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(goal); }} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-[#CB3939] p-1">
                        <Trash2 size={15} />
                      </button>
                      <ChevronRight size={16} className="text-[var(--text-muted)]" />
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
