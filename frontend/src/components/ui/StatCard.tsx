import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  delta?: number;
  iconColor?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * StatCard — Reusable stat card with icon, value, label, trend delta, and hover animation.
 * Design System V2: dark theme, Tailwind, Framer Motion hover.
 */
export default function StatCard({
  icon: Icon,
  value,
  label,
  delta,
  iconColor = '#7C3AED',
  onClick,
  className = '',
}: StatCardProps) {
  const deltaPositive = delta != null && delta >= 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      data-testid="stat-card"
      className={`
        bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[10px]
        p-3 text-center cursor-pointer
        hover:border-[#7C3AED]/40 hover:shadow-card-hover
        transition-[border-color,box-shadow] duration-200
        ${className}
      `}
    >
      {/* Icon */}
      {Icon && (
        <div
          className="w-5 h-5 rounded-[5px] flex items-center justify-center mx-auto mb-2"
          style={{ background: `${iconColor}20`, color: iconColor }}
        >
          <Icon size={12} />
        </div>
      )}

      {/* Value */}
      <div
        className="text-[clamp(13px,1.2vw,18px)] font-bold text-[var(--text-primary)] leading-tight truncate tabular-nums"
        title={String(value)}
      >
        {value}
      </div>

      {/* Label */}
      <div className="text-[10px] text-[var(--text-muted)] mt-1 leading-tight truncate" title={label}>
        {label}
      </div>

      {/* Trend delta */}
      {delta != null && (
        <div
          className={`inline-flex items-center gap-0.5 text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded-full ${
            deltaPositive
              ? 'text-[#10B981] bg-[#10B981]/15'
              : 'text-[#EF4444] bg-[#EF4444]/15'
          }`}
        >
          {deltaPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </motion.div>
  );
}
