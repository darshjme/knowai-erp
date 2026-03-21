import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { auditApi } from '../services/api';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight, Loader2,
  AlertCircle, Calendar, X,
} from 'lucide-react';

const ACTION_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  CREATE: { bg: '#DCFCE7', color: '#166534', label: 'CREATE' },
  UPDATE: { bg: '#DBEAFE', color: '#1E40AF', label: 'UPDATE' },
  DELETE: { bg: '#FEE2E2', color: '#991B1B', label: 'DELETE' },
  LOGIN:  { bg: '#F3F4F6', color: '#374151', label: 'LOGIN' },
  LOGOUT: { bg: '#F3F4F6', color: '#374151', label: 'LOGOUT' },
  READ:   { bg: '#E0E7FF', color: '#3730A3', label: 'READ' },
  EXPORT: { bg: '#FEF3C7', color: '#92400E', label: 'EXPORT' },
};

const ACTION_OPTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'READ', 'EXPORT'];
const ENTITY_OPTIONS = [
  'USER', 'TASK', 'PROJECT', 'EXPENSE', 'PAYROLL', 'CONTACT',
  'CREDENTIAL', 'FILE', 'WORKSPACE', 'COMPLAINT', 'NOTIFICATION',
];

const PAGE_SIZE = 20;

const inputClass = "w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]";

function relativeTime(dateStr: string): string {
  if (!dateStr) return '-';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function fullTimestamp(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLog() {
  const dispatch = useDispatch();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Audit Log' });
  }, []);

  const fetchLogs = useCallback(async (pageNum = page) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, any> = { page: pageNum, limit: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity = entityFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;

      const { data } = await auditApi.list(params);
      const items = data.data || data.logs || data.items || (Array.isArray(data) ? data : []);
      setLogs(items);
      setTotalPages(data.totalPages || Math.ceil((data.total || items.length) / PAGE_SIZE) || 1);
      setTotal(data.total || items.length);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, entityFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const applyFilters = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  const clearFilters = async () => {
    setSearch('');
    setActionFilter('');
    setEntityFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setLoading(true);
    setError('');
    try {
      const { data } = await auditApi.list({ page: 1, limit: PAGE_SIZE });
      const items = data.data || data.logs || data.items || (Array.isArray(data) ? data : []);
      setLogs(items);
      setTotalPages(data.totalPages || Math.ceil((data.total || items.length) / PAGE_SIZE) || 1);
      setTotal(data.total || items.length);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = search || actionFilter || entityFilter || dateFrom || dateTo;

  const handleExport = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Entity', 'Description', 'IP Address'];
    const rows = logs.map((l) => [
      fullTimestamp(l.createdAt || l.timestamp),
      l.userName || l.user?.name || '',
      l.action || '',
      l.entity || '',
      l.description || l.details || '',
      l.ipAddress || '',
    ]);
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        r.map((c: string) => `"${String(c).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionBadge = (action: string) => {
    const badge = ACTION_BADGES[action?.toUpperCase()] || {
      bg: '#F3F4F6', color: '#374151', label: action || 'UNKNOWN',
    };
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wide uppercase" style={{ background: badge.bg, color: badge.color }}>
        {badge.label}
      </span>
    );
  };

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)] m-0">Audit Log</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Track all system activities and user actions</p>
        </div>
        <button data-testid="export-csv" onClick={handleExport} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-[var(--bg-elevated)] transition-colors inline-flex items-center gap-1.5">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Search + Filters */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-4 mb-5">
        <form onSubmit={applyFilters} className="flex gap-3 items-end flex-wrap">
          <div className="flex-[2] min-w-[220px]">
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-2.5 top-2.5 text-[var(--text-muted)]" />
              <input data-testid="search-audit" className={`${inputClass} pl-8`} placeholder="Search actions, users, entities..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">Action</label>
            <select className={inputClass} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">All Actions</option>
              {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a.charAt(0) + a.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">Entity</label>
            <select className={inputClass} value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">All Entities</option>
              {ENTITY_OPTIONS.map((e) => <option key={e} value={e}>{e.charAt(0) + e.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">From</label>
            <input className={inputClass} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">To</label>
            <input className={inputClass} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 flex items-center gap-1.5">
              <Filter size={16} /> Filter
            </button>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-2 text-[13px] flex items-center gap-1">
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg mb-5 text-[13px] bg-red-50 text-red-800 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Results summary */}
      {!loading && total > 0 && (
        <div className="mb-3 text-[13px] text-[var(--text-secondary)]">
          {total.toLocaleString()} {total === 1 ? 'entry' : 'entries'} found
          {hasActiveFilters ? ' matching your filters' : ''}
        </div>
      )}

      {/* Audit Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#7C3AED]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-secondary)]">
            <Calendar size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-[15px] font-medium">No audit logs found</p>
            <p className="text-[13px]">{hasActiveFilters ? 'Try adjusting your filters' : 'Check back later'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide bg-[var(--bg-elevated)] border-b-2 border-[var(--border-default)]">Time</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide bg-[var(--bg-elevated)] border-b-2 border-[var(--border-default)]">User</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide bg-[var(--bg-elevated)] border-b-2 border-[var(--border-default)]">Action</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide bg-[var(--bg-elevated)] border-b-2 border-[var(--border-default)]">Entity</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide bg-[var(--bg-elevated)] border-b-2 border-[var(--border-default)]">Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id || log._id || i} className="border-b border-[var(--border-subtle)]">
                    <td className="px-4 py-3 align-middle">
                      <span title={fullTimestamp(log.createdAt || log.timestamp)} className="text-[13px] text-[var(--text-secondary)] whitespace-nowrap cursor-default">
                        {relativeTime(log.createdAt || log.timestamp)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <span className="font-medium text-[var(--text-primary)] text-[13px]">
                        {log.userName || log.user?.name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">{getActionBadge(log.action)}</td>
                    <td className="px-4 py-3 align-middle">
                      <span className="text-[13px] text-[var(--text-secondary)]">
                        {log.entity || '-'}
                        {log.entityName && (
                          <span className="block text-[12px] text-[var(--text-muted)] mt-0.5">{log.entityName}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle max-w-[320px]">
                      <span className="text-[13px] text-[var(--text-secondary)] block overflow-hidden text-ellipsis whitespace-nowrap" title={log.description || log.details || ''}>
                        {log.description || log.details || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && logs.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-[13px] text-[var(--text-secondary)]">
            Page {page} of {totalPages} ({total.toLocaleString()} entries)
          </span>
          <div className="flex gap-1 items-center">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2.5 py-1.5 text-[13px] flex items-center gap-1 disabled:opacity-40">
              <ChevronLeft size={16} /> Prev
            </button>
            {getPageNumbers().map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-[13px] text-[var(--text-muted)]">...</span>
              ) : (
                <button key={p} onClick={() => setPage(p as number)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] border ${p === page ? 'bg-[#7C3AED] text-white border-[#7C3AED] font-semibold' : 'bg-transparent border-[var(--border-default)] text-[var(--text-secondary)]'}`}>
                  {p}
                </button>
              )
            )}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2.5 py-1.5 text-[13px] flex items-center gap-1 disabled:opacity-40">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
