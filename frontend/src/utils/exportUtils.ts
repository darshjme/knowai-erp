/**
 * Export utilities for Know AI ERP
 * CSV download + PDF print for any data table
 */

// ── CSV Export ──────────────────────────────────────────
export function exportCSV(data, columns, filename = 'export') {
  if (!data || data.length === 0) return;

  const headers = columns.map(c => c.label || c.key);
  const rows = data.map(row =>
    columns.map(c => {
      let val = c.accessor ? c.accessor(row) : row[c.key];
      if (val === null || val === undefined) val = '';
      // Escape commas and quotes
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`;
      return val;
    })
  );

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── PDF Export (Print-based) ────────────────────────────
export function exportPDF(title, data, columns, filename = 'export') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { alert('Please allow popups'); return; }

  const headers = columns.map(c => `<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #146DF7;font-size:11px;font-weight:700;text-transform:uppercase;color:#4C5963;letter-spacing:0.5px">${c.label || c.key}</th>`).join('');

  const rows = data.map(row =>
    '<tr>' + columns.map(c => {
      let val = c.accessor ? c.accessor(row) : row[c.key];
      if (val === null || val === undefined) val = '';
      return `<td style="padding:8px 12px;border-bottom:1px solid #E7E7E8;font-size:12px;color:#10222F">${val}</td>`;
    }).join('') + '</tr>'
  ).join('');

  printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; color: #10222F; }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #146DF7; }
      .logo { font-size: 20px; font-weight: 800; color: #146DF7; }
      .title { font-size: 22px; font-weight: 700; }
      .meta { font-size: 12px; color: #5B6B76; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #E7E7E8; font-size: 11px; color: #5B6B76; display: flex; justify-content: space-between; }
      @media print { body { margin: 20px; } .no-print { display: none; } }
    </style>
  </head><body>
    <div class="header">
      <span class="logo">KnowAI</span>
      <span class="title">${title}</span>
    </div>
    <div class="meta">Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString()} • ${data.length} records</div>
    <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
    <div class="footer">
      <span>Know AI Enterprise ERP</span>
      <span>Confidential</span>
    </div>
    <script>window.onload=function(){window.print();}</script>
  </body></html>`);
  printWindow.document.close();
}

// ── Quick Export Button Component ────────────────────────
// Usage: <ExportButtons data={data} columns={columns} filename="tasks" title="Tasks Report" />
export function getExportColumns(pageType) {
  const COLUMNS = {
    tasks: [
      { key: 'title', label: 'Task' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
      { key: 'project', label: 'Project', accessor: r => r.project?.name || '' },
      { key: 'assignee', label: 'Assignee', accessor: r => r.assignee ? `${r.assignee.firstName} ${r.assignee.lastName}` : '' },
      { key: 'dueDate', label: 'Due Date', accessor: r => r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '' },
    ],
    projects: [
      { key: 'name', label: 'Project' },
      { key: 'status', label: 'Status' },
      { key: 'progress', label: 'Progress', accessor: r => `${r.progress || 0}%` },
      { key: 'manager', label: 'Manager', accessor: r => r.manager ? `${r.manager.firstName} ${r.manager.lastName}` : '' },
      { key: 'dueDate', label: 'Due Date', accessor: r => r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '' },
    ],
    team: [
      { key: 'name', label: 'Name', accessor: r => r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim() },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' },
      { key: 'status', label: 'Status' },
    ],
    clients: [
      { key: 'name', label: 'Client' },
      { key: 'company', label: 'Company' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'industry', label: 'Industry' },
    ],
    leads: [
      { key: 'title', label: 'Lead' },
      { key: 'value', label: 'Value', accessor: r => r.value ? `₹${r.value.toLocaleString()}` : '' },
      { key: 'status', label: 'Status' },
      { key: 'source', label: 'Source' },
      { key: 'client', label: 'Client', accessor: r => r.client?.name || '' },
      { key: 'assignee', label: 'Assigned To', accessor: r => r.assignee ? `${r.assignee.firstName} ${r.assignee.lastName}` : '' },
    ],
    invoices: [
      { key: 'invoiceNumber', label: 'Invoice #' },
      { key: 'clientName', label: 'Client' },
      { key: 'subtotal', label: 'Subtotal', accessor: r => `₹${(r.subtotal || 0).toLocaleString()}` },
      { key: 'tax', label: 'Tax', accessor: r => `₹${(r.tax || 0).toLocaleString()}` },
      { key: 'total', label: 'Total', accessor: r => `₹${(r.total || 0).toLocaleString()}` },
      { key: 'status', label: 'Status' },
      { key: 'dueDate', label: 'Due Date', accessor: r => r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '' },
    ],
    expenses: [
      { key: 'title', label: 'Expense' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount', accessor: r => `₹${(r.amount || 0).toLocaleString()}` },
      { key: 'status', label: 'Status' },
      { key: 'submitter', label: 'Submitted By', accessor: r => r.submitter ? `${r.submitter.firstName} ${r.submitter.lastName}` : '' },
      { key: 'createdAt', label: 'Date', accessor: r => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '' },
    ],
    payroll: [
      { key: 'employee', label: 'Employee', accessor: r => r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : r.employeeName || '' },
      { key: 'month', label: 'Month' },
      { key: 'year', label: 'Year' },
      { key: 'basicPay', label: 'Basic Pay', accessor: r => `₹${(r.basicPay || 0).toLocaleString()}` },
      { key: 'hra', label: 'HRA', accessor: r => `₹${(r.hra || 0).toLocaleString()}` },
      { key: 'transport', label: 'Transport', accessor: r => `₹${(r.transport || 0).toLocaleString()}` },
      { key: 'bonus', label: 'Bonus', accessor: r => `₹${(r.bonus || 0).toLocaleString()}` },
      { key: 'deductions', label: 'Deductions', accessor: r => `₹${(r.deductions || 0).toLocaleString()}` },
      { key: 'totalPay', label: 'Total', accessor: r => `₹${(r.totalPay || 0).toLocaleString()}` },
      { key: 'status', label: 'Status' },
    ],
    leaves: [
      { key: 'employee', label: 'Employee', accessor: r => r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '' },
      { key: 'type', label: 'Type' },
      { key: 'startDate', label: 'Start', accessor: r => r.startDate ? new Date(r.startDate).toLocaleDateString() : '' },
      { key: 'endDate', label: 'End', accessor: r => r.endDate ? new Date(r.endDate).toLocaleDateString() : '' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status' },
    ],
    hiring: [
      { key: 'title', label: 'Position' },
      { key: 'department', label: 'Department' },
      { key: 'location', label: 'Location' },
      { key: 'type', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'candidates', label: 'Applicants', accessor: r => r._count?.candidates || r.candidates?.length || 0 },
    ],
    complaints: [
      { key: 'ticketNumber', label: 'Ticket #' },
      { key: 'subject', label: 'Subject' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status' },
      { key: 'filedBy', label: 'Filed By', accessor: r => r.filedBy ? `${r.filedBy.firstName} ${r.filedBy.lastName}` : '' },
      { key: 'createdAt', label: 'Date', accessor: r => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '' },
    ],
    documents: [
      { key: 'employee', label: 'Employee', accessor: r => r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '' },
      { key: 'type', label: 'Document Type' },
      { key: 'fileName', label: 'File' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Submitted', accessor: r => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '' },
    ],
    audit: [
      { key: 'createdAt', label: 'Time', accessor: r => r.createdAt ? new Date(r.createdAt).toLocaleString() : '' },
      { key: 'user', label: 'User', accessor: r => r.user ? `${r.user.firstName} ${r.user.lastName}` : '' },
      { key: 'action', label: 'Action' },
      { key: 'entity', label: 'Entity' },
      { key: 'description', label: 'Details' },
      { key: 'ipAddress', label: 'IP' },
    ],
    timeTracking: [
      { key: 'description', label: 'Description' },
      { key: 'project', label: 'Project', accessor: r => r.project?.name || '' },
      { key: 'task', label: 'Task', accessor: r => r.task?.title || '' },
      { key: 'duration', label: 'Duration (min)' },
      { key: 'billable', label: 'Billable', accessor: r => r.billable ? 'Yes' : 'No' },
      { key: 'startTime', label: 'Start', accessor: r => r.startTime ? new Date(r.startTime).toLocaleString() : '' },
    ],
  };
  return COLUMNS[pageType] || [];
}
