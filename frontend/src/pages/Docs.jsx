import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { docsApi } from '../services/api';
import {
  FileText, Plus, ChevronRight, ChevronDown, Search, Save, Trash2, Eye, EyeOff,
  Loader2, AlertCircle, BookOpen, X, Edit3, Globe, Lock
} from 'lucide-react';

export default function Docs() {
  const dispatch = useDispatch();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPublished, setEditPublished] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newParentId, setNewParentId] = useState('');

  const [expandedNodes, setExpandedNodes] = useState({});

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Docs' });
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data } = await docsApi.list();
      const items = data.docs || data.data || data.items || (Array.isArray(data) ? data : []);
      setDocs(items);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, msg) => {
    if (type === 'success') { setSuccess(msg); setError(''); }
    else { setError(msg); setSuccess(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 3000);
  };

  // Build tree from flat list
  const buildTree = (items) => {
    const map = {};
    const roots = [];
    items.forEach(item => { map[item._id || item.id] = { ...item, children: [] }; });
    items.forEach(item => {
      const id = item._id || item.id;
      const parentId = item.parentId || item.parent;
      if (parentId && map[parentId]) {
        map[parentId].children.push(map[id]);
      } else {
        roots.push(map[id]);
      }
    });
    return roots;
  };

  const tree = buildTree(docs.filter(d =>
    !search || d.title?.toLowerCase().includes(search.toLowerCase())
  ));

  const toggleNode = (id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectDoc = (doc) => {
    setSelectedDoc(doc);
    setEditTitle(doc.title || '');
    setEditContent(doc.content || doc.body || '');
    setEditPublished(doc.published ?? doc.isPublished ?? false);
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      await docsApi.update(selectedDoc._id || selectedDoc.id, {
        title: editTitle,
        content: editContent,
        published: editPublished,
      });
      setDocs(prev => prev.map(d =>
        (d._id || d.id) === (selectedDoc._id || selectedDoc.id)
          ? { ...d, title: editTitle, content: editContent, published: editPublished }
          : d
      ));
      setSelectedDoc(prev => ({ ...prev, title: editTitle, content: editContent, published: editPublished }));
      showMsg('success', 'Document saved successfully');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const payload = { title: newTitle.trim(), content: '', published: false };
      if (newParentId) payload.parentId = newParentId;
      const { data } = await docsApi.create(payload);
      const newDoc = data.doc || data;
      setDocs(prev => [...prev, newDoc]);
      setNewTitle('');
      setNewParentId('');
      setShowCreate(false);
      selectDoc(newDoc);
      showMsg('success', 'Document created');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to create document');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await docsApi.delete(doc._id || doc.id);
      setDocs(prev => prev.filter(d => (d._id || d.id) !== (doc._id || doc.id)));
      if (selectedDoc && (selectedDoc._id || selectedDoc.id) === (doc._id || doc.id)) {
        setSelectedDoc(null);
      }
      showMsg('success', 'Document deleted');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to delete document');
    }
  };

  const DocTreeNode = ({ node, depth = 0 }) => {
    const id = node._id || node.id;
    const expanded = expandedNodes[id];
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedDoc && (selectedDoc._id || selectedDoc.id) === id;

    return (
      <div>
        <div
          onClick={() => selectDoc(node)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
            paddingLeft: 12 + depth * 20, cursor: 'pointer', borderRadius: 6,
            background: isSelected ? '#EBF3FE' : 'transparent',
            color: isSelected ? '#146DF7' : '#4C5963',
            fontSize: 13, fontWeight: isSelected ? 600 : 400,
            transition: 'background 0.1s',
          }}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleNode(id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' }}>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span style={{ width: 14 }} />
          )}
          <FileText size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {node.title || 'Untitled'}
          </span>
          {(node.published || node.isPublished) && (
            <Globe size={12} style={{ color: '#10B981', flexShrink: 0 }} />
          )}
        </div>
        {hasChildren && expanded && (
          <div>
            {node.children.map(child => (
              <DocTreeNode key={child._id || child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Docs</h1>
          <p>Team wiki and documentation</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="kai-btn kai-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Create Doc
        </button>
      </div>

      {(success || error) && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500,
          background: success ? '#d4edda' : '#f8d7da', color: success ? '#155724' : '#721c24',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {success || error}
        </div>
      )}

      {/* Create Doc Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowCreate(false)}>
          <div className="kai-card" style={{ width: 440 }} onClick={e => e.stopPropagation()}>
            <div className="kai-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#10222F', margin: 0 }}>Create Document</h3>
                <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5B6B76' }}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreate}>
                <div style={{ marginBottom: 16 }}>
                  <label className="kai-label">Title</label>
                  <input className="kai-input" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="Document title" autoFocus required />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="kai-label">Parent Document (optional)</label>
                  <select className="kai-input" value={newParentId} onChange={e => setNewParentId(e.target.value)}>
                    <option value="">None (top level)</option>
                    {docs.map(d => (
                      <option key={d._id || d.id} value={d._id || d.id}>{d.title}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowCreate(false)} className="kai-btn">Cancel</button>
                  <button type="submit" className="kai-btn kai-btn-primary" disabled={saving}>
                    {saving ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, minHeight: 'calc(100vh - 220px)', flexWrap: 'wrap' }}>
        {/* Sidebar - Doc Tree */}
        <div className="kai-card" style={{ width: 280, flex: '0 0 280px', minWidth: 240, display: 'flex', flexDirection: 'column' }}>
          <div className="kai-card-body" style={{ padding: '12px 8px', flex: 1, overflow: 'auto' }}>
            <div style={{ padding: '0 4px', marginBottom: 12 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: '#9CA3AF' }} />
                <input className="kai-input" placeholder="Search docs..." value={search}
                  onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, height: 34, fontSize: 13 }} />
              </div>
            </div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}>
                <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: '#146DF7' }} />
              </div>
            ) : tree.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: '#5B6B76', fontSize: 13 }}>
                No documents yet
              </div>
            ) : (
              tree.map(node => (
                <DocTreeNode key={node._id || node.id} node={node} />
              ))
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div style={{ flex: 1 }}>
          {selectedDoc ? (
            <div className="kai-card" style={{ height: '100%' }}>
              <div className="kai-card-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Editor toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #E8EBED' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Edit3 size={18} style={{ color: '#146DF7' }} />
                    <span style={{ fontSize: 14, color: '#5B6B76' }}>Editing</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Publish toggle */}
                    <button
                      onClick={() => setEditPublished(!editPublished)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                        borderRadius: 6, border: '1px solid #E8EBED', cursor: 'pointer', fontSize: 13,
                        background: editPublished ? '#D1FAE5' : '#F3F4F6',
                        color: editPublished ? '#065F46' : '#4B5563',
                      }}
                    >
                      {editPublished ? <Globe size={14} /> : <Lock size={14} />}
                      {editPublished ? 'Published' : 'Draft'}
                    </button>
                    <button onClick={() => handleDelete(selectedDoc)} className="kai-btn" style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Trash2 size={15} /> Delete
                    </button>
                    <button onClick={handleSave} className="kai-btn kai-btn-primary" disabled={saving}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Title input */}
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Document title"
                  style={{
                    border: 'none', outline: 'none', fontSize: 28, fontWeight: 700, color: '#10222F',
                    marginBottom: 16, padding: '4px 0', background: 'transparent', width: '100%',
                  }}
                />

                {/* Content editor (rich text area) */}
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  placeholder="Start writing your document content..."
                  style={{
                    flex: 1, border: 'none', outline: 'none', resize: 'none',
                    fontSize: 15, lineHeight: 1.7, color: '#374151', padding: '8px 0',
                    background: 'transparent', fontFamily: 'inherit', minHeight: 400,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="kai-card" style={{ height: '100%' }}>
              <div className="kai-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
                <div style={{ textAlign: 'center', color: '#5B6B76' }}>
                  <BookOpen size={48} style={{ marginBottom: 16, opacity: 0.3, color: '#146DF7' }} />
                  <p style={{ fontSize: 17, fontWeight: 600, color: '#10222F', marginBottom: 6 }}>Select a document</p>
                  <p style={{ fontSize: 14 }}>Choose a document from the sidebar or create a new one</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
