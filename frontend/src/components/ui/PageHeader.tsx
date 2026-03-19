import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * PageHeader - Page header with title, subtitle, breadcrumbs, and action buttons.
 *
 * @param {Object}           props
 * @param {string}           props.title          - Page title
 * @param {string}           [props.subtitle]     - Optional subtitle
 * @param {Array}            [props.breadcrumbs]  - Array of { label, to? } objects
 * @param {React.ReactNode}  [props.actions]      - Action buttons / controls for the right side
 * @param {React.ReactNode}  [props.children]     - Extra content below the header
 * @param {string}           [props.className]
 */
export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
  className = '',
}) {
  return (
    <div className={`kai-page-header ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="kai-page-header__breadcrumbs" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={i} className="kai-page-header__crumb">
                {crumb.to && !isLast ? (
                  <Link to={crumb.to} className="kai-page-header__crumb-link">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'kai-page-header__crumb-current' : ''}>
                    {crumb.label}
                  </span>
                )}
                {!isLast && <ChevronRight size={14} className="kai-page-header__crumb-sep" />}
              </span>
            );
          })}
        </nav>
      )}

      {/* Title Row */}
      <div className="kai-page-header__row">
        <div className="kai-page-header__text">
          <h1 className="kai-page-header__title">{title}</h1>
          {subtitle && <p className="kai-page-header__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="kai-page-header__actions">{actions}</div>}
      </div>

      {/* Extra content */}
      {children}

      <style>{`
        .kai-page-header {
          margin-bottom: 24px;
        }

        .kai-page-header__breadcrumbs {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 2px;
          margin-bottom: 12px;
        }

        .kai-page-header__crumb {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-size: 13px;
          color: var(--kai-silver, #4C5963);
        }

        .kai-page-header__crumb-link {
          color: var(--kai-primary, #146DF7);
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .kai-page-header__crumb-link:hover {
          opacity: 0.75;
          text-decoration: underline;
        }

        .kai-page-header__crumb-current {
          color: var(--kai-near-black, #10222F);
          font-weight: 600;
        }

        .kai-page-header__crumb-sep {
          color: var(--kai-silver, #4C5963);
          opacity: 0.5;
          flex-shrink: 0;
        }

        .kai-page-header__row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .kai-page-header__text {
          flex: 1;
          min-width: 0;
        }

        .kai-page-header__title {
          font-size: 24px;
          font-weight: 700;
          color: var(--kai-near-black, #10222F);
          margin: 0;
          letter-spacing: -0.3px;
          line-height: 1.2;
        }

        .kai-page-header__subtitle {
          font-size: 14px;
          color: var(--kai-silver, #4C5963);
          margin: 4px 0 0;
          line-height: 1.4;
        }

        .kai-page-header__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .kai-page-header__row {
            flex-direction: column;
          }
          .kai-page-header__actions {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
