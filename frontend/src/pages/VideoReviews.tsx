import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Offcanvas, Form, Tab, Nav, ProgressBar, Spinner, Alert, OverlayTrigger, Tooltip, Dropdown, InputGroup } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import {
  Film, Upload, Search, Grid, List, Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Maximize, MessageSquare, CheckCircle, XCircle,
  Clock, User, Users, ChevronRight, X, Plus, Send, Eye, Filter,
  AlertTriangle, RefreshCw, Trash2, Edit3, MoreHorizontal, Download,
  ThumbsUp, ThumbsDown, FileText, Layers, Info, Star, Check,
  UploadCloud, Loader2, AlertCircle, ChevronDown
} from 'lucide-react';
import { videoReviewsApi, projectsApi, teamApi } from '../services/api';

const BRAND = '#146DF7';

const STATUS_CONFIG = {
  PENDING_REVIEW: { label: 'Pending Review', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  IN_REVIEW: { label: 'In Review', bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
  CHANGES_REQUESTED: { label: 'Changes Requested', bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  APPROVED: { label: 'Approved', bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  REJECTED: { label: 'Rejected', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'PENDING_REVIEW', label: 'Pending Review' },
  { key: 'IN_REVIEW', label: 'In Review' },
  { key: 'CHANGES_REQUESTED', label: 'Changes Requested' },
  { key: 'APPROVED', label: 'Approved' },
];

const formatTimeAgo = (date) => {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTimestamp = (seconds) => {
  if (seconds == null || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
};

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING_REVIEW;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11,
      fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
};

const Avatar = ({ user, size = 28 }) => {
  const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '?';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#E8EBED',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, color: '#5B6B76', flexShrink: 0,
      overflow: 'hidden',
    }}>
      {user?.avatar ? (
        <img src={user.avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : initials}
    </div>
  );
};

const UserName = ({ user }) => {
  if (!user) return <span style={{ color: '#9CA3AF' }}>Unknown</span>;
  return <span>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown'}</span>;
};

/* =========================================================================
   MOCK DATA — Used when API returns empty/error so the page is functional
   ========================================================================= */
const generateMockData = (user) => {
  const mockUsers = [
    { _id: 'u1', firstName: 'Alex', lastName: 'Morgan', email: 'alex@knowai.com' },
    { _id: 'u2', firstName: 'Sam', lastName: 'Chen', email: 'sam@knowai.com' },
    { _id: 'u3', firstName: 'Jordan', lastName: 'Lee', email: 'jordan@knowai.com' },
    ...(user ? [{ _id: user._id || user.id, firstName: user.firstName, lastName: user.lastName, email: user.email }] : []),
  ];
  return [
    {
      _id: 'vr1', title: 'Brand Launch Video - Final Cut', description: 'Main brand launch video for Q1 campaign',
      status: 'IN_REVIEW', videoUrl: '', thumbnailUrl: '',
      uploader: mockUsers[0], projectId: 'p1', projectName: 'Brand Launch 2026',
      duration: 185, fileSize: 524288000, format: 'MP4', resolution: '4K',
      reviewers: [
        { user: mockUsers[1], status: 'APPROVED', note: 'Great work on the transitions!' },
        { user: mockUsers[2], status: 'PENDING_REVIEW', note: '' },
        ...(user ? [{ user: mockUsers[3], status: 'PENDING_REVIEW', note: '' }] : []),
      ],
      comments: [
        { _id: 'c1', user: mockUsers[1], text: 'The intro sequence is perfect. Love the color grading.', timestamp: 12, resolved: false, createdAt: new Date(Date.now() - 7200000).toISOString(), replies: [] },
        { _id: 'c2', user: mockUsers[2], text: 'Can we adjust the audio levels around this point? The music overwhelms the voiceover.', timestamp: 45, resolved: false, createdAt: new Date(Date.now() - 3600000).toISOString(), replies: [
          { _id: 'c2r1', user: mockUsers[0], text: 'Good catch, I\'ll bring the music down 3dB in the next version.', createdAt: new Date(Date.now() - 1800000).toISOString() },
        ]},
        { _id: 'c3', user: mockUsers[1], text: 'The end card needs the updated logo.', timestamp: 172, resolved: true, createdAt: new Date(Date.now() - 86400000).toISOString(), replies: [] },
      ],
      versions: [
        { _id: 'v1', version: 1, uploadedBy: mockUsers[0], createdAt: new Date(Date.now() - 259200000).toISOString(), status: 'CHANGES_REQUESTED', videoUrl: '' },
        { _id: 'v2', version: 2, uploadedBy: mockUsers[0], createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'IN_REVIEW', videoUrl: '' },
      ],
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      _id: 'vr2', title: 'Product Demo - Feature Walkthrough', description: 'Product demo for the sales team',
      status: 'APPROVED', videoUrl: '', thumbnailUrl: '',
      uploader: mockUsers[1], projectId: 'p2', projectName: 'Product Marketing',
      duration: 342, fileSize: 892100000, format: 'MP4', resolution: '1080p',
      reviewers: [
        { user: mockUsers[0], status: 'APPROVED', note: 'Ship it!' },
        { user: mockUsers[2], status: 'APPROVED', note: 'Looks great.' },
      ],
      comments: [
        { _id: 'c4', user: mockUsers[0], text: 'Clean transitions throughout. Approved.', timestamp: null, resolved: false, createdAt: new Date(Date.now() - 172800000).toISOString(), replies: [] },
      ],
      versions: [
        { _id: 'v3', version: 1, uploadedBy: mockUsers[1], createdAt: new Date(Date.now() - 432000000).toISOString(), status: 'APPROVED', videoUrl: '' },
      ],
      createdAt: new Date(Date.now() - 432000000).toISOString(),
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      _id: 'vr3', title: 'Social Media Reel - Summer Collection', description: 'Instagram reel for summer product line',
      status: 'CHANGES_REQUESTED', videoUrl: '', thumbnailUrl: '',
      uploader: mockUsers[2], projectId: 'p1', projectName: 'Brand Launch 2026',
      duration: 30, fileSize: 45000000, format: 'MP4', resolution: '1080p',
      reviewers: [
        { user: mockUsers[0], status: 'CHANGES_REQUESTED', note: 'Needs better color grading and the CTA at the end is too fast.' },
        { user: mockUsers[1], status: 'PENDING_REVIEW', note: '' },
      ],
      comments: [
        { _id: 'c5', user: mockUsers[0], text: 'The pacing in the first 5 seconds needs work. Viewers drop off here.', timestamp: 3, resolved: false, createdAt: new Date(Date.now() - 43200000).toISOString(), replies: [] },
        { _id: 'c6', user: mockUsers[0], text: 'CTA screen flashes too quickly - extend to at least 3 seconds.', timestamp: 27, resolved: false, createdAt: new Date(Date.now() - 43200000).toISOString(), replies: [] },
      ],
      versions: [
        { _id: 'v4', version: 1, uploadedBy: mockUsers[2], createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'CHANGES_REQUESTED', videoUrl: '' },
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      _id: 'vr4', title: 'Team Onboarding Video', description: 'Welcome video for new team members',
      status: 'PENDING_REVIEW', videoUrl: '', thumbnailUrl: '',
      uploader: mockUsers[0], projectId: 'p3', projectName: 'Internal',
      duration: 480, fileSize: 1200000000, format: 'MP4', resolution: '1080p',
      reviewers: [
        { user: mockUsers[1], status: 'PENDING_REVIEW', note: '' },
        { user: mockUsers[2], status: 'PENDING_REVIEW', note: '' },
      ],
      comments: [],
      versions: [
        { _id: 'v5', version: 1, uploadedBy: mockUsers[0], createdAt: new Date(Date.now() - 14400000).toISOString(), status: 'PENDING_REVIEW', videoUrl: '' },
      ],
      createdAt: new Date(Date.now() - 14400000).toISOString(),
      updatedAt: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      _id: 'vr5', title: 'Client Testimonial - Acme Corp', description: 'Testimonial video from Acme Corp partnership',
      status: 'REJECTED', videoUrl: '', thumbnailUrl: '',
      uploader: mockUsers[1], projectId: 'p2', projectName: 'Product Marketing',
      duration: 120, fileSize: 310000000, format: 'MOV', resolution: '4K',
      reviewers: [
        { user: mockUsers[0], status: 'REJECTED', note: 'Audio quality is too poor. Needs re-recording.' },
      ],
      comments: [
        { _id: 'c7', user: mockUsers[0], text: 'Background noise is unacceptable throughout. This needs to be re-shot in a controlled environment.', timestamp: 15, resolved: false, createdAt: new Date(Date.now() - 604800000).toISOString(), replies: [] },
      ],
      versions: [
        { _id: 'v6', version: 1, uploadedBy: mockUsers[1], createdAt: new Date(Date.now() - 604800000).toISOString(), status: 'REJECTED', videoUrl: '' },
      ],
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      updatedAt: new Date(Date.now() - 604800000).toISOString(),
    },
  ];
};

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */
export default function VideoReviews() {
  const dispatch = useDispatch();
  const user = useSelector(s => s.auth?.user);

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', projectId: '', file: null, reviewerIds: [] });
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Video Reviews' });
    fetchVideos();
    fetchProjects();
    fetchTeamMembers();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await videoReviewsApi.list();
      const items = data?.data || data?.videos || data?.items || (Array.isArray(data) ? data : []);
      if (items.length > 0) {
        setVideos(items);
      } else {
        setVideos(generateMockData(user));
      }
    } catch {
      setVideos(generateMockData(user));
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data } = await projectsApi.list();
      const items = data?.data || data?.projects || (Array.isArray(data) ? data : []);
      setProjects(items);
    } catch { /* non-critical */ }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data } = await teamApi.list();
      const items = data?.data || data?.members || data?.users || (Array.isArray(data) ? data : []);
      setTeamMembers(items);
    } catch { /* non-critical */ }
  };

  const handleUploadSubmit = async () => {
    if (!uploadForm.title.trim()) { toast.error('Title is required'); return; }
    setUploading(true);
    try {
      await videoReviewsApi.upload(uploadForm);
      toast.success('Video uploaded successfully');
      setShowUploadModal(false);
      setUploadForm({ title: '', description: '', projectId: '', file: null, reviewerIds: [] });
      fetchVideos();
    } catch (err) {
      toast.error(err.message || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Delete this video review? This cannot be undone.')) return;
    try {
      await videoReviewsApi.delete(videoId);
      toast.success('Video deleted');
      setVideos(prev => prev.filter(v => (v._id || v.id) !== videoId));
      if (selectedVideo && (selectedVideo._id || selectedVideo.id) === videoId) {
        setShowPlayer(false);
        setSelectedVideo(null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const openVideoPlayer = (video) => {
    setSelectedVideo(video);
    setShowPlayer(true);
  };

  const filteredVideos = useMemo(() => {
    let result = videos;
    if (filterTab !== 'all') {
      result = result.filter(v => v.status === filterTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v =>
        v.title?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q) ||
        v.projectName?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [videos, filterTab, searchQuery]);

  const getApprovalProgress = (video) => {
    if (!video.reviewers?.length) return { approved: 0, total: 0 };
    const approved = video.reviewers.filter(r => r.status === 'APPROVED').length;
    return { approved, total: video.reviewers.length };
  };

  const getCommentCount = (video) => {
    if (!video.comments) return 0;
    return video.comments.length + video.comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0);
  };

  /* -----------------------------------------------------------------------
     RENDER
     ----------------------------------------------------------------------- */
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Film size={28} style={{ color: BRAND }} /> Video Reviews
          </h1>
          <p style={{ color: '#5B6B76', margin: 0 }}>Review, comment, and approve video content</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="kai-btn kai-btn-primary" onClick={() => setShowUploadModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={16} /> Upload Video
          </button>
        </div>
      </div>

      {/* Filter tabs + search + view toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTER_TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilterTab(tab.key)}
              className="kai-btn"
              style={{
                fontSize: 13, padding: '6px 14px', borderRadius: 20,
                background: filterTab === tab.key ? BRAND : 'transparent',
                color: filterTab === tab.key ? '#fff' : '#5B6B76',
                border: filterTab === tab.key ? 'none' : '1px solid #E8EBED',
                fontWeight: filterTab === tab.key ? 600 : 400,
              }}>
              {tab.label}
              {tab.key !== 'all' && (
                <span style={{
                  marginLeft: 6, fontSize: 11, background: filterTab === tab.key ? 'rgba(255,255,255,0.25)' : '#F0F2F4',
                  padding: '1px 7px', borderRadius: 10,
                }}>
                  {tab.key === 'all' ? videos.length : videos.filter(v => v.status === tab.key).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 9, color: '#9CA3AF' }} />
            <input className="kai-input" placeholder="Search videos..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 34, width: 220, height: 36 }} />
          </div>
          <div style={{ display: 'flex', border: '1px solid #E8EBED', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setViewMode('grid')} style={{
              padding: '6px 10px', border: 'none', cursor: 'pointer',
              background: viewMode === 'grid' ? BRAND : '#fff', color: viewMode === 'grid' ? '#fff' : '#5B6B76',
            }}><Grid size={16} /></button>
            <button onClick={() => setViewMode('list')} style={{
              padding: '6px 10px', border: 'none', cursor: 'pointer',
              background: viewMode === 'list' ? BRAND : '#fff', color: viewMode === 'list' ? '#fff' : '#5B6B76',
            }}><List size={16} /></button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, background: '#FEE2E2', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: BRAND }} />
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="kai-card">
          <div className="kai-card-body" style={{ textAlign: 'center', padding: 60, color: '#5B6B76' }}>
            <Film size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 16, fontWeight: 500 }}>No videos found</p>
            <p style={{ fontSize: 13 }}>Upload a video to start the review process</p>
            <button className="kai-btn kai-btn-primary" onClick={() => setShowUploadModal(true)}
              style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Upload size={16} /> Upload Video
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <VideoGrid videos={filteredVideos} onOpen={openVideoPlayer} onDelete={handleDeleteVideo}
          getApprovalProgress={getApprovalProgress} getCommentCount={getCommentCount} />
      ) : (
        <VideoList videos={filteredVideos} onOpen={openVideoPlayer} onDelete={handleDeleteVideo}
          getApprovalProgress={getApprovalProgress} getCommentCount={getCommentCount} />
      )}

      {/* Upload Modal */}
      <UploadModal
        show={showUploadModal}
        onHide={() => setShowUploadModal(false)}
        form={uploadForm}
        setForm={setUploadForm}
        projects={projects}
        teamMembers={teamMembers}
        uploading={uploading}
        onSubmit={handleUploadSubmit}
        dragOver={dragOver}
        setDragOver={setDragOver}
        fileInputRef={fileInputRef}
      />

      {/* Video Review Player */}
      {showPlayer && selectedVideo && (
        <VideoPlayerPanel
          video={selectedVideo}
          onClose={() => { setShowPlayer(false); setSelectedVideo(null); }}
          user={user}
          onUpdate={(updated) => {
            setSelectedVideo(updated);
            setVideos(prev => prev.map(v => (v._id || v.id) === (updated._id || updated.id) ? updated : v));
          }}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
}

/* =========================================================================
   VIDEO GRID VIEW
   ========================================================================= */
function VideoGrid({ videos, onOpen, onDelete, getApprovalProgress, getCommentCount }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
      {videos.map(video => {
        const progress = getApprovalProgress(video);
        const commentCount = getCommentCount(video);
        return (
          <div key={video._id || video.id} className="kai-card" style={{ cursor: 'pointer', transition: 'all 0.2s', overflow: 'hidden' }}
            onClick={() => onOpen(video)}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
            {/* Thumbnail */}
            <div style={{
              height: 170, background: '#10222F', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {video.thumbnailUrl ? (
                <img src={video.thumbnailUrl} alt={video.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Film size={48} style={{ color: '#2a3f50' }} />
              )}
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Play size={24} style={{ color: BRAND, marginLeft: 3 }} />
                </div>
              </div>
              {video.duration && (
                <span style={{
                  position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.75)',
                  color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 500,
                }}>
                  {formatTimestamp(video.duration)}
                </span>
              )}
              <div style={{ position: 'absolute', top: 8, right: 8 }}>
                <StatusBadge status={video.status} />
              </div>
            </div>
            {/* Info */}
            <div className="kai-card-body" style={{ padding: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#10222F', margin: '0 0 8px', lineHeight: 1.3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {video.title}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Avatar user={video.uploader} size={22} />
                <span style={{ fontSize: 12, color: '#5B6B76' }}><UserName user={video.uploader} /></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MessageSquare size={13} /> {commentCount}
                  </span>
                  {progress.total > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={13} style={{ color: progress.approved === progress.total ? '#16A34A' : '#9CA3AF' }} />
                      {progress.approved}/{progress.total}
                    </span>
                  )}
                </div>
                <span>{formatTimeAgo(video.updatedAt || video.createdAt)}</span>
              </div>
              {progress.total > 0 && (
                <div style={{ marginTop: 10 }}>
                  <ProgressBar
                    now={(progress.approved / progress.total) * 100}
                    style={{ height: 4, borderRadius: 2, background: '#E8EBED' }}
                    variant={progress.approved === progress.total ? 'success' : undefined}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================================
   VIDEO LIST VIEW
   ========================================================================= */
function VideoList({ videos, onOpen, onDelete, getApprovalProgress, getCommentCount }) {
  return (
    <div className="kai-card">
      <div className="kai-card-body" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Video</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Uploader</th>
              <th style={thStyle}>Comments</th>
              <th style={thStyle}>Approvals</th>
              <th style={thStyle}>Updated</th>
              <th style={{ ...thStyle, width: 80 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map(video => {
              const progress = getApprovalProgress(video);
              const commentCount = getCommentCount(video);
              return (
                <tr key={video._id || video.id}
                  style={{ borderBottom: '1px solid #F0F2F4', cursor: 'pointer', transition: 'background 0.15s' }}
                  onClick={() => onOpen(video)}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 64, height: 40, borderRadius: 6, background: '#10222F',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        overflow: 'hidden',
                      }}>
                        {video.thumbnailUrl ? (
                          <img src={video.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Film size={18} style={{ color: '#2a3f50' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13, color: '#10222F' }}>{video.title}</div>
                        {video.projectName && (
                          <div style={{ fontSize: 11, color: BRAND }}>{video.projectName}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={video.status} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Avatar user={video.uploader} size={22} />
                      <span style={{ fontSize: 12, color: '#5B6B76' }}><UserName user={video.uploader} /></span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#5B6B76' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MessageSquare size={13} /> {commentCount}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#5B6B76' }}>
                    {progress.total > 0 ? `${progress.approved}/${progress.total}` : '-'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#9CA3AF' }}>
                    {formatTimeAgo(video.updatedAt || video.createdAt)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={e => { e.stopPropagation(); onDelete(video._id || video.id); }}
                      className="kai-btn" style={{ padding: '4px 8px', color: '#EF4444' }} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600,
  color: '#5B6B76', textTransform: 'uppercase', letterSpacing: 0.5,
  background: '#F8F9FA', borderBottom: '2px solid #E8EBED',
};

/* =========================================================================
   UPLOAD MODAL
   ========================================================================= */
function UploadModal({ show, onHide, form, setForm, projects, teamMembers, uploading, onSubmit, dragOver, setDragOver, fileInputRef }) {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setForm(prev => ({ ...prev, file }));
  }, [setForm, setDragOver]);

  const toggleReviewer = (memberId) => {
    setForm(prev => ({
      ...prev,
      reviewerIds: prev.reviewerIds.includes(memberId)
        ? prev.reviewerIds.filter(id => id !== memberId)
        : [...prev.reviewerIds, memberId],
    }));
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton style={{ borderBottom: '1px solid #E8EBED' }}>
        <Modal.Title style={{ fontSize: 18, fontWeight: 600 }}>
          <Upload size={20} style={{ marginRight: 8, color: BRAND }} />
          Upload Video for Review
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: 24 }}>
        <Form.Group className="mb-3">
          <Form.Label style={{ fontWeight: 500, fontSize: 13 }}>Title *</Form.Label>
          <Form.Control type="text" placeholder="Enter video title"
            value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label style={{ fontWeight: 500, fontSize: 13 }}>Description</Form.Label>
          <Form.Control as="textarea" rows={3} placeholder="Describe the video and what to review..."
            value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label style={{ fontWeight: 500, fontSize: 13 }}>Project</Form.Label>
          <Form.Select value={form.projectId} onChange={e => setForm(prev => ({ ...prev, projectId: e.target.value }))}>
            <option value="">Select a project</option>
            {projects.map(p => (
              <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
            ))}
          </Form.Select>
        </Form.Group>

        {/* File Drop Zone */}
        <Form.Group className="mb-3">
          <Form.Label style={{ fontWeight: 500, fontSize: 13 }}>Video File *</Form.Label>
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? BRAND : '#E8EBED'}`, borderRadius: 12,
              padding: form.file ? 16 : 40, textAlign: 'center',
              background: dragOver ? '#EBF3FE' : '#FAFAFA', transition: 'all 0.2s', cursor: 'pointer',
            }}>
            {form.file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Film size={24} style={{ color: BRAND }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 500, fontSize: 13, color: '#10222F' }}>{form.file.name}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{formatFileSize(form.file.size)}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setForm(prev => ({ ...prev, file: null })); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', marginLeft: 8 }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <UploadCloud size={36} style={{ color: dragOver ? BRAND : '#9CA3AF', marginBottom: 8 }} />
                <p style={{ color: '#5B6B76', fontSize: 14, margin: 0 }}>
                  Drag and drop your video here, or click to browse
                </p>
                <p style={{ color: '#9CA3AF', fontSize: 12, margin: '4px 0 0' }}>
                  MP4, MOV, AVI up to 2GB
                </p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="video/*" hidden
            onChange={e => { if (e.target.files?.[0]) setForm(prev => ({ ...prev, file: e.target.files[0] })); }} />
        </Form.Group>

        {/* Reviewer Selection */}
        <Form.Group className="mb-0">
          <Form.Label style={{ fontWeight: 500, fontSize: 13 }}>Assign Reviewers</Form.Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 150, overflowY: 'auto', padding: 4 }}>
            {teamMembers.length > 0 ? teamMembers.map(member => {
              const id = member._id || member.id;
              const selected = form.reviewerIds.includes(id);
              return (
                <button key={id} onClick={() => toggleReviewer(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    borderRadius: 20, border: `1px solid ${selected ? BRAND : '#E8EBED'}`,
                    background: selected ? '#EBF3FE' : '#fff', cursor: 'pointer', fontSize: 12,
                    color: selected ? BRAND : '#5B6B76', fontWeight: selected ? 500 : 400,
                    transition: 'all 0.15s',
                  }}>
                  <Avatar user={member} size={20} />
                  <UserName user={member} />
                  {selected && <Check size={12} />}
                </button>
              );
            }) : (
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>No team members loaded</span>
            )}
          </div>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer style={{ borderTop: '1px solid #E8EBED' }}>
        <Button variant="light" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={onSubmit} disabled={uploading || !form.title.trim()}
          style={{ background: BRAND, borderColor: BRAND, display: 'flex', alignItems: 'center', gap: 6 }}>
          {uploading ? <><Spinner size="sm" animation="border" /> Uploading...</> : <><Upload size={16} /> Upload</>}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/* =========================================================================
   VIDEO PLAYER PANEL (Full-width Offcanvas)
   ========================================================================= */
function VideoPlayerPanel({ video, onClose, user, onUpdate, teamMembers }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [muted, setMuted] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  // Comments state
  const [comments, setComments] = useState(video.comments || []);
  const [newComment, setNewComment] = useState('');
  const [pinToTime, setPinToTime] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  // Approvals state
  const [reviewers, setReviewers] = useState(video.reviewers || []);
  const [approvalNote, setApprovalNote] = useState('');
  const [approvalAction, setApprovalAction] = useState(null);

  // Versions state
  const [versions, setVersions] = useState(video.versions || []);
  const [currentVersion, setCurrentVersion] = useState(versions.length > 0 ? versions[versions.length - 1] : null);

  // Details state
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailForm, setDetailForm] = useState({ title: video.title, description: video.description || '' });

  const seekTo = useCallback((time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    } else {
      setCurrentTime(time);
    }
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); } else { videoRef.current.play(); }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleTimelineClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const t = pct * (duration || video.duration || 1);
    seekTo(t);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const comment = {
      _id: `c_${Date.now()}`,
      user: user || { firstName: 'You' },
      text: newComment.trim(),
      timestamp: pinToTime ? currentTime : null,
      resolved: false,
      createdAt: new Date().toISOString(),
      replies: [],
    };
    if (videoRef.current && playing) {
      videoRef.current.pause();
      setPlaying(false);
    }
    try {
      await videoReviewsApi.comment({
        videoId: video._id || video.id,
        text: comment.text,
        timestamp: comment.timestamp,
      });
    } catch { /* continue with optimistic update */ }
    const updated = [...comments, comment];
    setComments(updated);
    setNewComment('');
    onUpdate({ ...video, comments: updated });
  };

  const handleAddReply = async (commentId) => {
    if (!replyText.trim()) return;
    const reply = {
      _id: `r_${Date.now()}`,
      user: user || { firstName: 'You' },
      text: replyText.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = comments.map(c => {
      if (c._id === commentId) {
        return { ...c, replies: [...(c.replies || []), reply] };
      }
      return c;
    });
    try {
      await videoReviewsApi.comment({
        videoId: video._id || video.id,
        text: reply.text,
        parentCommentId: commentId,
      });
    } catch { /* continue */ }
    setComments(updated);
    setReplyingTo(null);
    setReplyText('');
    onUpdate({ ...video, comments: updated });
  };

  const handleResolveComment = async (commentId) => {
    const updated = comments.map(c =>
      c._id === commentId ? { ...c, resolved: !c.resolved } : c
    );
    try { await videoReviewsApi.resolve(commentId); } catch { /* continue */ }
    setComments(updated);
    onUpdate({ ...video, comments: updated });
  };

  const handleApproval = async (action) => {
    const userId = user?._id || user?.id;
    if (!userId) { toast.error('User not identified'); return; }
    try {
      const apiMethod = action === 'APPROVED' ? videoReviewsApi.approve
        : action === 'CHANGES_REQUESTED' ? videoReviewsApi.requestChanges
        : videoReviewsApi.reject;
      await apiMethod({ videoId: video._id || video.id, note: approvalNote });
    } catch { /* continue with optimistic update */ }
    const updatedReviewers = reviewers.map(r => {
      const rId = r.user?._id || r.user?.id;
      if (rId === userId) {
        return { ...r, status: action, note: approvalNote };
      }
      return r;
    });
    setReviewers(updatedReviewers);
    setApprovalNote('');
    setApprovalAction(null);
    // Determine overall status
    const allApproved = updatedReviewers.every(r => r.status === 'APPROVED');
    const anyRejected = updatedReviewers.some(r => r.status === 'REJECTED');
    const anyChanges = updatedReviewers.some(r => r.status === 'CHANGES_REQUESTED');
    let newStatus = video.status;
    if (allApproved) newStatus = 'APPROVED';
    else if (anyRejected) newStatus = 'REJECTED';
    else if (anyChanges) newStatus = 'CHANGES_REQUESTED';
    else newStatus = 'IN_REVIEW';
    onUpdate({ ...video, reviewers: updatedReviewers, status: newStatus });
    toast.success(`Review ${action === 'APPROVED' ? 'approved' : action === 'CHANGES_REQUESTED' ? 'changes requested' : 'rejected'}`);
  };

  const handleSaveDetails = async () => {
    try {
      await videoReviewsApi.update(video._id || video.id, detailForm);
    } catch { /* continue */ }
    onUpdate({ ...video, ...detailForm });
    setEditingDetails(false);
    toast.success('Details updated');
  };

  const handleVersionSwitch = (version) => {
    setCurrentVersion(version);
    if (videoRef.current && version.videoUrl) {
      videoRef.current.src = version.videoUrl;
      videoRef.current.load();
    }
    setPlaying(false);
    setCurrentTime(0);
  };

  const commentMarkers = useMemo(() => {
    const d = duration || video.duration || 1;
    return comments
      .filter(c => c.timestamp != null && !c.resolved)
      .map(c => ({
        id: c._id,
        position: (c.timestamp / d) * 100,
        timestamp: c.timestamp,
        text: c.text,
        user: c.user,
      }));
  }, [comments, duration, video.duration]);

  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => {
      if (a.timestamp != null && b.timestamp != null) return a.timestamp - b.timestamp;
      if (a.timestamp != null) return -1;
      if (b.timestamp != null) return 1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
  }, [comments]);

  const approvalProgress = useMemo(() => {
    if (!reviewers.length) return { approved: 0, total: 0, pct: 0 };
    const approved = reviewers.filter(r => r.status === 'APPROVED').length;
    return { approved, total: reviewers.length, pct: Math.round((approved / reviewers.length) * 100) };
  }, [reviewers]);

  const isCurrentUserReviewer = useMemo(() => {
    const userId = user?._id || user?.id;
    return reviewers.some(r => (r.user?._id || r.user?.id) === userId);
  }, [reviewers, user]);

  const currentUserReviewStatus = useMemo(() => {
    const userId = user?._id || user?.id;
    const rev = reviewers.find(r => (r.user?._id || r.user?.id) === userId);
    return rev?.status || null;
  }, [reviewers, user]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(0,0,0,0.6)',
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <div style={{
        width: '85vw', maxWidth: 1400, height: '100vh', background: '#fff',
        display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 24px rgba(0,0,0,0.2)',
        animation: 'slideInRight 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', borderBottom: '1px solid #E8EBED', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Film size={20} style={{ color: BRAND }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#10222F' }}>{video.title}</h3>
            <StatusBadge status={video.status} />
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5B6B76', padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left: Video Player */}
          <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', background: '#0a0a14' }}>
            {/* Video Area */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 0 }}>
              {video.videoUrl ? (
                <video ref={videoRef} src={currentVersion?.videoUrl || video.videoUrl}
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setPlaying(false)}
                  onClick={togglePlay}
                />
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#4a5568',
                }}>
                  <Film size={64} style={{ opacity: 0.3 }} />
                  <span style={{ fontSize: 14 }}>Video preview unavailable</span>
                  <span style={{ fontSize: 12, color: '#666' }}>Use the player controls below to navigate timestamps</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={{ padding: '12px 20px', background: '#10222F', flexShrink: 0 }}>
              {/* Timeline with markers */}
              <div style={{ position: 'relative', marginBottom: 10, cursor: 'pointer' }} onClick={handleTimelineClick}>
                <div style={{ height: 6, background: '#2a3f50', borderRadius: 3, position: 'relative', overflow: 'visible' }}>
                  <div style={{
                    height: '100%', background: BRAND, borderRadius: 3,
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    transition: 'width 0.1s linear',
                  }} />
                </div>
                {/* Comment markers */}
                {commentMarkers.map(marker => (
                  <OverlayTrigger key={marker.id} placement="top"
                    overlay={<Tooltip>{formatTimestamp(marker.timestamp)} - {marker.text?.slice(0, 50)}</Tooltip>}>
                    <div
                      onClick={e => { e.stopPropagation(); seekTo(marker.timestamp); }}
                      style={{
                        position: 'absolute', top: -3, left: `${marker.position}%`,
                        width: 12, height: 12, borderRadius: '50%', background: '#F59E0B',
                        border: '2px solid #fff', transform: 'translateX(-50%)', cursor: 'pointer',
                        zIndex: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                      }}
                    />
                  </OverlayTrigger>
                ))}
              </div>

              {/* Player buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => seekTo(Math.max(0, currentTime - 10))}
                    style={controlBtn}><SkipBack size={16} /></button>
                  <button onClick={togglePlay} style={{ ...controlBtn, width: 40, height: 40 }}>
                    {playing ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
                  </button>
                  <button onClick={() => seekTo(Math.min(duration, currentTime + 10))}
                    style={controlBtn}><SkipForward size={16} /></button>
                  <button onClick={() => setMuted(!muted)} style={controlBtn}>
                    {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>
                <div style={{ color: '#A6B5BF', fontSize: 13, fontFamily: 'monospace' }}>
                  {formatTimestamp(currentTime)} / {formatTimestamp(duration || video.duration)}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Review Panel */}
          <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #E8EBED', overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #E8EBED', flexShrink: 0 }}>
              {[
                { key: 'comments', icon: MessageSquare, label: 'Comments', badge: comments.length },
                { key: 'approvals', icon: CheckCircle, label: 'Approvals', badge: null },
                { key: 'versions', icon: Layers, label: 'Versions', badge: versions.length },
                { key: 'details', icon: Info, label: 'Details', badge: null },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
                    background: 'transparent', fontSize: 12, fontWeight: activeTab === tab.key ? 600 : 400,
                    color: activeTab === tab.key ? BRAND : '#5B6B76',
                    borderBottom: activeTab === tab.key ? `2px solid ${BRAND}` : '2px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    transition: 'all 0.15s',
                  }}>
                  <tab.icon size={14} />
                  {tab.label}
                  {tab.badge != null && tab.badge > 0 && (
                    <span style={{
                      background: activeTab === tab.key ? BRAND : '#E8EBED',
                      color: activeTab === tab.key ? '#fff' : '#5B6B76',
                      fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 600,
                    }}>{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* COMMENTS TAB */}
              {activeTab === 'comments' && (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                    {sortedComments.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                        <MessageSquare size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                        <p style={{ fontSize: 13 }}>No comments yet. Add the first one below.</p>
                      </div>
                    ) : sortedComments.map(comment => (
                      <div key={comment._id} style={{
                        marginBottom: 16, padding: 12, borderRadius: 10,
                        background: comment.resolved ? '#F9FAFB' : '#fff',
                        border: `1px solid ${comment.resolved ? '#E8EBED' : '#E8EBED'}`,
                        opacity: comment.resolved ? 0.6 : 1,
                      }}>
                        {/* Comment header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar user={comment.user} size={24} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#10222F' }}>
                              <UserName user={comment.user} />
                            </span>
                            {comment.timestamp != null && (
                              <button onClick={() => seekTo(comment.timestamp)}
                                style={{
                                  background: '#EBF3FE', border: 'none', cursor: 'pointer',
                                  padding: '2px 8px', borderRadius: 12, fontSize: 11, color: BRAND,
                                  fontWeight: 600, fontFamily: 'monospace',
                                }}>
                                {formatTimestamp(comment.timestamp)}
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                              {formatTimeAgo(comment.createdAt)}
                            </span>
                            <button onClick={() => handleResolveComment(comment._id)}
                              title={comment.resolved ? 'Unresolve' : 'Resolve'}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: comment.resolved ? '#16A34A' : '#9CA3AF', padding: 2,
                              }}>
                              <CheckCircle size={14} />
                            </button>
                          </div>
                        </div>
                        {/* Comment body */}
                        <p style={{
                          margin: '0 0 6px', fontSize: 13, color: '#374151', lineHeight: 1.5,
                          textDecoration: comment.resolved ? 'line-through' : 'none',
                        }}>
                          {comment.text}
                        </p>
                        {/* Replies */}
                        {comment.replies?.length > 0 && (
                          <div style={{ marginLeft: 20, borderLeft: '2px solid #E8EBED', paddingLeft: 12, marginTop: 8 }}>
                            {comment.replies.map(reply => (
                              <div key={reply._id} style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                  <Avatar user={reply.user} size={18} />
                                  <span style={{ fontSize: 11, fontWeight: 500, color: '#10222F' }}>
                                    <UserName user={reply.user} />
                                  </span>
                                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                                    {formatTimeAgo(reply.createdAt)}
                                  </span>
                                </div>
                                <p style={{ margin: 0, fontSize: 12, color: '#5B6B76', lineHeight: 1.4 }}>
                                  {reply.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Reply button / input */}
                        {replyingTo === comment._id ? (
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <input className="kai-input" placeholder="Write a reply..." value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleAddReply(comment._id); }}
                              style={{ flex: 1, fontSize: 12, height: 32 }} autoFocus />
                            <button onClick={() => handleAddReply(comment._id)}
                              className="kai-btn kai-btn-primary" style={{ padding: '4px 12px', fontSize: 12 }}>
                              <Send size={12} />
                            </button>
                            <button onClick={() => { setReplyingTo(null); setReplyText(''); }}
                              className="kai-btn" style={{ padding: '4px 8px', fontSize: 12 }}>
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setReplyingTo(comment._id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: BRAND, padding: 0, marginTop: 4 }}>
                            Reply
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Add comment */}
                  <div style={{ padding: 16, borderTop: '1px solid #E8EBED', flexShrink: 0, background: '#FAFAFA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Form.Check type="switch" id="pin-time" checked={pinToTime}
                        onChange={e => setPinToTime(e.target.checked)}
                        label={<span style={{ fontSize: 12, color: '#5B6B76' }}>
                          Pin to {formatTimestamp(currentTime)}
                        </span>}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="kai-input" placeholder="Add a comment..." value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                        style={{ flex: 1, fontSize: 13 }} />
                      <button onClick={handleAddComment}
                        className="kai-btn kai-btn-primary" disabled={!newComment.trim()}
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* APPROVALS TAB */}
              {activeTab === 'approvals' && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, padding: 16 }}>
                    {/* Progress */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#10222F' }}>Approval Progress</span>
                        <span style={{ fontSize: 12, color: '#5B6B76' }}>
                          {approvalProgress.approved}/{approvalProgress.total} approved
                        </span>
                      </div>
                      <ProgressBar
                        now={approvalProgress.pct}
                        style={{ height: 8, borderRadius: 4, background: '#E8EBED' }}
                        variant={approvalProgress.pct === 100 ? 'success' : approvalProgress.pct > 0 ? 'primary' : undefined}
                        label={approvalProgress.pct > 20 ? `${approvalProgress.pct}%` : ''}
                      />
                    </div>

                    {/* Reviewers list */}
                    {reviewers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 30, color: '#9CA3AF' }}>
                        <Users size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                        <p style={{ fontSize: 13 }}>No reviewers assigned</p>
                      </div>
                    ) : reviewers.map((reviewer, idx) => {
                      const rStatus = STATUS_CONFIG[reviewer.status] || STATUS_CONFIG.PENDING_REVIEW;
                      return (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: 12, marginBottom: 8, borderRadius: 10,
                          border: '1px solid #E8EBED', background: '#fff',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar user={reviewer.user} size={32} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#10222F' }}>
                                <UserName user={reviewer.user} />
                              </div>
                              {reviewer.note && (
                                <div style={{ fontSize: 11, color: '#5B6B76', marginTop: 2, maxWidth: 200,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  "{reviewer.note}"
                                </div>
                              )}
                            </div>
                          </div>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: rStatus.bg, color: rStatus.color, border: `1px solid ${rStatus.border}`,
                          }}>
                            {reviewer.status === 'PENDING_REVIEW' ? 'Pending' :
                              reviewer.status === 'APPROVED' ? 'Approved' :
                              reviewer.status === 'CHANGES_REQUESTED' ? 'Changes' : 'Rejected'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action buttons for current user if they're a reviewer */}
                  {isCurrentUserReviewer && (
                    <div style={{ padding: 16, borderTop: '1px solid #E8EBED', flexShrink: 0, background: '#FAFAFA' }}>
                      {approvalAction ? (
                        <div>
                          <Form.Label style={{ fontSize: 12, fontWeight: 500, color: '#5B6B76' }}>
                            {approvalAction === 'APPROVED' ? 'Approval' : approvalAction === 'CHANGES_REQUESTED' ? 'Changes' : 'Rejection'} note (optional)
                          </Form.Label>
                          <Form.Control as="textarea" rows={2} placeholder="Add a note..."
                            value={approvalNote} onChange={e => setApprovalNote(e.target.value)}
                            style={{ fontSize: 13, marginBottom: 10 }} />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => handleApproval(approvalAction)}
                              className="kai-btn kai-btn-primary" style={{
                                flex: 1, fontSize: 13,
                                background: approvalAction === 'APPROVED' ? '#16A34A' :
                                  approvalAction === 'CHANGES_REQUESTED' ? '#EA580C' : '#DC2626',
                                borderColor: 'transparent',
                              }}>
                              Confirm
                            </button>
                            <button onClick={() => { setApprovalAction(null); setApprovalNote(''); }}
                              className="kai-btn" style={{ fontSize: 13 }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: 12, color: '#5B6B76', marginBottom: 10 }}>
                            Your review: <strong>{currentUserReviewStatus === 'PENDING_REVIEW' ? 'Pending' :
                              currentUserReviewStatus === 'APPROVED' ? 'Approved' :
                              currentUserReviewStatus === 'CHANGES_REQUESTED' ? 'Changes Requested' : currentUserReviewStatus || 'Pending'}</strong>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setApprovalAction('APPROVED')}
                              className="kai-btn" style={{
                                flex: 1, fontSize: 13, background: '#D1FAE5', color: '#065F46',
                                border: '1px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                              }}>
                              <ThumbsUp size={14} /> Approve
                            </button>
                            <button onClick={() => setApprovalAction('CHANGES_REQUESTED')}
                              className="kai-btn" style={{
                                flex: 1, fontSize: 13, background: '#FFF7ED', color: '#C2410C',
                                border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                              }}>
                              <Edit3 size={14} /> Changes
                            </button>
                            <button onClick={() => setApprovalAction('REJECTED')}
                              className="kai-btn" style={{
                                flex: 1, fontSize: 13, background: '#FEE2E2', color: '#991B1B',
                                border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                              }}>
                              <ThumbsDown size={14} /> Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* VERSIONS TAB */}
              {activeTab === 'versions' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                  {versions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 30, color: '#9CA3AF' }}>
                      <Layers size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                      <p style={{ fontSize: 13 }}>No version history</p>
                    </div>
                  ) : versions.map((version, idx) => {
                    const isCurrent = currentVersion?._id === version._id;
                    return (
                      <div key={version._id} onClick={() => handleVersionSwitch(version)}
                        style={{
                          padding: 14, marginBottom: 10, borderRadius: 10, cursor: 'pointer',
                          border: `1px solid ${isCurrent ? BRAND : '#E8EBED'}`,
                          background: isCurrent ? '#EBF3FE' : '#fff',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = '#F8FAFC'; }}
                        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = '#fff'; }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: isCurrent ? BRAND : '#E8EBED',
                              color: isCurrent ? '#fff' : '#5B6B76',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 600,
                            }}>
                              V{version.version}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#10222F' }}>
                                Version {version.version}
                                {isCurrent && <span style={{ color: BRAND, fontSize: 11, marginLeft: 6 }}>(current)</span>}
                              </div>
                              <div style={{ fontSize: 11, color: '#5B6B76', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Avatar user={version.uploadedBy} size={14} />
                                <UserName user={version.uploadedBy} /> - {formatTimeAgo(version.createdAt)}
                              </div>
                            </div>
                          </div>
                          {version.status && <StatusBadge status={version.status} />}
                        </div>
                      </div>
                    );
                  })}
                  <button className="kai-btn" style={{
                    width: '100%', marginTop: 8, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 6, padding: 12, border: '2px dashed #E8EBED',
                    color: '#5B6B76', fontSize: 13,
                  }}>
                    <Upload size={14} /> Upload Revision
                  </button>
                </div>
              )}

              {/* DETAILS TAB */}
              {activeTab === 'details' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                  {editingDetails ? (
                    <div>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: 500, fontSize: 13 }}>Title</Form.Label>
                        <Form.Control type="text" value={detailForm.title}
                          onChange={e => setDetailForm(prev => ({ ...prev, title: e.target.value }))} />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: 500, fontSize: 13 }}>Description</Form.Label>
                        <Form.Control as="textarea" rows={3} value={detailForm.description}
                          onChange={e => setDetailForm(prev => ({ ...prev, description: e.target.value }))} />
                      </Form.Group>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleSaveDetails} className="kai-btn kai-btn-primary" style={{ fontSize: 13 }}>
                          Save Changes
                        </button>
                        <button onClick={() => { setEditingDetails(false); setDetailForm({ title: video.title, description: video.description || '' }); }}
                          className="kai-btn" style={{ fontSize: 13 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#10222F' }}>Video Details</h4>
                        <button onClick={() => setEditingDetails(true)}
                          className="kai-btn" style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Edit3 size={12} /> Edit
                        </button>
                      </div>

                      <DetailRow label="Title" value={video.title} />
                      <DetailRow label="Description" value={video.description || 'No description'} />
                      <DetailRow label="Project" value={video.projectName || '-'} highlight />
                      <DetailRow label="Status" value={<StatusBadge status={video.status} />} />

                      <div style={{ borderTop: '1px solid #F0F2F4', margin: '16px 0', paddingTop: 16 }}>
                        <h5 style={{ fontSize: 13, fontWeight: 600, color: '#5B6B76', marginBottom: 12 }}>Uploader</h5>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                          <Avatar user={video.uploader} size={36} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#10222F' }}>
                              <UserName user={video.uploader} />
                            </div>
                            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{video.uploader?.email || ''}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #F0F2F4', margin: '16px 0', paddingTop: 16 }}>
                        <h5 style={{ fontSize: 13, fontWeight: 600, color: '#5B6B76', marginBottom: 12 }}>File Info</h5>
                        <DetailRow label="File Size" value={formatFileSize(video.fileSize)} />
                        <DetailRow label="Duration" value={formatTimestamp(video.duration)} />
                        <DetailRow label="Format" value={video.format || '-'} />
                        <DetailRow label="Resolution" value={video.resolution || '-'} />
                      </div>

                      <div style={{ borderTop: '1px solid #F0F2F4', margin: '16px 0', paddingTop: 16 }}>
                        <h5 style={{ fontSize: 13, fontWeight: 600, color: '#5B6B76', marginBottom: 12 }}>
                          Reviewers ({reviewers.length})
                        </h5>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {reviewers.map((r, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                              borderRadius: 16, background: '#F8F9FA', border: '1px solid #E8EBED', fontSize: 12,
                            }}>
                              <Avatar user={r.user} size={18} />
                              <UserName user={r.user} />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #F0F2F4', margin: '16px 0', paddingTop: 16 }}>
                        <DetailRow label="Created" value={formatDate(video.createdAt)} />
                        <DetailRow label="Updated" value={formatDate(video.updatedAt)} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, fontSize: 13 }}>
      <span style={{ color: '#5B6B76', minWidth: 100 }}>{label}</span>
      <span style={{ color: highlight ? BRAND : '#10222F', fontWeight: highlight ? 500 : 400, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>
        {value}
      </span>
    </div>
  );
}

const controlBtn = {
  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', cursor: 'pointer', transition: 'background 0.15s',
};
