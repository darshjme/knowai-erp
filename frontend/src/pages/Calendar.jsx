import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { calendarApi, tasksApi } from '../services/api';

const EVENT_CATEGORIES = [
  { key: 'meeting', label: 'Meeting', color: '#146DF7' },
  { key: 'deadline', label: 'Deadline', color: '#CB3939' },
  { key: 'followup', label: 'Follow-up', color: '#16A34A' },
  { key: 'personal', label: 'Personal', color: '#8B3FE9' },
  { key: 'task', label: 'Task', color: '#EA580C' },
];

const VIEWS = ['month', 'week', 'day'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function getCategory(event) {
  const cat = event.category || event.type || 'meeting';
  return EVENT_CATEGORIES.find(c => c.key === cat) || EVENT_CATEGORIES[0];
}

function toLocalDatetimeStr(date) {
  const d = new Date(date);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function Calendar() {
  const dispatch = useDispatch();

  const [events, setEvents] = useState([]);
  const [taskEvents, setTaskEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [dragEvent, setDragEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '', start: '', end: '', category: 'meeting', description: '',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Calendar' });
    fetchEvents();
    fetchTasks();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await calendarApi.list();
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await tasksApi.list({ limit: 100 });
      const tasks = Array.isArray(res.data) ? res.data : [];
      const taskEvts = tasks
        .filter(t => t.dueDate || t.deadline)
        .map(t => ({
          _id: `task-${t._id || t.id}`,
          title: t.title || t.name,
          start: t.dueDate || t.deadline,
          end: t.dueDate || t.deadline,
          category: 'task',
          isTask: true,
          taskId: t._id || t.id,
        }));
      setTaskEvents(taskEvts);
    } catch { /* silent */ }
  };

  const allEvents = useMemo(() => [...events, ...taskEvents], [events, taskEvents]);

  const handleAddEvent = (date) => {
    const d = date || new Date();
    setNewEvent({
      title: '',
      start: toLocalDatetimeStr(d),
      end: toLocalDatetimeStr(new Date(d.getTime() + 3600000)),
      category: 'meeting',
      description: '',
    });
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event) => {
    if (event.isTask) return;
    setNewEvent({
      title: event.title || '',
      start: event.start ? toLocalDatetimeStr(event.start) : '',
      end: event.end ? toLocalDatetimeStr(event.end) : '',
      category: event.category || event.type || 'meeting',
      description: event.description || '',
    });
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim()) {
      toast.warning('Event title is required');
      return;
    }
    if (!newEvent.start) {
      toast.warning('Start date is required');
      return;
    }
    try {
      if (editingEvent) {
        await calendarApi.update(editingEvent._id || editingEvent.id, {
          title: newEvent.title,
          start: newEvent.start,
          end: newEvent.end || newEvent.start,
          category: newEvent.category,
          description: newEvent.description,
        });
        toast.success('Event updated');
      } else {
        await calendarApi.create({
          title: newEvent.title,
          start: newEvent.start,
          end: newEvent.end || newEvent.start,
          category: newEvent.category,
          description: newEvent.description,
        });
        toast.success('Event created');
      }
      setShowEventModal(false);
      fetchEvents();
    } catch {
      toast.error('Failed to save event');
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    try {
      await calendarApi.delete(editingEvent._id || editingEvent.id);
      toast.success('Event deleted');
      setShowEventModal(false);
      setEditingEvent(null);
      fetchEvents();
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const handleDrop = async (event, newDate) => {
    if (event.isTask) return;
    const oldStart = new Date(event.start);
    const diff = newDate.getTime() - new Date(oldStart.getFullYear(), oldStart.getMonth(), oldStart.getDate()).getTime();
    const newStart = new Date(oldStart.getTime() + diff);
    const newEnd = event.end ? new Date(new Date(event.end).getTime() + diff) : newStart;
    try {
      await calendarApi.update(event._id || event.id, {
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      });
      toast.success('Event rescheduled');
      fetchEvents();
    } catch {
      toast.error('Failed to reschedule');
    }
  };

  // Navigation
  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // Calendar grid calculations
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const days = [];
    // Previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, daysInPrev - i), isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Next month fill
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  };

  const getWeekDays = () => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const wd = new Date(start);
      wd.setDate(start.getDate() + i);
      days.push({ date: wd, isCurrentMonth: true });
    }
    return days;
  };

  const getEventsForDay = (date) => {
    return allEvents.filter(evt => {
      const evtDate = new Date(evt.start || evt.date);
      return isSameDay(evtDate, date);
    });
  };

  const today = new Date();

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return allEvents
      .filter(e => new Date(e.start || e.date) >= now)
      .sort((a, b) => new Date(a.start || a.date) - new Date(b.start || b.date))
      .slice(0, 10);
  }, [allEvents]);

  const headerText = view === 'month'
    ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : view === 'week'
      ? (() => {
        const days = getWeekDays();
        return `${formatDate(days[0].date)} - ${formatDate(days[6].date)}`;
      })()
      : currentDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const renderDayCell = (dayObj) => {
    const { date, isCurrentMonth } = dayObj;
    const isToday = isSameDay(date, today);
    const dayEvents = getEventsForDay(date);

    return (
      <div
        key={date.toISOString()}
        onClick={() => handleAddEvent(date)}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          if (dragEvent) {
            handleDrop(dragEvent, date);
            setDragEvent(null);
          }
        }}
        style={{
          minHeight: view === 'month' ? 100 : 120,
          padding: 4,
          border: '1px solid var(--kai-border-light)',
          background: isToday ? 'rgba(20,109,247,0.04)' : 'transparent',
          opacity: isCurrentMonth ? 1 : 0.4,
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <div style={{
          fontSize: 12,
          fontWeight: isToday ? 700 : 500,
          color: isToday ? '#fff' : 'var(--kai-text)',
          background: isToday ? 'var(--kai-primary)' : 'transparent',
          width: 24,
          height: 24,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 2,
        }}>
          {date.getDate()}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {dayEvents.slice(0, 3).map((evt) => {
            const cat = getCategory(evt);
            return (
              <div
                key={evt._id || evt.id}
                draggable={!evt.isTask}
                onDragStart={() => setDragEvent(evt)}
                onClick={e => { e.stopPropagation(); handleEditEvent(evt); }}
                style={{
                  fontSize: 11,
                  padding: '1px 4px',
                  borderRadius: 3,
                  background: cat.color + '20',
                  color: cat.color,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: evt.isTask ? 'default' : 'grab',
                  borderLeft: `2px solid ${cat.color}`,
                }}
              >
                {evt.title}
              </div>
            );
          })}
          {dayEvents.length > 3 && (
            <div
              onClick={e => { e.stopPropagation(); setSelectedDayEvents({ date, events: dayEvents }); }}
              style={{ fontSize: 10, color: 'var(--kai-primary)', fontWeight: 600, cursor: 'pointer', paddingLeft: 4 }}
            >
              +{dayEvents.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWeekTimeGrid = () => {
    const days = view === 'week' ? getWeekDays() : [{ date: new Date(currentDate), isCurrentMonth: true }];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div style={{ display: 'flex', flex: 1, overflowY: 'auto' }}>
        {/* Time labels */}
        <div style={{ width: 60, flexShrink: 0 }}>
          {hours.map(h => (
            <div key={h} style={{ height: 48, fontSize: 11, color: 'var(--kai-text-muted)', textAlign: 'right', paddingRight: 8, paddingTop: 2 }}>
              {h === 0 ? '' : `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`}
            </div>
          ))}
        </div>
        {/* Day columns */}
        {days.map(dayObj => {
          const dayEvents = getEventsForDay(dayObj.date);
          const isToday = isSameDay(dayObj.date, today);
          return (
            <div
              key={dayObj.date.toISOString()}
              style={{ flex: 1, borderLeft: '1px solid var(--kai-border-light)', position: 'relative' }}
              onClick={() => handleAddEvent(dayObj.date)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (dragEvent) { handleDrop(dragEvent, dayObj.date); setDragEvent(null); }
              }}
            >
              {hours.map(h => (
                <div key={h} style={{ height: 48, borderBottom: '1px solid var(--kai-border-light)', background: isToday && h === today.getHours() ? 'rgba(20,109,247,0.04)' : 'transparent' }} />
              ))}
              {/* Events overlay */}
              {dayEvents.map(evt => {
                const start = new Date(evt.start || evt.date);
                const end = evt.end ? new Date(evt.end) : new Date(start.getTime() + 3600000);
                const top = (start.getHours() + start.getMinutes() / 60) * 48;
                const height = Math.max(((end - start) / 3600000) * 48, 20);
                const cat = getCategory(evt);
                return (
                  <div
                    key={evt._id || evt.id}
                    draggable={!evt.isTask}
                    onDragStart={() => setDragEvent(evt)}
                    onClick={e => { e.stopPropagation(); handleEditEvent(evt); }}
                    style={{
                      position: 'absolute',
                      top,
                      left: 2,
                      right: 2,
                      height,
                      background: cat.color + '20',
                      borderLeft: `3px solid ${cat.color}`,
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 11,
                      fontWeight: 500,
                      color: cat.color,
                      overflow: 'hidden',
                      cursor: evt.isTask ? 'default' : 'grab',
                      zIndex: 1,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{evt.title}</div>
                    <div style={{ fontSize: 10, opacity: 0.8 }}>{formatTime(evt.start)}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Calendar</h1>
          <p>Schedule and manage events</p>
        </div>
        <div className="page-actions">
          <button className="kai-btn kai-btn-primary" onClick={() => handleAddEvent()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Event
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden' }}>
        {/* Main Calendar */}
        <div style={{ flex: '1 1 500px', minWidth: 0, overflow: 'hidden' }}>
          <div className="kai-card">
            {/* Calendar Toolbar */}
            <div className="kai-card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => navigate(-1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={goToday}>Today</button>
                <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => navigate(1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <h6 style={{ margin: '0 0 0 8px', fontSize: 16, fontWeight: 700 }}>{headerText}</h6>
              </div>
              <div style={{ display: 'flex', gap: 4, background: 'var(--kai-bg)', padding: 3, borderRadius: 'var(--kai-radius)' }}>
                {VIEWS.map(v => (
                  <button
                    key={v}
                    className={`kai-btn kai-btn-sm ${view === v ? 'kai-btn-primary' : 'kai-btn-outline'}`}
                    onClick={() => setView(v)}
                    style={{ textTransform: 'capitalize', borderColor: 'transparent' }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="kai-card-body" style={{ padding: 0, overflow: 'hidden', width: '100%' }}>
              {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>Loading calendar...</div>
              ) : view === 'month' ? (
                <>
                  {/* Weekday header */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--kai-border)' }}>
                    {WEEKDAYS.map(d => (
                      <div key={d} style={{ padding: '8px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--kai-text-muted)', textAlign: 'center' }}>
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Days grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', width: '100%', tableLayout: 'fixed' }}>
                    {getMonthDays().map(renderDayCell)}
                  </div>
                </>
              ) : (
                <>
                  {/* Week/Day header */}
                  {view === 'week' && (
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--kai-border)' }}>
                      <div style={{ width: 60 }} />
                      {getWeekDays().map(dayObj => {
                        const isToday = isSameDay(dayObj.date, today);
                        return (
                          <div key={dayObj.date.toISOString()} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderLeft: '1px solid var(--kai-border-light)' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-text-muted)', textTransform: 'uppercase' }}>
                              {WEEKDAYS[dayObj.date.getDay()]}
                            </div>
                            <div style={{
                              fontSize: 18, fontWeight: 700, color: isToday ? '#fff' : 'var(--kai-text)',
                              background: isToday ? 'var(--kai-primary)' : 'transparent',
                              width: 32, height: 32, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {dayObj.date.getDate()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ height: 500, overflowY: 'auto' }}>
                    {renderWeekTimeGrid()}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {EVENT_CATEGORIES.map(cat => (
              <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--kai-text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: cat.color }} />
                {cat.label}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events Side Panel */}
        <div style={{ width: 300, flex: '0 1 300px', minWidth: 0 }}>
          <div className="kai-card">
            <div className="kai-card-header">
              <h6 style={{ margin: 0 }}>Upcoming Events</h6>
            </div>
            <div className="kai-card-body" style={{ padding: 0, maxHeight: 500, overflowY: 'auto' }}>
              {upcomingEvents.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--kai-text-muted)', fontSize: 13 }}>No upcoming events</div>
              ) : (
                upcomingEvents.map(evt => {
                  const cat = getCategory(evt);
                  return (
                    <div
                      key={evt._id || evt.id}
                      onClick={() => handleEditEvent(evt)}
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--kai-border-light)',
                        cursor: evt.isTask ? 'default' : 'pointer',
                        transition: 'var(--kai-transition)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--kai-surface-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 4, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text)', marginBottom: 2 }} className="truncate">
                          {evt.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {formatDate(evt.start || evt.date)} {formatTime(evt.start || evt.date)}
                        </div>
                        <span className="kai-badge" style={{ marginTop: 4, fontSize: 10, background: cat.color + '20', color: cat.color }}>
                          {cat.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {showEventModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowEventModal(false)} />
          <div className="kai-card" style={{ position: 'relative', width: 480, maxWidth: '90vw', zIndex: 1 }}>
            <div className="kai-card-header">
              <h5>{editingEvent ? 'Edit Event' : 'Add Event'}</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowEventModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSaveEvent}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="kai-label">Title</label>
                  <input className="kai-input" placeholder="Event title" value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="kai-label">Start</label>
                    <input className="kai-input" type="datetime-local" value={newEvent.start} onChange={e => setNewEvent(p => ({ ...p, start: e.target.value }))} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="kai-label">End</label>
                    <input className="kai-input" type="datetime-local" value={newEvent.end} onChange={e => setNewEvent(p => ({ ...p, end: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="kai-label">Category</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {EVENT_CATEGORIES.filter(c => c.key !== 'task').map(cat => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setNewEvent(p => ({ ...p, category: cat.key }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 'var(--kai-radius-pill)',
                          border: newEvent.category === cat.key ? `2px solid ${cat.color}` : '2px solid var(--kai-border)',
                          background: newEvent.category === cat.key ? cat.color + '15' : 'transparent',
                          color: newEvent.category === cat.key ? cat.color : 'var(--kai-text-muted)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'var(--kai-transition)',
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="kai-label">Description</label>
                  <textarea
                    className="kai-input"
                    rows={3}
                    placeholder="Optional description..."
                    value={newEvent.description}
                    onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  {editingEvent && (
                    <button type="button" className="kai-btn kai-btn-danger kai-btn-sm" onClick={handleDeleteEvent}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      Delete
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowEventModal(false)}>Cancel</button>
                  <button type="submit" className="kai-btn kai-btn-primary">
                    {editingEvent ? 'Update' : 'Create'} Event
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day Events Popup */}
      {selectedDayEvents && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} onClick={() => setSelectedDayEvents(null)} />
          <div className="kai-card" style={{ position: 'relative', width: 380, maxWidth: '90vw', zIndex: 1 }}>
            <div className="kai-card-header">
              <h5>{formatDate(selectedDayEvents.date)}</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setSelectedDayEvents(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="kai-card-body" style={{ padding: 0, maxHeight: 400, overflowY: 'auto' }}>
              {selectedDayEvents.events.map(evt => {
                const cat = getCategory(evt);
                return (
                  <div
                    key={evt._id || evt.id}
                    onClick={() => { setSelectedDayEvents(null); handleEditEvent(evt); }}
                    style={{ display: 'flex', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--kai-border-light)', cursor: 'pointer' }}
                  >
                    <div style={{ width: 4, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{evt.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>{formatTime(evt.start)} {evt.end ? `- ${formatTime(evt.end)}` : ''}</div>
                      <span className="kai-badge" style={{ marginTop: 4, fontSize: 10, background: cat.color + '20', color: cat.color }}>{cat.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
