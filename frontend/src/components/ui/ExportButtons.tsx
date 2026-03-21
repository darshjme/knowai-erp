import { Download, FileText } from 'lucide-react';
import { exportCSV, exportPDF, getExportColumns } from '../../utils/exportUtils';
import { toast } from 'react-toastify';

/**
 * Export buttons for CSV and PDF
 */
export default function ExportButtons({ data, pageType, title, filename, columns }: { data: any; pageType?: any; title?: any; filename?: any; columns?: any }) {
  const cols = columns || getExportColumns(pageType);

  if (!data || data.length === 0 || cols.length === 0) return null;

  const handleCSV = () => {
    exportCSV(data, cols, filename || pageType);
    toast.success(`CSV exported: ${data.length} records`);
  };

  const handlePDF = () => {
    exportPDF(title || filename || pageType, data, cols, filename || pageType);
  };

  return (
    <div className="flex gap-1.5">
      <button
        data-testid="export-csv"
        className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1.5 text-[13px] font-medium hover:bg-[var(--bg-elevated)] transition-colors inline-flex items-center gap-1.5"
        onClick={handleCSV}
        title="Export as CSV"
      >
        <Download size={14} /> CSV
      </button>
      <button
        data-testid="export-pdf"
        className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1.5 text-[13px] font-medium hover:bg-[var(--bg-elevated)] transition-colors inline-flex items-center gap-1.5"
        onClick={handlePDF}
        title="Export as PDF"
      >
        <FileText size={14} /> PDF
      </button>
    </div>
  );
}
