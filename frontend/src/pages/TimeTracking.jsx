import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { timeTrackingApi } from '../services/api';
import {
  Play, Square, Plus, Clock, Calendar, Loader2, AlertCircle, Trash2, Edit3, X,
  Timer, BarChart3, Check
} from 'lucide-react';

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

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerDescription, setTimerDescription] = useState('');
  const [timerProject, setTimerProject] = useState('');
  const timerRef = useRef(null);
  const timerStartRef = useRef(null);

  // Log Entry modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    task: '', project: '', startTime: '', endTime: '', description: '', billable: false,
  });
  const [savingLog, setSavingLog] = useState(false);

  // Weekly summary
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
    try {
      const res = await timeTrackingApi.list({ period: 'today' });
      const data = res;
      const items = Array.isArray(res.data) ? res.data : [];
      setEntries(items);

      // Compute weekly summary from entries or use API data
      if (data.weeklySummary) {
        setWeeklySummary(data.weeklySummary);
      } else {
        // Fetch full week data
        try {
          const weekData = await timeTrackingApi.list({ period: 'week' });
          const weekItems = Array.isArray(weekData.data) ? weekData.data : [];
          computeWeeklySummary(weekItems);
        } catch {
          computeWeeklySummary(items);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load time entries');
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

    if (timerSeconds < 5) return; // ignore very short timers

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

  const handleLogEntry = async (e) => {
    e.preventDefault();
    setSavingLog(true);
    try {
      const duration = logForm.startTime && logForm.endTime
        ? Math.round((new Date(`1970-01-01T${logForm.endTime}`) - new Date(`1970-01-01T${logForm.startTime}`)) / 60000)
        : 0;

      const today = new Date().toISOString().split('T')[0];
      await timeTrackingApi.create({
        task: logForm.task,
        project: logForm.project,
        startTime: logForm.startTime ? `${today}T${logForm.startTime}` : undefined,
        endTime: logForm.endTime ? `${today}T${logForm.endTime}` : undefined,
        duration,
        description: logForm.description,
        billable: logForm.billable,
      });
      setShowLogModal(false);
      setLogForm({ task: '', project: '', startTime: '', endTime: '', description: '', billable: false });
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
      <div className="page-header">
        <div>
          <h1>Time Tracking</h1>
          <p>Track your work hours and manage time entries</p>
        </div>
        <button onClick={() => setShowLogModal(true)} className="kai-btn kai-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Log Entry
        </button>
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

      {/* Timer */}
      <div className="kai-card" style={{ marginBottom: 24 }}>
        <div className="kai-card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{
              fontSize: 36, fontWeight: 700, fontFamily: 'monospace', color: timerRunning ? '#146DF7' : '#10222F',
              minWidth: 160, letterSpacing: 1,
            }}>
              {formatDuration(timerSeconds)}
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 10, minWidth: 200 }}>
              <input className="kai-input" placeholder="What are you working on?"
                value={timerDescription} onChange={e => setTimerDescription(e.target.value)}
                style={{ flex: 1 }} disabled={timerRunning} />
              <input className="kai-input" placeholder="Project"
                value={timerProject} onChange={e => setTimerProject(e.target.value)}
                style={{ width: 150 }} disabled={timerRunning} />
            </div>
            {timerRunning ? (
              <button onClick={stopTimer} className="kai-btn"
                style={{ background: '#EF4444', color: '#fff', border: 'none', width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Square size={20} fill="#fff" />
              </button>
            ) : (
              <button onClick={startTimer} className="kai-btn kai-btn-primary"
                style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Play size={20} fill="#fff" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)', gap: 20 }}>
        {/* Today's Entries */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#10222F', margin: 0 }}>
              Today's Entries
            </h3>
            <span style={{ fontSize: 13, color: '#5B6B76' }}>
              Total: <strong style={{ color: '#10222F' }}>{formatDurationHM(totalTodayMinutes)}</strong>
            </span>
          </div>

          {loading ? (
            <div className="kai-card">
              <div className="kai-card-body" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#146DF7' }} />
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className="kai-card">
              <div className="kai-card-body" style={{ textAlign: 'center', padding: 40, color: '#5B6B76' }}>
                <Timer size={36} style={{ marginBottom: 10, opacity: 0.3 }} />
                <p style={{ fontSize: 14, fontWeight: 500 }}>No entries today</p>
                <p style={{ fontSize: 13 }}>Start the timer or log an entry manually</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entries.map(entry => {
                const dur = getEntryDuration(entry);
                return (
                  <div key={entry._id || entry.id} className="kai-card">
                    <div className="kai-card-body" style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: '#10222F' }}>
                              {entry.task || entry.description || 'Untitled entry'}
                            </span>
                            {entry.billable && (
                              <span className="kai-badge" style={{ background: '#D1FAE5', color: '#065F46', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
                                Billable
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#5B6B76' }}>
                            {entry.project && <span style={{ color: '#146DF7', fontWeight: 500 }}>{entry.project}</span>}
                            {entry.description && entry.task && <span>{entry.description}</span>}
                            {entry.startTime && (
                              <span>
                                {new Date(entry.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                {entry.endTime && ` - ${new Date(entry.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'monospace', color: '#10222F' }}>
                            {formatDurationHM(dur)}
                          </span>
                          <button onClick={() => handleDeleteEntry(entry)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
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
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#10222F', marginBottom: 12 }}>Weekly Summary</h3>
          <div className="kai-card">
            <div className="kai-card-body">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 200, padding: '0 4px' }}>
                {weeklySummary.map((day, i) => {
                  const height = maxWeekMinutes > 0 ? (day.minutes / maxWeekMinutes) * 160 : 0;
                  const isToday = new Date().getDay() === (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day.day) + 1) % 7;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: '#5B6B76', fontWeight: 500 }}>
                        {day.minutes > 0 ? formatDurationHM(day.minutes) : ''}
                      </span>
                      <div style={{
                        width: '100%', maxWidth: 36, height: Math.max(height, 4), borderRadius: '6px 6px 0 0',
                        background: isToday
                          ? 'linear-gradient(180deg, #146DF7 0%, #0148A7 100%)'
                          : day.minutes > 0 ? '#CBD5E0' : '#F0F2F4',
                        transition: 'height 0.3s',
                      }} />
                      <span style={{
                        fontSize: 11, fontWeight: isToday ? 700 : 400,
                        color: isToday ? '#146DF7' : '#5B6B76',
                      }}>
                        {day.day}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ borderTop: '1px solid #E8EBED', marginTop: 16, paddingTop: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: '#5B6B76' }}>Total this week: </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#10222F' }}>
                  {formatDurationHM(weeklySummary.reduce((s, d) => s + d.minutes, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Log Entry Modal */}
      {showLogModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowLogModal(false)}>
          <div className="kai-card" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div className="kai-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#10222F', margin: 0 }}>Log Time Entry</h3>
                <button onClick={() => setShowLogModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5B6B76' }}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleLogEntry}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label className="kai-label">Task</label>
                    <input className="kai-input" value={logForm.task} onChange={e => setLogForm(f => ({ ...f, task: e.target.value }))}
                      placeholder="Task name" required />
                  </div>
                  <div>
                    <label className="kai-label">Project</label>
                    <input className="kai-input" value={logForm.project} onChange={e => setLogForm(f => ({ ...f, project: e.target.value }))}
                      placeholder="Project name" />
                  </div>
                  <div>
                    <label className="kai-label">Start Time</label>
                    <input className="kai-input" type="time" value={logForm.startTime}
                      onChange={e => setLogForm(f => ({ ...f, startTime: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="kai-label">End Time</label>
                    <input className="kai-input" type="time" value={logForm.endTime}
                      onChange={e => setLogForm(f => ({ ...f, endTime: e.target.value }))} required />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="kai-label">Description</label>
                  <textarea className="kai-input" value={logForm.description}
                    onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="What did you work on?" rows={3} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#4C5963' }}>
                    <div style={{
                      width: 40, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative',
                      background: logForm.billable ? '#146DF7' : '#CBD5E0', transition: 'background 0.2s',
                    }}
                      onClick={() => setLogForm(f => ({ ...f, billable: !f.billable }))}>
                      <span style={{
                        position: 'absolute', top: 2, left: logForm.billable ? 20 : 2,
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }} />
                    </div>
                    Billable
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowLogModal(false)} className="kai-btn">Cancel</button>
                  <button type="submit" className="kai-btn kai-btn-primary" disabled={savingLog}>
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
