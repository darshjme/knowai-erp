/**
 * UserAvatar — Avatar with initials fallback, online status dot, and size variants.
 * Design System V2: Tailwind CSS.
 */

const SIZES = {
  xs: { box: 20, font: 8, dot: 6, dotBorder: 1.5 },
  sm: { box: 28, font: 11, dot: 8, dotBorder: 2 },
  md: { box: 36, font: 13, dot: 10, dotBorder: 2 },
  lg: { box: 48, font: 16, dot: 12, dotBorder: 3 },
};

function stringToColor(str: string): string {
  const COLORS = [
    '#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#DB2777', '#0891B2', '#4F46E5', '#EA580C', '#0D9488',
  ];
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface UserAvatarProps {
  src?: string;
  name?: string;
  initials?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  online?: boolean;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
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
}: UserAvatarProps) {
  const sz = SIZES[size] || SIZES.md;
  const displayInitials = initials || getInitials(name);
  const bgColor = color || stringToColor(name || initials || '');

  return (
    <div
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: sz.box, height: sz.box, ...style }}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className="rounded-full object-cover"
          style={{ width: sz.box, height: sz.box }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            const next = (e.target as HTMLImageElement).nextSibling as HTMLElement;
            if (next) next.style.display = 'flex';
          }}
        />
      ) : null}

      <span
        className="rounded-full text-white font-bold items-center justify-center select-none tracking-wide leading-none"
        style={{
          display: src ? 'none' : 'flex',
          width: sz.box,
          height: sz.box,
          background: bgColor,
          fontSize: sz.font,
        }}
      >
        {displayInitials}
      </span>

      {online != null && (
        <span
          className="absolute bottom-0 right-0 rounded-full"
          style={{
            width: sz.dot,
            height: sz.dot,
            background: online ? '#10B981' : '#9CA3AF',
            border: `${sz.dotBorder}px solid var(--bg-card)`,
          }}
        />
      )}
    </div>
  );
}
