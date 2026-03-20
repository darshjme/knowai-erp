import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { auditApi } from '../services/api';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight, Loader2,
  AlertCircle, Calendar, X,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────

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

  // Fetch on page change
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
    // Fetch with no filters directly
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

  // ─── Export CSV ──────────────────────────────────────────────────

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

  // ─── Badge renderer ──────────────────────────────────────────────

  const getActionBadge = (action: string) => {
    const badge = ACTION_BADGES[action?.toUpperCase()] || {
      bg: '#F3F4F6', color: '#374151', label: action || 'UNKNOWN',
    };
    return (
      <span style={{
        background: badge.bg, color: badge.color, padding: '3px 10px',
        borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
        textTransform: 'uppercase', display: 'inline-block',
      }}>
        {badge.label}
      </span>
    );
  };

  // ─── Pagination helpers ──────────────────────────────────────────

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

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Audit Log</h1>
          <p>Track all system activities and user actions</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExport} className="kai-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="kai-card" style={{ marginBottom: 20 }}>
        <div className="kai-card-body">
          <form onSubmit={applyFilters} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: 2, minWidth: 220 }}>
              <label className="kai-label">Search</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#9CA3AF' }} />
                <input
                  className="kai-input"
                  placeholder="Search actions, users, entities, descriptions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 34 }}
                />
              </div>
            </div>

            {/* Action filter */}
            <div style={{ minWidth: 140 }}>
              <label className="kai-label">Action</label>
              <select className="kai-input" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                <option value="">All Actions</option>
                {ACTION_OPTIONS.map((a) => (
                  <option key={a} value={a}>{a.charAt(0) + a.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>

            {/* Entity filter */}
            <div style={{ minWidth: 140 }}>
              <label className="kai-label">Entity</label>
              <select className="kai-input" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
                <option value="">All Entities</option>
                {ENTITY_OPTIONS.map((e) => (
                  <option key={e} value={e}>{e.charAt(0) + e.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div style={{ minWidth: 140 }}>
              <label className="kai-label">From</label>
              <input className="kai-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            {/* Date to */}
            <div style={{ minWidth: 140 }}>
              <label className="kai-label">To</label>
              <input className="kai-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="kai-btn kai-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={16} /> Filter
              </button>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="kai-btn" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <X size={14} /> Clear
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13,
          background: '#FEE2E2', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Results summary */}
      {!loading && total > 0 && (
        <div style={{ marginBottom: 12, fontSize: 13, color: '#5B6B76' }}>
          {total.toLocaleString()} {total === 1 ? 'entry' : 'entries'} found
          {hasActiveFilters ? ' matching your filters' : ''}
        </div>
      )}

      {/* Audit Table */}
      <div className="kai-card">
        <div className="kai-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#007AFF' }} />
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#5B6B76' }}>
              <Calendar size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 15, fontWeight: 500 }}>No audit logs found</p>
              <p style={{ fontSize: 13 }}>
                {hasActiveFilters ? 'Try adjusting your filters' : 'Check back later'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="kai-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Action</th>
                    <th style={thStyle}>Entity</th>
                    <th style={thStyle}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id || log._id || i} style={{ borderBottom: '1px solid #F0F2F4' }}>
                      {/* Time — relative with full timestamp on hover */}
                      <td style={tdStyle}>
                        <span
                          title={fullTimestamp(log.createdAt || log.timestamp)}
                          style={{ fontSize: 13, color: '#4C5963', whiteSpace: 'nowrap', cursor: 'default' }}
                        >
                          {relativeTime(log.createdAt || log.timestamp)}
                        </span>
                      </td>

                      {/* User */}
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 500, color: '#10222F', fontSize: 13 }}>
                          {log.userName || log.user?.name || '-'}
                        </span>
                      </td>

                      {/* Action badge */}
                      <td style={tdStyle}>{getActionBadge(log.action)}</td>

                      {/* Entity */}
                      <td style={tdStyle}>
                        <span style={{ fontSize: 13, color: '#4C5963' }}>
                          {log.entity || '-'}
                          {log.entityName && (
                            <span style={{ display: 'block', fontSize: 12, color: '#6B7280', marginTop: 1 }}>
                              {log.entityName}
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Description */}
                      <td style={{ ...tdStyle, maxWidth: 320 }}>
                        <span style={{
                          fontSize: 13, color: '#5B6B76', display: 'block',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                        title={log.description || log.details || ''}
                        >
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
      </div>

      {/* Pagination */}
      {!loading && logs.length > 0 && totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 16, padding: '0 4px',
        }}>
          <span style={{ fontSize: 13, color: '#5B6B76' }}>
            Page {page} of {totalPages} ({total.toLocaleString()} entries)
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {/* Previous */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="kai-btn"
              style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronLeft size={16} /> Prev
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} style={{ padding: '6px 4px', fontSize: 13, color: '#9CA3AF' }}>
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className="kai-btn"
                  style={{
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: p === page ? 600 : 400,
                    background: p === page ? '#007AFF' : undefined,
                    color: p === page ? '#fff' : undefined,
                    borderColor: p === page ? '#007AFF' : undefined,
                  }}
                >
                  {p}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="kai-btn"
              style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600,
  color: '#5B6B76', textTransform: 'uppercase', letterSpacing: 0.5,
  background: '#F8F9FA', borderBottom: '2px solid #E8EBED',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 14, verticalAlign: 'middle',
};
