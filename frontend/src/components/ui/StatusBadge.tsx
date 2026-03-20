/**
 * StatusBadge - Maps status strings to colored badges.
 *
 * @param {Object}  props
 * @param {string}  props.status    - Status key (e.g. 'IN_PROGRESS', 'COMPLETED')
 * @param {string}  [props.size='md'] - 'sm' | 'md' | 'lg'
 * @param {string}  [props.className]
 */

const STATUS_MAP = {
  // Gray
  TODO:       { label: 'To Do',        bg: '#6B728015', color: '#4B5563', dot: '#6B7280' },
  PLANNING:   { label: 'Planning',     bg: '#6B728015', color: '#4B5563', dot: '#6B7280' },
  DRAFT:      { label: 'Draft',        bg: '#6B728015', color: '#4B5563', dot: '#6B7280' },

  // Blue
  IN_PROGRESS:{ label: 'In Progress',  bg: '#3B82F615', color: '#1D4ED8', dot: '#3B82F6' },
  ACTIVE:     { label: 'Active',       bg: '#3B82F615', color: '#1D4ED8', dot: '#3B82F6' },
  SENT:       { label: 'Sent',         bg: '#3B82F615', color: '#1D4ED8', dot: '#3B82F6' },

  // Amber
  IN_REVIEW:  { label: 'In Review',    bg: '#D9770615', color: '#B45309', dot: '#D97706' },

  // Green
  COMPLETED:  { label: 'Completed',    bg: '#05966915', color: '#047857', dot: '#059669' },
  APPROVED:   { label: 'Approved',     bg: '#05966915', color: '#047857', dot: '#059669' },
  PAID:       { label: 'Paid',         bg: '#05966915', color: '#047857', dot: '#059669' },

  // Red
  ON_HOLD:    { label: 'On Hold',      bg: '#DC262615', color: '#B91C1C', dot: '#DC2626' },
  CANCELLED:  { label: 'Cancelled',    bg: '#DC262615', color: '#B91C1C', dot: '#DC2626' },
  REJECTED:   { label: 'Rejected',     bg: '#DC262615', color: '#B91C1C', dot: '#DC2626' },
  FAILED:     { label: 'Failed',       bg: '#DC262615', color: '#B91C1C', dot: '#DC2626' },
  OVERDUE:    { label: 'Overdue',      bg: '#DC262615', color: '#B91C1C', dot: '#DC2626' },

  // Gold
  PENDING:    { label: 'Pending',      bg: '#CA8A0415', color: '#A16207', dot: '#CA8A04' },
};

const SIZE_STYLES = {
  sm: { fontSize: 11, padding: '2px 8px', dotSize: 6 },
  md: { fontSize: 12, padding: '4px 10px', dotSize: 7 },
  lg: { fontSize: 13, padding: '5px 12px', dotSize: 8 },
};

export default function StatusBadge({ status, size = 'md', className = '' }) {
  const config = STATUS_MAP[status] || {
    label: status?.replace(/_/g, ' ') || 'Unknown',
    bg: '#6B728015',
    color: '#4B5563',
    dot: '#6B7280',
  };
  const sz = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <span
      className={`kai-status-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: sz.fontSize,
        fontWeight: 600,
        padding: sz.padding,
        borderRadius: 100,
        background: config.bg,
        color: config.color,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      <span
        style={{
          width: sz.dotSize,
          height: sz.dotSize,
          borderRadius: '50%',
          background: config.dot,
          flexShrink: 0,
        }}
      />
      {config.label}
    </span>
  );
}

/** Helper: get status config for external use */
StatusBadge.getConfig = (status) => STATUS_MAP[status] || null;

/** Expose the full map */
StatusBadge.STATUS_MAP = STATUS_MAP;
