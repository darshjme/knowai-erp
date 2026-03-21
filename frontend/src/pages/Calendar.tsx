import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { calendarApi, tasksApi } from '../services/api';

const EVENT_CATEGORIES = [
  { key: 'meeting', label: 'Meeting', color: '#111827' },
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
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, daysInPrev - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
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
        className={`min-h-[100px] p-1 border border-[var(--border-default)] cursor-pointer relative ${isToday ? 'bg-[#7C3AED]/5' : 'bg-transparent'} ${!isCurrentMonth ? 'opacity-40' : ''}`}
      >
        <div className={`text-[12px] w-6 h-6 rounded-full flex items-center justify-center mb-0.5 ${isToday ? 'font-bold text-white bg-[#7C3AED]' : 'font-medium text-[var(--text-primary)]'}`}>
          {date.getDate()}
        </div>
        <div className="flex flex-col gap-px">
          {dayEvents.slice(0, 3).map((evt) => {
            const cat = getCategory(evt);
            return (
              <div
                key={evt._id || evt.id}
                draggable={!evt.isTask}
                onDragStart={() => setDragEvent(evt)}
                onClick={e => { e.stopPropagation(); handleEditEvent(evt); }}
                className="text-[11px] px-1 py-px rounded-[3px] font-medium overflow-hidden text-ellipsis whitespace-nowrap"
                style={{
                  background: cat.color + '20',
                  color: cat.color,
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
              className="text-[10px] text-[#7C3AED] font-semibold cursor-pointer pl-1"
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
      <div className="flex flex-1 overflow-y-auto">
        {/* Time labels */}
        <div className="w-[60px] flex-shrink-0">
          {hours.map(h => (
            <div key={h} className="h-12 text-[11px] text-[var(--text-muted)] text-right pr-2 pt-0.5">
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
              className="flex-1 border-l border-[var(--border-default)] relative"
              onClick={() => handleAddEvent(dayObj.date)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (dragEvent) { handleDrop(dragEvent, dayObj.date); setDragEvent(null); }
              }}
            >
              {hours.map(h => (
                <div key={h} className={`h-12 border-b border-[var(--border-default)] ${isToday && h === today.getHours() ? 'bg-[#7C3AED]/5' : ''}`} />
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
                    className="absolute left-0.5 right-0.5 rounded overflow-hidden z-[1]"
                    style={{
                      top,
                      height,
                      background: cat.color + '20',
                      borderLeft: `3px solid ${cat.color}`,
                      padding: '2px 6px',
                      fontSize: 11,
                      fontWeight: 500,
                      color: cat.color,
                      cursor: evt.isTask ? 'default' : 'grab',
                    }}
                  >
                    <div className="font-semibold">{evt.title}</div>
                    <div className="text-[10px] opacity-80">{formatTime(evt.start)}</div>
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight font-[Manrope]">Calendar</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Schedule and manage events</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="add-event-btn"
            className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-2"
            onClick={() => handleAddEvent()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Event
          </button>
        </div>
      </div>

      <div className="flex gap-5 flex-wrap max-w-full overflow-hidden">
        {/* Main Calendar */}
        <div className="flex-[1_1_500px] min-w-0 overflow-hidden">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
            {/* Calendar Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)] flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <button data-testid="nav-prev" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1.5 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => navigate(-1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button data-testid="nav-today" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={goToday}>Today</button>
                <button data-testid="nav-next" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1.5 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => navigate(1)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <h6 className="ml-2 text-[16px] font-bold text-[var(--text-primary)] m-0">{headerText}</h6>
              </div>
              <div className="flex gap-1 bg-[var(--bg-elevated)] p-0.5 rounded-lg">
                {VIEWS.map(v => (
                  <button
                    key={v}
                    data-testid={`view-${v}`}
                    className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold capitalize transition-colors border-transparent ${view === v ? 'bg-[#7C3AED] text-white' : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
                    onClick={() => setView(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-0 overflow-hidden w-full">
              {loading ? (
                <div className="py-16 text-center text-[var(--text-muted)]">Loading calendar...</div>
              ) : view === 'month' ? (
                <>
                  {/* Weekday header */}
                  <div className="grid grid-cols-7 border-b border-[var(--border-default)]">
                    {WEEKDAYS.map(d => (
                      <div key={d} className="py-2 px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] text-center">
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Days grid */}
                  <div className="grid grid-cols-7 w-full">
                    {getMonthDays().map(renderDayCell)}
                  </div>
                </>
              ) : (
                <>
                  {/* Week/Day header */}
                  {view === 'week' && (
                    <div className="flex border-b border-[var(--border-default)]">
                      <div className="w-[60px]" />
                      {getWeekDays().map(dayObj => {
                        const isToday = isSameDay(dayObj.date, today);
                        return (
                          <div key={dayObj.date.toISOString()} className="flex-1 text-center py-2 px-1 border-l border-[var(--border-default)]">
                            <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">
                              {WEEKDAYS[dayObj.date.getDay()]}
                            </div>
                            <div className={`text-[18px] font-bold inline-flex items-center justify-center w-8 h-8 rounded-full ${isToday ? 'text-white bg-[#7C3AED]' : 'text-[var(--text-primary)]'}`}>
                              {dayObj.date.getDate()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="h-[500px] overflow-y-auto">
                    {renderWeekTimeGrid()}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 flex-wrap">
            {EVENT_CATEGORIES.map(cat => (
              <div key={cat.key} className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cat.color }} />
                {cat.label}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events Side Panel */}
        <div className="w-[300px] flex-[0_1_300px] min-w-0">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <h6 className="text-[14px] font-semibold text-[var(--text-primary)] m-0">Upcoming Events</h6>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {upcomingEvents.length === 0 ? (
                <div className="py-6 text-center text-[var(--text-muted)] text-[13px]">No upcoming events</div>
              ) : (
                upcomingEvents.map(evt => {
                  const cat = getCategory(evt);
                  return (
                    <div
                      key={evt._id || evt.id}
                      onClick={() => handleEditEvent(evt)}
                      className={`flex gap-3 px-4 py-3 border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--bg-elevated)] ${evt.isTask ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="w-1 rounded-sm flex-shrink-0" style={{ background: cat.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[var(--text-primary)] mb-0.5 truncate">
                          {evt.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {formatDate(evt.start || evt.date)} {formatTime(evt.start || evt.date)}
                        </div>
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cat.color + '20', color: cat.color }}>
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEventModal(false)} />
          <div className="relative w-[480px] max-w-[90vw] z-[1] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <h5 className="text-[16px] font-bold text-[var(--text-primary)] m-0">{editingEvent ? 'Edit Event' : 'Add Event'}</h5>
              <button data-testid="close-event-modal" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1.5 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowEventModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSaveEvent}>
              <div className="p-4 flex flex-col gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Title</label>
                  <input data-testid="event-title" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" placeholder="Event title" value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Start</label>
                    <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" type="datetime-local" value={newEvent.start} onChange={e => setNewEvent(p => ({ ...p, start: e.target.value }))} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">End</label>
                    <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" type="datetime-local" value={newEvent.end} onChange={e => setNewEvent(p => ({ ...p, end: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Category</label>
                  <div className="flex gap-2 flex-wrap">
                    {EVENT_CATEGORIES.filter(c => c.key !== 'task').map(cat => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setNewEvent(p => ({ ...p, category: cat.key }))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-colors"
                        style={{
                          border: newEvent.category === cat.key ? `2px solid ${cat.color}` : '2px solid var(--border-default)',
                          background: newEvent.category === cat.key ? cat.color + '15' : 'transparent',
                          color: newEvent.category === cat.key ? cat.color : 'var(--text-muted)',
                        }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Description</label>
                  <textarea
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px] resize-y"
                    rows={3}
                    placeholder="Optional description..."
                    value={newEvent.description}
                    onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-between p-4 border-t border-[var(--border-subtle)]">
                <div>
                  {editingEvent && (
                    <button type="button" data-testid="delete-event" className="bg-[#CB3939] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-[#CB3939]/90 transition-colors flex items-center gap-1.5" onClick={handleDeleteEvent}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      Delete
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowEventModal(false)}>Cancel</button>
                  <button type="submit" data-testid="save-event" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors">
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedDayEvents(null)} />
          <div className="relative w-[380px] max-w-[90vw] z-[1] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <h5 className="text-[16px] font-bold text-[var(--text-primary)] m-0">{formatDate(selectedDayEvents.date)}</h5>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1.5 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setSelectedDayEvents(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {selectedDayEvents.events.map(evt => {
                const cat = getCategory(evt);
                return (
                  <div
                    key={evt._id || evt.id}
                    onClick={() => { setSelectedDayEvents(null); handleEditEvent(evt); }}
                    className="flex gap-2.5 px-4 py-2.5 border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div className="w-1 rounded-sm flex-shrink-0" style={{ background: cat.color }} />
                    <div>
                      <div className="text-[13px] font-semibold text-[var(--text-primary)]">{evt.title}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{formatTime(evt.start)} {evt.end ? `- ${formatTime(evt.end)}` : ''}</div>
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cat.color + '20', color: cat.color }}>{cat.label}</span>
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
