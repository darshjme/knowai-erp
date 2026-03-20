import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';

/* ========================================================================
   CONSTANTS
   ======================================================================== */

const BRAND_COLOR = '#111827';
const BRAND_DARK = '#10222F';
const BRAND_GRADIENT = 'linear-gradient(135deg, #111827 0%, #10222F 100%)';

const JOB_TYPE_STYLES = {
  'full-time':  { bg: '#D1FAE5', color: '#065F46', label: 'Full-time' },
  'part-time':  { bg: '#FEF3C7', color: '#92400E', label: 'Part-time' },
  'contract':   { bg: '#EDE9FE', color: '#7C3AED', label: 'Contract' },
  'internship': { bg: '#DBEAFE', color: '#1D4ED8', label: 'Internship' },
  'freelance':  { bg: '#FCE7F3', color: '#BE185D', label: 'Freelance' },
};

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/* ========================================================================
   MAIN COMPONENT
   ======================================================================== */

export default function Careers() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [submitting, setSubmitting] = useState(false);
  const [applyForm, setApplyForm] = useState({
    name: '', email: '', phone: '', coverLetter: '',
  });

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hiring?publicCareers=true');
      if (!res.ok) throw new Error('Failed to fetch');
      const rd = await res.json();
      const allJobs = Array.isArray(rd) ? rd : rd?.data || rd?.jobs || [];
      // Filter to only active/open jobs
      setJobs(allJobs.filter(j => j.status === 'OPEN' || j.status === 'ACTIVE' || j.active !== false));
    } catch (err) {
      // Gracefully handle - no auth might cause failure
      console.warn('Could not load careers:', err.message);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const departments = useMemo(() => {
    const set = new Set(jobs.map(j => j.department).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [jobs]);

  const jobTypes = useMemo(() => {
    const set = new Set(jobs.map(j => j.type || j.employmentType).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [jobs]);

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      if (departmentFilter !== 'All' && j.department !== departmentFilter) return false;
      const jType = j.type || j.employmentType || '';
      if (typeFilter !== 'All' && jType !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const title = (j.title || '').toLowerCase();
        const dept = (j.department || '').toLowerCase();
        const desc = (j.description || '').toLowerCase();
        if (!title.includes(q) && !dept.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, departmentFilter, typeFilter, searchQuery]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!applyForm.name || !applyForm.email) {
      toast.error('Name and email are required');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/hiring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addCandidate',
          jobId: applyingJobId,
          name: applyForm.name,
          email: applyForm.email,
          phone: applyForm.phone || undefined,
          coverLetter: applyForm.coverLetter || undefined,
          source: 'careers_page',
          status: 'APPLIED',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || 'Failed to submit');
      }
      toast.success('Application submitted successfully! We will get back to you soon.');
      setShowApplyModal(false);
      setApplyForm({ name: '', email: '', phone: '', coverLetter: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openApply = (jobId) => {
    setApplyingJobId(jobId);
    setApplyForm({ name: '', email: '', phone: '', coverLetter: '' });
    setShowApplyModal(true);
  };

  /* ── Render ── */

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Header / Navbar */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: BRAND_COLOR,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, fontWeight: 800,
          }}>
            K
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: BRAND_DARK, letterSpacing: -0.3 }}>Know AI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14, color: '#6B7280' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="bi bi-briefcase" style={{ color: BRAND_COLOR }} />
            Careers
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{
        background: BRAND_GRADIENT, color: '#fff', padding: '64px 20px 56px',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 14, lineHeight: 1.2, letterSpacing: -0.5 }}>
            Join Our Team
          </h1>
          <p style={{ fontSize: 17, opacity: 0.9, maxWidth: 560, margin: '0 auto 28px', lineHeight: 1.6 }}>
            Build the future of AI-powered business solutions. We are looking for passionate people to help us grow.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: 'rgba(255,255,255,0.15)', borderRadius: 999, backdropFilter: 'blur(10px)', fontSize: 14 }}>
            <i className="bi bi-briefcase-fill" style={{ fontSize: 14 }} />
            {jobs.length} open position{jobs.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 60px' }}>
        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <i className="bi bi-search" style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: '#9CA3AF', fontSize: 15,
            }} />
            <input type="text" placeholder="Search positions..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px 12px 40px', borderRadius: 10, border: '1px solid #E5E7EB',
                fontSize: 14, background: '#fff', outline: 'none', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = BRAND_COLOR}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
          <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, background: '#fff', minWidth: 160 }}>
            {departments.map(d => (
              <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, background: '#fff', minWidth: 140 }}>
            {jobTypes.map(t => (
              <option key={t} value={t}>{t === 'All' ? 'All Types' : (JOB_TYPE_STYLES[t.toLowerCase()]?.label || t)}</option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
            <i className="bi bi-arrow-repeat" style={{ fontSize: 28, display: 'block', marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 500 }}>Loading positions...</div>
          </div>
        )}

        {/* No Results */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <i className="bi bi-search" style={{ fontSize: 48, color: '#D1D5DB', display: 'block', marginBottom: 16 }} />
            <div style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 8 }}>No positions available</div>
            <div style={{ fontSize: 14, color: '#9CA3AF' }}>
              {jobs.length === 0 ? 'No openings at the moment. Check back soon!' : 'Try adjusting your search or filters.'}
            </div>
          </div>
        )}

        {/* Job Grid */}
        {!loading && filtered.length > 0 && (
          <>
            {/* Selected Job Detail View */}
            {selectedJob ? (
              <div>
                <button onClick={() => setSelectedJob(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8,
                    border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151',
                    cursor: 'pointer', marginBottom: 20, transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <i className="bi bi-arrow-left" /> Back to all positions
                </button>
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                  {/* Job Header */}
                  <div style={{ padding: '28px 32px', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                      <div>
                        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: '0 0 8px', lineHeight: 1.2 }}>
                          {selectedJob.title}
                        </h2>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          {selectedJob.department && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6B7280' }}>
                              <i className="bi bi-building" /> {selectedJob.department}
                            </span>
                          )}
                          {(selectedJob.type || selectedJob.employmentType) && (() => {
                            const jt = (selectedJob.type || selectedJob.employmentType || '').toLowerCase();
                            const style = JOB_TYPE_STYLES[jt] || { bg: '#F3F4F6', color: '#374151', label: selectedJob.type || selectedJob.employmentType };
                            return (
                              <span style={{ padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: style.bg, color: style.color }}>
                                {style.label}
                              </span>
                            );
                          })()}
                          {selectedJob.location && (
                            <span style={{ fontSize: 13, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="bi bi-geo-alt" /> {selectedJob.location}
                            </span>
                          )}
                          <span style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="bi bi-calendar3" /> Posted {formatDate(selectedJob.createdAt || selectedJob.postedAt)}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => openApply(selectedJob._id || selectedJob.id)}
                        style={{
                          padding: '12px 32px', borderRadius: 10, border: 'none', background: BRAND_COLOR,
                          color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                          transition: 'opacity 0.2s', boxShadow: '0 2px 8px var(--kai-primary-light, rgba(17,24,39,0.2))',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                        <i className="bi bi-send" /> Apply Now
                      </button>
                    </div>
                  </div>

                  {/* Job Body */}
                  <div style={{ padding: '28px 32px' }}>
                    {selectedJob.description && (
                      <div style={{ marginBottom: 24 }}>
                        <h4 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <i className="bi bi-file-text" style={{ color: BRAND_COLOR }} /> About This Role
                        </h4>
                        <div style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                          {selectedJob.description}
                        </div>
                      </div>
                    )}

                    {selectedJob.requirements && (
                      <div style={{ marginBottom: 24 }}>
                        <h4 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <i className="bi bi-list-check" style={{ color: BRAND_COLOR }} /> Requirements
                        </h4>
                        <div style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                          {Array.isArray(selectedJob.requirements)
                            ? selectedJob.requirements.map((r, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                <i className="bi bi-check2" style={{ color: BRAND_COLOR, marginTop: 2, flexShrink: 0 }} /> {r}
                              </div>
                            ))
                            : selectedJob.requirements
                          }
                        </div>
                      </div>
                    )}

                    {selectedJob.salary && (
                      <div style={{ marginBottom: 24 }}>
                        <h4 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <i className="bi bi-currency-dollar" style={{ color: BRAND_COLOR }} /> Compensation
                        </h4>
                        <div style={{ fontSize: 14, color: '#4B5563' }}>{selectedJob.salary}</div>
                      </div>
                    )}

                    {/* Apply CTA */}
                    <div style={{
                      marginTop: 32, padding: 24, background: '#F0F7FF', borderRadius: 12, textAlign: 'center',
                      border: '1px solid #BFDBFE',
                    }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
                        <i className="bi bi-stars" style={{ marginRight: 8, color: BRAND_COLOR }} />Interested in this role?
                      </div>
                      <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Submit your application and we will get back to you shortly.</div>
                      <button onClick={() => openApply(selectedJob._id || selectedJob.id)}
                        style={{
                          padding: '12px 40px', borderRadius: 10, border: 'none', background: BRAND_COLOR,
                          color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                          boxShadow: '0 2px 8px var(--kai-primary-light, rgba(17,24,39,0.2))', display: 'inline-flex', alignItems: 'center', gap: 8,
                        }}>
                        <i className="bi bi-send" /> Apply Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Job Cards Grid */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}>
                {filtered.map(job => {
                  const jt = (job.type || job.employmentType || '').toLowerCase();
                  const jtStyle = JOB_TYPE_STYLES[jt] || { bg: '#F3F4F6', color: '#374151', label: job.type || job.employmentType || 'Full-time' };
                  return (
                    <div key={job._id || job.id}
                      style={{
                        background: '#fff', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24,
                        cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                      }}
                      onClick={() => setSelectedJob(job)}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = BRAND_COLOR; e.currentTarget.style.boxShadow = '0 4px 16px var(--kai-primary-light, rgba(17,24,39,0.08))'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}>

                      {/* Department Icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, background: '#F0F7FF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, marginBottom: 14, color: BRAND_COLOR,
                      }}>
                        <i className="bi bi-briefcase-fill" />
                      </div>

                      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: '0 0 8px', lineHeight: 1.3 }}>
                        {job.title}
                      </h3>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        {job.department && (
                          <span style={{ fontSize: 12, color: '#6B7280', padding: '2px 10px', background: '#F3F4F6', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="bi bi-building" style={{ fontSize: 10 }} /> {job.department}
                          </span>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 999, background: jtStyle.bg, color: jtStyle.color }}>
                          {jtStyle.label}
                        </span>
                      </div>

                      {job.location && (
                        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="bi bi-geo-alt" style={{ fontSize: 12 }} /> {job.location}
                        </div>
                      )}

                      {job.description && (
                        <p style={{
                          fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: '0 0 16px',
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {job.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="bi bi-calendar3" style={{ fontSize: 10 }} />
                          {formatDate(job.createdAt || job.postedAt)}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: BRAND_COLOR, display: 'flex', alignItems: 'center', gap: 4 }}>
                          View Details <i className="bi bi-arrow-right" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowApplyModal(false)}>
          <div style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="bi bi-person-plus" style={{ color: BRAND_COLOR }} /> Apply for Position
                </h4>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                  {selectedJob?.title || jobs.find(j => (j._id || j.id) === applyingJobId)?.title || ''}
                </div>
              </div>
              <button onClick={() => setShowApplyModal(false)}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <i className="bi bi-x-lg" style={{ fontSize: 14 }} />
              </button>
            </div>

            <form onSubmit={handleApply}>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    <i className="bi bi-person" style={{ marginRight: 4, color: BRAND_COLOR }} /> Full Name *
                  </label>
                  <input type="text" required placeholder="John Doe" value={applyForm.name}
                    onChange={e => setApplyForm(p => ({ ...p, name: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = BRAND_COLOR}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    <i className="bi bi-envelope" style={{ marginRight: 4, color: BRAND_COLOR }} /> Email Address *
                  </label>
                  <input type="email" required placeholder="john@example.com" value={applyForm.email}
                    onChange={e => setApplyForm(p => ({ ...p, email: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = BRAND_COLOR}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    <i className="bi bi-telephone" style={{ marginRight: 4, color: BRAND_COLOR }} /> Phone Number
                  </label>
                  <input type="tel" placeholder="+91 98765 43210" value={applyForm.phone}
                    onChange={e => setApplyForm(p => ({ ...p, phone: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = BRAND_COLOR}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    <i className="bi bi-file-earmark-text" style={{ marginRight: 4, color: BRAND_COLOR }} /> Resume / Cover Letter
                  </label>
                  <textarea rows={5} placeholder="Paste your resume or cover letter here, or share a link to your resume (Google Drive, Dropbox, etc.)..."
                    value={applyForm.coverLetter} onChange={e => setApplyForm(p => ({ ...p, coverLetter: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 120 }}
                    onFocus={e => e.target.style.borderColor = BRAND_COLOR}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setShowApplyModal(false)}
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#374151' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  style={{
                    padding: '10px 28px', borderRadius: 8, border: 'none', background: BRAND_COLOR,
                    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                  {submitting ? (
                    <><i className="bi bi-arrow-repeat" /> Submitting...</>
                  ) : (
                    <><i className="bi bi-send" /> Submit Application</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ background: BRAND_DARK, color: '#fff', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: BRAND_COLOR,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 14, fontWeight: 800,
            }}>
              K
            </div>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Know AI</span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12, lineHeight: 1.6 }}>
            AI-powered business solutions for the modern enterprise.
          </p>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            &copy; {new Date().getFullYear()} Know AI. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
