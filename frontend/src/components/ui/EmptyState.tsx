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
 * EmptyState - Empty state placeholder with icon, title, description, and action button.
 * Styled per DESIGN.md: centered layout, icon in tinted circle, warm friendly copy,
 * primary #007AFF CTA button, secondary text #86868B.
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
    <div className={`kai-empty-state ${className}`}>
      <div className="kai-empty-state__icon">
        <Icon size={48} strokeWidth={1.2} />
      </div>

      <h3 className="kai-empty-state__title">{title}</h3>

      {description && (
        <p className="kai-empty-state__desc">{description}</p>
      )}

      {children ? (
        <div className="kai-empty-state__actions">{children}</div>
      ) : actionLabel && onAction ? (
        <div className="kai-empty-state__actions">
          <button className="kai-empty-state__btn" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      ) : null}

      <style>{`
        .kai-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 48px 24px;
          max-width: 400px;
          margin: 0 auto;
          gap: 8px;
        }
        .kai-empty-state__icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(0, 122, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #86868B;
          opacity: 0.5;
          margin-bottom: 8px;
        }
        .kai-empty-state__title {
          font-size: 17px;
          font-weight: 600;
          color: var(--kai-text, #1D1D1F);
          margin: 0;
          line-height: 1.3;
        }
        .kai-empty-state__desc {
          font-size: 13px;
          color: #86868B;
          margin: 0;
          max-width: 360px;
          line-height: 1.5;
        }
        .kai-empty-state__actions {
          margin-top: 12px;
        }
        .kai-empty-state__btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 20px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          color: #fff;
          background: #007AFF;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
        }
        .kai-empty-state__btn:hover {
          background: #0066D6;
          transform: translateY(-1px);
        }
        .kai-empty-state__btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
