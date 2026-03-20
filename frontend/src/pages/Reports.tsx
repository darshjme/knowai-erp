import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { reportsApi } from '../services/api';
import {
  FileText, Download, Calendar, BarChart3, TrendingUp, Users, DollarSign,
  Briefcase, Loader2, AlertCircle, ChevronDown
} from 'lucide-react';

const REPORT_TYPES = [
  { key: 'financial', label: 'Financial', icon: DollarSign, color: '#10B981' },
  { key: 'team', label: 'Team', icon: Users, color: '#8B5CF6' },
  { key: 'project', label: 'Project', icon: Briefcase, color: '#111827' },
  { key: 'client', label: 'Client', icon: TrendingUp, color: '#F59E0B' },
];

export default function Reports() {
  const dispatch = useDispatch();
  const [reportType, setReportType] = useState('financial');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Reports' });
  }, []);

  const generateReport = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await reportsApi.get({ type: reportType, dateFrom, dateTo });
      setReport(data.report || data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = report.rows || report.data || [];
    if (rows.length === 0) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    downloadFile(csv, 'text/csv', `${reportType}-report-${dateFrom}.csv`);
  };

  const exportPDF = () => {
    // Create a printable HTML version for PDF export
    if (!report) return;
    const rows = report.rows || report.data || [];
    const summary = report.summary || {};
    const keys = rows.length > 0 ? Object.keys(rows[0]) : [];
    const html = `
      <html><head><title>${reportType} Report</title>
      <style>body{font-family:Arial,sans-serif;padding:40px}table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f4f4f4;font-weight:600}
      h1{color:#10222F}h2{color:#4C5963;font-size:16px}.summary{display:flex;gap:20px;margin:20px 0}
      .card{background:#f8f9fa;padding:16px;border-radius:8px;flex:1;text-align:center}
      .card h3{margin:0;font-size:22px;color:#10222F}.card p{margin:4px 0 0;font-size:12px;color:#5B6B76}</style></head>
      <body><h1>${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</h1>
      <p>Period: ${dateFrom} to ${dateTo}</p>
      <div class="summary">${Object.entries(summary).map(([k, v]) => `<div class="card"><h3>${typeof v === 'number' ? v.toLocaleString() : v}</h3><p>${k}</p></div>`).join('')}</div>
      ${rows.length > 0 ? `<table><thead><tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${keys.map(k => `<td>${r[k] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}
      </body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  };

  const downloadFile = (content, type, filename) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = report?.summary || {};
  const chartData = report?.chart || report?.chartData || [];
  const rows = report?.rows || report?.data || [];
  const maxChartValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value || d.amount || 0)) : 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Generate and export detailed business reports</p>
        </div>
      </div>

      {/* Report Type Selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon;
          const active = reportType === rt.key;
          return (
            <button key={rt.key} onClick={() => setReportType(rt.key)} className="kai-card" style={{
              cursor: 'pointer', border: `2px solid ${active ? '#111827' : 'transparent'}`,
              background: active ? '#EBF3FE' : '#fff', transition: 'all 0.15s', textAlign: 'left',
            }}>
              <div className="kai-card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${rt.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={22} style={{ color: rt.color }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#10222F' }}>{rt.label}</div>
                  <div style={{ fontSize: 12, color: '#5B6B76' }}>Report</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Date Range + Generate */}
      <div className="kai-card" style={{ marginBottom: 24 }}>
        <div className="kai-card-body" style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 180 }}>
            <label className="kai-label">From Date</label>
            <input className="kai-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div style={{ minWidth: 180 }}>
            <label className="kai-label">To Date</label>
            <input className="kai-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button onClick={generateReport} className="kai-btn kai-btn-primary" disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38 }}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <BarChart3 size={16} />}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {report && (
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <button onClick={exportCSV} className="kai-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Download size={16} /> CSV
              </button>
              <button onClick={exportPDF} className="kai-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={16} /> PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, background: '#FEE2E2', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Report Results */}
      {report && (
        <>
          {/* Summary Cards */}
          {Object.keys(summaryCards).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
              {Object.entries(summaryCards).map(([key, value]) => (
                <div key={key} className="kai-card">
                  <div className="kai-card-body" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#5B6B76', textTransform: 'capitalize', marginBottom: 6 }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: '#10222F' }}>
                      {typeof value === 'number' ? value.toLocaleString() : value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="kai-card" style={{ marginBottom: 24 }}>
              <div className="kai-card-body">
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#10222F', marginBottom: 20 }}>Overview</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, padding: '0 8px' }}>
                  {chartData.map((d, i) => {
                    const val = d.value || d.amount || 0;
                    const height = maxChartValue > 0 ? (val / maxChartValue) * 160 : 0;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#5B6B76', fontWeight: 500 }}>{val.toLocaleString()}</span>
                        <div style={{
                          width: '100%', maxWidth: 48, height: Math.max(height, 4), borderRadius: '6px 6px 0 0',
                          background: `linear-gradient(180deg, #111827 0%, #1E3A5F 100%)`, transition: 'height 0.3s',
                        }} />
                        <span style={{ fontSize: 10, color: '#5B6B76', textAlign: 'center', lineHeight: 1.2 }}>
                          {d.label || d.name || d.month || `#${i + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          {rows.length > 0 && (
            <div className="kai-card">
              <div className="kai-card-body" style={{ padding: 0, overflowX: 'auto' }}>
                <table className="kai-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {Object.keys(rows[0]).map(key => (
                        <th key={key} style={{
                          padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600,
                          color: '#5B6B76', textTransform: 'uppercase', letterSpacing: 0.5,
                          background: '#F8F9FA', borderBottom: '2px solid #E8EBED',
                        }}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F0F2F4' }}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} style={{ padding: '10px 16px', fontSize: 13, color: '#4C5963' }}>
                            {typeof val === 'number' ? val.toLocaleString() : String(val ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No data in report */}
          {rows.length === 0 && chartData.length === 0 && Object.keys(summaryCards).length === 0 && (
            <div className="kai-card">
              <div className="kai-card-body" style={{ textAlign: 'center', padding: 60, color: '#5B6B76' }}>
                <BarChart3 size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p style={{ fontSize: 15, fontWeight: 500 }}>No data available for this report</p>
                <p style={{ fontSize: 13 }}>Try adjusting the date range or report type</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Initial state */}
      {!report && !loading && !error && (
        <div className="kai-card">
          <div className="kai-card-body" style={{ textAlign: 'center', padding: 80, color: '#5B6B76' }}>
            <BarChart3 size={48} style={{ marginBottom: 16, opacity: 0.3, color: '#111827' }} />
            <p style={{ fontSize: 17, fontWeight: 600, color: '#10222F', marginBottom: 6 }}>Select a report type and generate</p>
            <p style={{ fontSize: 14 }}>Choose a report type above, set your date range, and click Generate Report</p>
          </div>
        </div>
      )}
    </div>
  );
}
