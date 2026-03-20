import { useState, useMemo, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Loader2, Inbox } from 'lucide-react';

/**
 * DataTable - Reusable table with sorting, pagination, search, empty & loading states.
 *
 * @param {Object}   props
 * @param {Array}    props.columns    - Column definitions: { key, label, sortable?, render?, width?, align? }
 * @param {Array}    props.data       - Row data array
 * @param {boolean}  [props.loading=false]
 * @param {Function} [props.onSort]   - External sort handler (key, direction) => void. If omitted, sorts client-side.
 * @param {number}   [props.pageSize=10]
 * @param {boolean}  [props.searchable=true]
 * @param {string}   [props.searchPlaceholder='Search...']
 * @param {string}   [props.emptyTitle='No data found']
 * @param {string}   [props.emptyDescription='There are no records to display.']
 * @param {React.ReactNode} [props.emptyAction]
 * @param {React.ReactNode} [props.headerActions] - Extra content in the header bar (filters, buttons, etc.)
 * @param {Function} [props.onRowClick] - (row, index) => void
 * @param {string}   [props.className]
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  onSort,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'Search...',
  emptyTitle = 'No data found',
  emptyDescription = 'There are no records to display.',
  emptyAction,
  headerActions,
  onRowClick,
  className = '',
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  // Sort (client-side when no onSort provided)
  const sorted = useMemo(() => {
    if (onSort || !sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, onSort]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize]
  );

  // Reset page when search/data changes
  const handleSearch = useCallback((e) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handleSort = useCallback(
    (key) => {
      const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
      setSortKey(key);
      setSortDir(newDir);
      if (onSort) onSort(key, newDir);
    },
    [sortKey, sortDir, onSort]
  );

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className={`kai-data-table ${className}`}>
      {/* Toolbar */}
      {(searchable || headerActions) && (
        <div className="kai-data-table__toolbar">
          {searchable && (
            <div className="kai-data-table__search">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder={searchPlaceholder}
              />
            </div>
          )}
          {headerActions && <div className="kai-data-table__actions">{headerActions}</div>}
        </div>
      )}

      {/* Table */}
      <div className="kai-data-table__wrapper">
        <table className="kai-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    textAlign: col.align || 'left',
                    cursor: col.sortable !== false ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="kai-table__th-inner">
                    {col.label}
                    {col.sortable !== false && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="kai-data-table__loading">
                    <Loader2 size={24} className="kai-spin" />
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="kai-data-table__empty">
                    <Inbox size={40} strokeWidth={1.2} />
                    <div className="kai-data-table__empty-title">{emptyTitle}</div>
                    <div className="kai-data-table__empty-desc">{emptyDescription}</div>
                    {emptyAction}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr
                  key={row.id || row._id || idx}
                  onClick={() => onRowClick?.(row, idx)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                      {col.render ? col.render(row[col.key], row, idx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && sorted.length > pageSize && (
        <div className="kai-data-table__pagination">
          <span className="kai-data-table__pagination-info">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of{' '}
            {sorted.length}
          </span>
          <div className="kai-data-table__pagination-controls">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="kai-data-table__page-btn"
            >
              <ChevronLeft size={16} />
            </button>
            {generatePageNumbers(safePage, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`dot-${i}`} className="kai-data-table__page-dots">...</span>
              ) : (
                <button
                  key={p}
                  className={`kai-data-table__page-btn ${p === safePage ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            )}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="kai-data-table__page-btn"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .kai-data-table {
          background: var(--kai-card-bg, #fff);
          border: 1px solid var(--kai-border, #E5E7EB);
          border-radius: 12px;
          overflow: hidden;
        }

        .kai-data-table__toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--kai-border, #E5E7EB);
          flex-wrap: wrap;
        }

        .kai-data-table__search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--kai-canvas, #FAFAFA);
          border: 1px solid var(--kai-border, #E5E7EB);
          border-radius: 8px;
          padding: 8px 12px;
          min-width: 220px;
          max-width: 320px;
          flex: 1;
          color: var(--kai-silver, #4C5963);
        }
        .kai-data-table__search input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 13px;
          color: var(--kai-near-black, #10222F);
          width: 100%;
          font-family: inherit;
        }
        .kai-data-table__search input::placeholder {
          color: var(--kai-silver, #4C5963);
          opacity: 0.6;
        }

        .kai-data-table__actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .kai-data-table__wrapper {
          overflow-x: auto;
        }

        .kai-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .kai-table thead {
          background: var(--kai-canvas, #FAFAFA);
        }
        .kai-table th {
          padding: 10px 16px;
          font-weight: 600;
          font-size: 12px;
          color: var(--kai-silver, #4C5963);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid var(--kai-border, #E5E7EB);
          white-space: nowrap;
        }
        .kai-table__th-inner {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .kai-table td {
          padding: 12px 16px;
          color: var(--kai-near-black, #10222F);
          border-bottom: 1px solid var(--kai-border, #E5E7EB);
          vertical-align: middle;
        }
        .kai-table tbody tr:last-child td {
          border-bottom: none;
        }
        .kai-table tbody tr:hover {
          background: var(--kai-canvas, #FAFAFA);
        }

        .kai-data-table__loading,
        .kai-data-table__empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 48px 20px;
          color: var(--kai-silver, #4C5963);
        }
        .kai-data-table__empty-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--kai-near-black, #10222F);
        }
        .kai-data-table__empty-desc {
          font-size: 13px;
          opacity: 0.7;
        }

        .kai-data-table__pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-top: 1px solid var(--kai-border, #E5E7EB);
          flex-wrap: wrap;
          gap: 8px;
        }
        .kai-data-table__pagination-info {
          font-size: 12px;
          color: var(--kai-silver, #4C5963);
        }
        .kai-data-table__pagination-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .kai-data-table__page-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 32px;
          padding: 0 6px;
          border: 1px solid var(--kai-border, #E5E7EB);
          border-radius: 6px;
          background: var(--kai-card-bg, #fff);
          color: var(--kai-near-black, #10222F);
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }
        .kai-data-table__page-btn:hover:not(:disabled) {
          background: var(--kai-canvas, #FAFAFA);
          border-color: var(--kai-primary, #111827);
        }
        .kai-data-table__page-btn.active {
          background: var(--kai-primary, #111827);
          color: #fff;
          border-color: var(--kai-primary, #111827);
        }
        .kai-data-table__page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .kai-data-table__page-dots {
          padding: 0 4px;
          color: var(--kai-silver, #4C5963);
          font-size: 13px;
        }

        @keyframes kai-spin {
          to { transform: rotate(360deg); }
        }
        .kai-spin {
          animation: kai-spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}

/** Generate page numbers with ellipsis */
function generatePageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
