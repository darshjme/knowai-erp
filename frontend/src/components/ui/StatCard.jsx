import { TrendingUp, TrendingDown } from 'lucide-react';

const VARIANT_STYLES = {
  primary: {
    iconBg: 'var(--kai-primary, #146DF7)',
    iconColor: '#fff',
  },
  success: {
    iconBg: '#059669',
    iconColor: '#fff',
  },
  warning: {
    iconBg: '#D97706',
    iconColor: '#fff',
  },
  danger: {
    iconBg: '#DC2626',
    iconColor: '#fff',
  },
  info: {
    iconBg: '#0891B2',
    iconColor: '#fff',
  },
  neutral: {
    iconBg: 'var(--kai-silver, #4C5963)',
    iconColor: '#fff',
  },
};

/**
 * StatCard - Reusable stat card with icon, value, label, and optional delta.
 *
 * @param {Object}          props
 * @param {React.ElementType} props.icon     - Lucide icon component
 * @param {string|number}   props.value      - Main value (e.g. "12,340")
 * @param {string}          props.label      - Description label
 * @param {number}          [props.delta]    - Percentage change (positive = up, negative = down)
 * @param {'primary'|'success'|'warning'|'danger'|'info'|'neutral'} [props.variant='primary']
 * @param {string}          [props.className]
 * @param {Object}          [props.style]
 */
export default function StatCard({
  icon: Icon,
  value,
  label,
  delta,
  variant = 'primary',
  className = '',
  style,
}) {
  const vs = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const deltaPositive = delta != null && delta >= 0;
  const deltaColor = deltaPositive ? '#059669' : '#DC2626';

  return (
    <div className={`kai-stat-card ${className}`} style={style}>
      <div className="kai-stat-card__header">
        {Icon && (
          <div
            className="kai-stat-card__icon"
            style={{ background: vs.iconBg, color: vs.iconColor }}
          >
            <Icon size={20} />
          </div>
        )}
        {delta != null && (
          <span
            className="kai-stat-card__delta"
            style={{
              color: deltaColor,
              background: deltaPositive ? '#05966915' : '#DC262615',
            }}
          >
            {deltaPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="kai-stat-card__value">{value}</div>
      <div className="kai-stat-card__label">{label}</div>

      <style>{`
        .kai-stat-card {
          background: var(--kai-card-bg, #fff);
          border: 1px solid var(--kai-border, #E5E7EB);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .kai-stat-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }
        .kai-stat-card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .kai-stat-card__icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .kai-stat-card__delta {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          line-height: 1;
        }
        .kai-stat-card__value {
          font-size: 28px;
          font-weight: 700;
          color: var(--kai-near-black, #10222F);
          line-height: 1.1;
          letter-spacing: -0.5px;
        }
        .kai-stat-card__label {
          font-size: 13px;
          color: var(--kai-silver, #4C5963);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
