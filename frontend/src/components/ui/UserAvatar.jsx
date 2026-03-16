/**
 * UserAvatar - Avatar with initials fallback, online status dot, and size variants.
 *
 * @param {Object}  props
 * @param {string}  [props.src]         - Image URL
 * @param {string}  [props.name]        - Full name (used for initials fallback)
 * @param {string}  [props.initials]    - Explicit initials (overrides name-derived)
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.online]      - Show green online dot
 * @param {string}  [props.color]       - Background color for initials avatar
 * @param {string}  [props.className]
 * @param {Object}  [props.style]
 */

const SIZES = {
  sm: { box: 28, font: 11, dot: 8, dotBorder: 2 },
  md: { box: 36, font: 13, dot: 10, dotBorder: 2 },
  lg: { box: 48, font: 16, dot: 12, dotBorder: 3 },
};

// Deterministic color from string
function stringToColor(str) {
  const COLORS = [
    '#146DF7', '#7C3AED', '#059669', '#D97706', '#DC2626',
    '#DB2777', '#0891B2', '#4F46E5', '#EA580C', '#0D9488',
  ];
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function UserAvatar({
  src,
  name,
  initials,
  size = 'md',
  online,
  color,
  className = '',
  style,
}) {
  const sz = SIZES[size] || SIZES.md;
  const displayInitials = initials || getInitials(name);
  const bgColor = color || stringToColor(name || initials || '');

  return (
    <div
      className={`kai-avatar kai-avatar-${size} ${className}`}
      style={{
        position: 'relative',
        width: sz.box,
        height: sz.box,
        flexShrink: 0,
        display: 'inline-flex',
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          style={{
            width: sz.box,
            height: sz.box,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}

      <span
        style={{
          display: src ? 'none' : 'flex',
          width: sz.box,
          height: sz.box,
          borderRadius: '50%',
          background: bgColor,
          color: '#fff',
          fontSize: sz.font,
          fontWeight: 700,
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: '0.02em',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {displayInitials}
      </span>

      {online != null && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: sz.dot,
            height: sz.dot,
            borderRadius: '50%',
            background: online ? '#059669' : '#9CA3AF',
            border: `${sz.dotBorder}px solid var(--kai-card-bg, #fff)`,
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  );
}
