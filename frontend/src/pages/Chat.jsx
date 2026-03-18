import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { chatApi, filesApi } from '../services/api';
import VerifiedBadge from '../components/ui/VerifiedBadge';

const ROOM_ICONS = {
  dm: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  group: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  project: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  department: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
};

const AVATAR_COLORS = ['#146DF7', '#8B3FE9', '#16A34A', '#EA580C', '#CB3939', '#2563EB', '#D946EF', '#0891B2'];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Render @mentions as clickable tags
function renderMessageText(text) {
  if (!text) return '';
  // Match @Name patterns
  const parts = text.split(/(@\w[\w\s]*?)(?=\s|$|@)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <span key={i} style={{ background: 'rgba(20,109,247,0.15)', color: '#146DF7', padding: '1px 4px', borderRadius: 4, fontWeight: 600, fontSize: 13 }}>{part}</span>;
    }
    return part;
  });
}

export default function Chat() {
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.auth.user);
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [users, setUsers] = useState([]);
  const [newRoom, setNewRoom] = useState({ type: 'group', name: '', members: [] });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [mobileShowMessages, setMobileShowMessages] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Chat' });
    fetchRooms();
    fetchUsers();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Poll for new messages every 5s
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (selectedRoom) {
      pollRef.current = setInterval(() => {
        loadMessages(selectedRoom._id || selectedRoom.id, 1, true);
      }, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedRoom]);

  // Auto-select room from URL param ?room=<id>
  useEffect(() => {
    const roomId = searchParams.get('room');
    if (roomId && rooms.length > 0 && !selectedRoom) {
      const found = rooms.find(r => (r._id || r.id) === roomId);
      if (found) {
        setSelectedRoom(found);
        setMobileShowMessages(true);
      }
    }
  }, [rooms, searchParams]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await chatApi.getRooms();
      setRooms(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load chat rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await chatApi.getUsers();
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch { /* silent */ }
  };

  const loadMessages = async (roomId, pg = 1, silent = false) => {
    try {
      if (!silent) setMessagesLoading(true);
      const res = await chatApi.getMessages(roomId, pg);
      const msgs = Array.isArray(res.data) ? res.data : [];
      if (pg === 1) {
        setMessages(msgs);
      } else {
        setMessages(prev => [...msgs, ...prev]);
      }
      setHasMore(msgs.length >= 50);
    } catch (err) {
      if (!silent) toast.error('Failed to load messages');
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setPage(1);
    setMessages([]);
    setMobileShowMessages(true);
    loadMessages(room._id || room.id, 1);
  };

  const [attachedFile, setAttachedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileAttach = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) { toast.error('File too large (max 50MB)'); return; }
    setAttachedFile(file);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageText.trim() && !attachedFile) || !selectedRoom) return;
    const roomId = selectedRoom._id || selectedRoom.id;
    const text = messageText.trim();
    setMessageText('');

    // If file attached, upload first then send as file message
    if (attachedFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', attachedFile);
        const uploadRes = await filesApi.upload(formData);
        // Interceptor unwraps {success,data} → uploadRes.data is the file object
        const fileData = uploadRes.data;
        const fileUrl = fileData?.url || (fileData?.filePath ? `/api/files/serve/${fileData.filePath.split('/').pop()}` : null);
        const fileName = fileData?.name || attachedFile.name;
        const fileType = attachedFile.type;

        if (!fileUrl) {
          toast.error('File uploaded but URL not returned');
          setUploading(false);
          return;
        }

        await chatApi.sendMessage({
          roomId,
          content: text || `📎 ${fileName}`,
          type: 'file',
          fileName,
          fileType,
          fileUrl,
          fileSize: attachedFile.size,
        });
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadMessages(roomId, 1, true);
      } catch (err) {
        toast.error('Failed to upload file');
      } finally {
        setUploading(false);
      }
      return;
    }

    // Text-only message
    const optimisticMsg = {
      _id: 'temp-' + Date.now(),
      content: text,
      sender: currentUser || { name: 'Me' },
      senderId: currentUser?._id || currentUser?.id || 'me',
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await chatApi.sendMessage({ roomId, content: text });
      loadMessages(roomId, 1, true);
    } catch {
      toast.error('Failed to send message');
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoom.name.trim() && newRoom.type !== 'dm') {
      toast.warning('Room name is required');
      return;
    }
    try {
      await chatApi.createRoom({
        type: newRoom.type,
        name: newRoom.name,
        members: newRoom.members,
      });
      toast.success('Room created');
      setShowCreateRoom(false);
      setNewRoom({ type: 'group', name: '', members: [] });
      fetchRooms();
    } catch {
      toast.error('Failed to create room');
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(selectedRoom._id || selectedRoom.id, nextPage);
  };

  const toggleMember = (userId) => {
    setNewRoom(prev => ({
      ...prev,
      members: prev.members.includes(userId)
        ? prev.members.filter(id => id !== userId)
        : [...prev.members, userId],
    }));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredRooms = rooms.filter(r =>
    (r.name || '').toLowerCase().includes(roomSearch.toLowerCase())
  );

  const currentUserId = currentUser?._id || currentUser?.id || 'me';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Chat</h1>
          <p>Team conversations and direct messages</p>
        </div>
        <div className="page-actions">
          <button className="kai-btn kai-btn-primary" onClick={() => setShowCreateRoom(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Room
          </button>
        </div>
      </div>

      <div className="chat-layout" style={{ display: 'flex', height: 'calc(100vh - 180px)', border: '1px solid var(--kai-border)', borderRadius: 'var(--kai-radius-lg)', overflow: 'hidden', background: 'var(--kai-surface)' }}>
        {/* Room List Panel */}
        <div className="chat-sidebar" style={{ width: 280, borderRight: '1px solid var(--kai-border)', display: 'flex', flexDirection: 'column', flexShrink: 0, ...(mobileShowMessages ? {} : {}) }}>
          <div style={{ padding: 12 }}>
            <div className="kai-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                placeholder="Search conversations..."
                value={roomSearch}
                onChange={e => setRoomSearch(e.target.value)}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--kai-text-muted)' }}>Loading rooms...</div>
            ) : filteredRooms.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--kai-text-muted)' }}>No conversations found</div>
            ) : (
              filteredRooms.map(room => {
                const roomId = room._id || room.id;
                const isActive = selectedRoom && (selectedRoom._id || selectedRoom.id) === roomId;
                return (
                  <div
                    key={roomId}
                    onClick={() => handleSelectRoom(room)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(20, 109, 247, 0.08)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--kai-primary)' : '3px solid transparent',
                      transition: 'var(--kai-transition)',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--kai-surface-hover)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div
                      className="kai-avatar"
                      style={{ background: getAvatarColor(room.name), width: 40, height: 40 }}
                    >
                      {room.avatar ? <img src={room.avatar} alt="" /> : getInitials(room.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--kai-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {room.name || 'Unnamed'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--kai-text-muted)', flexShrink: 0 }}>
                          {formatTime(room.lastMessage?.createdAt || room.lastMessageAt || room.updatedAt)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <span className="truncate" style={{ fontSize: 12, color: 'var(--kai-text-muted)', flex: 1 }}>
                          {typeof room.lastMessage === 'object' ? room.lastMessage?.content?.slice(0, 50) : room.lastMessage || 'No messages yet'}
                        </span>
                        {room.unreadCount > 0 && (
                          <span className="kai-badge primary" style={{ marginLeft: 8, fontSize: 10, padding: '1px 7px', minWidth: 18, textAlign: 'center' }}>
                            {room.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Messages Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--kai-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button className="kai-btn kai-btn-outline kai-btn-sm hide-desktop" style={{ display: 'none' }} onClick={() => setMobileShowMessages(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <div className="kai-avatar" style={{ background: getAvatarColor(selectedRoom.name) }}>
                    {getInitials(selectedRoom.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--kai-text)' }}>{selectedRoom.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {ROOM_ICONS[selectedRoom.type] || ROOM_ICONS.group}
                      <span>{selectedRoom.type} {selectedRoom.members?.length ? `- ${selectedRoom.members.length} members` : ''}
                        {['CTO','CEO','ADMIN','BRAND_FACE'].includes(currentUser?.role) && !(selectedRoom.members || []).some(m => (m.userId || m.id) === currentUserId) && (
                          <span style={{ marginLeft: 6, color: '#F59E0B', fontWeight: 600 }}>👁️ Observing</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowAddMembers(true)} title="Add team members">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    Add
                  </button>
                  <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowInfoPanel(!showInfoPanel)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    Info
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {hasMore && messages.length > 0 && (
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={handleLoadMore}>Load earlier messages</button>
                  </div>
                )}
                {messagesLoading && messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--kai-text-muted)', padding: 40 }}>Loading messages...</div>
                )}
                {!messagesLoading && messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--kai-text-muted)', padding: 40 }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--kai-border)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <div>No messages yet. Start the conversation!</div>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isSent = (msg.senderId || msg.sender?._id || msg.sender?.id) === currentUserId;
                  const showAvatar = idx === 0 || (messages[idx - 1] && (messages[idx - 1].senderId || messages[idx - 1].sender?._id) !== (msg.senderId || msg.sender?._id));
                  const senderName = msg.sender?.name || (msg.sender?.firstName ? `${msg.sender.firstName} ${msg.sender.lastName || ''}`.trim() : msg.senderName || 'Unknown');
                  return (
                    <div
                      key={msg._id || msg.id || idx}
                      style={{
                        display: 'flex',
                        justifyContent: isSent ? 'flex-end' : 'flex-start',
                        marginTop: showAvatar ? 12 : 2,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, maxWidth: '70%', flexDirection: isSent ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                        {showAvatar && !isSent && (
                          <div className="kai-avatar kai-avatar-sm" style={{ background: getAvatarColor(senderName), marginBottom: 2 }}>
                            {getInitials(senderName)}
                          </div>
                        )}
                        {!showAvatar && !isSent && <div style={{ width: 28 }} />}
                        <div>
                          {showAvatar && !isSent && (
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--kai-primary)', marginBottom: 2, paddingLeft: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => window.location.href = `/profile/${msg.senderId || msg.sender?.id}`}>
                              {senderName}
                              <VerifiedBadge verified={msg.sender?.verified} size={14} />
                            </div>
                          )}
                          <div
                            style={{
                              padding: '8px 14px',
                              borderRadius: isSent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              background: isSent ? 'var(--kai-primary)' : 'var(--kai-bg)',
                              color: isSent ? '#fff' : 'var(--kai-text)',
                              fontSize: 13.5,
                              lineHeight: 1.5,
                              opacity: msg.pending ? 0.7 : 1,
                              wordBreak: 'break-word',
                            }}
                          >
                            {/* File attachment rendering */}
                            {(msg.type === 'file' || msg.fileName) && msg.fileUrl ? (
                              <div>
                                {msg.fileType?.startsWith('image/') ? (
                                  <img src={msg.fileUrl} alt={msg.fileName} style={{ maxWidth: 280, maxHeight: 200, borderRadius: 8, marginBottom: 4, cursor: 'pointer' }} onClick={() => window.open(msg.fileUrl, '_blank')} />
                                ) : msg.fileType?.startsWith('video/') ? (
                                  <video src={msg.fileUrl} controls style={{ maxWidth: 320, maxHeight: 220, borderRadius: 8, marginBottom: 4 }} />
                                ) : (
                                  <a href={msg.fileUrl} target="_blank" rel="noreferrer" style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: isSent ? 'rgba(255,255,255,0.15)' : 'var(--kai-surface)', borderRadius: 8, textDecoration: 'none', color: 'inherit', marginBottom: 4,
                                  }}>
                                    <span style={{ fontSize: 24 }}>
                                      {msg.fileType?.includes('pdf') ? '📄' : msg.fileType?.includes('sheet') || msg.fileType?.includes('excel') ? '📊' : msg.fileType?.includes('word') || msg.fileType?.includes('document') ? '📝' : msg.fileType?.includes('presentation') || msg.fileType?.includes('ppt') ? '📎' : msg.fileType?.includes('keynote') ? '🎬' : msg.fileType?.startsWith('video/') ? '🎥' : '📁'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.fileName}</div>
                                      <div style={{ fontSize: 11, opacity: 0.7 }}>Click to open</div>
                                    </div>
                                  </a>
                                )}
                                {(msg.text || msg.content) && msg.text !== msg.fileName && msg.content !== msg.fileName && (
                                  <div>{renderMessageText(msg.text || msg.content)}</div>
                                )}
                              </div>
                            ) : (
                              renderMessageText(msg.text || msg.content || msg.message)
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--kai-text-muted)', marginTop: 2, textAlign: isSent ? 'right' : 'left', paddingLeft: 4, paddingRight: 4 }}>
                            {formatMessageTime(msg.createdAt || msg.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Attached file preview */}
              {attachedFile && (
                <div style={{ padding: '8px 20px', borderTop: '1px solid var(--kai-border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--kai-bg)', fontSize: 13 }}>
                  <span style={{ fontSize: 20 }}>
                    {attachedFile.type?.startsWith('image/') ? '🖼️' : attachedFile.type?.includes('pdf') ? '📄' : attachedFile.type?.includes('sheet') || attachedFile.type?.includes('excel') ? '📊' : attachedFile.type?.includes('word') ? '📝' : attachedFile.type?.includes('presentation') || attachedFile.type?.includes('ppt') ? '📎' : '📁'}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{attachedFile.name}</span>
                  <span style={{ color: 'var(--kai-text-muted)', fontSize: 12 }}>{(attachedFile.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--kai-danger)', padding: 4 }}>✕</button>
                </div>
              )}

              {/* Message Input - show different UI based on membership */}
              {(() => {
                const isMember = (selectedRoom.members || []).some(m => (m.userId || m.id) === currentUserId);
                const isCLevel = ['CTO', 'CEO', 'ADMIN', 'BRAND_FACE'].includes(currentUser?.role);
                const isWatching = !isMember && isCLevel;

                if (isWatching) {
                  return (
                    <div style={{ padding: '12px 20px', borderTop: '1px solid var(--kai-border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, background: 'var(--kai-bg)' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--kai-text-muted)' }}>
                        <span style={{ fontSize: 16 }}>👁️</span>
                        <span>Watching silently — you are not a member of this chat</span>
                      </div>
                      <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={async () => {
                        try {
                          await fetch('/api/chat', {
                            method: 'POST', credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'add-members', roomId: selectedRoom._id || selectedRoom.id, memberIds: [currentUserId] }),
                          });
                          toast.success('You joined the chat');
                          fetchRooms();
                          loadMessages(selectedRoom._id || selectedRoom.id, 1, true);
                        } catch { toast.error('Failed to join'); }
                      }}>
                        Join Chat
                      </button>
                      <button className="kai-btn kai-btn-primary kai-btn-sm" onClick={() => {
                        // Send without joining
                        const msg = prompt('Send a message (you will remain as observer):');
                        if (msg?.trim()) {
                          chatApi.sendMessage({ roomId: selectedRoom._id || selectedRoom.id, content: msg.trim() })
                            .then(() => { loadMessages(selectedRoom._id || selectedRoom.id, 1, true); toast.success('Message sent'); })
                            .catch(() => toast.error('Failed to send'));
                        }
                      }}>
                        Send Message
                      </button>
                    </div>
                  );
                }

                return null;
              })()}
              {/* Always show message input - backend handles permissions */}
              {!(() => {
                const isMember = (selectedRoom.members || []).some(m => (m.userId || m.id) === currentUserId);
                const isCLevel = ['CTO', 'CEO', 'ADMIN', 'BRAND_FACE'].includes(currentUser?.role);
                return !isMember && isCLevel; // Only hide input for C-level watching silently (they have Send Message button above)
              })() && (
                <form onSubmit={handleSendMessage} style={{ padding: '12px 20px', borderTop: attachedFile ? 'none' : '1px solid var(--kai-border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <button type="button" className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => fileInputRef.current?.click()} style={{ padding: 8 }} title="Attach file">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  </button>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }}
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.key,.pages,.numbers,.mp4,.mov,.avi,.webm"
                    onChange={handleFileAttach} />
                  <input className="kai-input" placeholder={attachedFile ? "Add a message (optional)..." : "Type a message..."} value={messageText} onChange={e => setMessageText(e.target.value)} style={{ flex: 1 }} />
                  <button type="submit" className="kai-btn kai-btn-primary" disabled={(!messageText.trim() && !attachedFile) || uploading}>
                    {uploading ? 'Uploading...' : 'Send'}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--kai-text-muted)' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--kai-border)" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Select a conversation</div>
              <div style={{ fontSize: 13 }}>Choose a room from the sidebar to start chatting</div>
            </div>
          )}
        </div>

        {/* Info Panel */}
        {showInfoPanel && selectedRoom && (
          <div style={{ width: 300, borderLeft: '1px solid var(--kai-border)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', position: 'relative' }}>
            {/* Close button */}
            <button onClick={() => setShowInfoPanel(false)} style={{
              position: 'absolute', top: 12, right: 12, zIndex: 2,
              background: 'var(--kai-bg)', border: '1px solid var(--kai-border)', borderRadius: '50%',
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--kai-text-muted)', fontSize: 16,
            }}>✕</button>
            <div style={{ padding: 20, textAlign: 'center', borderBottom: '1px solid var(--kai-border)' }}>
              <div className="kai-avatar kai-avatar-xl" style={{ background: getAvatarColor(selectedRoom.name), margin: '0 auto 12px' }}>
                {getInitials(selectedRoom.name)}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedRoom.name || 'Direct Message'}</div>
              <div className="kai-badge secondary" style={{ marginTop: 6, textTransform: 'capitalize' }}>{selectedRoom.type}</div>
              {selectedRoom.projectId && <div style={{ fontSize: 12, color: 'var(--kai-primary)', marginTop: 4 }}>Project Channel</div>}
            </div>

            {/* Members List */}
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--kai-text-muted)' }}>
                  Members ({selectedRoom.members?.length || selectedRoom.memberCount || 0})
                </span>
                <button className="kai-btn kai-btn-primary kai-btn-sm" onClick={() => setShowAddMembers(true)} style={{ padding: '3px 8px', fontSize: 11 }}>
                  + Add
                </button>
              </div>
              {(selectedRoom.members || []).map((member, i) => {
                const m = member.user || member;
                const memberName = m.name || (m.firstName ? `${m.firstName} ${m.lastName || ''}`.trim() : 'Unknown');
                const memberId = m.userId || m._id || m.id || i;
                const memberRole = m.role || m.designation || '';
                return (
                  <div key={memberId}
                    onClick={() => window.location.href = `/profile/${memberId}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', cursor: 'pointer', borderRadius: 'var(--kai-radius)', transition: 'var(--kai-transition)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--kai-surface-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div className="kai-avatar kai-avatar-sm" style={{ background: getAvatarColor(memberName) }}>
                      {m.avatar ? <img src={m.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(memberName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--kai-text)', display: 'flex', alignItems: 'center', gap: 4 }}>{memberName} <VerifiedBadge verified={m.verified} size={14} /></div>
                      {memberRole && <div style={{ fontSize: 10, color: 'var(--kai-text-muted)' }}>{memberRole}</div>}
                    </div>
                    {m.status === 'ONLINE' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />}
                  </div>
                );
              })}
              {(!selectedRoom.members || selectedRoom.members.length === 0) && (
                <div style={{ fontSize: 13, color: 'var(--kai-text-muted)', textAlign: 'center', padding: 12 }}>No members info</div>
              )}
            </div>

            {selectedRoom.description && (
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--kai-text-muted)', marginBottom: 8 }}>Description</div>
                <div style={{ fontSize: 13, color: 'var(--kai-text-secondary)' }}>{selectedRoom.description}</div>
              </div>
            )}
          </div>
        )}

        {/* Add Members Modal */}
        {showAddMembers && selectedRoom && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowAddMembers(false)} />
            <div className="kai-card" style={{ position: 'relative', width: 420, maxWidth: '90vw', maxHeight: '70vh', overflow: 'auto', zIndex: 1 }}>
              <div className="kai-card-header">
                <h6 style={{ margin: 0 }}>Add Members to {selectedRoom.name || 'Chat'}</h6>
                <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowAddMembers(false)}>✕</button>
              </div>
              <div className="kai-card-body" style={{ padding: 0 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--kai-border)' }}>
                  <input className="kai-input" placeholder="Search team members..." onChange={e => setRoomSearch(e.target.value)} style={{ width: '100%' }} />
                </div>
                <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                  {users.filter(u => {
                    const name = u.name || (u.firstName ? `${u.firstName} ${u.lastName || ''}` : '');
                    return name.toLowerCase().includes((roomSearch || '').toLowerCase());
                  }).map(u => {
                    const uid = u._id || u.id;
                    const uName = u.name || (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : 'Unknown');
                    const alreadyMember = (selectedRoom.members || []).some(m => (m.userId || m._id || m.id) === uid);
                    return (
                      <div key={uid}
                        onClick={async () => {
                          if (alreadyMember) return;
                          try {
                            await fetch('/api/chat', {
                              method: 'POST', credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'add-members', roomId: selectedRoom._id || selectedRoom.id, memberIds: [uid] }),
                            });
                            toast.success(`${uName} added to ${selectedRoom.name || 'chat'}`);
                            setShowAddMembers(false);
                            fetchRooms();
                            if (selectedRoom) loadMessages(selectedRoom._id || selectedRoom.id, 1, true);
                          } catch { toast.error('Failed to add member'); }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                          cursor: alreadyMember ? 'default' : 'pointer', opacity: alreadyMember ? 0.5 : 1,
                          borderBottom: '1px solid var(--kai-border-light)', transition: 'var(--kai-transition)',
                        }}
                        onMouseEnter={e => { if (!alreadyMember) e.currentTarget.style.background = 'var(--kai-surface-hover)'; }}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div className="kai-avatar kai-avatar-sm" style={{ background: getAvatarColor(uName) }}>
                          {getInitials(uName)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{uName}</div>
                          <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>{u.role || u.designation || u.email}</div>
                        </div>
                        {alreadyMember ? (
                          <span className="kai-badge success" style={{ fontSize: 10 }}>Member</span>
                        ) : (
                          <span className="kai-badge primary" style={{ fontSize: 10, cursor: 'pointer' }}>+ Add</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowCreateRoom(false)} />
          <div className="kai-card" style={{ position: 'relative', width: 480, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', zIndex: 1 }}>
            <div className="kai-card-header">
              <h5>Create New Room</h5>
              <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={() => setShowCreateRoom(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreateRoom}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="kai-label">Room Type</label>
                  <select className="kai-input" value={newRoom.type} onChange={e => setNewRoom(p => ({ ...p, type: e.target.value }))}>
                    <option value="dm">Direct Message</option>
                    <option value="group">Group Chat</option>
                    <option value="project">Project Channel</option>
                    <option value="department">Department Channel</option>
                  </select>
                </div>
                <div>
                  <label className="kai-label">Room Name</label>
                  <input
                    className="kai-input"
                    placeholder="e.g., Design Team, Project Alpha..."
                    value={newRoom.name}
                    onChange={e => setNewRoom(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="kai-label">Add Members</label>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--kai-border)', borderRadius: 'var(--kai-radius)', padding: 4 }}>
                    {users.length === 0 && (
                      <div style={{ padding: 12, textAlign: 'center', color: 'var(--kai-text-muted)', fontSize: 13 }}>No users available</div>
                    )}
                    {users.map(u => {
                      const uid = u._id || u.id;
                      const selected = newRoom.members.includes(uid);
                      return (
                        <div
                          key={uid}
                          onClick={() => toggleMember(uid)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            cursor: 'pointer',
                            borderRadius: 'var(--kai-radius-sm)',
                            background: selected ? 'rgba(20,109,247,0.08)' : 'transparent',
                          }}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: 4,
                            border: selected ? 'none' : '2px solid var(--kai-border)',
                            background: selected ? 'var(--kai-primary)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {selected && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                          </div>
                          <div className="kai-avatar kai-avatar-sm" style={{ background: getAvatarColor(u.name || u.firstName || '') }}>
                            {getInitials(u.name || (u.firstName ? `${u.firstName} ${u.lastName || ''}` : 'U'))}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name || (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : 'Unknown')}</div>
                            <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>{u.email || u.role || ''}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {newRoom.members.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--kai-text-muted)', marginTop: 6 }}>{newRoom.members.length} member(s) selected</div>
                  )}
                </div>
              </div>
              <div className="kai-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="kai-btn kai-btn-outline" onClick={() => setShowCreateRoom(false)}>Cancel</button>
                <button type="submit" className="kai-btn kai-btn-primary">Create Room</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
