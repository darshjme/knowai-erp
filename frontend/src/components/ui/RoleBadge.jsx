import { ROLE_LABELS, ROLE_COLORS } from '../../utils/roleConfig';

/**
 * RoleBadge - Badge showing user role with role-specific color.
 * Colors are sourced from the existing roleConfig.js.
 *
 * @param {Object}  props
 * @param {string}  props.role          - Role key (e.g. 'CEO', 'ADMIN', 'HR')
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.showLabel=true] - Show full label or just the key
 * @param {string}  [props.className]
 */

const SIZE_STYLES = {
  sm: { fontSize: 10, padding: '2px 7px', lineHeight: '16px' },
  md: { fontSize: 11, padding: '3px 10px', lineHeight: '18px' },
  lg: { fontSize: 13, padding: '4px 12px', lineHeight: '20px' },
};

export default function RoleBadge({
  role,
  size = 'md',
  showLabel = true,
  className = '',
}) {
  const color = ROLE_COLORS[role] || '#6B7280';
  const label = showLabel ? (ROLE_LABELS[role] || role?.replace(/_/g, ' ') || 'Unknown') : role;
  const sz = SIZE_STYLES[size] || SIZE_STYLES.md;

  return (
    <span
      className={`kai-role-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: sz.fontSize,
        fontWeight: 700,
        padding: sz.padding,
        lineHeight: sz.lineHeight,
        borderRadius: 6,
        color,
        background: `${color}15`,
        border: `1px solid ${color}25`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
        textTransform: size === 'sm' ? 'uppercase' : 'none',
      }}
    >
      <span
        style={{
          width: sz.fontSize * 0.65,
          height: sz.fontSize * 0.65,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
