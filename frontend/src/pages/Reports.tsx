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

const inputClass = 'w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]';
const labelClass = 'block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1.5';

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
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)] font-[Manrope]">Reports</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Generate and export detailed business reports</p>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" data-testid="report-type-selector">
        {REPORT_TYPES.map(rt => {
          const Icon = rt.icon;
          const active = reportType === rt.key;
          return (
            <button key={rt.key} onClick={() => setReportType(rt.key)}
              className={`bg-[var(--bg-card)] border rounded-xl text-left transition-all cursor-pointer ${active ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/20' : 'border-[var(--border-default)]'}`}
              data-testid={`report-type-${rt.key}`}>
              <div className="p-4 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${rt.color}15` }}>
                  <Icon size={22} style={{ color: rt.color }} />
                </div>
                <div>
                  <div className="font-semibold text-[15px] text-[var(--text-primary)]">{rt.label}</div>
                  <div className="text-[12px] text-[var(--text-muted)]">Report</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Date Range + Generate */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl mb-6">
        <div className="p-4 flex items-end gap-4 flex-wrap">
          <div className="min-w-[180px]">
            <label className={labelClass}>From Date</label>
            <input className={inputClass} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} data-testid="date-from" />
          </div>
          <div className="min-w-[180px]">
            <label className={labelClass}>To Date</label>
            <input className={inputClass} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} data-testid="date-to" />
          </div>
          <button onClick={generateReport}
            className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors disabled:opacity-50 flex items-center gap-1.5 h-[38px]"
            disabled={loading} data-testid="generate-report-btn">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          {report && (
            <div className="flex gap-2 ml-auto">
              <button onClick={exportCSV} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1.5" data-testid="export-csv">
                <Download size={16} /> CSV
              </button>
              <button onClick={exportPDF} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1.5" data-testid="export-pdf">
                <FileText size={16} /> PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg mb-5 text-[13px] flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Report Results */}
      {report && (
        <>
          {/* Summary Cards */}
          {Object.keys(summaryCards).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(summaryCards).map(([key, value]) => (
                <div key={key} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
                  <div className="p-4 text-center">
                    <div className="text-[12px] text-[var(--text-muted)] capitalize mb-1.5">
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                    </div>
                    <div className="text-[26px] font-bold text-[var(--text-primary)]">
                      {typeof value === 'number' ? value.toLocaleString() : value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl mb-6">
              <div className="p-4">
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-5">Overview</h3>
                <div className="flex items-end gap-2 h-[200px] px-2">
                  {chartData.map((d, i) => {
                    const val = d.value || d.amount || 0;
                    const height = maxChartValue > 0 ? (val / maxChartValue) * 160 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">{val.toLocaleString()}</span>
                        <div className="w-full max-w-[48px] rounded-t-md transition-all duration-300"
                          style={{ height: Math.max(height, 4), background: 'linear-gradient(180deg, #7C3AED 0%, #5B21B6 100%)' }} />
                        <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight">
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
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {Object.keys(rows[0]).map(key => (
                        <th key={key} className="px-4 py-3 text-left text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide bg-[var(--bg-elevated)] border-b-2 border-[var(--border-default)]">
                          {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-elevated)] transition-colors">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-4 py-2.5 text-[13px] text-[var(--text-secondary)]">
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
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
              <div className="text-center py-16 text-[var(--text-muted)]">
                <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-[15px] font-medium">No data available for this report</p>
                <p className="text-[13px]">Try adjusting the date range or report type</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Initial state */}
      {!report && !loading && !error && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl">
          <div className="text-center py-20 text-[var(--text-muted)]">
            <BarChart3 size={48} className="mx-auto mb-4 opacity-30 text-[var(--text-primary)]" />
            <p className="text-[17px] font-semibold text-[var(--text-primary)] mb-1.5">Select a report type and generate</p>
            <p className="text-[14px]">Choose a report type above, set your date range, and click Generate Report</p>
          </div>
        </div>
      )}
    </div>
  );
}
