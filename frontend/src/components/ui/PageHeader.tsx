import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface Breadcrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  count?: number | string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * PageHeader — Reusable page header with title, optional count badge, breadcrumbs, and action buttons.
 * Design System V2: Tailwind CSS.
 */
export default function PageHeader({
  title,
  subtitle,
  count,
  breadcrumbs,
  actions,
  children,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-4 ${className}`} data-testid="page-header">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center flex-wrap gap-0.5 mb-3" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={i} className="inline-flex items-center gap-0.5 text-[13px] text-[var(--text-muted)]">
                {crumb.to && !isLast ? (
                  <Link to={crumb.to} className="text-[#3B82F6] hover:underline hover:opacity-75 transition-opacity">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'text-[var(--text-primary)] font-semibold' : ''}>
                    {crumb.label}
                  </span>
                )}
                {!isLast && <ChevronRight size={14} className="text-[var(--text-muted)] opacity-50 shrink-0" />}
              </span>
            );
          })}
        </nav>
      )}

      {/* Title Row */}
      <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-page-title font-heading text-[var(--text-primary)] m-0 truncate">
              {title}
            </h1>
            {count != null && (
              <span className="bg-[var(--bg-elevated)] rounded-full px-2.5 py-0.5 text-[13px] text-[var(--text-secondary)] shrink-0">
                {count}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[14px] text-[var(--text-secondary)] mt-1 m-0 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
