import ExportButtons from '../components/ui/ExportButtons';
import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { documentsApi } from '../services/api';

const DOC_TYPES = ['Aadhaar Card', 'PAN Card', 'Passport', 'Driving License', 'Degree Certificate', 'Experience Letter', 'Offer Letter', 'Payslip', 'Bank Statement', 'Other'];
const STATUS_STYLES = {
  Pending: { bg: '#fff3cd', color: '#856404' },
  'Under Review': { bg: '#d1ecf1', color: '#0c5460' },
  Verified: { bg: '#d4edda', color: '#155724' },
  Rejected: { bg: '#f8d7da', color: '#721c24' },
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
      <div className="page-header">
        <div>
          <h1>Document Verification</h1>
          <p>Manage and verify employee documents</p>
        </div>
        <div className="page-actions">
          <button className="kai-btn kai-btn-primary" onClick={() => setShowUploadModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Document
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Pending', value: stats.pending, color: '#EA580C' },
          { label: 'Under Review', value: stats.underReview, color: '#2563EB' },
          { label: 'Verified', value: stats.verified, color: '#16A34A' },
          { label: 'Rejected', value: stats.rejected, color: '#CB3939' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="kai-card" style={{ marginBottom: 24 }}>
        <div className="kai-card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="kai-search" style={{ flex: '1 1 250px', minWidth: 200 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="kai-input" style={{ width: 'auto', minWidth: 160 }} value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Documents Table */}
        <div className="kai-card" style={{ flex: '1 1 500px', minWidth: 0 }}>
          <div className="kai-card-header">
            <h6>Documents</h6>
            <span className="kai-badge secondary">{filtered.length} documents</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>Loading documents...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>
                {documents.length === 0 ? 'No documents uploaded yet.' : 'No documents match your filters.'}
              </div>
            ) : (
              <table className="kai-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Document Type</th>
                    <th>File Name</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Reviewer</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(doc => {
                    const st = STATUS_STYLES[doc.status] || STATUS_STYLES.Pending;
                    const isActive = previewDoc && (previewDoc._id || previewDoc.id) === (doc._id || doc.id);
                    return (
                      <tr key={doc._id || doc.id} style={{ background: isActive ? 'var(--kai-primary-light)' : undefined, cursor: 'pointer' }}
                        onClick={() => setPreviewDoc(doc)}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{doc.employeeName || '-'}</div>
                          {doc.employeeId && <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>{doc.employeeId}</div>}
                        </td>
                        <td>
                          <span className="kai-badge info">{doc.documentType || '-'}</span>
                        </td>
                        <td>
                          <div className="truncate" style={{ maxWidth: 150 }} title={doc.fileName}>{doc.fileName || '-'}</div>
                        </td>
                        <td>{formatDate(doc.submittedDate || doc.createdAt)}</td>
                        <td>
                          <span className="kai-badge" style={{ background: st.bg, color: st.color }}>{doc.status}</span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{doc.reviewer || '-'}</td>
                        <td>
                          <div className="flex-gap-8" onClick={e => e.stopPropagation()}>
                            {(doc.status === 'Pending' || doc.status === 'Under Review') && (
                              <>
                                <button className="kai-btn kai-btn-success kai-btn-sm" onClick={() => handleStatusUpdate(doc, 'Verified')}>Verify</button>
                                <button className="kai-btn kai-btn-danger kai-btn-sm" onClick={() => handleStatusUpdate(doc, 'Rejected')}>Reject</button>
                              </>
                            )}
                            {doc.status === 'Pending' && (
                              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => handleStatusUpdate(doc, 'Under Review')}>Review</button>
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
          <div className="kai-card" style={{ width: 340, flex: '0 0 340px', minWidth: 280, alignSelf: 'flex-start', position: 'sticky', top: 88 }}>
            <div className="kai-card-header">
              <h6>Document Preview</h6>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setPreviewDoc(null)}>&times;</button>
            </div>
            <div className="kai-card-body">
              {/* File preview area */}
              <div style={{
                height: 180, background: 'var(--kai-bg)', borderRadius: 8, marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--kai-border-light)',
              }}>
                {previewDoc.fileUrl ? (
                  <a href={previewDoc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ textAlign: 'center' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--kai-primary)" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <div style={{ fontSize: 12, marginTop: 8, color: 'var(--kai-primary)' }}>View Document</div>
                  </a>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--kai-text-muted)' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <div style={{ fontSize: 12, marginTop: 8 }}>No preview available</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Employee</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{previewDoc.employeeName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Type</div>
                  <div style={{ fontSize: 13 }}>{previewDoc.documentType}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>File</div>
                  <div style={{ fontSize: 13 }}>{previewDoc.fileName || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
                  <span className="kai-badge" style={{ background: (STATUS_STYLES[previewDoc.status] || STATUS_STYLES.Pending).bg, color: (STATUS_STYLES[previewDoc.status] || STATUS_STYLES.Pending).color }}>
                    {previewDoc.status}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Submitted</div>
                  <div style={{ fontSize: 13 }}>{formatDate(previewDoc.submittedDate || previewDoc.createdAt)}</div>
                </div>
                {previewDoc.notes && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Notes</div>
                    <div style={{ fontSize: 13 }}>{previewDoc.notes}</div>
                  </div>
                )}
              </div>

              {(previewDoc.status === 'Pending' || previewDoc.status === 'Under Review') && (
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <button className="kai-btn kai-btn-success kai-btn-sm" style={{ flex: 1 }} onClick={() => handleStatusUpdate(previewDoc, 'Verified')}>
                    Approve
                  </button>
                  <button className="kai-btn kai-btn-danger kai-btn-sm" style={{ flex: 1 }} onClick={() => handleStatusUpdate(previewDoc, 'Rejected')}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowUploadModal(false)}>
          <div className="kai-card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="kai-card-header">
              <h5>Upload Document</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowUploadModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUpload}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="kai-label">Employee Name *</label>
                  <input className="kai-input" required placeholder="John Doe" value={form.employeeName}
                    onChange={e => setForm(p => ({ ...p, employeeName: e.target.value }))} />
                </div>
                <div>
                  <label className="kai-label">Employee ID</label>
                  <input className="kai-input" placeholder="EMP-001" value={form.employeeId}
                    onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} />
                </div>
                <div>
                  <label className="kai-label">Document Type *</label>
                  <select className="kai-input" value={form.documentType}
                    onChange={e => setForm(p => ({ ...p, documentType: e.target.value }))}>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="kai-label">File Name *</label>
                  <input className="kai-input" required placeholder="aadhaar_john_doe.pdf" value={form.fileName}
                    onChange={e => setForm(p => ({ ...p, fileName: e.target.value }))} />
                </div>
                <div>
                  <label className="kai-label">File URL / Link</label>
                  <input className="kai-input" placeholder="https://drive.google.com/..." value={form.fileUrl}
                    onChange={e => setForm(p => ({ ...p, fileUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="kai-label">Notes</label>
                  <textarea className="kai-input" rows={2} placeholder="Any additional notes..." value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowUploadModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary">Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
