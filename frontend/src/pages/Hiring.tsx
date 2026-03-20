import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { Row, Col, Modal, Offcanvas, Dropdown, Tab, Tabs, Form, Badge } from 'react-bootstrap';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Briefcase, Users, Plus, Search, LayoutList, Columns3, ChevronDown, Star,
  ExternalLink, Phone, Mail, MapPin, Clock, ArrowRight, X, Send,
  MessageSquare, History, FileText, Trash2, Filter, GripVertical,
  MoreHorizontal, AlertTriangle, GitMerge, CheckCircle, XCircle,
  Calendar, ArrowUpDown, Copy, Pencil, Check, Upload, User,
} from 'lucide-react';
import { hiringApi, teamApi } from '../services/api';
import VerifiedBadge from '../components/ui/VerifiedBadge';

/* ========================================================================
   CONSTANTS
   ======================================================================== */

const BRAND = '#111827';

const STATUS_LIST = [
  'APPLIED', 'RESUME_REVIEW', 'UNDER_REVIEW', 'SHORTLISTED',
  'INTERVIEW_ROUND_1', 'PRACTICAL_TASK', 'ASSIGNMENT_SENT',
  'ASSIGNMENT_PASSED', 'INTERVIEW_ROUND_2', 'FINAL_INTERVIEW',
  'OFFERED', 'HIRED', 'REJECTED', 'NOT_GOOD', 'MAYBE', 'ON_HOLD',
];

const STATUS_LABELS = {
  APPLIED: 'Applied', RESUME_REVIEW: 'Resume Review', UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted', INTERVIEW_ROUND_1: 'Interview R1', PRACTICAL_TASK: 'Practical',
  ASSIGNMENT_SENT: 'Assignment Sent', ASSIGNMENT_PASSED: 'Assignment Passed',
  INTERVIEW_ROUND_2: 'Interview R2', FINAL_INTERVIEW: 'Final Interview',
  OFFERED: 'Offered', HIRED: 'Hired', REJECTED: 'Rejected',
  NOT_GOOD: 'Not Good', MAYBE: 'Maybe', ON_HOLD: 'On Hold',
};

const STATUS_BG = {
  APPLIED: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  RESUME_REVIEW: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  UNDER_REVIEW: { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  SHORTLISTED: { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
  INTERVIEW_ROUND_1: { bg: '#EDE9FE', color: '#6D28D9', border: '#C4B5FD' },
  PRACTICAL_TASK: { bg: '#F3E8FF', color: '#7C3AED', border: '#D8B4FE' },
  ASSIGNMENT_SENT: { bg: '#EDE9FE', color: '#6D28D9', border: '#C4B5FD' },
  ASSIGNMENT_PASSED: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  INTERVIEW_ROUND_2: { bg: '#CFFAFE', color: '#155E75', border: '#67E8F9' },
  FINAL_INTERVIEW: { bg: '#E0E7FF', color: '#3730A3', border: '#A5B4FC' },
  OFFERED: { bg: '#DBEAFE', color: '#1D4ED8', border: '#93C5FD' },
  HIRED: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  REJECTED: { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
  NOT_GOOD: { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
  MAYBE: { bg: '#FEF9C3', color: '#854D0E', border: '#FDE047' },
  ON_HOLD: { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
};

const TIER_LIST = ['UNTIERED', 'INTERN', 'JUNIOR', 'SENIOR'];
const TIER_LABELS = { UNTIERED: 'Untiered', INTERN: 'Intern', JUNIOR: 'Junior', SENIOR: 'Senior' };
const TIER_STYLES = {
  UNTIERED: { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
  INTERN: { bg: '#EDE9FE', color: '#7C3AED', border: '#C4B5FD' },
  JUNIOR: { bg: '#DBEAFE', color: '#2563EB', border: '#93C5FD' },
  SENIOR: { bg: '#D1FAE5', color: '#059669', border: '#6EE7B7' },
};

const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'referral', label: 'Referral' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'updated', label: 'Last Updated' },
];

const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const REJECTION_REASONS = [
  'Not qualified', 'Lack of experience', 'Poor portfolio', 'Culture mismatch',
  'Salary expectations', 'No response', 'Position filled', 'Other',
];

const KANBAN_COLUMNS = [
  { id: 'APPLIED', label: 'Applied', dot: '#5B6B76', statuses: ['APPLIED', 'RESUME_REVIEW'] },
  { id: 'UNDER_REVIEW', label: 'Under Review', dot: '#D97706', statuses: ['UNDER_REVIEW'] },
  { id: 'SHORTLISTED', label: 'Shortlisted', dot: '#2563EB', statuses: ['SHORTLISTED'] },
  { id: 'INTERVIEW_ROUND_1', label: 'Interview', dot: BRAND, statuses: ['INTERVIEW_ROUND_1', 'PRACTICAL_TASK', 'INTERVIEW_ROUND_2', 'FINAL_INTERVIEW'] },
  { id: 'ASSIGNMENT_SENT', label: 'Assignment', dot: '#7C3AED', statuses: ['ASSIGNMENT_SENT', 'ASSIGNMENT_PASSED'] },
  { id: 'OFFERED', label: 'Offered', dot: '#2563EB', statuses: ['OFFERED'] },
  { id: 'HIRED', label: 'Hired', dot: '#16A34A', statuses: ['HIRED'] },
  { id: 'REJECTED', label: 'Rejected', dot: '#DC2626', statuses: ['REJECTED', 'NOT_GOOD'], collapsed: true },
];

const PAGE_SIZE = 50;

/* ========================================================================
   UTILITY HELPERS
   ======================================================================== */

function formatRelative(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const ms = now - d;
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function shortName(email) {
  if (!email) return '';
  return email.split('@')[0];
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function safeArray(d) {
  if (Array.isArray(d)) return d;
  if (d?.data && Array.isArray(d.data)) return d.data;
  if (d?.candidates && Array.isArray(d.candidates)) return d.candidates;
  return [];
}

/* ========================================================================
   SUB-COMPONENTS
   ======================================================================== */

/* ── StatusBadge ─────────────────────────────────────────────────────── */
function StatusBadge({ status, onClick, size = 'sm', interactive = true }) {
  const s = STATUS_BG[status] || STATUS_BG.APPLIED;
  const style = {
    background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    borderRadius: 999, padding: size === 'sm' ? '2px 10px' : '4px 14px',
    fontSize: size === 'sm' ? 11 : 12, fontWeight: 600,
    cursor: interactive ? 'pointer' : 'default', display: 'inline-flex',
    alignItems: 'center', gap: 4, whiteSpace: 'nowrap', lineHeight: '18px',
  };
  return (
    <span style={style} onClick={interactive ? onClick : undefined}>
      {STATUS_LABELS[status] || status}
      {interactive && <ChevronDown size={10} style={{ opacity: 0.5 }} />}
    </span>
  );
}

/* ── StatusDropdown (inline change) ──────────────────────────────────── */
function StatusDropdown({ status, candidateId, onStatusChange }) {
  const handleSelect = (newStatus) => {
    if (newStatus !== status) onStatusChange(candidateId, newStatus);
  };
  return (
    <Dropdown onClick={e => e.stopPropagation()}>
      <Dropdown.Toggle as="span" bsPrefix="kai-no-caret" style={{ cursor: 'pointer' }}>
        <StatusBadge status={status} />
      </Dropdown.Toggle>
      <Dropdown.Menu style={{ maxHeight: 300, overflowY: 'auto', minWidth: 180, fontSize: 13 }}>
        {STATUS_LIST.map(s => (
          <Dropdown.Item key={s} onClick={() => handleSelect(s)} active={s === status}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: (STATUS_BG[s] || {}).color || '#666',
            }} />
            {STATUS_LABELS[s]}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

/* ── TierBadge ───────────────────────────────────────────────────────── */
function TierBadge({ tier, candidateId, onTierChange, interactive = true }) {
  const t = TIER_STYLES[tier] || TIER_STYLES.UNTIERED;
  const style = {
    background: t.bg, color: t.color, border: `1px solid ${t.border}`,
    borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600,
    cursor: interactive ? 'pointer' : 'default', display: 'inline-flex',
    alignItems: 'center', gap: 4, whiteSpace: 'nowrap', lineHeight: '18px',
  };
  if (!interactive) return <span style={style}>{TIER_LABELS[tier] || tier}</span>;
  return (
    <Dropdown onClick={e => e.stopPropagation()}>
      <Dropdown.Toggle as="span" bsPrefix="kai-no-caret" style={{ cursor: 'pointer' }}>
        <span style={style}>
          {TIER_LABELS[tier] || tier}
          <ChevronDown size={10} style={{ opacity: 0.5 }} />
        </span>
      </Dropdown.Toggle>
      <Dropdown.Menu style={{ minWidth: 140, fontSize: 13 }}>
        {TIER_LIST.map(tr => (
          <Dropdown.Item key={tr} onClick={() => onTierChange(candidateId, tr)} active={tr === tier}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: (TIER_STYLES[tr] || {}).color || '#666',
            }} />
            {TIER_LABELS[tr]}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

/* ── StarRating ──────────────────────────────────────────────────────── */
function StarRating({ rating = 0, avgRating = null, count = 0, onRate, size = 18, interactive = true }) {
  const [hovered, setHovered] = useState(null);
  const display = hovered ?? rating;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}
        onMouseLeave={() => setHovered(null)}>
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s} type="button"
            style={{
              border: 'none', background: 'none', padding: 0, cursor: interactive ? 'pointer' : 'default',
              transition: 'transform 0.1s',
              transform: hovered === s ? 'scale(1.15)' : 'scale(1)',
            }}
            onClick={interactive ? (e) => { e.stopPropagation(); onRate?.(s); } : undefined}
            onMouseEnter={interactive ? () => setHovered(s) : undefined}
          >
            <Star size={size} fill={s <= display ? '#F59E0B' : 'none'}
              color={s <= display ? '#F59E0B' : '#D1D5DB'} />
          </button>
        ))}
        {interactive && hovered && hovered !== rating && (
          <span style={{ marginLeft: 6, fontSize: 11, color: '#F59E0B' }}>Rate {hovered}</span>
        )}
        {interactive && !hovered && rating > 0 && (
          <span style={{ marginLeft: 6, fontSize: 11, color: '#9CA3AF' }}>Your rating</span>
        )}
      </div>
      {avgRating !== null && count > 0 && (
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>
          Team avg: <strong style={{ color: '#6B7280' }}>{Number(avgRating).toFixed(1)}</strong> ({count} {count === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
}

/* ── CompactStarRating (for table rows) ──────────────────────────────── */
function CompactStarRating({ rating, onRate }) {
  const [hovered, setHovered] = useState(null);
  const display = hovered ?? (rating || 0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}
      onMouseLeave={() => setHovered(null)} onClick={e => e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button"
          style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', lineHeight: 1 }}
          onMouseEnter={() => setHovered(s)}
          onClick={() => onRate?.(s)}
        >
          <Star size={14} fill={s <= display ? '#F59E0B' : 'none'}
            color={s <= display ? '#F59E0B' : '#D1D5DB'} />
        </button>
      ))}
    </div>
  );
}

/* ── DuplicateBanner ─────────────────────────────────────────────────── */
function DuplicateBanner({ candidate, onMerge, onDismiss }) {
  if (!candidate?.isDuplicate) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
      background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, margin: '0 16px 0',
    }}>
      <AlertTriangle size={16} color="#F59E0B" />
      <span style={{ flex: 1, fontSize: 12, color: '#92400E', fontWeight: 500 }}>
        Potential duplicate {candidate.duplicateOf ? `of ${candidate.duplicateOf}` : 'detected'}
      </span>
      <button className="kai-btn kai-btn-sm" style={{ fontSize: 11, color: '#92400E' }}
        onClick={onMerge}>
        <GitMerge size={12} style={{ marginRight: 4 }} /> Merge
      </button>
      <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#D97706' }}
        onClick={onDismiss}>
        <X size={14} />
      </button>
    </div>
  );
}

/* ── CommentThread ───────────────────────────────────────────────────── */
function CommentThread({ comments = [], onAddComment, candidateId }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const handlePost = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onAddComment(candidateId, text.trim());
      setText('');
    } catch { /* handled */ }
    setSending(false);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="kai-input" value={text} onChange={e => setText(e.target.value)}
          placeholder="Add a comment..." style={{ flex: 1, fontSize: 13, padding: '6px 12px' }}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handlePost()}
          disabled={sending} />
        <button className="kai-btn kai-btn-primary kai-btn-sm"
          onClick={handlePost} disabled={sending || !text.trim()}
          style={{ padding: '6px 10px' }}>
          <Send size={14} />
        </button>
      </div>
      {comments.length === 0 ? (
        <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', fontStyle: 'italic', padding: 8 }}>
          No comments yet
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
          {comments.map((c, i) => (
            <div key={c.id || i} style={{ display: 'flex', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: '#DBEAFE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 11, fontWeight: 600, color: BRAND,
              }}>
                {initials(c.createdBy || c.author || 'U')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {c.createdBy || c.author || 'Unknown'}
                    <VerifiedBadge verified={c.createdByVerified || c.authorVerified} size={13} />
                  </span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {formatRelative(c.createdAt || c.timestamp)}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#4B5563', marginTop: 2, wordBreak: 'break-word' }}>
                  {c.body || c.text || c.content || ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── StatusHistory (timeline) ────────────────────────────────────────── */
function StatusTimeline({ events = [] }) {
  if (events.length === 0) return (
    <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>No history yet.</p>
  );
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {events.map((ev, idx) => {
        const isLast = idx === events.length - 1;
        const dotColor = ev.eventType === 'created' ? '#10B981'
          : ev.eventType === 'status_change' ? '#3B82F6'
          : ev.eventType === 'tier_change' ? '#8B5CF6' : '#9CA3AF';
        const desc = ev.eventType === 'created' ? 'Candidate created'
          : ev.eventType === 'status_change'
            ? `Status: ${STATUS_LABELS[ev.fromValue] || ev.fromValue || '?'} \u2192 ${STATUS_LABELS[ev.toValue] || ev.toValue || '?'}`
          : ev.eventType === 'tier_change'
            ? `Tier: ${TIER_LABELS[ev.fromValue] || ev.fromValue || '?'} \u2192 ${TIER_LABELS[ev.toValue] || ev.toValue || '?'}`
          : (ev.description || ev.eventType?.replace(/_/g, ' ') || 'Event');
        return (
          <li key={ev.id || idx} style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', background: dotColor,
                flexShrink: 0, marginTop: 4,
              }} />
              {!isLast && <span style={{ width: 2, flex: 1, background: '#E5E7EB', marginTop: 4 }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 0 : 16 }}>
              <p style={{ fontSize: 13, color: '#1F2937', margin: 0 }}>{desc}</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>
                {ev.createdBy && <span style={{ marginRight: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{ev.createdBy} <VerifiedBadge verified={ev.createdByVerified} size={12} /> &middot;</span>}
                {formatRelative(ev.createdAt || ev.timestamp)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── ViewToggle ──────────────────────────────────────────────────────── */
function ViewToggle({ view, onChange }) {
  const btnStyle = (active) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 6, borderRadius: 6, border: 'none', cursor: 'pointer',
    background: active ? '#F3F4F6' : 'transparent',
    color: active ? '#111827' : '#9CA3AF',
    transition: 'all 0.15s',
  });
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', border: '1px solid #E5E7EB',
      borderRadius: 8, background: '#fff', padding: 2, gap: 2,
    }}>
      <button style={btnStyle(view === 'list')} onClick={() => onChange('list')} title="List view">
        <LayoutList size={16} />
      </button>
      <button style={btnStyle(view === 'board')} onClick={() => onChange('board')} title="Board view">
        <Columns3 size={16} />
      </button>
    </div>
  );
}

/* ── FilterBar ───────────────────────────────────────────────────────── */
function FilterBar({
  filters, onFiltersChange, total, showing, onClearAll,
}) {
  const {
    search = '', statuses = [], tier = '', source = '', date = '',
    sort = 'priority', duplicatesOnly = false,
  } = filters;

  const setFilter = (key, val) => onFiltersChange({ ...filters, [key]: val });

  const toggleStatus = (s) => {
    const curr = new Set(statuses);
    if (curr.has(s)) curr.delete(s); else curr.add(s);
    setFilter('statuses', Array.from(curr));
  };

  const activeCount = [
    statuses.length > 0, tier, source, date, filters.search, duplicatesOnly,
  ].filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {/* Status multi-select */}
        <Dropdown autoClose="outside">
          <Dropdown.Toggle variant="outline-secondary" size="sm" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            Status
            {statuses.length > 0 && (
              <span className="kai-badge" style={{ background: '#DBEAFE', color: BRAND, fontSize: 10, padding: '0 6px', borderRadius: 999 }}>
                {statuses.length}
              </span>
            )}
          </Dropdown.Toggle>
          <Dropdown.Menu style={{ maxHeight: 280, overflowY: 'auto', minWidth: 200, fontSize: 13 }}>
            {STATUS_LIST.map(s => (
              <Dropdown.Item key={s} as="label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={statuses.includes(s)}
                  onChange={() => toggleStatus(s)} style={{ marginRight: 4 }} />
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: (STATUS_BG[s] || {}).color || '#666',
                }} />
                {STATUS_LABELS[s]}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>

        {/* Tier dropdown */}
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" size="sm" style={{ fontSize: 12 }}>
            {tier ? <>Tier: <strong>{TIER_LABELS[tier]}</strong></> : 'Tier'}
          </Dropdown.Toggle>
          <Dropdown.Menu style={{ minWidth: 140, fontSize: 13 }}>
            <Dropdown.Item onClick={() => setFilter('tier', '')}
              active={!tier}>All</Dropdown.Item>
            {TIER_LIST.map(t => (
              <Dropdown.Item key={t} onClick={() => setFilter('tier', t)}
                active={tier === t}>{TIER_LABELS[t]}</Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>

        {/* Source dropdown */}
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" size="sm" style={{ fontSize: 12 }}>
            {source ? <>Source: <strong>{SOURCE_OPTIONS.find(o => o.value === source)?.label || source}</strong></> : 'Source'}
          </Dropdown.Toggle>
          <Dropdown.Menu style={{ fontSize: 13 }}>
            <Dropdown.Item onClick={() => setFilter('source', '')} active={!source}>All</Dropdown.Item>
            {SOURCE_OPTIONS.map(o => (
              <Dropdown.Item key={o.value} onClick={() => setFilter('source', o.value)}
                active={source === o.value}>{o.label}</Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>

        {/* Date range */}
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" size="sm" style={{ fontSize: 12 }}>
            {date ? <>Date: <strong>{DATE_OPTIONS.find(o => o.value === date)?.label || date}</strong></> : 'Date'}
          </Dropdown.Toggle>
          <Dropdown.Menu style={{ fontSize: 13 }}>
            <Dropdown.Item onClick={() => setFilter('date', '')} active={!date}>All Time</Dropdown.Item>
            {DATE_OPTIONS.map(o => (
              <Dropdown.Item key={o.value} onClick={() => setFilter('date', o.value)}
                active={date === o.value}>{o.label}</Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>

        {/* Sort */}
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" size="sm" style={{ fontSize: 12 }}>
            Sort: <strong>{SORT_OPTIONS.find(o => o.value === sort)?.label || 'Priority'}</strong>
          </Dropdown.Toggle>
          <Dropdown.Menu style={{ fontSize: 13 }}>
            {SORT_OPTIONS.map(o => (
              <Dropdown.Item key={o.value} onClick={() => setFilter('sort', o.value)}
                active={sort === o.value}>{o.label}</Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>

        {/* Duplicates toggle */}
        <label style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
          padding: '4px 12px', border: '1px solid #E5E7EB', borderRadius: 6,
          background: duplicatesOnly ? '#EFF6FF' : '#fff', cursor: 'pointer',
          color: duplicatesOnly ? BRAND : '#374151', fontWeight: 500, userSelect: 'none',
        }}>
          <input type="checkbox" checked={duplicatesOnly}
            onChange={e => setFilter('duplicatesOnly', e.target.checked)}
            style={{ marginRight: 2 }} />
          Duplicates only
        </label>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
          <input className="kai-input" value={search}
            onChange={e => setFilter('search', e.target.value)}
            placeholder="Search name or email..."
            style={{ paddingLeft: 32, width: 200, fontSize: 13, padding: '5px 10px 5px 32px' }}
          />
        </div>
      </div>

      {/* Summary row */}
      {(activeCount > 0 || total > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#6B7280' }}>
          <span>
            Showing <strong style={{ color: '#374151' }}>{showing}</strong> of <strong style={{ color: '#374151' }}>{total}</strong> candidates
          </span>
          {activeCount > 0 && (
            <>
              <span style={{ color: '#D1D5DB' }}>|</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: BRAND }}>
                <span style={{
                  background: '#DBEAFE', borderRadius: 999, padding: '0 6px',
                  fontWeight: 700, fontSize: 11,
                }}>{activeCount}</span>
                {activeCount === 1 ? 'filter' : 'filters'} active
              </span>
              <button onClick={onClearAll} style={{
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <X size={12} /> Clear all
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── InlineAddRow ────────────────────────────────────────────────────── */
function InlineAddRow({ jobId, onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: 'manual' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { setErrors({ name: 'Name is required' }); return; }
    setSaving(true);
    try {
      await onSave({ ...form, jobId });
      onCancel();
    } catch (err) {
      setErrors({ general: err.message || 'Failed to save' });
    }
    setSaving(false);
  };

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors({}); };

  return (
    <tr style={{ background: '#EFF6FF', borderBottom: '1px solid #BFDBFE' }}>
      <td colSpan={10} style={{ padding: '8px 12px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 140 }}>
            <input ref={nameRef} className="kai-input" value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="Name *"
              style={{ fontSize: 13, padding: '4px 10px' }} />
            {errors.name && <span style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>{errors.name}</span>}
          </div>
          <input className="kai-input" value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="Email" style={{ fontSize: 13, padding: '4px 10px', minWidth: 160 }} />
          <input className="kai-input" value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="Phone" style={{ fontSize: 13, padding: '4px 10px', minWidth: 120 }} />
          <select className="kai-input" value={form.source} onChange={e => set('source', e.target.value)}
            style={{ fontSize: 13, padding: '4px 10px', minWidth: 100 }}>
            {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {errors.general && <span style={{ fontSize: 11, color: '#DC2626', alignSelf: 'center' }}>{errors.general}</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={onCancel} disabled={saving}>Cancel</button>
            <button className="kai-btn kai-btn-primary kai-btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ── BulkActionBar ───────────────────────────────────────────────────── */
function BulkActionBar({ count, onChangeStatus, onChangeTier, onDelete, onClear }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (count === 0) return null;
  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 20, display: 'flex', alignItems: 'center',
      gap: 12, padding: '8px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE',
      borderRadius: 8, boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
    }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: BRAND }}>{count} selected</span>

      {/* Change Status */}
      <Dropdown>
        <Dropdown.Toggle size="sm" style={{ fontSize: 12, background: BRAND, border: 'none', color: '#fff' }}>
          Change Status
        </Dropdown.Toggle>
        <Dropdown.Menu style={{ maxHeight: 300, overflowY: 'auto', minWidth: 180, fontSize: 13 }}>
          {STATUS_LIST.map(s => (
            <Dropdown.Item key={s} onClick={() => onChangeStatus(s)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: (STATUS_BG[s] || {}).color || '#666' }} />
              {STATUS_LABELS[s]}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>

      {/* Change Tier */}
      <Dropdown>
        <Dropdown.Toggle size="sm" variant="outline-secondary" style={{ fontSize: 12 }}>
          Change Tier
        </Dropdown.Toggle>
        <Dropdown.Menu style={{ fontSize: 13 }}>
          {TIER_LIST.map(t => (
            <Dropdown.Item key={t} onClick={() => onChangeTier(t)}>
              {TIER_LABELS[t]}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>

      {/* Delete */}
      {confirmDelete ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>Delete {count}?</span>
          <button className="kai-btn kai-btn-sm" onClick={() => { onDelete(); setConfirmDelete(false); }}
            style={{ background: '#DC2626', color: '#fff', fontSize: 12 }}>Confirm</button>
          <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setConfirmDelete(false)}
            style={{ fontSize: 12 }}>Cancel</button>
        </div>
      ) : (
        <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setConfirmDelete(true)}
          style={{ color: '#DC2626', borderColor: '#FECACA', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Trash2 size={12} /> Delete
        </button>
      )}

      <button onClick={onClear} title="Clear selection"
        style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: '#93C5FD' }}>
        <X size={16} />
      </button>
    </div>
  );
}

/* ── RejectionModal ──────────────────────────────────────────────────── */
function RejectionModal({ show, candidateName, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [customReason, setCustomReason] = useState('');
  const activeReason = reason === 'Other' ? customReason : reason;

  const handleConfirm = () => {
    if (!activeReason.trim()) return;
    onConfirm(activeReason.trim(), message.trim());
    setReason(''); setMessage(''); setCustomReason('');
  };

  const handleCopyAndConfirm = () => {
    if (!activeReason.trim()) return;
    if (message.trim()) navigator.clipboard.writeText(message.trim()).catch(() => {});
    onConfirm(activeReason.trim(), message.trim());
    setReason(''); setMessage(''); setCustomReason('');
  };

  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: 16 }}>Reject {candidateName || 'Candidate'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8, display: 'block' }}>
            Reason
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {REJECTION_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)}
                style={{
                  borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 500,
                  border: `1px solid ${reason === r ? '#FECACA' : '#E5E7EB'}`,
                  background: reason === r ? '#FEE2E2' : '#F9FAFB',
                  color: reason === r ? '#991B1B' : '#4B5563',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {r}
              </button>
            ))}
          </div>
          {reason === 'Other' && (
            <input className="kai-input" value={customReason} onChange={e => setCustomReason(e.target.value)}
              placeholder="Specify reason..." style={{ marginTop: 8, width: '100%', fontSize: 13 }} autoFocus />
          )}
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8, display: 'block' }}>
            Message (optional)
          </label>
          <textarea className="kai-input" value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Write a rejection message..." rows={3}
            style={{ width: '100%', fontSize: 13, resize: 'none' }} />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className="kai-btn kai-btn-outline" onClick={onCancel}>Cancel</button>
        <button className="kai-btn" onClick={handleConfirm}
          disabled={!activeReason.trim()}
          style={{ background: '#DC2626', color: '#fff', opacity: activeReason.trim() ? 1 : 0.5 }}>
          Save Internally
        </button>
        {message.trim() && (
          <button className="kai-btn" onClick={handleCopyAndConfirm}
            disabled={!activeReason.trim()}
            style={{ background: '#DC2626', color: '#fff', opacity: activeReason.trim() ? 1 : 0.5 }}>
            Save & Copy
          </button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

/* ── MergeModal ──────────────────────────────────────────────────────── */
function MergeModal({ show, sourceCandidate, targetCandidate, onMerge, onClose }) {
  const [merging, setMerging] = useState(false);
  if (!show || !sourceCandidate) return null;
  const fields = ['name', 'email', 'phone', 'source'];
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <GitMerge size={16} color={BRAND} /> Merge Candidates
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!targetCandidate ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#9CA3AF' }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 8, marginBottom: 16 }}>
              <span />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6B7280' }}>Source (removed)</span>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: BRAND }}>Target (kept)</span>
              {fields.map(f => (
                <React.Fragment key={f}>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{f}</span>
                  <span style={{ fontSize: 13, color: '#4B5563' }}>{sourceCandidate[f] || '-'}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#4B5563' }}>{targetCandidate?.[f] || sourceCandidate[f] || '-'}</span>
                </React.Fragment>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>
              Merge will combine contact info, move comments and events to the target, and remove the source.
            </p>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button className="kai-btn kai-btn-outline" onClick={onClose}>Keep Separate</button>
        <button className="kai-btn kai-btn-primary" onClick={async () => {
          setMerging(true); await onMerge(); setMerging(false);
        }} disabled={merging || !targetCandidate}>
          {merging ? 'Merging...' : 'Merge'}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

/* ── KanbanCard ──────────────────────────────────────────────────────── */
function KanbanCard({ candidate, onClick, provided, isDragging }) {
  const t = TIER_STYLES[candidate.tier] || TIER_STYLES.UNTIERED;
  return (
    <div
      ref={provided?.innerRef}
      {...(provided?.draggableProps || {})}
      {...(provided?.dragHandleProps || {})}
      onClick={() => onClick(candidate)}
      style={{
        ...provided?.draggableProps?.style,
        padding: 12, borderRadius: 8, border: '1px solid #E5E7EB',
        background: '#fff', cursor: 'grab', marginBottom: 8,
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
        opacity: isDragging ? 0.9 : 1,
        transform: isDragging ? 'rotate(1deg)' : 'none',
        transition: 'box-shadow 0.15s, transform 0.15s',
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {candidate.name}
      </p>
      {candidate.email && (
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {candidate.email}
        </p>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        {candidate.tier && candidate.tier !== 'UNTIERED' ? (
          <span style={{
            background: t.bg, color: t.color, border: `1px solid ${t.border}`,
            borderRadius: 999, padding: '1px 8px', fontSize: 10, fontWeight: 600,
          }}>
            {TIER_LABELS[candidate.tier]}
          </span>
        ) : <span />}
        <span style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
          {formatRelative(candidate.updatedAt || candidate.createdAt)}
        </span>
      </div>
    </div>
  );
}

/* ── KanbanColumn ────────────────────────────────────────────────────── */
function KanbanColumn({ column, candidates, onCardClick }) {
  const [collapsed, setCollapsed] = useState(column.collapsed || false);
  return (
    <div style={{
      minWidth: 240, maxWidth: 280, flex: '0 0 260px',
      display: 'flex', flexDirection: 'column', borderRadius: 10,
      background: '#F9FAFB', border: '1px solid #E5E7EB',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
        cursor: 'pointer', userSelect: 'none',
      }} onClick={() => setCollapsed(!collapsed)}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: column.dot }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{column.label}</span>
        <span style={{
          fontSize: 11, color: '#9CA3AF', background: '#E5E7EB',
          borderRadius: 999, padding: '0 7px', fontWeight: 600,
        }}>{candidates.length}</span>
        <ChevronDown size={14} style={{
          marginLeft: 'auto', color: '#9CA3AF', transition: 'transform 0.2s',
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)',
        }} />
      </div>
      {!collapsed && (
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div ref={provided.innerRef} {...provided.droppableProps}
              style={{
                flex: 1, padding: '0 8px 8px', minHeight: 60, overflowY: 'auto', maxHeight: 500,
                background: snapshot.isDraggingOver ? '#EFF6FF' : 'transparent',
                borderRadius: '0 0 10px 10px', transition: 'background 0.15s',
              }}>
              {candidates.map((c, idx) => (
                <Draggable key={c.id} draggableId={String(c.id)} index={idx}>
                  {(prov, snap) => <KanbanCard candidate={c} onClick={onCardClick} provided={prov} isDragging={snap.isDragging} />}
                </Draggable>
              ))}
              {provided.placeholder}
              {candidates.length === 0 && (
                <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', padding: '16px 0' }}>
                  Drop here
                </p>
              )}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
}

/* ── KanbanBoard ─────────────────────────────────────────────────────── */
function KanbanBoard({ candidates, onCardClick, onStatusChange }) {
  const columnData = useMemo(() => {
    const map = {};
    KANBAN_COLUMNS.forEach(col => { map[col.id] = []; });
    candidates.forEach(c => {
      const col = KANBAN_COLUMNS.find(col => col.statuses.includes(c.status));
      if (col) map[col.id].push(c);
    });
    return map;
  }, [candidates]);

  const handleDragEnd = (result) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const targetCol = KANBAN_COLUMNS.find(c => c.id === destination.droppableId);
    if (!targetCol) return;
    const newStatus = targetCol.statuses[0];
    const candidate = candidates.find(c => String(c.id) === draggableId);
    if (candidate && candidate.status !== newStatus) {
      onStatusChange(candidate.id, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
        {KANBAN_COLUMNS.map(col => (
          <KanbanColumn key={col.id} column={col} candidates={columnData[col.id] || []}
            onCardClick={onCardClick} />
        ))}
      </div>
    </DragDropContext>
  );
}

/* ── CandidateDrawer (right slide-out) ───────────────────────────────── */
function CandidateDrawer({
  show, candidate, onClose, onStatusChange, onTierChange, onRate,
  onAddComment, onReject, onAdvance, onScheduleInterview, onOffer,
  comments, events, onDismissDuplicate, onMerge,
}) {
  const [activeTab, setActiveTab] = useState('comments');
  const [dupDismissed, setDupDismissed] = useState(false);

  useEffect(() => { if (show) { setActiveTab('comments'); setDupDismissed(false); } }, [show, candidate?.id]);

  if (!candidate) return null;

  return (
    <Offcanvas show={show} onHide={onClose} placement="end" style={{ width: 480, maxWidth: '100vw' }}>
      <Offcanvas.Header closeButton style={{ borderBottom: '1px solid #F3F4F6', padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          <Offcanvas.Title style={{ fontSize: 16, fontWeight: 600 }}>{candidate.name}</Offcanvas.Title>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <StatusDropdown status={candidate.status} candidateId={candidate.id}
              onStatusChange={onStatusChange} />
            <TierBadge tier={candidate.tier || 'UNTIERED'} candidateId={candidate.id}
              onTierChange={onTierChange} />
          </div>
          <div style={{ paddingTop: 4 }}>
            <StarRating rating={candidate.userRating || candidate.rating || 0}
              avgRating={candidate.avgRating} count={candidate.ratingCount || 0}
              onRate={(val) => onRate(candidate.id, val)} />
          </div>
        </div>
      </Offcanvas.Header>

      <Offcanvas.Body style={{ padding: 0, overflowY: 'auto' }}>
        {/* Duplicate banner */}
        {candidate.isDuplicate && !dupDismissed && (
          <DuplicateBanner candidate={candidate}
            onMerge={() => onMerge?.(candidate)}
            onDismiss={() => setDupDismissed(true)} />
        )}

        {/* Contact info */}
        <section style={{ padding: '16px', borderBottom: '1px solid #F3F4F6' }}>
          <h6 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 10 }}>
            Contact
          </h6>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {candidate.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <Mail size={14} color="#9CA3AF" />
                <a href={`mailto:${candidate.email}`} style={{ color: '#374151' }}>{candidate.email}</a>
              </div>
            )}
            {candidate.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <Phone size={14} color="#9CA3AF" />
                <span style={{ color: '#374151' }}>{candidate.phone}</span>
              </div>
            )}
            {candidate.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <MapPin size={14} color="#9CA3AF" />
                <span style={{ color: '#374151' }}>{candidate.location}</span>
              </div>
            )}
            {candidate.source && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <ExternalLink size={14} color="#9CA3AF" />
                <span style={{ color: '#6B7280' }}>Source: {candidate.source}</span>
              </div>
            )}
          </div>
        </section>

        {/* Action buttons */}
        <section style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="kai-btn kai-btn-primary kai-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => onAdvance?.(candidate.id)}>
            <ArrowRight size={14} /> Advance
          </button>
          <button className="kai-btn kai-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#DC2626', color: '#fff', border: 'none' }}
            onClick={() => onReject?.(candidate)}>
            <XCircle size={14} /> Reject
          </button>
          <button className="kai-btn kai-btn-outline kai-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => onScheduleInterview?.(candidate.id)}>
            <Calendar size={14} /> Interview
          </button>
          <button className="kai-btn kai-btn-outline kai-btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => onOffer?.(candidate.id)}>
            <CheckCircle size={14} /> Offer
          </button>
        </section>

        {/* Rejection details */}
        {candidate.status === 'REJECTED' && candidate.rejectionReason && (
          <section style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
            <h6 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#EF4444', marginBottom: 8 }}>
              Rejection
            </h6>
            <div style={{
              padding: 12, background: '#FEE2E2', border: '1px solid #FECACA',
              borderRadius: 8,
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', margin: 0 }}>
                {candidate.rejectionReason}
              </p>
              {candidate.rejectionMessage && (
                <p style={{ fontSize: 13, color: '#B91C1C', marginTop: 4 }}>
                  {candidate.rejectionMessage}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Tabs: Comments | History | Resume */}
        <section style={{ padding: '0 16px' }}>
          <Tabs activeKey={activeTab} onSelect={setActiveTab}
            style={{ fontSize: 13 }} className="mb-3 mt-2">
            <Tab eventKey="comments" title={<><MessageSquare size={13} style={{ marginRight: 4 }} />Comments</>}>
              <div style={{ paddingBottom: 16 }}>
                <CommentThread comments={comments || candidate.comments || []}
                  onAddComment={onAddComment} candidateId={candidate.id} />
              </div>
            </Tab>
            <Tab eventKey="history" title={<><History size={13} style={{ marginRight: 4 }} />History</>}>
              <div style={{ paddingBottom: 16 }}>
                <StatusTimeline events={events || candidate.events || candidate.history || []} />
              </div>
            </Tab>
            <Tab eventKey="resume" title={<><FileText size={13} style={{ marginRight: 4 }} />Resume</>}>
              <div style={{ paddingBottom: 16 }}>
                {candidate.resumeUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer"
                      className="kai-btn kai-btn-outline kai-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                      <FileText size={14} /> View Resume
                    </a>
                    {candidate.resumeFileName && (
                      <span style={{ fontSize: 12, color: '#6B7280' }}>{candidate.resumeFileName}</span>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>No resume uploaded</p>
                )}
              </div>
            </Tab>
          </Tabs>
        </section>

        {/* Meta footer */}
        <section style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
            Created {candidate.createdBy && <><span style={{ color: '#6B7280' }}>{candidate.createdBy}</span> &middot; </>}
            <span style={{ color: '#6B7280' }}>{formatDate(candidate.createdAt)}</span>
          </p>
          {candidate.updatedAt && (
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>
              Last updated <span style={{ color: '#6B7280' }}>{formatDate(candidate.updatedAt)}</span>
            </p>
          )}
        </section>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

/* ========================================================================
   MAIN HIRING PAGE
   ======================================================================== */

export default function Hiring() {
  /* ── State ──────────────────────────────────────────────────────── */
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [page, setPage] = useState(1);

  const [view, setView] = useState('list'); // list | board
  const [filters, setFilters] = useState({
    search: '', statuses: [], tier: '', source: '', date: '',
    sort: 'priority', duplicatesOnly: false,
  });

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAddRow, setShowAddRow] = useState(false);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', department: '', description: '' });

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCandidate, setDrawerCandidate] = useState(null);
  const [drawerComments, setDrawerComments] = useState([]);
  const [drawerEvents, setDrawerEvents] = useState([]);

  // Rejection modal
  const [rejectionTarget, setRejectionTarget] = useState(null);

  // Merge modal
  const [mergeSource, setMergeSource] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);

  /* ── Load jobs ──────────────────────────────────────────────────── */
  const loadJobs = useCallback(async () => {
    try {
      const res = await hiringApi.listJobs();
      const rd = res.data;
      const list = rd?.jobs || rd?.data || (Array.isArray(rd) ? rd : []);
      setJobs(list);
      if (list.length > 0 && !selectedJob) setSelectedJob(list[0]);
    } catch (err) {
      toast.error('Failed to load jobs');
    }
    setLoading(false);
  }, [selectedJob]);

  useEffect(() => { loadJobs(); }, []);

  /* ── Load candidates ────────────────────────────────────────────── */
  const loadCandidates = useCallback(async (jobId, pageNum = 1, append = false) => {
    if (!jobId) return;
    setLoadingCandidates(true);
    try {
      const params = {
        page: pageNum,
        limit: PAGE_SIZE,
        sort: filters.sort,
      };
      if (filters.search) params.search = filters.search;
      if (filters.statuses.length) params.status = filters.statuses.join(',');
      if (filters.tier) params.tier = filters.tier;
      if (filters.source) params.source = filters.source;
      if (filters.date) params.date = filters.date;
      if (filters.duplicatesOnly) params.duplicates = 'true';

      const res = await hiringApi.getCandidates(jobId, params);
      const rd = res.data;
      const list = safeArray(rd);
      const t = rd?.total ?? rd?.count ?? list.length;

      if (append) {
        setCandidates(prev => [...prev, ...list]);
      } else {
        setCandidates(list);
      }
      setTotal(t);
    } catch (err) {
      toast.error('Failed to load candidates');
    }
    setLoadingCandidates(false);
  }, [filters]);

  useEffect(() => {
    if (selectedJob) {
      setPage(1);
      setSelectedIds(new Set());
      setShowAddRow(false);
      loadCandidates(selectedJob.id, 1);
    }
  }, [selectedJob, loadCandidates]);

  /* ── Debounced search ───────────────────────────────────────────── */
  const searchTimer = useRef(null);
  useEffect(() => {
    if (!selectedJob) return;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      loadCandidates(selectedJob.id, 1);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [filters.search]);

  /* ── Reload on filter change (except search which is debounced) ── */
  const prevFiltersRef = useRef(filters);
  useEffect(() => {
    const prev = prevFiltersRef.current;
    prevFiltersRef.current = filters;
    // Skip if only search changed (handled by debounce)
    const changed = ['statuses', 'tier', 'source', 'date', 'sort', 'duplicatesOnly'].some(
      k => JSON.stringify(prev[k]) !== JSON.stringify(filters[k])
    );
    if (changed && selectedJob) {
      setPage(1);
      loadCandidates(selectedJob.id, 1);
    }
  }, [filters.statuses, filters.tier, filters.source, filters.date, filters.sort, filters.duplicatesOnly]);

  /* ── Actions ────────────────────────────────────────────────────── */
  const handleStatusChange = async (candidateId, newStatus) => {
    // If rejecting, show modal
    if (newStatus === 'REJECTED') {
      const c = candidates.find(c => c.id === candidateId);
      setRejectionTarget(c || { id: candidateId, name: 'Candidate' });
      return;
    }
    try {
      await hiringApi.changeStatus({ candidateId, status: newStatus });
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: newStatus } : c));
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleReject = async (reason, message) => {
    if (!rejectionTarget) return;
    try {
      await hiringApi.rejectCandidate({
        candidateId: rejectionTarget.id,
        reason, message,
      });
      setCandidates(prev => prev.map(c =>
        c.id === rejectionTarget.id
          ? { ...c, status: 'REJECTED', rejectionReason: reason, rejectionMessage: message }
          : c
      ));
      toast.success('Candidate rejected');
    } catch (err) {
      toast.error(err.message || 'Failed to reject');
    }
    setRejectionTarget(null);
  };

  const handleTierChange = async (candidateId, newTier) => {
    try {
      await hiringApi.updateCandidate(candidateId, { tier: newTier });
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, tier: newTier } : c));
      toast.success(`Tier updated to ${TIER_LABELS[newTier]}`);
    } catch (err) {
      toast.error(err.message || 'Failed to update tier');
    }
  };

  const handleRate = async (candidateId, value) => {
    try {
      await hiringApi.rateCandidate({ candidateId, rating: value });
      setCandidates(prev => prev.map(c =>
        c.id === candidateId ? { ...c, rating: value, userRating: value } : c
      ));
    } catch (err) {
      toast.error(err.message || 'Failed to rate');
    }
  };

  const handleAddCandidate = async (data) => {
    await hiringApi.addCandidate(data);
    toast.success('Candidate added');
    loadCandidates(selectedJob.id, 1);
  };

  const handleAddComment = async (candidateId, text) => {
    await hiringApi.addComment({ candidateId, text });
    // Reload drawer data
    if (drawerCandidate?.id === candidateId) {
      openDrawer(drawerCandidate);
    }
  };

  const handleAdvance = async (candidateId) => {
    try {
      await hiringApi.advanceCandidate({ candidateId });
      toast.success('Candidate advanced');
      loadCandidates(selectedJob.id, page);
    } catch (err) {
      toast.error(err.message || 'Failed to advance');
    }
  };

  const handleScheduleInterview = (candidateId) => {
    toast.info('Interview scheduling - coming soon');
  };

  const handleOffer = async (candidateId) => {
    try {
      await hiringApi.offerCandidate({ candidateId });
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: 'OFFERED' } : c));
      toast.success('Offer sent');
    } catch (err) {
      toast.error(err.message || 'Failed to send offer');
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    try {
      await hiringApi.deleteCandidate(candidateId);
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      setTotal(t => t - 1);
      toast.success('Candidate deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  /* ── Bulk actions ───────────────────────────────────────────────── */
  const selectedCandidates = candidates.filter(c => selectedIds.has(c.id));

  const handleBulkStatus = async (newStatus) => {
    if (newStatus === 'REJECTED') {
      setRejectionTarget({ id: 'bulk', name: `${selectedIds.size} candidates` });
      return;
    }
    try {
      await Promise.all([...selectedIds].map(id =>
        hiringApi.changeStatus({ candidateId: id, status: newStatus })
      ));
      setCandidates(prev => prev.map(c =>
        selectedIds.has(c.id) ? { ...c, status: newStatus } : c
      ));
      setSelectedIds(new Set());
      toast.success(`Updated ${selectedIds.size} candidates`);
    } catch (err) {
      toast.error(err.message || 'Bulk update failed');
    }
  };

  const handleBulkTier = async (newTier) => {
    try {
      await Promise.all([...selectedIds].map(id =>
        hiringApi.updateCandidate(id, { tier: newTier })
      ));
      setCandidates(prev => prev.map(c =>
        selectedIds.has(c.id) ? { ...c, tier: newTier } : c
      ));
      setSelectedIds(new Set());
      toast.success(`Updated ${selectedIds.size} candidates`);
    } catch (err) {
      toast.error(err.message || 'Bulk update failed');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selectedIds].map(id => hiringApi.deleteCandidate(id)));
      setCandidates(prev => prev.filter(c => !selectedIds.has(c.id)));
      setTotal(t => t - selectedIds.size);
      setSelectedIds(new Set());
      toast.success('Candidates deleted');
    } catch (err) {
      toast.error(err.message || 'Bulk delete failed');
    }
  };

  /* ── Drawer ─────────────────────────────────────────────────────── */
  const openDrawer = async (candidate) => {
    setDrawerCandidate(candidate);
    setDrawerOpen(true);
    setDrawerComments(candidate.comments || []);
    setDrawerEvents(candidate.events || candidate.history || []);
    // Try to load full profile
    try {
      const res = await hiringApi.getCandidates(selectedJob?.id, { candidateId: candidate.id, detail: true });
      const rd = res.data;
      const detail = rd?.candidate || rd?.data || rd;
      if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
        setDrawerCandidate(prev => ({ ...prev, ...detail }));
        setDrawerComments(detail.comments || rd?.comments || []);
        setDrawerEvents(detail.events || detail.history || rd?.events || []);
      }
    } catch { /* use what we have */ }
  };

  /* ── Drag-and-drop reorder (list view) ──────────────────────────── */
  const handleListDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(candidates);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setCandidates(items);
  };

  /* ── Selection helpers ──────────────────────────────────────────── */
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map(c => c.id)));
    }
  };

  /* ── Load more ──────────────────────────────────────────────────── */
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadCandidates(selectedJob.id, nextPage, true);
  };

  /* ── Create job ─────────────────────────────────────────────────── */
  const handleCreateJob = async () => {
    if (!newJob.title.trim()) { toast.error('Job title is required'); return; }
    try {
      await hiringApi.createJob(newJob);
      toast.success('Job created');
      setShowAddJobModal(false);
      setNewJob({ title: '', department: '', description: '' });
      loadJobs();
    } catch (err) {
      toast.error(err.message || 'Failed to create job');
    }
  };

  /* ── Clear filters ──────────────────────────────────────────────── */
  const handleClearFilters = () => {
    setFilters({
      search: '', statuses: [], tier: '', source: '', date: '',
      sort: 'priority', duplicatesOnly: false,
    });
  };

  /* ── Filtered + sorted candidates (client-side fallback) ────────── */
  const displayCandidates = useMemo(() => {
    let list = [...candidates];

    // Client-side search filter (API should handle but as fallback)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [candidates, filters.search]);

  const hasMore = displayCandidates.length < total;

  /* ── Render ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="kai-card" style={{ padding: 60, textAlign: 'center' }}>
        <div className="spinner-border text-primary" />
        <p style={{ marginTop: 12, color: '#6B7280' }}>Loading hiring data...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#EFF6FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Briefcase size={18} color={BRAND} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: 0 }}>
              Hiring
              {selectedJob && (
                <span style={{ fontSize: 14, fontWeight: 400, color: '#9CA3AF', marginLeft: 8 }}>
                  ({total})
                </span>
              )}
            </h1>
            {selectedJob && (
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{selectedJob.title}</p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ViewToggle view={view} onChange={setView} />
          <button className="kai-btn kai-btn-primary" onClick={() => setShowAddJobModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={16} /> New Job
          </button>
        </div>
      </div>

      {/* ── Job selector tabs ─────────────────────────────────────── */}
      {jobs.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto', padding: '0 0 4px',
          borderBottom: '1px solid #E5E7EB',
        }}>
          {jobs.map(job => (
            <button key={job.id} onClick={() => setSelectedJob(job)}
              style={{
                border: 'none', background: 'none', cursor: 'pointer',
                padding: '8px 16px', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                color: selectedJob?.id === job.id ? BRAND : '#6B7280',
                borderBottom: selectedJob?.id === job.id ? `2px solid ${BRAND}` : '2px solid transparent',
                transition: 'all 0.15s',
              }}>
              {job.title || job.name}
            </button>
          ))}
        </div>
      )}

      {/* ── No jobs state ─────────────────────────────────────────── */}
      {jobs.length === 0 && (
        <div className="kai-card">
          <div className="kai-card-body" style={{ textAlign: 'center', padding: 60 }}>
            <Briefcase size={40} color="#D1D5DB" />
            <p style={{ marginTop: 12, fontWeight: 500, color: '#6B7280' }}>No jobs yet</p>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Create your first job to start tracking candidates.</p>
            <button className="kai-btn kai-btn-primary" onClick={() => setShowAddJobModal(true)}
              style={{ marginTop: 12 }}>
              <Plus size={16} style={{ marginRight: 4 }} /> Create Job
            </button>
          </div>
        </div>
      )}

      {/* ── Main content (when job selected) ──────────────────────── */}
      {selectedJob && (
        <>
          {/* Filter bar */}
          <FilterBar filters={filters} onFiltersChange={setFilters}
            total={total} showing={displayCandidates.length}
            onClearAll={handleClearFilters} />

          {/* Board view */}
          {view === 'board' ? (
            <KanbanBoard candidates={displayCandidates}
              onCardClick={openDrawer}
              onStatusChange={handleStatusChange} />
          ) : (
            /* List view */
            <div className="kai-card">
              <div className="kai-card-body" style={{ padding: 0, overflowX: 'auto' }}>
                <DragDropContext onDragEnd={handleListDragEnd}>
                  <Droppable droppableId="candidate-list">
                    {(provided) => (
                      <table className="kai-table" style={{ width: '100%', tableLayout: 'auto' }}
                        ref={provided.innerRef} {...provided.droppableProps}>
                        <thead>
                          <tr style={{ background: '#F9FAFB' }}>
                            <th style={{ width: 40, padding: '8px 4px 8px 12px' }}>
                              <input type="checkbox"
                                checked={candidates.length > 0 && selectedIds.size === candidates.length}
                                onChange={toggleSelectAll}
                                style={{ cursor: 'pointer' }} />
                            </th>
                            <th style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', padding: '8px 8px' }}>Name</th>
                            <th style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', padding: '8px 8px' }}>Phone</th>
                            <th style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', padding: '8px 8px' }}>Status</th>
                            <th style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', padding: '8px 8px' }}>Tier</th>
                            <th style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', padding: '8px 8px' }}>Rating</th>
                            <th style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', padding: '8px 8px' }}>Source</th>
                            <th style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', padding: '8px 8px' }}>Applied</th>
                            <th style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', padding: '8px 8px', width: 48 }}>
                              {/* actions */}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayCandidates.length === 0 && !showAddRow && !loadingCandidates && (
                            <tr>
                              <td colSpan={9} style={{ textAlign: 'center', padding: 48 }}>
                                <Users size={36} color="#D1D5DB" />
                                <p style={{ marginTop: 10, fontWeight: 500, color: '#6B7280', fontSize: 14 }}>
                                  No candidates yet
                                </p>
                                <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                                  Click "Add Candidate" below to get started.
                                </p>
                              </td>
                            </tr>
                          )}

                          {displayCandidates.map((c, idx) => {
                            const isPositive = ['SHORTLISTED', 'ASSIGNMENT_PASSED', 'HIRED', 'OFFERED'].includes(c.status);
                            const isNegative = ['REJECTED', 'NOT_GOOD'].includes(c.status);
                            const rowBg = isPositive ? '#F0FDF4'
                              : isNegative ? '#FEF2F2'
                              : selectedIds.has(c.id) ? '#EFF6FF' : 'transparent';

                            return (
                              <Draggable key={c.id} draggableId={String(c.id)} index={idx}>
                                {(provided, snapshot) => (
                                  <tr ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    onClick={() => openDrawer(c)}
                                    style={{
                                      ...provided.draggableProps.style,
                                      background: snapshot.isDragging ? '#fff' : rowBg,
                                      borderBottom: '1px solid #F3F4F6',
                                      cursor: 'pointer',
                                      borderLeft: isPositive ? '3px solid #10B981'
                                        : isNegative ? '3px solid #EF4444' : '3px solid transparent',
                                      boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                                      transition: 'background 0.15s',
                                    }}>
                                    {/* Checkbox + drag handle */}
                                    <td style={{ padding: '6px 4px 6px 8px', width: 40 }} onClick={e => e.stopPropagation()}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <span {...provided.dragHandleProps} style={{ cursor: 'grab', color: '#D1D5DB', lineHeight: 1 }}>
                                          <GripVertical size={14} />
                                        </span>
                                        <input type="checkbox" checked={selectedIds.has(c.id)}
                                          onChange={() => toggleSelect(c.id)}
                                          style={{ cursor: 'pointer' }} />
                                      </div>
                                    </td>

                                    {/* Name + email stacked */}
                                    <td style={{ padding: '6px 8px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {c.isDuplicate && <AlertTriangle size={12} color="#F59E0B" />}
                                        <div style={{ minWidth: 0 }}>
                                          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                            {c.name}
                                          </p>
                                          {c.email && (
                                            <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                              {c.email}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Phone */}
                                    <td style={{ padding: '6px 8px', fontSize: 13, color: '#4B5563' }}>
                                      {c.phone || <span style={{ color: '#D1D5DB' }}>&mdash;</span>}
                                    </td>

                                    {/* Status (inline dropdown) */}
                                    <td style={{ padding: '6px 8px' }} onClick={e => e.stopPropagation()}>
                                      <StatusDropdown status={c.status || 'APPLIED'}
                                        candidateId={c.id}
                                        onStatusChange={handleStatusChange} />
                                    </td>

                                    {/* Tier */}
                                    <td style={{ padding: '6px 8px' }} onClick={e => e.stopPropagation()}>
                                      <TierBadge tier={c.tier || 'UNTIERED'} candidateId={c.id}
                                        onTierChange={handleTierChange} />
                                    </td>

                                    {/* Star rating (compact, clickable) */}
                                    <td style={{ padding: '6px 8px' }} onClick={e => e.stopPropagation()}>
                                      <CompactStarRating rating={c.rating || c.userRating || 0}
                                        onRate={(val) => handleRate(c.id, val)} />
                                    </td>

                                    {/* Source pill */}
                                    <td style={{ padding: '6px 8px' }}>
                                      {c.source ? (
                                        <span style={{
                                          background: '#F3F4F6', color: '#4B5563', borderRadius: 999,
                                          padding: '2px 10px', fontSize: 11, fontWeight: 500,
                                        }}>
                                          {c.source}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#D1D5DB', fontSize: 12 }}>&mdash;</span>
                                      )}
                                    </td>

                                    {/* Applied date */}
                                    <td style={{ padding: '6px 8px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>
                                      {formatRelative(c.createdAt || c.appliedAt)}
                                    </td>

                                    {/* Actions menu */}
                                    <td style={{ padding: '6px 8px' }} onClick={e => e.stopPropagation()}>
                                      <Dropdown align="end">
                                        <Dropdown.Toggle as="span" bsPrefix="kai-no-caret"
                                          style={{ cursor: 'pointer', color: '#9CA3AF' }}>
                                          <MoreHorizontal size={16} />
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu style={{ fontSize: 13 }}>
                                          <Dropdown.Item onClick={() => openDrawer(c)}>
                                            <User size={13} style={{ marginRight: 6 }} /> View Profile
                                          </Dropdown.Item>
                                          <Dropdown.Item onClick={() => handleAdvance(c.id)}>
                                            <ArrowRight size={13} style={{ marginRight: 6 }} /> Advance
                                          </Dropdown.Item>
                                          <Dropdown.Item onClick={() => {
                                            setRejectionTarget(c);
                                          }}>
                                            <XCircle size={13} style={{ marginRight: 6 }} /> Reject
                                          </Dropdown.Item>
                                          <Dropdown.Divider />
                                          <Dropdown.Item onClick={() => handleDeleteCandidate(c.id)}
                                            style={{ color: '#DC2626' }}>
                                            <Trash2 size={13} style={{ marginRight: 6 }} /> Delete
                                          </Dropdown.Item>
                                        </Dropdown.Menu>
                                      </Dropdown>
                                    </td>
                                  </tr>
                                )}
                              </Draggable>
                            );
                          })}

                          {/* Inline add row */}
                          {showAddRow && (
                            <InlineAddRow jobId={selectedJob.id}
                              onSave={handleAddCandidate}
                              onCancel={() => setShowAddRow(false)} />
                          )}

                          {provided.placeholder}
                        </tbody>
                      </table>
                    )}
                  </Droppable>
                </DragDropContext>

                {/* Loading indicator */}
                {loadingCandidates && (
                  <div style={{ textAlign: 'center', padding: 16 }}>
                    <div className="spinner-border spinner-border-sm text-primary" />
                  </div>
                )}
              </div>

              {/* Add candidate button at bottom */}
              {!showAddRow && (
                <div style={{ padding: '8px 16px', borderTop: '1px solid #F3F4F6' }}>
                  <button onClick={() => setShowAddRow(true)}
                    style={{
                      border: 'none', background: 'none', cursor: 'pointer',
                      color: BRAND, fontSize: 13, fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                    <Plus size={14} /> Add Candidate
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Load more button (pagination) */}
          {view === 'list' && hasMore && (
            <div style={{ textAlign: 'center' }}>
              <button className="kai-btn kai-btn-outline"
                onClick={handleLoadMore} disabled={loadingCandidates}
                style={{ fontSize: 13 }}>
                {loadingCandidates ? 'Loading...' : `Load More (${displayCandidates.length} of ${total})`}
              </button>
            </div>
          )}

          {/* Bulk action bar */}
          <BulkActionBar count={selectedIds.size}
            onChangeStatus={handleBulkStatus}
            onChangeTier={handleBulkTier}
            onDelete={handleBulkDelete}
            onClear={() => setSelectedIds(new Set())} />
        </>
      )}

      {/* ── Candidate Drawer (right slide-out) ────────────────────── */}
      <CandidateDrawer
        show={drawerOpen}
        candidate={drawerCandidate}
        onClose={() => { setDrawerOpen(false); setDrawerCandidate(null); }}
        onStatusChange={(id, status) => {
          handleStatusChange(id, status);
          setDrawerCandidate(prev => prev ? { ...prev, status } : prev);
        }}
        onTierChange={(id, tier) => {
          handleTierChange(id, tier);
          setDrawerCandidate(prev => prev ? { ...prev, tier } : prev);
        }}
        onRate={(id, val) => {
          handleRate(id, val);
          setDrawerCandidate(prev => prev ? { ...prev, rating: val, userRating: val } : prev);
        }}
        onAddComment={handleAddComment}
        comments={drawerComments}
        events={drawerEvents}
        onReject={(c) => { setRejectionTarget(c); }}
        onAdvance={handleAdvance}
        onScheduleInterview={handleScheduleInterview}
        onOffer={handleOffer}
        onMerge={(c) => {
          setMergeSource(c);
          // Try to find duplicate target
          if (c.duplicateOfId) setMergeTarget({ id: c.duplicateOfId });
        }}
      />

      {/* ── Rejection Modal ───────────────────────────────────────── */}
      <RejectionModal
        show={!!rejectionTarget}
        candidateName={rejectionTarget?.name || 'Candidate'}
        onConfirm={async (reason, message) => {
          if (rejectionTarget?.id === 'bulk') {
            // Bulk reject
            try {
              await Promise.all([...selectedIds].map(id =>
                hiringApi.rejectCandidate({ candidateId: id, reason, message })
              ));
              setCandidates(prev => prev.map(c =>
                selectedIds.has(c.id) ? { ...c, status: 'REJECTED', rejectionReason: reason, rejectionMessage: message } : c
              ));
              setSelectedIds(new Set());
              toast.success('Candidates rejected');
            } catch (err) {
              toast.error(err.message || 'Bulk reject failed');
            }
            setRejectionTarget(null);
          } else {
            handleReject(reason, message);
          }
        }}
        onCancel={() => setRejectionTarget(null)}
      />

      {/* ── Add Job Modal ─────────────────────────────────────────── */}
      <Modal show={showAddJobModal} onHide={() => setShowAddJobModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 16 }}>Create New Job</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>
                Job Title *
              </label>
              <input className="kai-input" value={newJob.title}
                onChange={e => setNewJob(j => ({ ...j, title: e.target.value }))}
                placeholder="e.g. Senior Frontend Developer"
                style={{ width: '100%', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>
                Department
              </label>
              <input className="kai-input" value={newJob.department}
                onChange={e => setNewJob(j => ({ ...j, department: e.target.value }))}
                placeholder="e.g. Engineering"
                style={{ width: '100%', fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>
                Description
              </label>
              <textarea className="kai-input" value={newJob.description}
                onChange={e => setNewJob(j => ({ ...j, description: e.target.value }))}
                placeholder="Job description..."
                rows={3} style={{ width: '100%', fontSize: 13, resize: 'none' }} />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="kai-btn kai-btn-outline" onClick={() => setShowAddJobModal(false)}>Cancel</button>
          <button className="kai-btn kai-btn-primary" onClick={handleCreateJob}>Create Job</button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
