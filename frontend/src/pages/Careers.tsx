import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { Search, Briefcase, MapPin, Calendar, ArrowLeft, ArrowRight, Send, X, Loader2, ChevronRight } from 'lucide-react';

const BRAND_COLOR = '#7C3AED';

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

const inputClass = "w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-3.5 py-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none";

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
  const [applyForm, setApplyForm] = useState({ name: '', email: '', phone: '', coverLetter: '' });

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hiring?publicCareers=true');
      if (!res.ok) throw new Error('Failed to fetch');
      const rd = await res.json();
      const allJobs = Array.isArray(rd) ? rd : rd?.data || rd?.jobs || [];
      setJobs(allJobs.filter(j => j.status === 'OPEN' || j.status === 'ACTIVE' || j.active !== false));
    } catch (err) {
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
    if (!applyForm.name || !applyForm.email) { toast.error('Name and email are required'); return; }
    try {
      setSubmitting(true);
      const res = await fetch('/api/hiring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addCandidate', jobId: applyingJobId,
          name: applyForm.name, email: applyForm.email,
          phone: applyForm.phone || undefined, coverLetter: applyForm.coverLetter || undefined,
          source: 'careers_page', status: 'APPLIED',
        }),
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message || data.error || 'Failed to submit'); }
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

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header / Navbar */}
      <div className="bg-[var(--bg-card)] border-b border-[var(--border-default)] px-6 py-3.5 flex items-center justify-between sticky top-0 z-[100]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white text-[16px] font-extrabold">K</div>
          <span className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight">Know AI</span>
        </div>
        <div className="flex items-center gap-4 text-[14px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1"><Briefcase size={14} className="text-[#7C3AED]" /> Careers</span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] text-white py-16 px-5 text-center relative overflow-hidden">
        <div className="relative max-w-[800px] mx-auto">
          <h1 className="text-[40px] font-extrabold mb-3.5 leading-tight tracking-tight">Join Our Team</h1>
          <p className="text-[17px] opacity-90 max-w-[560px] mx-auto mb-7 leading-relaxed">
            Build the future of AI-powered business solutions. We are looking for passionate people to help us grow.
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 rounded-full backdrop-blur-md text-[14px]">
            <Briefcase size={14} /> {jobs.length} open position{jobs.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-[1100px] mx-auto px-5 py-8 pb-16">
        {/* Search & Filters */}
        <div className="flex gap-3 mb-7 flex-wrap">
          <div className="flex-[1_1_300px] relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input data-testid="search-positions" type="text" placeholder="Search positions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className={`${inputClass} pl-10`} />
          </div>
          <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className={`${inputClass} min-w-[160px] w-auto`}>
            {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${inputClass} min-w-[140px] w-auto`}>
            {jobTypes.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : (JOB_TYPE_STYLES[t.toLowerCase()]?.label || t)}</option>)}
          </select>
        </div>

        {loading && (
          <div className="text-center py-20 text-[var(--text-muted)]">
            <Loader2 size={28} className="mx-auto mb-3 animate-spin" />
            <div className="text-[16px] font-medium">Loading positions...</div>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <Search size={48} className="mx-auto mb-4 text-[var(--text-muted)] opacity-40" />
            <div className="text-[18px] font-semibold text-[var(--text-primary)] mb-2">No positions available</div>
            <div className="text-[14px] text-[var(--text-muted)]">
              {jobs.length === 0 ? 'No openings at the moment. Check back soon!' : 'Try adjusting your search or filters.'}
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            {selectedJob ? (
              <div>
                <button data-testid="back-to-positions" onClick={() => setSelectedJob(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-[13px] font-medium text-[var(--text-secondary)] cursor-pointer mb-5 hover:bg-[var(--bg-elevated)] transition-colors">
                  <ArrowLeft size={14} /> Back to all positions
                </button>
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] overflow-hidden">
                  <div className="p-7 border-b border-[var(--border-subtle)]">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div>
                        <h2 className="text-[26px] font-bold text-[var(--text-primary)] mb-2 leading-tight">{selectedJob.title}</h2>
                        <div className="flex gap-3 flex-wrap items-center">
                          {selectedJob.department && <span className="flex items-center gap-1 text-[13px] text-[var(--text-secondary)]"><Briefcase size={13} /> {selectedJob.department}</span>}
                          {(selectedJob.type || selectedJob.employmentType) && (() => {
                            const jt = (selectedJob.type || selectedJob.employmentType || '').toLowerCase();
                            const style = JOB_TYPE_STYLES[jt] || { bg: '#F3F4F6', color: '#374151', label: selectedJob.type || selectedJob.employmentType };
                            return <span className="px-3 py-0.5 rounded-full text-[12px] font-semibold" style={{ background: style.bg, color: style.color }}>{style.label}</span>;
                          })()}
                          {selectedJob.location && <span className="text-[13px] text-[var(--text-secondary)] flex items-center gap-1"><MapPin size={13} /> {selectedJob.location}</span>}
                          <span className="text-[12px] text-[var(--text-muted)] flex items-center gap-1"><Calendar size={12} /> Posted {formatDate(selectedJob.createdAt || selectedJob.postedAt)}</span>
                        </div>
                      </div>
                      <button data-testid="apply-now" onClick={() => openApply(selectedJob._id || selectedJob.id)}
                        className="bg-[#7C3AED] text-white rounded-xl px-8 py-3 text-[15px] font-semibold hover:bg-[#7C3AED]/90 flex items-center gap-2 shadow-lg shadow-[#7C3AED]/20">
                        <Send size={16} /> Apply Now
                      </button>
                    </div>
                  </div>
                  <div className="p-7">
                    {selectedJob.description && (
                      <div className="mb-6">
                        <h4 className="text-[16px] font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">About This Role</h4>
                        <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{selectedJob.description}</div>
                      </div>
                    )}
                    {selectedJob.requirements && (
                      <div className="mb-6">
                        <h4 className="text-[16px] font-bold text-[var(--text-primary)] mb-3">Requirements</h4>
                        <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                          {Array.isArray(selectedJob.requirements)
                            ? selectedJob.requirements.map((r, i) => <div key={i} className="flex gap-2 mb-1.5"><span className="text-[#7C3AED] mt-0.5 shrink-0">&#10003;</span> {r}</div>)
                            : selectedJob.requirements}
                        </div>
                      </div>
                    )}
                    {selectedJob.salary && (
                      <div className="mb-6">
                        <h4 className="text-[16px] font-bold text-[var(--text-primary)] mb-2">Compensation</h4>
                        <div className="text-[14px] text-[var(--text-secondary)]">{selectedJob.salary}</div>
                      </div>
                    )}
                    <div className="mt-8 p-6 bg-[#7C3AED]/5 rounded-xl text-center border border-[#7C3AED]/20">
                      <div className="text-[18px] font-bold text-[var(--text-primary)] mb-2">Interested in this role?</div>
                      <div className="text-[14px] text-[var(--text-secondary)] mb-4">Submit your application and we will get back to you shortly.</div>
                      <button onClick={() => openApply(selectedJob._id || selectedJob.id)}
                        className="bg-[#7C3AED] text-white rounded-xl px-10 py-3 text-[15px] font-semibold hover:bg-[#7C3AED]/90 inline-flex items-center gap-2 shadow-lg shadow-[#7C3AED]/20">
                        <Send size={16} /> Apply Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4">
                {filtered.map(job => {
                  const jt = (job.type || job.employmentType || '').toLowerCase();
                  const jtStyle = JOB_TYPE_STYLES[jt] || { bg: '#F3F4F6', color: '#374151', label: job.type || job.employmentType || 'Full-time' };
                  return (
                    <div key={job._id || job.id}
                      className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-6 cursor-pointer transition-all hover:border-[#7C3AED] hover:shadow-lg relative"
                      onClick={() => setSelectedJob(job)} data-testid={`job-card-${job._id || job.id}`}>
                      <div className="w-10 h-10 rounded-[10px] bg-[#7C3AED]/10 flex items-center justify-center text-[#7C3AED] mb-3.5">
                        <Briefcase size={18} />
                      </div>
                      <h3 className="text-[17px] font-bold text-[var(--text-primary)] mb-2 leading-snug">{job.title}</h3>
                      <div className="flex gap-2 flex-wrap mb-3">
                        {job.department && (
                          <span className="text-[12px] text-[var(--text-secondary)] px-2.5 py-0.5 bg-[var(--bg-elevated)] rounded-full flex items-center gap-1">
                            <Briefcase size={10} /> {job.department}
                          </span>
                        )}
                        <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: jtStyle.bg, color: jtStyle.color }}>{jtStyle.label}</span>
                      </div>
                      {job.location && <div className="text-[13px] text-[var(--text-secondary)] mb-2.5 flex items-center gap-1"><MapPin size={12} /> {job.location}</div>}
                      {job.description && <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-4 line-clamp-3">{job.description}</p>}
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] text-[var(--text-muted)] flex items-center gap-1"><Calendar size={10} /> {formatDate(job.createdAt || job.postedAt)}</span>
                        <span className="text-[13px] font-semibold text-[#7C3AED] flex items-center gap-1">View Details <ChevronRight size={14} /></span>
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
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-5" onClick={e => e.target === e.currentTarget && setShowApplyModal(false)}>
          <div className="w-full max-w-[520px] max-h-[90vh] overflow-auto bg-[var(--bg-card)] rounded-xl shadow-2xl">
            <div className="p-5 border-b border-[var(--border-default)] flex justify-between items-center">
              <div>
                <h4 className="m-0 text-[18px] font-bold text-[var(--text-primary)] flex items-center gap-2">Apply for Position</h4>
                <div className="text-[12px] text-[var(--text-muted)] mt-0.5">
                  {selectedJob?.title || jobs.find(j => (j._id || j.id) === applyingJobId)?.title || ''}
                </div>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="w-8 h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-secondary)] cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleApply}>
              <div className="p-6 flex flex-col gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5">Full Name *</label>
                  <input type="text" required placeholder="John Doe" value={applyForm.name} onChange={e => setApplyForm(p => ({ ...p, name: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5">Email Address *</label>
                  <input type="email" required placeholder="john@example.com" value={applyForm.email} onChange={e => setApplyForm(p => ({ ...p, email: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5">Phone Number</label>
                  <input type="tel" placeholder="+91 98765 43210" value={applyForm.phone} onChange={e => setApplyForm(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5">Resume / Cover Letter</label>
                  <textarea rows={5} placeholder="Paste your resume or cover letter here..." value={applyForm.coverLetter} onChange={e => setApplyForm(p => ({ ...p, coverLetter: e.target.value }))} className={`${inputClass} resize-y min-h-[120px]`} />
                </div>
              </div>
              <div className="p-4 border-t border-[var(--border-default)] flex justify-end gap-2.5">
                <button type="button" onClick={() => setShowApplyModal(false)} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-5 py-2.5 text-[14px] font-medium cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-[#7C3AED] text-white rounded-lg px-7 py-2.5 text-[14px] font-semibold hover:bg-[#7C3AED]/90 disabled:opacity-70 flex items-center gap-2 cursor-pointer">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <><Send size={14} /> Submit Application</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-[var(--bg-card)] border-t border-[var(--border-default)] text-[var(--text-primary)] py-10 px-5 text-center">
        <div className="max-w-[800px] mx-auto">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white text-[14px] font-extrabold">K</div>
            <span className="text-[16px] font-bold">Know AI</span>
          </div>
          <p className="text-[13px] text-[var(--text-muted)] mb-3 leading-relaxed">AI-powered business solutions for the modern enterprise.</p>
          <div className="text-[12px] text-[var(--text-muted)]">&copy; {new Date().getFullYear()} Know AI. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
