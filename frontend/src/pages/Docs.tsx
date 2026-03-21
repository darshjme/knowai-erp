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

  const buildTree = (items) => {
    const map = {};
    const roots = [];
    items.forEach(item => { map[item._id || item.id] = { ...item, children: [] }; });
    items.forEach(item => {
      const id = item._id || item.id;
      const parentId = item.parentId || item.parent;
      if (parentId && map[parentId]) { map[parentId].children.push(map[id]); }
      else { roots.push(map[id]); }
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
      await docsApi.update(selectedDoc._id || selectedDoc.id, { title: editTitle, content: editContent, published: editPublished });
      setDocs(prev => prev.map(d => (d._id || d.id) === (selectedDoc._id || selectedDoc.id) ? { ...d, title: editTitle, content: editContent, published: editPublished } : d));
      setSelectedDoc(prev => ({ ...prev, title: editTitle, content: editContent, published: editPublished }));
      showMsg('success', 'Document saved successfully');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to save document');
    } finally { setSaving(false); }
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
      setNewTitle(''); setNewParentId(''); setShowCreate(false);
      selectDoc(newDoc);
      showMsg('success', 'Document created');
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Failed to create document');
    } finally { setSaving(false); }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await docsApi.delete(doc._id || doc.id);
      setDocs(prev => prev.filter(d => (d._id || d.id) !== (doc._id || doc.id)));
      if (selectedDoc && (selectedDoc._id || selectedDoc.id) === (doc._id || doc.id)) { setSelectedDoc(null); }
      showMsg('success', 'Document deleted');
    } catch (err) { showMsg('error', err.response?.data?.error || 'Failed to delete document'); }
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
          className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer rounded-md text-[13px] transition-colors ${isSelected ? 'bg-[#7C3AED]/10 text-[#7C3AED] font-semibold' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
          style={{ paddingLeft: 12 + depth * 20 }}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleNode(id); }}
              className="bg-transparent border-none cursor-pointer p-0 flex text-inherit">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-3.5" />
          )}
          <FileText size={14} className="flex-shrink-0 opacity-70" />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1">
            {node.title || 'Untitled'}
          </span>
          {(node.published || node.isPublished) && (
            <Globe size={12} className="text-[#10B981] flex-shrink-0" />
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight font-[Manrope]">Docs</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Team wiki and documentation</p>
        </div>
        <button data-testid="create-doc" onClick={() => setShowCreate(true)} className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-1.5">
          <Plus size={16} /> Create Doc
        </button>
      </div>

      {(success || error) && (
        <div className={`px-4 py-3 rounded-lg mb-4 text-[13px] font-medium flex items-center gap-2 ${success ? 'bg-[#16A34A]/10 text-[#16A34A]' : 'bg-[#CB3939]/10 text-[#CB3939]'}`}>
          {success || error}
        </div>
      )}

      {/* Create Doc Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center"
          onClick={() => setShowCreate(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[440px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[18px] font-semibold text-[var(--text-primary)] m-0">Create Document</h3>
                <button onClick={() => setShowCreate(false)} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Title</label>
                  <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="Document title" autoFocus required />
                </div>
                <div className="mb-5">
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Parent Document (optional)</label>
                  <select className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px]" value={newParentId} onChange={e => setNewParentId(e.target.value)}>
                    <option value="">None (top level)</option>
                    {docs.map(d => (
                      <option key={d._id || d.id} value={d._id || d.id}>{d.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2.5 justify-end">
                  <button type="button" onClick={() => setShowCreate(false)} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors">Cancel</button>
                  <button type="submit" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors" disabled={saving}>
                    {saving ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-5 min-h-[calc(100vh-220px)] flex-wrap">
        {/* Sidebar - Doc Tree */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[280px] flex-[0_0_280px] min-w-[240px] flex flex-col">
          <div className="p-3 flex-1 overflow-auto">
            <div className="px-1 mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-[9px] text-[var(--text-muted)]" />
                <input data-testid="search-docs" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg pl-8 pr-3 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] outline-none text-[13px] h-[34px]" placeholder="Search docs..." value={search}
                  onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={22} className="animate-spin text-[#7C3AED]" />
              </div>
            ) : tree.length === 0 ? (
              <div className="text-center py-6 text-[var(--text-muted)] text-[13px]">
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
        <div className="flex-1 min-w-0">
          {selectedDoc ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl h-full">
              <div className="p-4 flex flex-col h-full">
                {/* Editor toolbar */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2.5">
                    <Edit3 size={18} className="text-[#7C3AED]" />
                    <span className="text-[14px] text-[var(--text-secondary)]">Editing</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setEditPublished(!editPublished)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[13px] cursor-pointer transition-colors ${editPublished ? 'bg-[#16A34A]/10 border-[#16A34A]/30 text-[#16A34A]' : 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)]'}`}
                    >
                      {editPublished ? <Globe size={14} /> : <Lock size={14} />}
                      {editPublished ? 'Published' : 'Draft'}
                    </button>
                    <button onClick={() => handleDelete(selectedDoc)} className="bg-transparent border border-[var(--border-default)] text-[#CB3939] rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1">
                      <Trash2 size={15} /> Delete
                    </button>
                    <button data-testid="save-doc" onClick={handleSave} className="bg-[#7C3AED] text-white rounded-lg px-4 py-1.5 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-1.5" disabled={saving}>
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Title input */}
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Document title"
                  className="border-none outline-none text-[28px] font-bold text-[var(--text-primary)] mb-4 py-1 bg-transparent w-full"
                />

                {/* Content editor */}
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  placeholder="Start writing your document content..."
                  className="flex-1 border-none outline-none resize-none text-[15px] leading-[1.7] text-[var(--text-secondary)] py-2 bg-transparent font-inherit min-h-[400px]"
                />
              </div>
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl h-full">
              <div className="flex items-center justify-center h-full min-h-[400px] p-4">
                <div className="text-center text-[var(--text-muted)]">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-30 text-[var(--text-primary)]" />
                  <p className="text-[17px] font-semibold text-[var(--text-primary)] mb-1.5">Select a document</p>
                  <p className="text-[14px]">Choose a document from the sidebar or create a new one</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
