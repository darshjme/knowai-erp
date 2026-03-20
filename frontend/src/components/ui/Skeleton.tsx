/**
 * Skeleton — Shimmer loading placeholder component.
 * Follows DESIGN.md: glass surface style, horizontal shimmer, 1.5s duration.
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
  borderRadius,
  className = '',
  style,
}: SkeletonProps) {
  return (
    <div
      className={`kai-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}
