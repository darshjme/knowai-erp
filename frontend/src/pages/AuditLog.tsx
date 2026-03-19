import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { auditApi } from '../services/api';
import {
  Search, Filter, Download, ChevronLeft, ChevronRight, Loader2, AlertCircle, Calendar
} from 'lucide-react';

const ACTION_BADGES = {
  CREATE: { bg: '#DBEAFE', color: '#1E40AF', label: 'CREATE' },
  UPDATE: { bg: '#FEF3C7', color: '#92400E', label: 'UPDATE' },
  DELETE: { bg: '#FEE2E2', color: '#991B1B', label: 'DELETE' },
  LOGIN: { bg: '#F3F4F6', color: '#374151', label: 'LOGIN' },
  LOGOUT: { bg: '#F3F4F6', color: '#374151', label: 'LOGOUT' },
  READ: { bg: '#E0E7FF', color: '#3730A3', label: 'READ' },
};

export default function AuditLog() {
  const dispatch = useDispatch();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({
    user: '', action: '', dateFrom: '', dateTo: '',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Audit Log' });
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      if (filters.user) params.user = filters.user;
      if (filters.action) params.action = filters.action;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      const { data } = await auditApi.list(params);
      const items = data.logs || data.data || data.items || (Array.isArray(data) ? data : []);
      setLogs(items);
      setTotalPages(data.totalPages || data.pages || Math.ceil((data.total || items.length) / 20) || 1);
      setTotal(data.total || items.length);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({ user: '', action: '', dateFrom: '', dateTo: '' });
    setPage(1);
    setTimeout(fetchLogs, 0);
  };

  const handleExport = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Entity', 'Details', 'IP Address'];
    const rows = logs.map(l => [
      formatDate(l.timestamp || l.createdAt),
      l.user?.name || l.userName || l.user || '',
      l.action || '',
      l.entity || l.resource || '',
      l.details || l.description || '',
      l.ipAddress || l.ip || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const getActionBadge = (action) => {
    const badge = ACTION_BADGES[action?.toUpperCase()] || { bg: '#F3F4F6', color: '#374151', label: action || 'UNKNOWN' };
    return (
      <span className="kai-badge" style={{
        background: badge.bg, color: badge.color, padding: '3px 10px',
        borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase',
      }}>
        {badge.label}
      </span>
    );
  };

  return (
    <div>
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

      {/* Filter Bar */}
      <div className="kai-card" style={{ marginBottom: 20 }}>
        <div className="kai-card-body">
          <form onSubmit={handleFilter} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="kai-label">User</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#9CA3AF' }} />
                <input className="kai-input" placeholder="Search user..." value={filters.user}
                  onChange={e => setFilters(f => ({ ...f, user: e.target.value }))} style={{ paddingLeft: 34 }} />
              </div>
            </div>
            <div style={{ minWidth: 150 }}>
              <label className="kai-label">Action Type</label>
              <select className="kai-input" value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}>
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
              </select>
            </div>
            <div style={{ minWidth: 150 }}>
              <label className="kai-label">From Date</label>
              <input className="kai-input" type="date" value={filters.dateFrom}
                onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
            </div>
            <div style={{ minWidth: 150 }}>
              <label className="kai-label">To Date</label>
              <input className="kai-input" type="date" value={filters.dateTo}
                onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="kai-btn kai-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Filter size={16} /> Filter
              </button>
              <button type="button" onClick={handleClearFilters} className="kai-btn">Clear</button>
            </div>
          </form>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, background: '#FEE2E2', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Audit Table */}
      <div className="kai-card">
        <div className="kai-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#146DF7' }} />
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#5B6B76' }}>
              <Calendar size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 15, fontWeight: 500 }}>No audit logs found</p>
              <p style={{ fontSize: 13 }}>Adjust your filters or check back later</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="kai-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Timestamp</th>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Action</th>
                    <th style={thStyle}>Entity</th>
                    <th style={thStyle}>Details</th>
                    <th style={thStyle}>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log._id || log.id || i} style={{ borderBottom: '1px solid #F0F2F4' }}>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 13, color: '#4C5963', whiteSpace: 'nowrap' }}>
                          {formatDate(log.timestamp || log.createdAt)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 500, color: '#10222F', fontSize: 13 }}>
                          {log.user?.name || log.userName || log.user || '-'}
                        </span>
                      </td>
                      <td style={tdStyle}>{getActionBadge(log.action)}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 13, color: '#4C5963' }}>
                          {log.entity || log.resource || '-'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 260 }}>
                        <span style={{ fontSize: 13, color: '#5B6B76', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.details || log.description || '-'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#6B7280' }}>
                          {log.ipAddress || log.ip || '-'}
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
      {!loading && logs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '0 4px' }}>
          <span style={{ fontSize: 13, color: '#5B6B76' }}>
            Showing page {page} of {totalPages} ({total} total entries)
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="kai-btn" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ChevronLeft size={16} /> Previous
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="kai-btn" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600,
  color: '#5B6B76', textTransform: 'uppercase', letterSpacing: 0.5, background: '#F8F9FA',
  borderBottom: '2px solid #E8EBED',
};

const tdStyle = {
  padding: '12px 16px', fontSize: 14, verticalAlign: 'middle',
};
