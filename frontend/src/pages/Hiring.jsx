import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { Row, Col, Modal, Tab, Tabs } from 'react-bootstrap';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Briefcase, Users, CalendarCheck, Gift, UserCheck, Plus, Search,
  LayoutGrid, List, ChevronDown, Star, ExternalLink, Download, Phone,
  Mail, MapPin, Clock, ArrowRight, X, Send, MessageSquare, History,
  Video, Award, FileText, Linkedin, Globe, Trash2, Edit3, Filter,
  CheckSquare, XCircle, DollarSign, User,
} from 'lucide-react';
import { hiringApi, teamApi } from '../services/api';

/* ─── Status config ──────────────────────────────────────────── */
const STATUS_LABELS = {
  APPLIED: 'Applied', RESUME_REVIEW: 'Resume Review', UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted', INTERVIEW_ROUND_1: 'Interview R1', PRACTICAL_TASK: 'Practical',
  ASSIGNMENT_SENT: 'Assignment Sent', ASSIGNMENT_PASSED: 'Assignment Passed',
  INTERVIEW_ROUND_2: 'Interview R2', FINAL_INTERVIEW: 'Final Interview',
  OFFERED: 'Offered', HIRED: 'Hired', REJECTED: 'Rejected',
  NOT_GOOD: 'Not Good', MAYBE: 'Maybe', ON_HOLD: 'On Hold',
};

const STATUS_COLORS = {
  APPLIED: '#5B6B76', RESUME_REVIEW: '#EA580C', UNDER_REVIEW: '#D97706',
  SHORTLISTED: '#2563EB', INTERVIEW_ROUND_1: '#146DF7', PRACTICAL_TASK: '#8B3FE9',
  ASSIGNMENT_SENT: '#7C3AED', ASSIGNMENT_PASSED: '#059669', INTERVIEW_ROUND_2: '#0891B2',
  FINAL_INTERVIEW: '#4F46E5', OFFERED: '#2563EB', HIRED: '#16A34A',
  REJECTED: '#DC2626', NOT_GOOD: '#991B1B', MAYBE: '#CA8A04', ON_HOLD: '#6B7280',
};

const TIER_COLORS = {
  UNTIERED: '#6B7280', INTERN: '#8B5CF6', JUNIOR: '#3B82F6', SENIOR: '#059669',
};

const SOURCE_LABELS = {
  MANUAL: 'Manual', CSV: 'CSV', EXCEL: 'Excel', URL: 'URL', RESUME: 'Resume', REFERRAL: 'Referral',
};

const KANBAN_COLUMNS = [
  { key: 'Applied', statuses: ['APPLIED', 'RESUME_REVIEW'], color: '#5B6B76' },
  { key: 'Under Review', statuses: ['UNDER_REVIEW', 'SHORTLISTED'], color: '#D97706' },
  { key: 'Shortlisted', statuses: ['INTERVIEW_ROUND_1'], color: '#146DF7' },
  { key: 'Interview', statuses: ['INTERVIEW_ROUND_2', 'FINAL_INTERVIEW'], color: '#0891B2' },
  { key: 'Assignment', statuses: ['PRACTICAL_TASK', 'ASSIGNMENT_SENT', 'ASSIGNMENT_PASSED'], color: '#8B3FE9' },
  { key: 'Offered', statuses: ['OFFERED'], color: '#2563EB' },
  { key: 'Hired', statuses: ['HIRED'], color: '#16A34A' },
];

// Map kanban column key to target CandidateStatus when dropping
const KANBAN_DROP_STATUS = {
  'Applied': 'APPLIED',
  'Under Review': 'UNDER_REVIEW',
  'Shortlisted': 'INTERVIEW_ROUND_1',
  'Interview': 'INTERVIEW_ROUND_2',
  'Assignment': 'PRACTICAL_TASK',
  'Offered': 'OFFERED',
  'Hired': 'HIRED',
};

const REJECTION_REASONS = [
  'Not a good fit', 'Lacks required experience', 'Failed technical assessment',
  'Poor culture fit', 'Salary expectations too high', 'Better candidate available',
  'Incomplete application', 'No-show to interview', 'Other',
];

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const daysAgo = (d) => {
  if (!d) return null;
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
};

/* ─── Stars component ────────────────────────────────────────── */
function RatingStars({ rating, onClick, size = 14 }) {
  const filled = Math.round(rating || 0);
  return (
    <span style={{ display: 'inline-flex', gap: 1, cursor: onClick ? 'pointer' : 'default' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size}
          fill={i <= filled ? '#F59E0B' : 'none'}
          stroke={i <= filled ? '#F59E0B' : '#CBD5E1'}
          style={{ cursor: onClick ? 'pointer' : 'default' }}
          onClick={() => onClick && onClick(i)} />
      ))}
    </span>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function Hiring() {
  const dispatch = useDispatch();

  // Core state
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobDetail, setJobDetail] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [teamMembers, setTeamMembers] = useState([]);

  // Modals
  const [showJobModal, setShowJobModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');

  // Sort
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');

  // Forms
  const [jobForm, setJobForm] = useState({
    title: '', department: '', description: '', requirements: '',
    salaryMin: '', salaryMax: '', currency: 'INR', location: '', type: 'Full-time', status: 'OPEN',
  });
  const [candidateForm, setCandidateForm] = useState({
    name: '', email: '', phone: '', linkedinUrl: '', portfolioUrl: '',
    location: '', experience: '', education: '', coverLetter: '',
    resumeUrl: '', tier: 'UNTIERED', source: 'MANUAL',
  });
  const [rejectForm, setRejectForm] = useState({ reason: '', message: '' });
  const [offerForm, setOfferForm] = useState({ salary: '', notes: '' });
  const [interviewForm, setInterviewForm] = useState({
    roundNumber: '1', roundName: '', interviewerId: '', scheduledAt: '',
  });
  const [commentText, setCommentText] = useState('');

  // Candidate detail state
  const [candidateComments, setCandidateComments] = useState([]);
  const [candidateEvents, setCandidateEvents] = useState([]);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Hiring' });
    fetchJobs();
    fetchTeam();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchJobDetail(selectedJobId);
    }
  }, [selectedJobId]);

  /* ─── Data fetching ──────────────────────────────────────── */
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await hiringApi.listJobs();
      const rd = res.data;
      const list = rd?.data || (Array.isArray(rd) ? rd : []);
      setJobs(list);
      if (list.length > 0 && !selectedJobId) {
        setSelectedJobId(list[0].id);
      }
    } catch {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobDetail = async (jobId) => {
    try {
      const res = await hiringApi.getJob(jobId);
      const rd = res.data;
      const detail = rd?.data || rd;
      setJobDetail(detail);
      setCandidates(detail?.candidates || []);
    } catch {
      toast.error('Failed to load job details');
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await teamApi.list();
      const rd = res.data;
      setTeamMembers(rd?.data || (Array.isArray(rd) ? rd : []));
    } catch {
      // silently fail
    }
  };

  const refreshData = useCallback(() => {
    fetchJobs();
    if (selectedJobId) fetchJobDetail(selectedJobId);
  }, [selectedJobId]);

  /* ─── Stats ──────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const openPositions = jobs.filter(j => j.status === 'OPEN').length;
    const totalApplicants = candidates.length;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    let interviewsThisWeek = 0;
    for (const c of candidates) {
      if (c.interviews) {
        for (const iv of c.interviews) {
          if (iv.scheduledAt) {
            const d = new Date(iv.scheduledAt);
            if (d >= weekStart && d < weekEnd) interviewsThisWeek++;
          }
        }
      }
    }

    const offersPending = candidates.filter(c => c.status === 'OFFERED').length;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const hiredThisMonth = candidates.filter(c =>
      c.status === 'HIRED' && c.statusChangedAt && new Date(c.statusChangedAt) >= monthStart
    ).length;

    return { openPositions, totalApplicants, interviewsThisWeek, offersPending, hiredThisMonth };
  }, [jobs, candidates]);

  /* ─── Kanban data ────────────────────────────────────────── */
  const kanbanData = useMemo(() => {
    const filtered = candidates.filter(c => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.name?.toLowerCase().includes(q) && !c.email?.toLowerCase().includes(q)) return false;
      }
      if (tierFilter !== 'All' && c.tier !== tierFilter) return false;
      return true;
    });

    const result = {};
    for (const col of KANBAN_COLUMNS) {
      result[col.key] = filtered.filter(c => col.statuses.includes(c.status));
    }
    return result;
  }, [candidates, searchQuery, tierFilter]);

  /* ─── List data ──────────────────────────────────────────── */
  const listData = useMemo(() => {
    let filtered = [...candidates];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
    }
    if (statusFilter !== 'All') filtered = filtered.filter(c => c.status === statusFilter);
    if (tierFilter !== 'All') filtered = filtered.filter(c => c.tier === tierFilter);

    filtered.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === 'name') {
        va = (va || '').toLowerCase();
        vb = (vb || '').toLowerCase();
      }
      if (sortField === 'rating' || sortField === 'avgRating') {
        va = va || 0;
        vb = vb || 0;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [candidates, searchQuery, statusFilter, tierFilter, sortField, sortDir]);

  /* ─── Handlers ───────────────────────────────────────────── */
  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await hiringApi.createJob(jobForm);
      toast.success('Job posting created');
      setShowJobModal(false);
      setJobForm({ title: '', department: '', description: '', requirements: '', salaryMin: '', salaryMax: '', currency: 'INR', location: '', type: 'Full-time', status: 'OPEN' });
      refreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to create job');
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      await hiringApi.addCandidate({ jobId: selectedJobId, ...candidateForm });
      toast.success('Candidate added');
      setShowCandidateModal(false);
      setCandidateForm({ name: '', email: '', phone: '', linkedinUrl: '', portfolioUrl: '', location: '', experience: '', education: '', coverLetter: '', resumeUrl: '', tier: 'UNTIERED', source: 'MANUAL' });
      refreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to add candidate');
    }
  };

  const handleStatusChange = async (candidateId, newStatus) => {
    try {
      await hiringApi.changeStatus({ candidateId, status: newStatus });
      toast.success(`Status changed to ${STATUS_LABELS[newStatus] || newStatus}`);
      refreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to change status');
    }
  };

  const handleAdvance = async (candidateId) => {
    try {
      await hiringApi.advanceCandidate({ candidateId });
      toast.success('Candidate advanced');
      refreshData();
      // Update detail modal if open
      if (selectedCandidate?.id === candidateId) {
        const res = await hiringApi.getJob(selectedJobId);
        const detail = res.data?.data || res.data;
        const updated = detail?.candidates?.find(c => c.id === candidateId);
        if (updated) setSelectedCandidate(updated);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to advance candidate');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      await hiringApi.rejectCandidate({
        candidateId: selectedCandidate.id,
        rejectionReason: rejectForm.reason,
        rejectionMessage: rejectForm.message,
      });
      toast.success('Candidate rejected');
      setShowRejectModal(false);
      setRejectForm({ reason: '', message: '' });
      refreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to reject candidate');
    }
  };

  const handleOffer = async (e) => {
    e.preventDefault();
    try {
      await hiringApi.offerCandidate({
        candidateId: selectedCandidate.id,
        offeredSalary: offerForm.salary,
        notes: offerForm.notes,
      });
      toast.success('Offer sent');
      setShowOfferModal(false);
      setOfferForm({ salary: '', notes: '' });
      refreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to make offer');
    }
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    try {
      await hiringApi.scheduleInterview({
        candidateId: selectedCandidate.id,
        ...interviewForm,
      });
      toast.success('Interview scheduled');
      setShowInterviewModal(false);
      setInterviewForm({ roundNumber: '1', roundName: '', interviewerId: '', scheduledAt: '' });
      refreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule interview');
    }
  };

  const handleRate = async (candidateId, rating) => {
    try {
      await hiringApi.rateCandidate({ candidateId, rating });
      toast.success(`Rated ${rating} stars`);
      refreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to rate');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await hiringApi.addComment({ candidateId: selectedCandidate.id, body: commentText });
      toast.success('Comment added');
      setCommentText('');
      // Refresh candidate detail
      const res = await hiringApi.getJob(selectedJobId);
      const detail = res.data?.data || res.data;
      const updated = detail?.candidates?.find(c => c.id === selectedCandidate.id);
      if (updated) setSelectedCandidate(updated);
      refreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to add comment');
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) return;
    try {
      await hiringApi.deleteCandidate(candidateId);
      toast.success('Candidate deleted');
      setShowDetailModal(false);
      refreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        await hiringApi.changeStatus({ candidateId: id, status: bulkStatus });
      }
      toast.success(`Updated ${selectedIds.length} candidates`);
      setSelectedIds([]);
      setBulkStatus('');
      refreshData();
    } catch (err) {
      toast.error(err.message || 'Bulk update failed');
    }
  };

  /* ─── Drag & Drop ────────────────────────────────────────── */
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const targetStatus = KANBAN_DROP_STATUS[destination.droppableId];
    if (!targetStatus) return;

    try {
      await hiringApi.changeStatus({ candidateId: draggableId, status: targetStatus });
      toast.success(`Moved to ${destination.droppableId}`);
      refreshData();
    } catch (err) {
      toast.error(err.message || 'Failed to move candidate');
    }
  };

  /* ─── Open candidate detail ──────────────────────────────── */
  const openCandidateDetail = (c) => {
    setSelectedCandidate(c);
    setShowDetailModal(true);
    setCommentText('');
    // Fetch comments and events for this candidate
    fetchCandidateDetail(c.id);
  };

  const fetchCandidateDetail = async (candidateId) => {
    // Comments and events are included in candidate data from the API
    // We just use what's already on the candidate object
    // But for a complete view we re-fetch
    try {
      const res = await hiringApi.getJob(selectedJobId);
      const detail = res.data?.data || res.data;
      const c = detail?.candidates?.find(ca => ca.id === candidateId);
      if (c) {
        setSelectedCandidate(c);
        setCandidateComments(c.comments || []);
        setCandidateEvents(c.events || []);
      }
    } catch {
      // silently fail
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === listData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(listData.map(c => c.id));
    }
  };

  const parseSkills = (skills) => {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    try { return JSON.parse(skills); } catch { return []; }
  };

  /* ─────────────────────────────────────────────────────────── */
  /*  R E N D E R                                               */
  /* ─────────────────────────────────────────────────────────── */

  if (loading && jobs.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--kai-text-muted)' }}>
        <div className="spinner-border" role="status" style={{ width: 32, height: 32, color: '#146DF7' }} />
        <p style={{ marginTop: 12 }}>Loading hiring data...</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 style={{ color: '#10222F' }}>Hiring Pipeline</h1>
          <p style={{ color: 'var(--kai-text-muted)' }}>Manage recruitment and track candidates through the pipeline</p>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="kai-btn kai-btn-outline" onClick={() => setShowCandidateModal(true)}
            disabled={!selectedJobId}>
            <Plus size={16} /> Add Candidate
          </button>
          <button className="kai-btn kai-btn-primary" onClick={() => setShowJobModal(true)}>
            <Plus size={16} /> Create Job
          </button>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────── */}
      <Row style={{ marginBottom: 24 }}>
        {[
          { label: 'Open Positions', value: stats.openPositions, color: '#146DF7', icon: Briefcase },
          { label: 'Total Applicants', value: stats.totalApplicants, color: '#8B3FE9', icon: Users },
          { label: 'Interviews This Week', value: stats.interviewsThisWeek, color: '#EA580C', icon: CalendarCheck },
          { label: 'Offers Pending', value: stats.offersPending, color: '#2563EB', icon: Gift },
          { label: 'Hired This Month', value: stats.hiredThisMonth, color: '#16A34A', icon: UserCheck },
        ].map((s, i) => (
          <Col key={i}>
            <div className="kai-card" style={{ padding: 20, textAlign: 'center' }}>
              <s.icon size={24} color={s.color} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* ── Controls ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Job selector */}
        <div style={{ position: 'relative', minWidth: 240 }}>
          <Briefcase size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--kai-text-muted)' }} />
          <select className="kai-input" value={selectedJobId} style={{ paddingLeft: 32 }}
            onChange={e => setSelectedJobId(e.target.value)}>
            <option value="">Select a job...</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title} ({j.candidateCount || 0})</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--kai-text-muted)' }} />
          <input className="kai-input" placeholder="Search candidates..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 32 }} />
        </div>

        {/* Tier filter */}
        <select className="kai-input" value={tierFilter} onChange={e => setTierFilter(e.target.value)} style={{ width: 130 }}>
          <option value="All">All Tiers</option>
          <option value="UNTIERED">Untiered</option>
          <option value="INTERN">Intern</option>
          <option value="JUNIOR">Junior</option>
          <option value="SENIOR">Senior</option>
        </select>

        {/* Status filter (list view) */}
        {view === 'list' && (
          <select className="kai-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 160 }}>
            <option value="All">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--kai-border)', borderRadius: 'var(--kai-radius)', overflow: 'hidden' }}>
          <button className={`kai-btn kai-btn-sm ${view === 'kanban' ? 'kai-btn-primary' : 'kai-btn-outline'}`}
            style={{ borderRadius: 0, border: 'none' }} onClick={() => setView('kanban')}>
            <LayoutGrid size={14} /> Kanban
          </button>
          <button className={`kai-btn kai-btn-sm ${view === 'list' ? 'kai-btn-primary' : 'kai-btn-outline'}`}
            style={{ borderRadius: 0, border: 'none' }} onClick={() => setView('list')}>
            <List size={14} /> List
          </button>
        </div>
      </div>

      {/* ── Empty state ────────────────────────────────────── */}
      {!selectedJobId && (
        <div className="kai-card" style={{ padding: 60, textAlign: 'center' }}>
          <Briefcase size={48} color="var(--kai-text-muted)" style={{ marginBottom: 16 }} />
          <h5 style={{ color: 'var(--kai-text-muted)' }}>Select a job to view candidates</h5>
          <p style={{ color: 'var(--kai-text-muted)', fontSize: 13 }}>Choose from the dropdown above or create a new job posting.</p>
        </div>
      )}

      {/* ── KANBAN VIEW ────────────────────────────────────── */}
      {selectedJobId && view === 'kanban' && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, minWidth: KANBAN_COLUMNS.length * 260 }}>
              {KANBAN_COLUMNS.map(col => (
                <Droppable key={col.key} droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      style={{ flex: '1 1 240px', minWidth: 240, minHeight: 200 }}>
                      {/* Column header */}
                      <div style={{
                        padding: '10px 14px', marginBottom: 8, borderRadius: 8,
                        background: `${col.color}10`, borderLeft: `3px solid ${col.color}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                          <span style={{ fontWeight: 700, fontSize: 12, color: col.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{col.key}</span>
                        </span>
                        <span className="kai-badge secondary" style={{ fontSize: 10 }}>
                          {(kanbanData[col.key] || []).length}
                        </span>
                      </div>

                      {/* Cards */}
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60,
                        background: snapshot.isDraggingOver ? `${col.color}08` : 'transparent',
                        borderRadius: 8, padding: snapshot.isDraggingOver ? 4 : 0,
                        transition: 'background 0.2s',
                      }}>
                        {(kanbanData[col.key] || []).length === 0 ? (
                          <div style={{ padding: 20, textAlign: 'center', color: 'var(--kai-text-muted)', fontSize: 12, border: '1px dashed var(--kai-border)', borderRadius: 8 }}>
                            No candidates
                          </div>
                        ) : (kanbanData[col.key] || []).map((c, idx) => (
                          <Draggable key={c.id} draggableId={c.id} index={idx}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                className="kai-card" onClick={() => openCandidateDetail(c)}
                                style={{
                                  ...provided.draggableProps.style,
                                  cursor: 'grab',
                                  opacity: snapshot.isDragging ? 0.85 : 1,
                                  boxShadow: snapshot.isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
                                }}>
                                <div className="kai-card-body" style={{ padding: 14 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                                    {c.tier && c.tier !== 'UNTIERED' && (
                                      <span className="kai-badge" style={{ background: `${TIER_COLORS[c.tier]}15`, color: TIER_COLORS[c.tier], fontSize: 9 }}>
                                        {c.tier}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', marginBottom: 4 }}>{c.email}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    {c.source && c.source !== 'MANUAL' && (
                                      <span className="kai-badge secondary" style={{ fontSize: 9 }}>{SOURCE_LABELS[c.source] || c.source}</span>
                                    )}
                                    <RatingStars rating={c.avgRating || c.rating} size={11} />
                                  </div>
                                  {c.statusChangedAt && (
                                    <div style={{ fontSize: 10, color: 'var(--kai-text-muted)' }}>
                                      <Clock size={10} style={{ marginRight: 3 }} />
                                      {daysAgo(c.statusChangedAt)}
                                    </div>
                                  )}
                                  {c.commentsCount > 0 && (
                                    <div style={{ fontSize: 10, color: 'var(--kai-text-muted)', marginTop: 4 }}>
                                      <MessageSquare size={10} style={{ marginRight: 3 }} />
                                      {c.commentsCount} comment{c.commentsCount !== 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </div>
        </DragDropContext>
      )}

      {/* ── LIST VIEW ──────────────────────────────────────── */}
      {selectedJobId && view === 'list' && (
        <div className="kai-card">
          <div className="kai-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h6 style={{ margin: 0 }}>Candidates ({listData.length})</h6>
            {selectedIds.length > 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--kai-text-muted)' }}>{selectedIds.length} selected</span>
                <select className="kai-input" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ width: 160, height: 32, fontSize: 12 }}>
                  <option value="">Bulk change status...</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="kai-btn kai-btn-primary kai-btn-sm" onClick={handleBulkStatusChange} disabled={!bulkStatus}>
                  Apply
                </button>
              </div>
            )}
          </div>
          {listData.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--kai-text-muted)' }}>
              <Users size={32} style={{ marginBottom: 8 }} />
              <p>No candidates found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="kai-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox" checked={selectedIds.length === listData.length && listData.length > 0}
                        onChange={toggleSelectAll} />
                    </th>
                    <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                      Name {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>
                      Status {sortField === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Tier</th>
                    <th onClick={() => toggleSort('avgRating')} style={{ cursor: 'pointer' }}>
                      Rating {sortField === 'avgRating' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Source</th>
                    <th onClick={() => toggleSort('createdAt')} style={{ cursor: 'pointer' }}>
                      Applied {sortField === 'createdAt' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listData.map(c => (
                    <tr key={c.id}>
                      <td><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                      <td>
                        <span style={{ fontWeight: 600, cursor: 'pointer', color: '#146DF7' }}
                          onClick={() => openCandidateDetail(c)}>{c.name}</span>
                      </td>
                      <td style={{ color: 'var(--kai-text-muted)' }}>{c.email}</td>
                      <td style={{ color: 'var(--kai-text-muted)' }}>{c.phone || '-'}</td>
                      <td>
                        <span className="kai-badge" style={{ background: `${STATUS_COLORS[c.status] || '#6B7280'}15`, color: STATUS_COLORS[c.status] || '#6B7280', fontSize: 11 }}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </td>
                      <td>
                        <span className="kai-badge" style={{ background: `${TIER_COLORS[c.tier] || '#6B7280'}15`, color: TIER_COLORS[c.tier] || '#6B7280', fontSize: 11 }}>
                          {c.tier}
                        </span>
                      </td>
                      <td><RatingStars rating={c.avgRating || c.rating} size={12} /></td>
                      <td style={{ fontSize: 11 }}>{SOURCE_LABELS[c.source] || c.source}</td>
                      <td style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>{formatDate(c.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="kai-btn kai-btn-primary kai-btn-sm" style={{ fontSize: 10, padding: '3px 8px' }}
                            onClick={() => handleAdvance(c.id)} title="Advance">
                            <ArrowRight size={12} />
                          </button>
                          <button className="kai-btn kai-btn-outline kai-btn-sm" style={{ fontSize: 10, padding: '3px 8px', color: '#DC2626', borderColor: '#DC2626' }}
                            onClick={() => { setSelectedCandidate(c); setShowRejectModal(true); }} title="Reject">
                            <XCircle size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  M O D A L S                                          */}
      {/* ═══════════════════════════════════════════════════════ */}

      {/* ── Create Job Modal ───────────────────────────────── */}
      <Modal show={showJobModal} onHide={() => setShowJobModal(false)} size="lg" centered>
        <form onSubmit={handleCreateJob}>
          <Modal.Header closeButton style={{ borderBottom: '1px solid var(--kai-border)' }}>
            <Modal.Title style={{ fontSize: 18, fontWeight: 700, color: '#10222F' }}>Create Job Posting</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="kai-label">Job Title *</label>
              <input className="kai-input" required placeholder="Senior Frontend Engineer"
                value={jobForm.title} onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <Row>
              <Col md={6}>
                <label className="kai-label">Department</label>
                <input className="kai-input" placeholder="Engineering"
                  value={jobForm.department} onChange={e => setJobForm(p => ({ ...p, department: e.target.value }))} />
              </Col>
              <Col md={6}>
                <label className="kai-label">Location</label>
                <input className="kai-input" placeholder="Remote / Bangalore"
                  value={jobForm.location} onChange={e => setJobForm(p => ({ ...p, location: e.target.value }))} />
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <label className="kai-label">Employment Type</label>
                <select className="kai-input" value={jobForm.type} onChange={e => setJobForm(p => ({ ...p, type: e.target.value }))}>
                  {['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'].map(t => <option key={t}>{t}</option>)}
                </select>
              </Col>
              <Col md={4}>
                <label className="kai-label">Status</label>
                <select className="kai-input" value={jobForm.status} onChange={e => setJobForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="DRAFT">Draft</option>
                  <option value="OPEN">Open</option>
                </select>
              </Col>
              <Col md={4}>
                <label className="kai-label">Currency</label>
                <select className="kai-input" value={jobForm.currency} onChange={e => setJobForm(p => ({ ...p, currency: e.target.value }))}>
                  {['INR', 'USD', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
                </select>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <label className="kai-label">Salary Min</label>
                <input className="kai-input" type="number" placeholder="500000"
                  value={jobForm.salaryMin} onChange={e => setJobForm(p => ({ ...p, salaryMin: e.target.value }))} />
              </Col>
              <Col md={6}>
                <label className="kai-label">Salary Max</label>
                <input className="kai-input" type="number" placeholder="1200000"
                  value={jobForm.salaryMax} onChange={e => setJobForm(p => ({ ...p, salaryMax: e.target.value }))} />
              </Col>
            </Row>
            <div>
              <label className="kai-label">Description</label>
              <textarea className="kai-input" rows={3} placeholder="Job description..."
                value={jobForm.description} onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))}
                style={{ resize: 'vertical', minHeight: 70 }} />
            </div>
            <div>
              <label className="kai-label">Requirements</label>
              <textarea className="kai-input" rows={3} placeholder="Required skills and qualifications..."
                value={jobForm.requirements} onChange={e => setJobForm(p => ({ ...p, requirements: e.target.value }))}
                style={{ resize: 'vertical', minHeight: 70 }} />
            </div>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid var(--kai-border)' }}>
            <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowJobModal(false)}>Cancel</button>
            <button type="submit" className="kai-btn kai-btn-primary">Create Job</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* ── Add Candidate Modal ────────────────────────────── */}
      <Modal show={showCandidateModal} onHide={() => setShowCandidateModal(false)} size="lg" centered>
        <form onSubmit={handleAddCandidate}>
          <Modal.Header closeButton style={{ borderBottom: '1px solid var(--kai-border)' }}>
            <Modal.Title style={{ fontSize: 18, fontWeight: 700, color: '#10222F' }}>Add Candidate</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Row>
              <Col md={6}>
                <label className="kai-label">Name *</label>
                <input className="kai-input" required placeholder="Jane Smith"
                  value={candidateForm.name} onChange={e => setCandidateForm(p => ({ ...p, name: e.target.value }))} />
              </Col>
              <Col md={6}>
                <label className="kai-label">Email *</label>
                <input className="kai-input" type="email" required placeholder="jane@email.com"
                  value={candidateForm.email} onChange={e => setCandidateForm(p => ({ ...p, email: e.target.value }))} />
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <label className="kai-label">Phone</label>
                <input className="kai-input" placeholder="+91 9876543210"
                  value={candidateForm.phone} onChange={e => setCandidateForm(p => ({ ...p, phone: e.target.value }))} />
              </Col>
              <Col md={6}>
                <label className="kai-label">Location</label>
                <input className="kai-input" placeholder="Bangalore, India"
                  value={candidateForm.location} onChange={e => setCandidateForm(p => ({ ...p, location: e.target.value }))} />
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <label className="kai-label">LinkedIn</label>
                <input className="kai-input" placeholder="https://linkedin.com/in/..."
                  value={candidateForm.linkedinUrl} onChange={e => setCandidateForm(p => ({ ...p, linkedinUrl: e.target.value }))} />
              </Col>
              <Col md={6}>
                <label className="kai-label">Portfolio</label>
                <input className="kai-input" placeholder="https://portfolio.dev"
                  value={candidateForm.portfolioUrl} onChange={e => setCandidateForm(p => ({ ...p, portfolioUrl: e.target.value }))} />
              </Col>
            </Row>
            <div>
              <label className="kai-label">Experience</label>
              <textarea className="kai-input" rows={2} placeholder="3 years at Google as SWE..."
                value={candidateForm.experience} onChange={e => setCandidateForm(p => ({ ...p, experience: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label className="kai-label">Education</label>
              <textarea className="kai-input" rows={2} placeholder="B.Tech from IIT Bombay..."
                value={candidateForm.education} onChange={e => setCandidateForm(p => ({ ...p, education: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label className="kai-label">Cover Letter</label>
              <textarea className="kai-input" rows={3} placeholder="Cover letter..."
                value={candidateForm.coverLetter} onChange={e => setCandidateForm(p => ({ ...p, coverLetter: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
            <div>
              <label className="kai-label">Resume URL</label>
              <input className="kai-input" placeholder="https://drive.google.com/..."
                value={candidateForm.resumeUrl} onChange={e => setCandidateForm(p => ({ ...p, resumeUrl: e.target.value }))} />
            </div>
            <Row>
              <Col md={6}>
                <label className="kai-label">Tier</label>
                <select className="kai-input" value={candidateForm.tier} onChange={e => setCandidateForm(p => ({ ...p, tier: e.target.value }))}>
                  <option value="UNTIERED">Untiered</option>
                  <option value="INTERN">Intern</option>
                  <option value="JUNIOR">Junior</option>
                  <option value="SENIOR">Senior</option>
                </select>
              </Col>
              <Col md={6}>
                <label className="kai-label">Source</label>
                <select className="kai-input" value={candidateForm.source} onChange={e => setCandidateForm(p => ({ ...p, source: e.target.value }))}>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid var(--kai-border)' }}>
            <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowCandidateModal(false)}>Cancel</button>
            <button type="submit" className="kai-btn kai-btn-primary">Add Candidate</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* ── Candidate Detail Modal ─────────────────────────── */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="xl" centered>
        {selectedCandidate && (
          <>
            <Modal.Header closeButton style={{ borderBottom: '1px solid var(--kai-border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <Modal.Title style={{ fontSize: 20, fontWeight: 700, color: '#10222F', margin: 0 }}>
                    {selectedCandidate.name}
                  </Modal.Title>
                  <span className="kai-badge" style={{ background: `${STATUS_COLORS[selectedCandidate.status]}15`, color: STATUS_COLORS[selectedCandidate.status] }}>
                    {STATUS_LABELS[selectedCandidate.status] || selectedCandidate.status}
                  </span>
                  {selectedCandidate.tier && selectedCandidate.tier !== 'UNTIERED' && (
                    <span className="kai-badge" style={{ background: `${TIER_COLORS[selectedCandidate.tier]}15`, color: TIER_COLORS[selectedCandidate.tier] }}>
                      {selectedCandidate.tier}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--kai-text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span><Mail size={13} style={{ marginRight: 4 }} />{selectedCandidate.email}</span>
                  {selectedCandidate.phone && <span><Phone size={13} style={{ marginRight: 4 }} />{selectedCandidate.phone}</span>}
                  {selectedCandidate.location && <span><MapPin size={13} style={{ marginRight: 4 }} />{selectedCandidate.location}</span>}
                  {selectedCandidate.linkedinUrl && (
                    <a href={selectedCandidate.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: '#0077B5', textDecoration: 'none' }}>
                      <Linkedin size={13} style={{ marginRight: 3 }} />LinkedIn
                    </a>
                  )}
                  {selectedCandidate.portfolioUrl && (
                    <a href={selectedCandidate.portfolioUrl} target="_blank" rel="noreferrer" style={{ color: '#146DF7', textDecoration: 'none' }}>
                      <Globe size={13} style={{ marginRight: 3 }} />Portfolio
                    </a>
                  )}
                </div>
                <div style={{ marginTop: 8 }}>
                  <RatingStars rating={selectedCandidate.avgRating || selectedCandidate.rating} size={16}
                    onClick={(r) => handleRate(selectedCandidate.id, r)} />
                </div>
              </div>
            </Modal.Header>
            <Modal.Body style={{ padding: 0 }}>
              <Tabs defaultActiveKey="profile" className="mb-0" style={{ borderBottom: '1px solid var(--kai-border)', padding: '0 20px' }}>
                {/* ── Profile Tab ────────────────── */}
                <Tab eventKey="profile" title={<span><FileText size={14} style={{ marginRight: 4 }} />Profile</span>}>
                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {selectedCandidate.experience && (
                      <div>
                        <h6 style={{ fontSize: 13, fontWeight: 700, color: '#10222F', marginBottom: 6 }}>Experience</h6>
                        <p style={{ fontSize: 13, color: 'var(--kai-text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>{selectedCandidate.experience}</p>
                      </div>
                    )}
                    {selectedCandidate.education && (
                      <div>
                        <h6 style={{ fontSize: 13, fontWeight: 700, color: '#10222F', marginBottom: 6 }}>Education</h6>
                        <p style={{ fontSize: 13, color: 'var(--kai-text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>{selectedCandidate.education}</p>
                      </div>
                    )}
                    {parseSkills(selectedCandidate.skills).length > 0 && (
                      <div>
                        <h6 style={{ fontSize: 13, fontWeight: 700, color: '#10222F', marginBottom: 6 }}>Skills</h6>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {parseSkills(selectedCandidate.skills).map((s, i) => (
                            <span key={i} className="kai-badge" style={{ background: '#146DF715', color: '#146DF7' }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedCandidate.resumeUrl && (
                      <div>
                        <h6 style={{ fontSize: 13, fontWeight: 700, color: '#10222F', marginBottom: 6 }}>Resume</h6>
                        <a href={selectedCandidate.resumeUrl} target="_blank" rel="noreferrer" className="kai-btn kai-btn-outline kai-btn-sm">
                          <Download size={14} style={{ marginRight: 4 }} />
                          {selectedCandidate.resumeFileName || 'Download Resume'}
                        </a>
                      </div>
                    )}
                    {selectedCandidate.coverLetter && (
                      <div>
                        <h6 style={{ fontSize: 13, fontWeight: 700, color: '#10222F', marginBottom: 6 }}>Cover Letter</h6>
                        <div style={{ fontSize: 13, color: 'var(--kai-text-secondary)', background: '#FAFAFA', padding: 16, borderRadius: 8, border: '1px solid var(--kai-border)', whiteSpace: 'pre-wrap' }}>
                          {selectedCandidate.coverLetter}
                        </div>
                      </div>
                    )}
                    {!selectedCandidate.experience && !selectedCandidate.education && !selectedCandidate.coverLetter && parseSkills(selectedCandidate.skills).length === 0 && !selectedCandidate.resumeUrl && (
                      <div style={{ textAlign: 'center', padding: 40, color: 'var(--kai-text-muted)' }}>
                        <User size={32} style={{ marginBottom: 8 }} />
                        <p>No profile information available</p>
                      </div>
                    )}
                  </div>
                </Tab>

                {/* ── Comments Tab ───────────────── */}
                <Tab eventKey="comments" title={<span><MessageSquare size={14} style={{ marginRight: 4 }} />Comments ({selectedCandidate.commentsCount || 0})</span>}>
                  <div style={{ padding: 24 }}>
                    {/* Add comment */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                      <textarea className="kai-input" rows={2} placeholder="Add a comment..."
                        value={commentText} onChange={e => setCommentText(e.target.value)}
                        style={{ flex: 1, resize: 'vertical' }} />
                      <button className="kai-btn kai-btn-primary" onClick={handleAddComment} disabled={!commentText.trim()}>
                        <Send size={14} />
                      </button>
                    </div>
                    {/* Comment list */}
                    {(candidateComments || []).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 30, color: 'var(--kai-text-muted)' }}>
                        <MessageSquare size={24} style={{ marginBottom: 8 }} />
                        <p style={{ fontSize: 13 }}>No comments yet</p>
                      </div>
                    ) : (candidateComments || []).map(cm => (
                      <div key={cm.id} style={{ padding: 12, borderBottom: '1px solid var(--kai-border-light)', display: 'flex', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#146DF715', color: '#146DF7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {(cm.createdBy || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', marginBottom: 4 }}>
                            {formatDate(cm.createdAt)}
                          </div>
                          <div style={{ fontSize: 13, color: '#10222F', whiteSpace: 'pre-wrap' }}>{cm.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Tab>

                {/* ── History Tab ────────────────── */}
                <Tab eventKey="history" title={<span><History size={14} style={{ marginRight: 4 }} />History ({selectedCandidate.eventsCount || 0})</span>}>
                  <div style={{ padding: 24 }}>
                    {(candidateEvents || []).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 30, color: 'var(--kai-text-muted)' }}>
                        <History size={24} style={{ marginBottom: 8 }} />
                        <p style={{ fontSize: 13 }}>No events recorded</p>
                      </div>
                    ) : (
                      <div style={{ position: 'relative', paddingLeft: 24 }}>
                        {/* Timeline line */}
                        <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: 'var(--kai-border)' }} />
                        {(candidateEvents || []).map(ev => (
                          <div key={ev.id} style={{ position: 'relative', paddingBottom: 20, paddingLeft: 16 }}>
                            <div style={{ position: 'absolute', left: -20, top: 4, width: 12, height: 12, borderRadius: '50%', background: ev.eventType === 'status_change' ? '#146DF7' : ev.eventType === 'comment' ? '#8B3FE9' : '#6B7280', border: '2px solid white' }} />
                            <div style={{ fontSize: 11, color: 'var(--kai-text-muted)', marginBottom: 2 }}>{formatDate(ev.createdAt)}</div>
                            <div style={{ fontSize: 13, color: '#10222F' }}>
                              {ev.eventType === 'status_change' && (
                                <span>Status changed: <strong>{STATUS_LABELS[ev.fromValue] || ev.fromValue}</strong> → <strong>{STATUS_LABELS[ev.toValue] || ev.toValue}</strong></span>
                              )}
                              {ev.eventType === 'created' && <span>Candidate added</span>}
                              {ev.eventType === 'imported' && <span>Imported via bulk import</span>}
                              {ev.eventType === 'comment' && <span>Comment added</span>}
                              {ev.eventType === 'rating' && <span>Rated {ev.toValue} stars</span>}
                              {ev.eventType === 'tier_change' && <span>Tier changed: {ev.fromValue} → {ev.toValue}</span>}
                              {ev.eventType === 'interview_scheduled' && <span>Interview scheduled: {ev.toValue}</span>}
                              {ev.eventType === 'field_update' && <span>Fields updated: {ev.toValue}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Tab>

                {/* ── Interview Tab ──────────────── */}
                <Tab eventKey="interview" title={<span><Video size={14} style={{ marginRight: 4 }} />Interviews ({(selectedCandidate.interviews || []).length})</span>}>
                  <div style={{ padding: 24 }}>
                    {(selectedCandidate.interviews || []).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 30, color: 'var(--kai-text-muted)' }}>
                        <Video size={24} style={{ marginBottom: 8 }} />
                        <p style={{ fontSize: 13 }}>No interviews scheduled</p>
                      </div>
                    ) : (selectedCandidate.interviews || []).map(iv => (
                      <div key={iv.id} className="kai-card" style={{ marginBottom: 12 }}>
                        <div className="kai-card-body" style={{ padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div>
                              <span style={{ fontWeight: 700, fontSize: 14, color: '#10222F' }}>
                                Round {iv.roundNumber}: {iv.roundName}
                              </span>
                            </div>
                            <span className="kai-badge" style={{
                              background: iv.result === 'PASSED' ? '#16A34A15' : iv.result === 'FAILED' ? '#DC262615' : '#6B728015',
                              color: iv.result === 'PASSED' ? '#16A34A' : iv.result === 'FAILED' ? '#DC2626' : '#6B7280',
                            }}>
                              {iv.result}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {iv.interviewer && <span>Interviewer: {iv.interviewer.firstName} {iv.interviewer.lastName}</span>}
                            {iv.scheduledAt && <span>Scheduled: {formatDate(iv.scheduledAt)}</span>}
                            {iv.completedAt && <span>Completed: {formatDate(iv.completedAt)}</span>}
                            {iv.score !== null && iv.score !== undefined && <span>Score: {iv.score}/10</span>}
                          </div>
                          {iv.feedback && (
                            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--kai-text-secondary)', background: '#FAFAFA', padding: 10, borderRadius: 6, whiteSpace: 'pre-wrap' }}>
                              {iv.feedback}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Tab>
              </Tabs>
            </Modal.Body>
            <Modal.Footer style={{ borderTop: '1px solid var(--kai-border)', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="kai-btn kai-btn-outline" style={{ color: '#DC2626', borderColor: '#DC2626' }}
                  onClick={() => handleDeleteCandidate(selectedCandidate.id)}>
                  <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="kai-btn kai-btn-outline" onClick={() => { setShowInterviewModal(true); }}>
                  <Video size={14} style={{ marginRight: 4 }} /> Schedule Interview
                </button>
                <button className="kai-btn kai-btn-outline" style={{ color: '#DC2626', borderColor: '#DC2626' }}
                  onClick={() => { setShowRejectModal(true); }}>
                  <XCircle size={14} style={{ marginRight: 4 }} /> Reject
                </button>
                <button className="kai-btn kai-btn-outline" style={{ color: '#2563EB', borderColor: '#2563EB' }}
                  onClick={() => { setShowOfferModal(true); }}>
                  <DollarSign size={14} style={{ marginRight: 4 }} /> Make Offer
                </button>
                <button className="kai-btn kai-btn-primary" onClick={() => handleAdvance(selectedCandidate.id)}>
                  <ArrowRight size={14} style={{ marginRight: 4 }} /> Advance
                </button>
              </div>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* ── Reject Modal ───────────────────────────────────── */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <form onSubmit={handleReject}>
          <Modal.Header closeButton style={{ borderBottom: '1px solid var(--kai-border)' }}>
            <Modal.Title style={{ fontSize: 18, fontWeight: 700, color: '#DC2626' }}>
              <XCircle size={20} style={{ marginRight: 8 }} />Reject Candidate
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedCandidate && (
              <p style={{ fontSize: 13, color: 'var(--kai-text-secondary)', margin: 0 }}>
                Rejecting <strong>{selectedCandidate.name}</strong> ({selectedCandidate.email})
              </p>
            )}
            <div>
              <label className="kai-label">Reason</label>
              <select className="kai-input" value={rejectForm.reason} onChange={e => setRejectForm(p => ({ ...p, reason: e.target.value }))}>
                <option value="">Select a reason...</option>
                {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="kai-label">Message (optional)</label>
              <textarea className="kai-input" rows={3} placeholder="Additional details..."
                value={rejectForm.message} onChange={e => setRejectForm(p => ({ ...p, message: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid var(--kai-border)' }}>
            <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowRejectModal(false)}>Cancel</button>
            <button type="submit" className="kai-btn" style={{ background: '#DC2626', color: 'white' }}>Reject Candidate</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* ── Offer Modal ────────────────────────────────────── */}
      <Modal show={showOfferModal} onHide={() => setShowOfferModal(false)} centered>
        <form onSubmit={handleOffer}>
          <Modal.Header closeButton style={{ borderBottom: '1px solid var(--kai-border)' }}>
            <Modal.Title style={{ fontSize: 18, fontWeight: 700, color: '#2563EB' }}>
              <DollarSign size={20} style={{ marginRight: 8 }} />Make Offer
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedCandidate && (
              <p style={{ fontSize: 13, color: 'var(--kai-text-secondary)', margin: 0 }}>
                Making offer to <strong>{selectedCandidate.name}</strong>
              </p>
            )}
            <div>
              <label className="kai-label">Offered Salary (Annual)</label>
              <input className="kai-input" type="number" placeholder="1200000" required
                value={offerForm.salary} onChange={e => setOfferForm(p => ({ ...p, salary: e.target.value }))} />
            </div>
            <div>
              <label className="kai-label">Notes</label>
              <textarea className="kai-input" rows={3} placeholder="Offer details, benefits, etc..."
                value={offerForm.notes} onChange={e => setOfferForm(p => ({ ...p, notes: e.target.value }))}
                style={{ resize: 'vertical' }} />
            </div>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid var(--kai-border)' }}>
            <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowOfferModal(false)}>Cancel</button>
            <button type="submit" className="kai-btn kai-btn-primary">Send Offer</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* ── Schedule Interview Modal ───────────────────────── */}
      <Modal show={showInterviewModal} onHide={() => setShowInterviewModal(false)} centered>
        <form onSubmit={handleScheduleInterview}>
          <Modal.Header closeButton style={{ borderBottom: '1px solid var(--kai-border)' }}>
            <Modal.Title style={{ fontSize: 18, fontWeight: 700, color: '#10222F' }}>
              <Video size={20} style={{ marginRight: 8 }} />Schedule Interview
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedCandidate && (
              <p style={{ fontSize: 13, color: 'var(--kai-text-secondary)', margin: 0 }}>
                Scheduling interview for <strong>{selectedCandidate.name}</strong>
              </p>
            )}
            <Row>
              <Col md={6}>
                <label className="kai-label">Round Number *</label>
                <input className="kai-input" type="number" min="1" required
                  value={interviewForm.roundNumber} onChange={e => setInterviewForm(p => ({ ...p, roundNumber: e.target.value }))} />
              </Col>
              <Col md={6}>
                <label className="kai-label">Round Name *</label>
                <input className="kai-input" required placeholder="Technical Screen"
                  value={interviewForm.roundName} onChange={e => setInterviewForm(p => ({ ...p, roundName: e.target.value }))} />
              </Col>
            </Row>
            <div>
              <label className="kai-label">Interviewer *</label>
              <select className="kai-input" required value={interviewForm.interviewerId}
                onChange={e => setInterviewForm(p => ({ ...p, interviewerId: e.target.value }))}>
                <option value="">Select interviewer...</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="kai-label">Scheduled Date/Time</label>
              <input className="kai-input" type="datetime-local"
                value={interviewForm.scheduledAt} onChange={e => setInterviewForm(p => ({ ...p, scheduledAt: e.target.value }))} />
            </div>
          </Modal.Body>
          <Modal.Footer style={{ borderTop: '1px solid var(--kai-border)' }}>
            <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowInterviewModal(false)}>Cancel</button>
            <button type="submit" className="kai-btn kai-btn-primary">Schedule</button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
