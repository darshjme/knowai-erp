import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Loader2, Inbox } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any, idx: number) => ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps {
  columns?: Column[];
  data?: any[];
  loading?: boolean;
  onSort?: (key: string, dir: string) => void;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  headerActions?: ReactNode;
  onRowClick?: (row: any, idx: number) => void;
  className?: string;
}

/**
 * DataTable — Reusable table with sorting, pagination, search, empty & loading states.
 * Design System V2: Tailwind CSS, dark theme.
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
}: DataTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize]
  );

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handleSort = useCallback(
    (key: string) => {
      const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
      setSortKey(key);
      setSortDir(newDir);
      if (onSort) onSort(key, newDir);
    },
    [sortKey, sortDir, onSort]
  );

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown size={14} className="opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className={`bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden ${className}`} data-testid="data-table">
      {/* Toolbar */}
      {(searchable || headerActions) && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-default)] flex-wrap">
          {searchable && (
            <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 min-w-[220px] max-w-[320px] flex-1 text-[var(--text-muted)]">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder={searchPlaceholder}
                className="border-none outline-none bg-transparent text-[13px] text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)] placeholder:opacity-60"
              />
            </div>
          )}
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-[var(--bg-elevated)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-default)] whitespace-nowrap ${col.sortable !== false ? 'cursor-pointer select-none' : ''}`}
                  style={{ width: col.width, textAlign: col.align || 'left' }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
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
                  <div className="flex flex-col items-center justify-center gap-2 py-12 px-5 text-[var(--text-muted)]">
                    <Loader2 size={24} className="animate-spin" />
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="flex flex-col items-center justify-center gap-2 py-12 px-5 text-[var(--text-muted)]">
                    <Inbox size={40} strokeWidth={1.2} />
                    <div className="text-[15px] font-semibold text-[var(--text-primary)]">{emptyTitle}</div>
                    <div className="text-[13px] opacity-70">{emptyDescription}</div>
                    {emptyAction}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr
                  key={row.id || row._id || idx}
                  onClick={() => onRowClick?.(row, idx)}
                  className={`border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--bg-elevated)]/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-[var(--text-primary)] align-middle" style={{ textAlign: col.align || 'left' }}>
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
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-default)] flex-wrap gap-2">
          <span className="text-[12px] text-[var(--text-muted)]">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center justify-center min-w-[32px] h-8 px-1.5 border border-[var(--border-default)] rounded-md bg-[var(--bg-card)] text-[var(--text-primary)] text-[13px] cursor-pointer transition-all hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            {generatePageNumbers(safePage, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`dot-${i}`} className="px-1 text-[var(--text-muted)] text-[13px]">...</span>
              ) : (
                <button
                  key={p}
                  className={`inline-flex items-center justify-center min-w-[32px] h-8 px-1.5 border rounded-md text-[13px] cursor-pointer transition-all ${
                    p === safePage
                      ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                      : 'border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </button>
              )
            )}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center justify-center min-w-[32px] h-8 px-1.5 border border-[var(--border-default)] rounded-md bg-[var(--bg-card)] text-[var(--text-primary)] text-[13px] cursor-pointer transition-all hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}
