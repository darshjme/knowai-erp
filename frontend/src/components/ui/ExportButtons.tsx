import { Download, FileText } from 'lucide-react';
import { exportCSV, exportPDF, getExportColumns } from '../../utils/exportUtils';
import { toast } from 'react-toastify';

/**
 * Export buttons for CSV and PDF
 * @param {Object} props
 * @param {Array} props.data - Array of data objects
 * @param {string} props.pageType - One of: tasks, projects, team, clients, leads, invoices, expenses, payroll, leaves, hiring, complaints, documents, audit, timeTracking
 * @param {string} props.title - Title for PDF header
 * @param {string} props.filename - Base filename for downloads
 * @param {Array} [props.columns] - Custom columns (overrides pageType defaults)
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
    <div style={{ display: 'flex', gap: 6 }}>
      <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={handleCSV} title="Export as CSV">
        <Download size={14} /> CSV
      </button>
      <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={handlePDF} title="Export as PDF">
        <FileText size={14} /> PDF
      </button>
    </div>
  );
}
