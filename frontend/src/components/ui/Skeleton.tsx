/**
 * Skeleton — Shimmer loading placeholder.
 * Design System V2: bg-elevated with shimmer animation.
 */

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Skeleton({
  width,
  height,
  borderRadius = 8,
  className = '',
  style,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton rounded-lg ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}
