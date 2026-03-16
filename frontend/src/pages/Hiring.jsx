import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { hiringApi } from '../services/api';

const PIPELINE_STAGES = ['Applied', 'Resume Review', 'Interview', 'Practical', 'Offered', 'Hired'];
const STAGE_COLORS = {
  'Applied': '#5B6B76', 'Resume Review': '#EA580C', 'Interview': '#146DF7',
  'Practical': '#8B3FE9', 'Offered': '#2563EB', 'Hired': '#16A34A',
};
const JOB_STATUS_STYLES = {
  Draft: { bg: '#e3e7ed', color: '#596882' },
  Open: { bg: '#d4edda', color: '#155724' },
  Closed: { bg: '#f8d7da', color: '#721c24' },
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function Hiring() {
  const dispatch = useDispatch();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);
  const [view, setView] = useState('pipeline'); // pipeline | list
  const [jobForm, setJobForm] = useState({
    title: '', department: '', location: '', type: 'Full-time', description: '', requirements: '', salary: '', status: 'Open',
  });
  const [candidateForm, setCandidateForm] = useState({
    jobId: '', name: '', email: '', phone: '', resume: '', stage: 'Applied', notes: '',
  });

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Hiring' });
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await hiringApi.listJobs();
      setJobs(Array.isArray(res.data) ? res.data : res.data?.data || res.data?.jobs || []);
    } catch (err) {
      toast.error('Failed to load hiring data');
    } finally {
      setLoading(false);
    }
  };

  const allCandidates = useMemo(() => {
    return jobs.flatMap(j => (j.candidates || []).map(c => ({ ...c, jobTitle: j.title, jobId: j._id || j.id })));
  }, [jobs]);

  const stats = useMemo(() => ({
    openPositions: jobs.filter(j => j.status === 'Open').length,
    totalApplicants: allCandidates.length,
    interviewsThisWeek: allCandidates.filter(c => {
      if (c.stage !== 'Interview') return false;
      if (!c.interviewDate) return true; // count all in interview stage
      const d = new Date(c.interviewDate);
      const now = new Date();
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
      return d >= weekStart && d < weekEnd;
    }).length,
    offersPending: allCandidates.filter(c => c.stage === 'Offered').length,
  }), [jobs, allCandidates]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await hiringApi.createJob(jobForm);
      toast.success('Job posting created');
      setShowJobModal(false);
      setJobForm({ title: '', department: '', location: '', type: 'Full-time', description: '', requirements: '', salary: '', status: 'Open' });
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create job');
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      await hiringApi.addCandidate(candidateForm);
      toast.success('Candidate added');
      setShowCandidateModal(false);
      setCandidateForm({ jobId: '', name: '', email: '', phone: '', resume: '', stage: 'Applied', notes: '' });
      fetchJobs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add candidate');
    }
  };

  const advanceCandidate = async (candidateId, jobId, newStage) => {
    try {
      await hiringApi.advanceCandidate({ candidateId, jobId, stage: newStage });
      toast.success(`Moved to ${newStage}`);
      fetchJobs();
    } catch (err) {
      toast.error('Failed to advance candidate');
    }
  };

  const candidatesByStage = useMemo(() => {
    const map = {};
    PIPELINE_STAGES.forEach(s => map[s] = []);
    allCandidates.forEach(c => {
      const stage = PIPELINE_STAGES.includes(c.stage) ? c.stage : 'Applied';
      map[stage].push(c);
    });
    return map;
  }, [allCandidates]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Recruitment Pipeline</h1>
          <p>Manage job postings and track candidates</p>
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', border: '1px solid var(--kai-border)', borderRadius: 'var(--kai-radius)', overflow: 'hidden', marginRight: 8 }}>
            <button className={`kai-btn kai-btn-sm ${view === 'pipeline' ? 'kai-btn-primary' : 'kai-btn-outline'}`}
              style={{ borderRadius: 0, border: 'none' }} onClick={() => setView('pipeline')}>Pipeline</button>
            <button className={`kai-btn kai-btn-sm ${view === 'list' ? 'kai-btn-primary' : 'kai-btn-outline'}`}
              style={{ borderRadius: 0, border: 'none' }} onClick={() => setView('list')}>Jobs</button>
          </div>
          <button className="kai-btn kai-btn-outline" onClick={() => { setCandidateForm(p => ({ ...p, jobId: jobs[0]?._id || jobs[0]?.id || '' })); setShowCandidateModal(true); }}>
            Add Candidate
          </button>
          <button className="kai-btn kai-btn-primary" onClick={() => setShowJobModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Open Positions', value: stats.openPositions, color: '#146DF7' },
          { label: 'Total Applicants', value: stats.totalApplicants, color: '#8B3FE9' },
          { label: 'Interviews This Week', value: stats.interviewsThisWeek, color: '#EA580C' },
          { label: 'Offers Pending', value: stats.offersPending, color: '#16A34A' },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {view === 'pipeline' ? (
        /* Kanban Pipeline */
        <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, minWidth: PIPELINE_STAGES.length * 240 }}>
            {PIPELINE_STAGES.map(stage => (
              <div key={stage} style={{ flex: '1 1 220px', minWidth: 220 }}>
                <div style={{
                  padding: '10px 14px', marginBottom: 8, borderRadius: 8,
                  background: `${STAGE_COLORS[stage]}10`, borderLeft: `3px solid ${STAGE_COLORS[stage]}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: STAGE_COLORS[stage], textTransform: 'uppercase', letterSpacing: 0.5 }}>{stage}</span>
                  <span className="kai-badge secondary" style={{ fontSize: 10 }}>{candidatesByStage[stage].length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {candidatesByStage[stage].length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--kai-text-muted)', fontSize: 12, border: '1px dashed var(--kai-border)', borderRadius: 8 }}>
                      No candidates
                    </div>
                  ) : candidatesByStage[stage].map(c => {
                    const stageIdx = PIPELINE_STAGES.indexOf(stage);
                    return (
                      <div className="kai-card" key={c._id || c.id || c.email} style={{ cursor: 'default' }}>
                        <div className="kai-card-body" style={{ padding: 14 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', marginBottom: 2 }}>{c.email}</div>
                          <div style={{ fontSize: 11, color: 'var(--kai-text-secondary)', marginBottom: 8 }}>
                            <span className="kai-badge" style={{ background: `${STAGE_COLORS[stage]}15`, color: STAGE_COLORS[stage], fontSize: 10 }}>
                              {c.jobTitle || 'No job'}
                            </span>
                          </div>
                          {c.notes && <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', marginBottom: 8, fontStyle: 'italic' }}>{c.notes}</div>}
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {stageIdx > 0 && (
                              <button className="kai-btn kai-btn-outline kai-btn-sm" style={{ fontSize: 10, padding: '3px 8px' }}
                                onClick={() => advanceCandidate(c._id || c.id, c.jobId, PIPELINE_STAGES[stageIdx - 1])}>
                                &larr; Back
                              </button>
                            )}
                            {stageIdx < PIPELINE_STAGES.length - 1 && (
                              <button className="kai-btn kai-btn-primary kai-btn-sm" style={{ fontSize: 10, padding: '3px 8px' }}
                                onClick={() => advanceCandidate(c._id || c.id, c.jobId, PIPELINE_STAGES[stageIdx + 1])}>
                                {PIPELINE_STAGES[stageIdx + 1]} &rarr;
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Job Postings List */
        <div className="kai-card">
          <div className="kai-card-header">
            <h6>Job Postings</h6>
            <span className="kai-badge secondary">{jobs.length} postings</span>
          </div>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>No job postings yet. Create one to get started.</div>
          ) : (
            <div>
              {jobs.map(job => {
                const jid = job._id || job.id;
                const jst = JOB_STATUS_STYLES[job.status] || JOB_STATUS_STYLES.Draft;
                const isExpanded = expandedJob === jid;
                const candidates = job.candidates || [];
                return (
                  <div key={jid} style={{ borderBottom: '1px solid var(--kai-border-light)' }}>
                    <div style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                      onClick={() => setExpandedJob(isExpanded ? null : jid)}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{job.title}</span>
                          <span className="kai-badge" style={{ background: jst.bg, color: jst.color }}>{job.status}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {job.department && <span>{job.department}</span>}
                          {job.location && <span>{job.location}</span>}
                          {job.type && <span>{job.type}</span>}
                          {job.salary && <span>{job.salary}</span>}
                        </div>
                      </div>
                      <div className="flex-gap-8">
                        <span className="kai-badge secondary">{candidates.length} candidates</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 20px 16px', background: 'var(--kai-bg)' }}>
                        {job.description && <p style={{ fontSize: 13, color: 'var(--kai-text-secondary)', marginBottom: 12 }}>{job.description}</p>}
                        {job.requirements && (
                          <div style={{ marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase' }}>Requirements</span>
                            <p style={{ fontSize: 13, color: 'var(--kai-text-secondary)', marginTop: 4 }}>{job.requirements}</p>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase' }}>Candidates ({candidates.length})</span>
                          <button className="kai-btn kai-btn-outline kai-btn-sm"
                            onClick={(e) => { e.stopPropagation(); setCandidateForm(p => ({ ...p, jobId: jid })); setShowCandidateModal(true); }}>
                            + Add Candidate
                          </button>
                        </div>
                        {candidates.length > 0 ? (
                          <table className="kai-table" style={{ fontSize: 12 }}>
                            <thead>
                              <tr><th>Name</th><th>Email</th><th>Stage</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                              {candidates.map(c => {
                                const si = PIPELINE_STAGES.indexOf(c.stage);
                                return (
                                  <tr key={c._id || c.id || c.email}>
                                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                                    <td>{c.email}</td>
                                    <td>
                                      <span className="kai-badge" style={{ background: `${STAGE_COLORS[c.stage] || '#5B6B76'}15`, color: STAGE_COLORS[c.stage] || '#5B6B76' }}>
                                        {c.stage}
                                      </span>
                                    </td>
                                    <td>
                                      {si < PIPELINE_STAGES.length - 1 && (
                                        <button className="kai-btn kai-btn-primary kai-btn-sm" style={{ fontSize: 10 }}
                                          onClick={() => advanceCandidate(c._id || c.id, jid, PIPELINE_STAGES[si + 1])}>
                                          Move to {PIPELINE_STAGES[si + 1]}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{ padding: 20, textAlign: 'center', color: 'var(--kai-text-muted)', fontSize: 12 }}>No candidates yet.</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Job Modal */}
      {showJobModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowJobModal(false)}>
          <div className="kai-card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="kai-card-header">
              <h5>Create Job Posting</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowJobModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateJob}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="kai-label">Job Title *</label>
                  <input className="kai-input" required placeholder="Senior Frontend Engineer" value={jobForm.title}
                    onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="kai-label">Department</label>
                    <input className="kai-input" placeholder="Engineering" value={jobForm.department}
                      onChange={e => setJobForm(p => ({ ...p, department: e.target.value }))} />
                  </div>
                  <div>
                    <label className="kai-label">Location</label>
                    <input className="kai-input" placeholder="Remote / Bangalore" value={jobForm.location}
                      onChange={e => setJobForm(p => ({ ...p, location: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="kai-label">Employment Type</label>
                    <select className="kai-input" value={jobForm.type}
                      onChange={e => setJobForm(p => ({ ...p, type: e.target.value }))}>
                      {['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="kai-label">Status</label>
                    <select className="kai-input" value={jobForm.status}
                      onChange={e => setJobForm(p => ({ ...p, status: e.target.value }))}>
                      {['Draft', 'Open', 'Closed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="kai-label">Salary Range</label>
                  <input className="kai-input" placeholder="10-15 LPA" value={jobForm.salary}
                    onChange={e => setJobForm(p => ({ ...p, salary: e.target.value }))} />
                </div>
                <div>
                  <label className="kai-label">Description</label>
                  <textarea className="kai-input" rows={3} placeholder="Job description..." value={jobForm.description}
                    onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))}
                    style={{ resize: 'vertical', minHeight: 70 }} />
                </div>
                <div>
                  <label className="kai-label">Requirements</label>
                  <textarea className="kai-input" rows={3} placeholder="Required skills and qualifications..." value={jobForm.requirements}
                    onChange={e => setJobForm(p => ({ ...p, requirements: e.target.value }))}
                    style={{ resize: 'vertical', minHeight: 70 }} />
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowJobModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary">Create Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showCandidateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowCandidateModal(false)}>
          <div className="kai-card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="kai-card-header">
              <h5>Add Candidate</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowCandidateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddCandidate}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="kai-label">Job Position *</label>
                  <select className="kai-input" required value={candidateForm.jobId}
                    onChange={e => setCandidateForm(p => ({ ...p, jobId: e.target.value }))}>
                    <option value="">Select job</option>
                    {jobs.map(j => <option key={j._id || j.id} value={j._id || j.id}>{j.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="kai-label">Candidate Name *</label>
                  <input className="kai-input" required placeholder="Jane Smith" value={candidateForm.name}
                    onChange={e => setCandidateForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="kai-label">Email *</label>
                    <input className="kai-input" type="email" required placeholder="jane@email.com" value={candidateForm.email}
                      onChange={e => setCandidateForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="kai-label">Phone</label>
                    <input className="kai-input" placeholder="+91 9876543210" value={candidateForm.phone}
                      onChange={e => setCandidateForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="kai-label">Resume Link</label>
                  <input className="kai-input" placeholder="https://drive.google.com/..." value={candidateForm.resume}
                    onChange={e => setCandidateForm(p => ({ ...p, resume: e.target.value }))} />
                </div>
                <div>
                  <label className="kai-label">Notes</label>
                  <textarea className="kai-input" rows={2} placeholder="Any notes about the candidate..." value={candidateForm.notes}
                    onChange={e => setCandidateForm(p => ({ ...p, notes: e.target.value }))}
                    style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowCandidateModal(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary">Add Candidate</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
