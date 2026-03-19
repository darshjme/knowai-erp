import { Inbox } from 'lucide-react';

/**
 * EmptyState - Empty state placeholder with icon, title, description, and action button.
 *
 * @param {Object}            props
 * @param {React.ElementType} [props.icon=Inbox]   - Lucide icon component
 * @param {string}            props.title           - Heading text
 * @param {string}            [props.description]   - Supporting text
 * @param {string}            [props.actionLabel]   - Button label
 * @param {Function}          [props.onAction]      - Button click handler
 * @param {React.ReactNode}   [props.children]      - Custom action area (overrides actionLabel/onAction)
 * @param {string}            [props.className]
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  children,
  className = '',
}) {
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
          gap: 8px;
        }
        .kai-empty-state__icon {
          color: var(--kai-silver, #4C5963);
          opacity: 0.4;
          margin-bottom: 8px;
        }
        .kai-empty-state__title {
          font-size: 17px;
          font-weight: 600;
          color: var(--kai-near-black, #10222F);
          margin: 0;
          line-height: 1.3;
        }
        .kai-empty-state__desc {
          font-size: 13px;
          color: var(--kai-silver, #4C5963);
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
          background: var(--kai-primary, #146DF7);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
        }
        .kai-empty-state__btn:hover {
          background: #1059D1;
          transform: translateY(-1px);
        }
        .kai-empty-state__btn:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
