import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { emailApi } from '../services/api';

// Tailwind migration: kai-* classes replaced with Tailwind equivalents
// All inline styles preserved for complex email UI layouts

const FOLDERS = [
  { key: 'inbox', label: 'Inbox', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg> },
  { key: 'sent', label: 'Sent', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
  { key: 'drafts', label: 'Drafts', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
  { key: 'trash', label: 'Trash', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> },
];

function formatEmailDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function EmailClient() {
  const dispatch = useDispatch();

  const [activeFolder, setActiveFolder] = useState('inbox');
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showCompose, setShowCompose] = useState(false);
  const [folderCounts, setFolderCounts] = useState({ inbox: 0, sent: 0, drafts: 0, trash: 0 });
  const [compose, setCompose] = useState({ to: '', cc: '', bcc: '', subject: '', body: '', attachments: [] });
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Email' });
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [activeFolder, search]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const res = await emailApi.list({ folder: activeFolder, search: search || undefined });
      
      const data = Array.isArray(res.data) ? res.data : [];
      setEmails(Array.isArray(data) ? data : []);

      // Update folder counts
      if (res.data?.counts) {
        setFolderCounts(res.data.counts);
      } else {
        try {
          const dashRes = await emailApi.getDashboard();
          const dd = dashRes.data;
          if (dd?.data?.counts) setFolderCounts(dd.data.counts);
          else if (dd?.counts) setFolderCounts(dd.counts);
        } catch { /* silent */ }
      }
    } catch (err) {
      toast.error('Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmail = (email) => {
    setSelectedEmail(email);
    // Mark as read if unread
    if (!email.read && email._id) {
      emailApi.list({ markRead: email._id || email.id }).catch(() => {});
      setEmails(prev => prev.map(e => (e._id || e.id) === (email._id || email.id) ? { ...e, read: true } : e));
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!compose.to.trim()) {
      toast.warning('Recipient is required');
      return;
    }
    if (!compose.subject.trim()) {
      toast.warning('Subject is required');
      return;
    }
    try {
      setSending(true);
      await emailApi.send({
        to: compose.to,
        cc: compose.cc || undefined,
        bcc: compose.bcc || undefined,
        subject: compose.subject,
        body: compose.body,
      });
      toast.success('Email sent successfully');
      setShowCompose(false);
      setCompose({ to: '', cc: '', bcc: '', subject: '', body: '', attachments: [] });
      if (activeFolder === 'sent') fetchEmails();
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) {
      toast.info('Select emails first');
      return;
    }
    try {
      for (const id of selectedIds) {
        if (action === 'read') {
          await emailApi.list({ markRead: id });
        } else if (action === 'delete') {
          await emailApi.list({ moveToTrash: id });
        } else if (action === 'archive') {
          await emailApi.list({ archive: id });
        }
      }
      toast.success(`${selectedIds.length} email(s) updated`);
      setSelectedIds([]);
      fetchEmails();
    } catch {
      toast.error('Bulk action failed');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === emails.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(emails.map(e => e._id || e.id));
    }
  };

  const handleReply = () => {
    if (!selectedEmail) return;
    setCompose({
      to: selectedEmail.from || selectedEmail.sender || '',
      cc: '',
      bcc: '',
      subject: `Re: ${selectedEmail.subject || ''}`,
      body: `\n\n--- Original Message ---\nFrom: ${selectedEmail.from || selectedEmail.sender || ''}\nDate: ${formatFullDate(selectedEmail.date || selectedEmail.createdAt)}\n\n${selectedEmail.body || selectedEmail.text || ''}`,
      attachments: [],
    });
    setShowCompose(true);
  };

  const handleForward = () => {
    if (!selectedEmail) return;
    setCompose({
      to: '',
      cc: '',
      bcc: '',
      subject: `Fwd: ${selectedEmail.subject || ''}`,
      body: `\n\n--- Forwarded Message ---\nFrom: ${selectedEmail.from || selectedEmail.sender || ''}\nDate: ${formatFullDate(selectedEmail.date || selectedEmail.createdAt)}\nSubject: ${selectedEmail.subject || ''}\n\n${selectedEmail.body || selectedEmail.text || ''}`,
      attachments: [],
    });
    setShowCompose(true);
  };

  const filteredEmails = emails;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight font-[Manrope]">Email</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Manage your emails and communications</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="compose-email" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors" onClick={() => { setCompose({ to: '', cc: '', bcc: '', subject: '', body: '', attachments: [] }); setShowCompose(true); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Compose
          </button>
        </div>
      </div>

      <div className="email-layout" style={{ display: 'flex', height: 'calc(100vh - 180px)', border: '1px solid var(--border-default)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-card)' }}>
        {/* Folder List */}
        <div className="email-sidebar" style={{ width: 200, borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', flexShrink: 0, padding: '12px 8px' }}>
          {FOLDERS.map(folder => {
            const count = folderCounts[folder.key] || 0;
            const isActive = activeFolder === folder.key;
            return (
              <div
                key={folder.key}
                onClick={() => { setActiveFolder(folder.key); setSelectedEmail(null); setSelectedIds([]); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
                  color: isActive ? '#7C3AED' : 'var(--text-primary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 13.5,
                  transition: 'all 0.15s ease',
                  marginBottom: 2,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(124, 58, 237, 0.1)' : 'transparent'; }}
              >
                {folder.icon}
                <span style={{ flex: 1 }}>{folder.label}</span>
                {count > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, background: isActive ? '#7C3AED' : 'var(--bg-primary)',
                    color: isActive ? '#fff' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '999px',
                  }}>
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Email List */}
        <div style={{ width: 350, borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Search + Bulk Actions */}
          <div style={{ padding: 12, borderBottom: '1px solid var(--border-default)' }}>
            <div className="relative" style={{ marginBottom: 8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Search emails..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === emails.length}
                  onChange={toggleSelectAll}
                  style={{ accentColor: '#7C3AED' }}
                />
                All
              </label>
              {selectedIds.length > 0 && (
                <>
                  <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => handleBulkAction('read')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Mark Read
                  </button>
                  <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => handleBulkAction('delete')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Email Items */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading emails...</div>
            ) : filteredEmails.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-default)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <div>No emails in this folder</div>
              </div>
            ) : (
              filteredEmails.map(email => {
                const eid = email._id || email.id;
                const isSelected = selectedIds.includes(eid);
                const isActive = selectedEmail && (selectedEmail._id || selectedEmail.id) === eid;
                const isUnread = !email.read;
                return (
                  <div
                    key={eid}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-default)',
                      background: isActive ? 'rgba(124, 58, 237, 0.1)' : isUnread ? 'rgba(17,24,39,0.02)' : 'transparent',
                      borderLeft: isActive ? '3px solid #7C3AED' : '3px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => handleSelectEmail(email)}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(124, 58, 237, 0.1)' : isUnread ? 'rgba(17,24,39,0.02)' : 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => { e.stopPropagation(); toggleSelect(eid); }}
                      onClick={e => e.stopPropagation()}
                      style={{ accentColor: '#7C3AED', marginTop: 2 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span style={{ fontWeight: isUnread ? 700 : 500, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {activeFolder === 'sent' ? (email.to || email.recipient || '') : (email.from || email.sender || '')}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                          {formatEmailDate(email.date || email.createdAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: isUnread ? 600 : 400, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                        {email.subject || '(No Subject)'}
                      </div>
                      <div className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {email.preview || email.snippet || (email.body || email.text || '').slice(0, 100)}
                      </div>
                    </div>
                    {isUnread && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED', flexShrink: 0, marginTop: 6 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Email Preview */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {selectedEmail ? (
            <>
              {/* Preview Header */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{selectedEmail.subject || '(No Subject)'}</h2>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors" onClick={handleReply}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                      Reply
                    </button>
                    <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors" onClick={handleForward}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>
                      Forward
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[12px]" style={{ background: '#111827' }}>
                    {(selectedEmail.from || selectedEmail.sender || '?')[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedEmail.from || selectedEmail.sender}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      To: {selectedEmail.to || selectedEmail.recipient || 'me'}
                      {selectedEmail.cc && <span> | CC: {selectedEmail.cc}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatFullDate(selectedEmail.date || selectedEmail.createdAt)}
                  </div>
                </div>
              </div>

              {/* Email Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                <div
                  style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body || selectedEmail.html || selectedEmail.text || '' }}
                />

                {/* Attachments */}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', marginBottom: 10 }}>
                      Attachments ({selectedEmail.attachments.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedEmail.attachments.map((att, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                          border: '1px solid var(--border-default)', borderRadius: '8px', fontSize: 13,
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                          <span>{typeof att === 'string' ? att : att.name || att.filename || `File ${i + 1}`}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {att.size ? `(${(att.size / 1024).toFixed(1)} KB)` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border-default)" strokeWidth="1.5">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Select an email</div>
              <div style={{ fontSize: 13 }}>Choose an email from the list to read it</div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowCompose(false)} />
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl" style={{ position: 'relative', width: 640, maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', zIndex: 1 }}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <h5>Compose Email</h5>
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowCompose(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', width: 50 }}>To</label>
                  <input
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]"
                    placeholder="recipient@example.com"
                    value={compose.to}
                    onChange={e => setCompose(p => ({ ...p, to: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                  {!showCcBcc && (
                    <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowCcBcc(true)}>CC/BCC</button>
                  )}
                </div>
                {showCcBcc && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', width: 50 }}>CC</label>
                      <input
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]"
                        placeholder="cc@example.com"
                        value={compose.cc}
                        onChange={e => setCompose(p => ({ ...p, cc: e.target.value }))}
                        style={{ flex: 1 }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', width: 50 }}>BCC</label>
                      <input
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]"
                        placeholder="bcc@example.com"
                        value={compose.bcc}
                        onChange={e => setCompose(p => ({ ...p, bcc: e.target.value }))}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', width: 50 }}>Subject</label>
                  <input
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]"
                    placeholder="Email subject"
                    value={compose.subject}
                    onChange={e => setCompose(p => ({ ...p, subject: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              {/* Rich Text Toolbar */}
              <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', gap: 4 }}>
                {[
                  { cmd: 'bold', icon: 'B', style: { fontWeight: 700 } },
                  { cmd: 'italic', icon: 'I', style: { fontStyle: 'italic' } },
                  { cmd: 'underline', icon: 'U', style: { textDecoration: 'underline' } },
                  { cmd: 'strikeThrough', icon: 'S', style: { textDecoration: 'line-through' } },
                ].map(btn => (
                  <button
                    key={btn.cmd}
                    type="button"
                    className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors"
                    style={{ ...btn.style, minWidth: 32, padding: '4px 8px' }}
                    onClick={() => document.execCommand(btn.cmd)}
                  >
                    {btn.icon}
                  </button>
                ))}
                <div style={{ width: 1, background: 'var(--border-default)', margin: '0 4px' }} />
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => document.execCommand('insertUnorderedList')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => document.execCommand('insertOrderedList')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
                </button>
              </div>

              {/* Body */}
              <div
                contentEditable
                suppressContentEditableWarning
                onInput={e => setCompose(p => ({ ...p, body: e.currentTarget.innerHTML }))}
                dangerouslySetInnerHTML={{ __html: compose.body }}
                style={{
                  flex: 1,
                  padding: 20,
                  minHeight: 200,
                  maxHeight: 400,
                  overflowY: 'auto',
                  outline: 'none',
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}
              />

              <div className="p-4 border-t border-[var(--border-subtle)]" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-2 py-1 text-[13px] hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => fileRef.current?.click()}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    Attach
                  </button>
                  <input type="file" ref={fileRef} multiple style={{ display: 'none' }} onChange={e => {
                    const files = Array.from(e.target.files || []);
                    setCompose(p => ({ ...p, attachments: [...p.attachments, ...files] }));
                  }} />
                  {compose.attachments.length > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                      {compose.attachments.length} file(s)
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors" onClick={() => setShowCompose(false)}>Discard</button>
                  <button type="submit" data-testid="compose-email" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors" disabled={sending}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
