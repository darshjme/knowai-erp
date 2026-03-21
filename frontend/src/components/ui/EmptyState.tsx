import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  className?: string;
}

/**
 * EmptyState — Empty state with icon, warm message, and primary action.
 * Design System V2: dark theme, centered, max-w-[400px].
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  children,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 max-w-[400px] mx-auto gap-2 ${className}`}>
      <div className="w-20 h-20 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] opacity-50 mb-2">
        <Icon size={48} strokeWidth={1.2} />
      </div>

      <h3 className="text-[17px] font-semibold text-[var(--text-primary)] m-0 leading-tight">
        {title}
      </h3>

      {description && (
        <p className="text-[13px] text-[var(--text-muted)] m-0 max-w-[360px] leading-relaxed">
          {description}
        </p>
      )}

      {children ? (
        <div className="mt-3">{children}</div>
      ) : actionLabel && onAction ? (
        <div className="mt-3">
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-[13px] font-semibold text-white bg-[#7C3AED] border-none rounded-lg cursor-pointer hover:bg-[#7C3AED]/90 active:scale-[0.98] transition-all"
          >
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
