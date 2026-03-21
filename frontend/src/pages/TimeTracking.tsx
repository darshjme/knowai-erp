import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { timeTrackingApi } from '../services/api';
import {
  Play, Square, Plus, Clock, Calendar, Loader2, AlertCircle, Trash2, Edit3, X,
  Timer, BarChart3, Check
} from 'lucide-react';

const inputClass = "w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]";

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '0:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatDurationHM = (minutes) => {
  if (!minutes) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TimeTracking() {
  const dispatch = useDispatch();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerDescription, setTimerDescription] = useState('');
  const [timerProject, setTimerProject] = useState('');
  const timerRef = useRef(null);
  const timerStartRef = useRef(null);

  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    task: '', project: '', startTime: '', endTime: '', description: '', billable: false,
  });
  const [savingLog, setSavingLog] = useState(false);
  const [logFormError, setLogFormError] = useState('');
  const [weeklySummary, setWeeklySummary] = useState([]);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Time Tracking' });
    fetchEntries();
  }, []);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(Math.floor((Date.now() - timerStartRef.current) / 1000));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const fetchEntries = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await timeTrackingApi.list();
      const items = Array.isArray(res.data) ? res.data : [];
      setEntries(items);
      computeWeeklySummary(items);
    } catch (err) {
      setError(err.message || 'Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const computeWeeklySummary = (items) => {
    const dayMap = {};
    DAYS.forEach(d => { dayMap[d] = 0; });
    items.forEach(entry => {
      const date = new Date(entry.startTime || entry.date || entry.createdAt);
      const dayIndex = date.getDay();
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex];
      const minutes = entry.duration || (entry.endTime && entry.startTime
        ? Math.round((new Date(entry.endTime) - new Date(entry.startTime)) / 60000)
        : 0);
      if (dayMap[dayName] !== undefined) dayMap[dayName] += minutes;
    });
    setWeeklySummary(DAYS.map(d => ({ day: d, minutes: dayMap[d] || 0 })));
  };

  const showMsg = (type, msg) => {
    if (type === 'success') { setSuccess(msg); setError(''); }
    else { setError(msg); setSuccess(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  const startTimer = () => {
    timerStartRef.current = Date.now();
    setTimerSeconds(0);
    setTimerRunning(true);
  };

  const stopTimer = async () => {
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (timerSeconds < 5) return;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timerSeconds * 1000);
    try {
      await timeTrackingApi.create({
        description: timerDescription || 'Timer entry',
        project: timerProject || undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: Math.round(timerSeconds / 60),
      });
      setTimerDescription('');
      setTimerProject('');
      setTimerSeconds(0);
      fetchEntries();
      showMsg('success', 'Time entry saved');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to save time entry');
    }
  };

  const logFormDuration = (() => {
    if (!logForm.startTime || !logForm.endTime) return null;
    const start = new Date(`1970-01-01T${logForm.startTime}`);
    const end = new Date(`1970-01-01T${logForm.endTime}`);
    const diffMs = end - start;
    if (diffMs <= 0) return null;
    const mins = Math.round(diffMs / 60000);
    if (mins > 1440) return null;
    return mins;
  })();

  const handleLogEntry = async (e) => {
    e.preventDefault();
    setLogFormError('');
    if (logForm.startTime && logForm.endTime) {
      const start = new Date(`1970-01-01T${logForm.startTime}`);
      const end = new Date(`1970-01-01T${logForm.endTime}`);
      if (end <= start) { setLogFormError('End time must be after start time'); return; }
      const diffMinutes = Math.round((end - start) / 60000);
      if (diffMinutes > 1440) { setLogFormError('Entry cannot exceed 24 hours'); return; }
    }
    setSavingLog(true);
    try {
      const duration = logForm.startTime && logForm.endTime
        ? Math.round((new Date(`1970-01-01T${logForm.endTime}`) - new Date(`1970-01-01T${logForm.startTime}`)) / 60000)
        : 0;
      const today = new Date().toISOString().split('T')[0];
      await timeTrackingApi.create({
        task: logForm.task, project: logForm.project,
        startTime: logForm.startTime ? `${today}T${logForm.startTime}` : undefined,
        endTime: logForm.endTime ? `${today}T${logForm.endTime}` : undefined,
        duration, description: logForm.description, billable: logForm.billable,
      });
      setShowLogModal(false);
      setLogForm({ task: '', project: '', startTime: '', endTime: '', description: '', billable: false });
      setLogFormError('');
      fetchEntries();
      showMsg('success', 'Time entry logged');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to log entry');
    } finally {
      setSavingLog(false);
    }
  };

  const handleDeleteEntry = async (entry) => {
    try {
      await timeTrackingApi.delete(entry._id || entry.id);
      setEntries(prev => prev.filter(e => (e._id || e.id) !== (entry._id || entry.id)));
      showMsg('success', 'Entry deleted');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to delete entry');
    }
  };

  const getEntryDuration = (entry) => {
    if (entry.duration) return entry.duration;
    if (entry.startTime && entry.endTime) {
      return Math.round((new Date(entry.endTime) - new Date(entry.startTime)) / 60000);
    }
    return 0;
  };

  const totalTodayMinutes = entries.reduce((sum, e) => sum + getEntryDuration(e), 0);
  const maxWeekMinutes = weeklySummary.length > 0 ? Math.max(...weeklySummary.map(d => d.minutes), 1) : 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)] m-0">Time Tracking</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Track your work hours and manage time entries</p>
        </div>
        <button data-testid="log-entry-btn" onClick={() => setShowLogModal(true)} className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 flex items-center gap-1.5">
          <Plus size={16} /> Log Entry
        </button>
      </div>

      {(success || error) && (
        <div className={`px-4 py-3 rounded-lg mb-4 text-[13px] font-medium flex items-center gap-2 ${success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {success || error}
        </div>
      )}

      {/* Timer */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className={`text-[36px] font-bold font-mono min-w-[160px] tracking-wider ${timerRunning ? 'text-[#7C3AED]' : 'text-[var(--text-primary)]'}`}>
            {formatDuration(timerSeconds)}
          </div>
          <div className="flex-1 flex gap-2.5 min-w-[200px]">
            <input data-testid="timer-description" className={`${inputClass} flex-1`} placeholder="What are you working on?"
              value={timerDescription} onChange={e => setTimerDescription(e.target.value)} disabled={timerRunning} />
            <input className={`${inputClass} w-[150px]`} placeholder="Project"
              value={timerProject} onChange={e => setTimerProject(e.target.value)} disabled={timerRunning} />
          </div>
          {timerRunning ? (
            <button data-testid="stop-timer" onClick={stopTimer}
              className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center border-none cursor-pointer hover:bg-red-600 transition-colors">
              <Square size={20} fill="#fff" />
            </button>
          ) : (
            <button data-testid="start-timer" onClick={startTimer}
              className="w-12 h-12 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center border-none cursor-pointer hover:bg-[#7C3AED]/90 transition-colors">
              <Play size={20} fill="#fff" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-5">
        {/* Today's Entries */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)] m-0">Today's Entries</h3>
            <span className="text-[13px] text-[var(--text-secondary)]">
              Total: <strong className="text-[var(--text-primary)]">{formatDurationHM(totalTodayMinutes)}</strong>
            </span>
          </div>

          {loading ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-center py-10 text-[var(--text-secondary)]">
              <Timer size={36} className="mx-auto mb-2.5 opacity-30" />
              <p className="text-[14px] font-medium">No entries today</p>
              <p className="text-[13px]">Start the timer or log an entry manually</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {entries.map(entry => {
                const dur = getEntryDuration(entry);
                return (
                  <div key={entry._id || entry.id} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 py-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[14px] text-[var(--text-primary)]">
                            {typeof entry.task === 'object' ? entry.task?.title : entry.task || entry.description || 'Untitled entry'}
                          </span>
                          {entry.billable && (
                            <span className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 rounded font-medium">Billable</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[12px] text-[var(--text-secondary)]">
                          {entry.project && <span className="text-[#7C3AED] font-medium">{typeof entry.project === 'object' ? entry.project?.name : entry.project}</span>}
                          {entry.description && <span>{entry.description}</span>}
                          {entry.startTime && (
                            <span>
                              {new Date(entry.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              {entry.endTime && ` - ${new Date(entry.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[15px] font-mono text-[var(--text-primary)]">{formatDurationHM(dur)}</span>
                        <button data-testid={`delete-entry-${entry._id || entry.id}`} onClick={() => handleDeleteEntry(entry)}
                          className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] p-1 hover:text-red-500 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Weekly Summary */}
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">Weekly Summary</h3>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
            <div className="flex items-end gap-2.5 h-[200px] px-1">
              {weeklySummary.map((day, i) => {
                const height = maxWeekMinutes > 0 ? (day.minutes / maxWeekMinutes) * 160 : 0;
                const isToday = new Date().getDay() === (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day.day) + 1) % 7;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                      {day.minutes > 0 ? formatDurationHM(day.minutes) : ''}
                    </span>
                    <div className="w-full max-w-[36px] rounded-t-md transition-all duration-300" style={{
                      height: Math.max(height, 4),
                      background: isToday
                        ? 'linear-gradient(180deg, #7C3AED 0%, #5B21B6 100%)'
                        : day.minutes > 0 ? 'var(--border-default)' : 'var(--bg-elevated)',
                    }} />
                    <span className={`text-[11px] ${isToday ? 'font-bold text-[#7C3AED]' : 'text-[var(--text-secondary)]'}`}>
                      {day.day}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-[var(--border-default)] mt-4 pt-3 text-center">
              <span className="text-[12px] text-[var(--text-secondary)]">Total this week: </span>
              <span className="text-[14px] font-bold text-[var(--text-primary)]">
                {formatDurationHM(weeklySummary.reduce((s, d) => s + d.minutes, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Log Entry Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center" onClick={() => setShowLogModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[480px] max-w-[95vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[18px] font-semibold text-[var(--text-primary)] m-0">Log Time Entry</h3>
                <button onClick={() => setShowLogModal(false)} className="bg-transparent border-none cursor-pointer text-[var(--text-secondary)] p-1">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleLogEntry}>
                {logFormError && (
                  <div className="px-3.5 py-2.5 rounded-lg mb-4 text-[13px] font-medium bg-red-50 text-red-800 flex items-center gap-2">
                    <AlertCircle size={16} /> {logFormError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">Task</label>
                    <input className={inputClass} value={logForm.task} onChange={e => setLogForm(f => ({ ...f, task: e.target.value }))} placeholder="Task name" required />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">Project</label>
                    <input className={inputClass} value={logForm.project} onChange={e => setLogForm(f => ({ ...f, project: e.target.value }))} placeholder="Project name" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">Start Time</label>
                    <input className={inputClass} type="time" value={logForm.startTime} onChange={e => { setLogForm(f => ({ ...f, startTime: e.target.value })); setLogFormError(''); }} required />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">End Time</label>
                    <input className={inputClass} type="time" value={logForm.endTime} onChange={e => { setLogForm(f => ({ ...f, endTime: e.target.value })); setLogFormError(''); }} required />
                  </div>
                </div>
                {logFormDuration !== null && (
                  <div className="px-3.5 py-2 rounded-lg mb-4 text-[13px] font-semibold bg-[#7C3AED]/10 text-[#7C3AED] flex items-center gap-2">
                    <Clock size={16} /> Duration: {formatDurationHM(logFormDuration)}
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">Description</label>
                  <textarea className={`${inputClass} resize-y`} value={logForm.description} onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))} placeholder="What did you work on?" rows={3} />
                </div>
                <div className="mb-5">
                  <label className="flex items-center gap-2 cursor-pointer text-[14px] text-[var(--text-secondary)]">
                    <div className="w-10 h-[22px] rounded-full cursor-pointer relative transition-colors" style={{ background: logForm.billable ? '#7C3AED' : 'var(--border-default)' }}
                      onClick={() => setLogForm(f => ({ ...f, billable: !f.billable }))}>
                      <span className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-all shadow-sm" style={{ left: logForm.billable ? 20 : 2 }} />
                    </div>
                    Billable
                  </label>
                </div>
                <div className="flex gap-2.5 justify-end">
                  <button type="button" onClick={() => setShowLogModal(false)} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-medium">Cancel</button>
                  <button type="submit" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 disabled:opacity-70" disabled={savingLog}>
                    {savingLog ? 'Saving...' : 'Log Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
