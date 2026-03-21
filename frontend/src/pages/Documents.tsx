import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { documentsApi } from '../services/api';

const DOC_TYPES = ['Aadhaar Card', 'PAN Card', 'Passport', 'Driving License', 'Degree Certificate', 'Experience Letter', 'Offer Letter', 'Payslip', 'Bank Statement', 'Other'];
const STATUS_STYLES = {
  Pending: { bg: '#EA580C20', color: '#EA580C' },
  'Under Review': { bg: '#2563EB20', color: '#2563EB' },
  Verified: { bg: '#16A34A20', color: '#16A34A' },
  Rejected: { bg: '#CB393920', color: '#CB3939' },
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function Documents() {
  const dispatch = useDispatch();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    employeeName: '', employeeId: '', documentType: 'Aadhaar Card', fileName: '', fileUrl: '', notes: '',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Documents' });
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await documentsApi.list();
      setDocuments(Array.isArray(res.data) ? res.data : res.data?.data || res.data?.documents || []);
    } catch (err) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return documents.filter(d => {
      const matchStatus = statusFilter === 'All' || d.status === statusFilter;
      const matchSearch = !search || [d.employeeName, d.documentType, d.fileName]
        .some(f => (f || '').toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [documents, statusFilter, search]);

  const stats = useMemo(() => ({
    pending: documents.filter(d => d.status === 'Pending').length,
    underReview: documents.filter(d => d.status === 'Under Review').length,
    verified: documents.filter(d => d.status === 'Verified').length,
    rejected: documents.filter(d => d.status === 'Rejected').length,
  }), [documents]);

  const handleUpload = async (e) => {
    e.preventDefault();
    try {
      await documentsApi.upload({
        ...form,
        status: 'Pending',
        submittedDate: new Date().toISOString(),
      });
      toast.success('Document uploaded successfully');
      setShowUploadModal(false);
      setForm({ employeeName: '', employeeId: '', documentType: 'Aadhaar Card', fileName: '', fileUrl: '', notes: '' });
      fetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
    }
  };

  const handleStatusUpdate = async (doc, newStatus) => {
    try {
      await documentsApi.update(doc._id || doc.id, { status: newStatus, reviewedAt: new Date().toISOString() });
      toast.success(`Document ${newStatus.toLowerCase()}`);
      if (previewDoc && (previewDoc._id || previewDoc.id) === (doc._id || doc.id)) {
        setPreviewDoc({ ...previewDoc, status: newStatus });
      }
      fetchDocuments();
    } catch (err) {
      toast.error('Failed to update document status');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight font-[Manrope]">Document Verification</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Manage and verify employee documents</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="upload-doc-btn" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-2" onClick={() => setShowUploadModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Document
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending', value: stats.pending, color: '#EA580C' },
          { label: 'Under Review', value: stats.underReview, color: '#2563EB' },
          { label: 'Verified', value: stats.verified, color: '#16A34A' },
          { label: 'Rejected', value: stats.rejected, color: '#CB3939' },
        ].map((s, i) => (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5" key={i}>
            <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[13px] text-[var(--text-secondary)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl mb-6">
        <div className="p-3 flex gap-3 flex-wrap items-center">
          <div className="flex-[1_1_250px] min-w-[200px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input data-testid="search-docs" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg pl-9 pr-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px] min-w-[160px]" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-6 flex-wrap">
        {/* Documents Table */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl flex-[1_1_500px] min-w-0">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
            <h6 className="text-[14px] font-semibold text-[var(--text-primary)] m-0">Documents</h6>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)]">{filtered.length} documents</span>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-[var(--text-muted)]">Loading documents...</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-[var(--text-muted)]">
                {documents.length === 0 ? 'No documents uploaded yet.' : 'No documents match your filters.'}
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b-2 border-[var(--border-default)]">
                    {['Employee', 'Document Type', 'File Name', 'Submitted', 'Status', 'Reviewer', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(doc => {
                    const st = STATUS_STYLES[doc.status] || STATUS_STYLES.Pending;
                    const isActive = previewDoc && (previewDoc._id || previewDoc.id) === (doc._id || doc.id);
                    return (
                      <tr key={doc._id || doc.id} className={`border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors ${isActive ? 'bg-[#7C3AED]/5' : ''}`}
                        onClick={() => setPreviewDoc(doc)}>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-[var(--text-primary)]">{doc.employeeName || '-'}</div>
                          {doc.employeeId && <div className="text-[11px] text-[var(--text-muted)]">{doc.employeeId}</div>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#2563EB]/10 text-[#2563EB]">{doc.documentType || '-'}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="truncate max-w-[150px]" title={doc.fileName}>{doc.fileName || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5">{formatDate(doc.submittedDate || doc.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>{doc.status}</span>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-[var(--text-muted)]">{doc.reviewer || '-'}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            {(doc.status === 'Pending' || doc.status === 'Under Review') && (
                              <>
                                <button className="bg-[#16A34A] text-white rounded-lg px-2 py-1 text-[11px] font-semibold hover:bg-[#16A34A]/90 transition-colors" onClick={() => handleStatusUpdate(doc, 'Verified')}>Verify</button>
                                <button className="bg-[#CB3939] text-white rounded-lg px-2 py-1 text-[11px] font-semibold hover:bg-[#CB3939]/90 transition-colors" onClick={() => handleStatusUpdate(doc, 'Rejected')}>Reject</button>
                              </>
                            )}
                            {doc.status === 'Pending' && (
                              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-[11px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => handleStatusUpdate(doc, 'Under Review')}>Review</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        {previewDoc && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[340px] flex-[0_0_340px] min-w-[280px] self-start sticky top-[88px]">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <h6 className="text-[14px] font-semibold text-[var(--text-primary)] m-0">Document Preview</h6>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setPreviewDoc(null)}>&times;</button>
            </div>
            <div className="p-4">
              <div className="h-[180px] bg-[var(--bg-elevated)] rounded-lg mb-4 flex items-center justify-center border border-[var(--border-subtle)]">
                {previewDoc.fileUrl ? (
                  <a href={previewDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-center no-underline">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <div className="text-[12px] mt-2 text-[#7C3AED]">View Document</div>
                  </a>
                ) : (
                  <div className="text-center text-[var(--text-muted)]">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <div className="text-[12px] mt-2">No preview available</div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2.5">
                {[
                  { label: 'Employee', value: previewDoc.employeeName },
                  { label: 'Type', value: previewDoc.documentType },
                  { label: 'File', value: previewDoc.fileName || '-' },
                  { label: 'Submitted', value: formatDate(previewDoc.submittedDate || previewDoc.createdAt) },
                ].map(item => (
                  <div key={item.label}>
                    <div className="text-[11px] text-[var(--text-muted)] font-semibold uppercase mb-0.5">{item.label}</div>
                    <div className="text-[13px] text-[var(--text-primary)]">{item.value}</div>
                  </div>
                ))}
                <div>
                  <div className="text-[11px] text-[var(--text-muted)] font-semibold uppercase mb-0.5">Status</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: (STATUS_STYLES[previewDoc.status] || STATUS_STYLES.Pending).bg, color: (STATUS_STYLES[previewDoc.status] || STATUS_STYLES.Pending).color }}>
                    {previewDoc.status}
                  </span>
                </div>
                {previewDoc.notes && (
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)] font-semibold uppercase mb-0.5">Notes</div>
                    <div className="text-[13px] text-[var(--text-primary)]">{previewDoc.notes}</div>
                  </div>
                )}
              </div>

              {(previewDoc.status === 'Pending' || previewDoc.status === 'Under Review') && (
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 bg-[#16A34A] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-[#16A34A]/90 transition-colors" onClick={() => handleStatusUpdate(previewDoc, 'Verified')}>
                    Approve
                  </button>
                  <button className="flex-1 bg-[#CB3939] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-[#CB3939]/90 transition-colors" onClick={() => handleStatusUpdate(previewDoc, 'Rejected')}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-5"
          onClick={e => e.target === e.currentTarget && setShowUploadModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-full max-w-[480px] max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <h5 className="text-[16px] font-bold text-[var(--text-primary)] m-0">Upload Document</h5>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowUploadModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="p-4 flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Employee Name *</label>
                  <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" required placeholder="John Doe" value={form.employeeName}
                    onChange={e => setForm(p => ({ ...p, employeeName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Employee ID</label>
                  <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" placeholder="EMP-001" value={form.employeeId}
                    onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Document Type *</label>
                  <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px]" value={form.documentType}
                    onChange={e => setForm(p => ({ ...p, documentType: e.target.value }))}>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">File Name *</label>
                  <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" required placeholder="aadhaar_john_doe.pdf" value={form.fileName}
                    onChange={e => setForm(p => ({ ...p, fileName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">File URL / Link</label>
                  <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" placeholder="https://drive.google.com/..." value={form.fileUrl}
                    onChange={e => setForm(p => ({ ...p, fileUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Notes</label>
                  <textarea className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px] resize-y" rows={2} placeholder="Any additional notes..." value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-[var(--border-subtle)]">
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowUploadModal(false)}>Cancel</button>
                <button type="submit" data-testid="submit-upload" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors">Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
