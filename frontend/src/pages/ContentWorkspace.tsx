import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { contentWorkspaceApi } from '../services/api';
import { Search, Plus, ArrowLeft, Loader2, X, Trash2, Download, Upload } from 'lucide-react';

const COLLECTION_TYPES = [
  { value: 'ASSET_PACK', label: 'Asset Pack', color: '#7C3AED' },
  { value: 'ELEMENT_PACK', label: 'Element Pack', color: '#2563EB' },
  { value: 'VIDEO_PROTOCOL', label: 'Video Protocol', color: '#DC2626' },
  { value: 'MOOD_BOARD', label: 'Mood Board', color: '#DB2777' },
  { value: 'EMBEDS', label: 'Embeds & Links', color: '#059669' },
];

const FILE_TYPES = ['IMAGE', 'SVG', 'VIDEO', 'PDF', 'FIGMA', 'MIRO', 'DOCUMENT', 'OTHER'];

function Avatar({ u, size = 28 }) {
  if (!u) return <div className="rounded-full bg-[var(--bg-elevated)]" style={{ width: size, height: size }} />;
  if (u.avatar) return <img src={u.avatar} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  const i = ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase();
  return <div className="rounded-full bg-[#7C3AED] text-white flex items-center justify-center font-semibold" style={{ width: size, height: size, fontSize: size * 0.4 }}>{i}</div>;
}

function fmtBytes(b) { if (!b) return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
function timeAgo(d) { if (!d) return ''; const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; }

const SENIOR_ROLES = ['CEO', 'CTO', 'CFO', 'BRAND_FACE', 'PRODUCT_OWNER', 'HR', 'ADMIN'];
const inputClass = "w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]";

export default function ContentWorkspace() {
  const user = useSelector(s => s.auth?.user);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionDetail, setCollectionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);
  const [collForm, setCollForm] = useState({ name: '', description: '', type: 'ASSET_PACK', color: '#3b82f6' });
  const [assetForm, setAssetForm] = useState({ name: '', description: '', fileType: 'IMAGE', file: null, embedUrl: '', tags: '' });

  const canCreate = user && (SENIOR_ROLES.includes(user.role) || user.role?.startsWith('SR_'));

  const fetchCollections = useCallback(async () => {
    try { setLoading(true); const params = {}; if (filterType !== 'ALL') params.type = filterType; const res = await contentWorkspaceApi.list(params); const rd = res.data; setCollections(rd?.collections || (Array.isArray(rd) ? rd : [])); }
    catch { toast.error('Failed to load workspace'); }
    finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const fetchDetail = async (id) => {
    try { setDetailLoading(true); const res = await contentWorkspaceApi.list({ collectionId: id }); setCollectionDetail(res.data?.data || res.data); }
    catch { toast.error('Failed to load collection'); }
    finally { setDetailLoading(false); }
  };

  const handleSearch = async () => {
    if (!search.trim()) { setSearchResults([]); return; }
    try { const res = await contentWorkspaceApi.list({ search: search.trim() }); setSearchResults(res.data?.assets || []); } catch {}
  };

  useEffect(() => { const t = setTimeout(handleSearch, 300); return () => clearTimeout(t); }, [search]);

  const handleCreateCollection = async () => {
    if (!collForm.name.trim()) return toast.error('Name is required');
    try { setSubmitting(true); await contentWorkspaceApi.createCollection(collForm); toast.success('Collection created'); setShowNewCollection(false); setCollForm({ name: '', description: '', type: 'ASSET_PACK', color: '#3b82f6' }); fetchCollections(); }
    catch (e) { toast.error(e.message || 'Failed to create'); }
    finally { setSubmitting(false); }
  };

  const handleAddAsset = async () => {
    if (!assetForm.name.trim()) return toast.error('Name is required');
    if (!assetForm.file && !assetForm.embedUrl.trim()) return toast.error('Upload a file or paste an embed URL');
    try {
      setSubmitting(true);
      let fileUrl = '', thumbnailUrl = '', mimeType = '', fileSize = 0;
      if (assetForm.file) {
        const fd = new FormData(); fd.append('file', assetForm.file);
        const uploadRes = await fetch('/api/files', { method: 'POST', body: fd, credentials: 'include' });
        const uploadData = await uploadRes.json();
        const fi = uploadData?.data || uploadData;
        fileUrl = fi?.url || fi?.fileUrl || `/api/files/serve/${fi?.fileName || assetForm.file.name}`;
        mimeType = assetForm.file.type; fileSize = assetForm.file.size;
        if (assetForm.file.type.startsWith('image/')) thumbnailUrl = fileUrl;
      }
      await contentWorkspaceApi.addAsset({
        name: assetForm.name.trim(), description: assetForm.description, fileUrl: fileUrl || assetForm.embedUrl,
        thumbnailUrl, fileType: assetForm.fileType, mimeType, fileSize,
        embedUrl: assetForm.embedUrl || undefined,
        tags: assetForm.tags ? assetForm.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [],
        collectionId: selectedCollection,
      });
      toast.success('Asset added'); setShowAddAsset(false);
      setAssetForm({ name: '', description: '', fileType: 'IMAGE', file: null, embedUrl: '', tags: '' });
      fetchDetail(selectedCollection);
    } catch (e) { toast.error(e.message || 'Failed to add asset'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteAsset = async (id) => {
    if (!confirm('Delete this asset?')) return;
    try { await contentWorkspaceApi.delete(id, 'asset'); fetchDetail(selectedCollection); } catch (e) { toast.error(e.message || 'Failed to delete'); }
  };

  const filteredCollections = useMemo(() => {
    if (!search.trim()) return collections;
    const q = search.toLowerCase();
    return collections.filter(c => c.name.toLowerCase().includes(q) || c.type?.toLowerCase().includes(q));
  }, [collections, search]);

  // Collection detail view
  if (selectedCollection && collectionDetail) {
    const ct = COLLECTION_TYPES.find(t => t.value === collectionDetail.type) || COLLECTION_TYPES[0];
    return (
      <div className="py-3 px-4" data-testid="collection-detail">
        <div className="flex items-center gap-3 mb-6">
          <button data-testid="back-btn" className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1.5 text-[13px] font-medium hover:bg-[var(--bg-elevated)] flex items-center gap-1" onClick={() => { setSelectedCollection(null); setCollectionDetail(null); }}>
            <ArrowLeft size={14} />Back
          </button>
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white text-[18px]" style={{ background: ct.color }}>&#9733;</div>
          <div>
            <h5 className="m-0 font-bold text-[var(--text-primary)]">{collectionDetail.name}</h5>
            <span className="text-[12px] text-[var(--text-secondary)]">{ct.label} &middot; {collectionDetail._count?.assets || collectionDetail.assets?.length || 0} assets</span>
          </div>
          <button className="ml-auto bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 flex items-center gap-1.5" onClick={() => setShowAddAsset(true)}>
            <Plus size={14} />Add Asset
          </button>
        </div>
        {collectionDetail.description && <p className="text-[var(--text-secondary)] text-[13px] mb-3">{collectionDetail.description}</p>}
        {detailLoading ? <div className="text-center py-10"><Loader2 size={24} className="mx-auto animate-spin text-[#7C3AED]" /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {(!collectionDetail.assets || collectionDetail.assets.length === 0) ? (
              <div className="col-span-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-center py-10 text-[var(--text-muted)]">No assets yet. Add your first asset.</div>
            ) : collectionDetail.assets.map(asset => (
              <div key={asset.id} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl cursor-pointer hover:shadow-md transition-shadow overflow-hidden" onClick={() => setShowPreview(asset)}>
                <div className="h-[140px] bg-[var(--bg-elevated)] flex items-center justify-center rounded-t-xl overflow-hidden">
                  {asset.thumbnailUrl || (asset.fileType === 'IMAGE' || asset.fileType === 'SVG') ?
                    <img src={asset.thumbnailUrl || asset.fileUrl} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
                    : <span className="text-[36px] text-[var(--text-muted)] opacity-40">&#128196;</span>}
                </div>
                <div className="p-3">
                  <h6 className="font-semibold mb-1 truncate text-[13px] text-[var(--text-primary)]">{asset.name}</h6>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded font-medium">{asset.fileType}</span>
                    {asset.fileSize > 0 && <span className="text-[10px] text-[var(--text-muted)]">{fmtBytes(asset.fileSize)}</span>}
                  </div>
                  {asset.tags?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {asset.tags.slice(0, 3).map(t => <span key={t} className="text-[9px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded">{t}</span>)}
                      {asset.tags.length > 3 && <span className="text-[9px] bg-[var(--bg-elevated)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">+{asset.tags.length - 3}</span>}
                    </div>
                  )}
                </div>
                <div className="px-3 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1"><Avatar u={asset.uploadedBy} size={18} /><span className="text-[11px] text-[var(--text-muted)]">{asset.uploadedBy?.firstName}</span></div>
                  <span className="text-[10px] text-[var(--text-muted)]">{timeAgo(asset.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Asset Modal */}
        {showAddAsset && (
          <div className="fixed inset-0 bg-black/50 z-[1050] flex items-center justify-center" onClick={() => setShowAddAsset(false)}>
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[520px] max-w-[95vw] shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
                <h5 className="m-0 font-bold text-[var(--text-primary)]">Add Asset</h5>
                <button className="text-[var(--text-secondary)] bg-transparent border-none cursor-pointer" onClick={() => setShowAddAsset(false)}><X size={18} /></button>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div><label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">Name *</label><input className={inputClass} value={assetForm.name} onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">Type</label><select className={inputClass} value={assetForm.fileType} onChange={e => setAssetForm(p => ({ ...p, fileType: e.target.value }))}>{FILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">Description</label><textarea className={`${inputClass} resize-y`} rows={2} value={assetForm.description} onChange={e => setAssetForm(p => ({ ...p, description: e.target.value }))} /></div>
                <div><label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">Upload File</label><input className={inputClass} type="file" onChange={e => setAssetForm(p => ({ ...p, file: e.target.files?.[0] || null }))} accept="image/*,video/*,.svg,.pdf,.doc,.docx,.pptx,.fig" /></div>
                <div><label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">Or Embed URL</label><input className={inputClass} type="url" value={assetForm.embedUrl} onChange={e => setAssetForm(p => ({ ...p, embedUrl: e.target.value }))} placeholder="https://www.figma.com/file/..." /></div>
                <div><label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">Tags (comma separated)</label><input className={inputClass} value={assetForm.tags} onChange={e => setAssetForm(p => ({ ...p, tags: e.target.value }))} placeholder="brand, logo, v2" /></div>
              </div>
              <div className="px-5 py-4 border-t border-[var(--border-default)] flex justify-end gap-2">
                <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px]" onClick={() => setShowAddAsset(false)}>Cancel</button>
                <button className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 disabled:opacity-70" onClick={handleAddAsset} disabled={submitting}>{submitting ? 'Adding...' : 'Add Asset'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/50 z-[1050] flex items-center justify-center" onClick={() => setShowPreview(null)}>
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[800px] max-w-[95vw] max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
                <h5 className="m-0 font-bold text-[var(--text-primary)]">{showPreview.name}</h5>
                <button className="text-[var(--text-secondary)] bg-transparent border-none cursor-pointer" onClick={() => setShowPreview(null)}><X size={18} /></button>
              </div>
              <div className="p-5">
                <div className="bg-[var(--bg-elevated)] rounded-lg flex items-center justify-center min-h-[300px] overflow-hidden mb-4">
                  {(showPreview.fileType === 'IMAGE' || showPreview.fileType === 'SVG') ? <img src={showPreview.fileUrl} alt={showPreview.name} className="max-w-full max-h-[500px]" />
                  : showPreview.fileType === 'VIDEO' ? <video src={showPreview.fileUrl} controls className="max-w-full max-h-[500px]" />
                  : showPreview.embedUrl ? <iframe src={showPreview.embedUrl} className="w-full h-[500px] border-none" allowFullScreen />
                  : showPreview.fileType === 'PDF' ? <iframe src={showPreview.fileUrl} className="w-full h-[500px] border-none" />
                  : <div className="text-center py-4 text-[var(--text-muted)]"><p className="mt-2">Preview not available</p></div>}
                </div>
                {showPreview.description && <p className="text-[var(--text-secondary)] text-[13px] mb-3">{showPreview.description}</p>}
                {showPreview.tags?.length > 0 && <div className="flex gap-1.5 flex-wrap mb-3">{showPreview.tags.map(t => <span key={t} className="text-[11px] bg-[#7C3AED]/10 text-[#7C3AED] px-2 py-0.5 rounded-full font-medium">{t}</span>)}</div>}
                <div className="flex items-center gap-2"><Avatar u={showPreview.uploadedBy} size={24} /><span className="text-[12px] text-[var(--text-secondary)]">Uploaded by {showPreview.uploadedBy?.firstName} {showPreview.uploadedBy?.lastName}</span><span className="text-[12px] text-[var(--text-muted)] ml-auto">{fmtBytes(showPreview.fileSize)}</span></div>
              </div>
              <div className="px-5 py-4 border-t border-[var(--border-default)] flex justify-end gap-2">
                <button className="bg-red-100 text-red-700 rounded-lg px-3 py-1.5 text-[13px] font-medium hover:bg-red-200 flex items-center gap-1" onClick={() => { handleDeleteAsset(showPreview.id); setShowPreview(null); }}><Trash2 size={14} /> Delete</button>
                <a href={showPreview.fileUrl} download target="_blank" rel="noopener noreferrer" className="bg-[#7C3AED] text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-[#7C3AED]/90 inline-flex items-center gap-1 no-underline"><Download size={14} /> Download</a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main collections view
  return (
    <div className="py-3 px-4" data-testid="content-workspace">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h4 className="m-0 font-bold text-[var(--text-primary)] text-[20px]">Content Workspace</h4>
          <span className="text-[12px] text-[var(--text-secondary)]">Organized IP assets, mood boards, protocols & embeds</span>
        </div>
        <div className="flex gap-2">
          <div className="relative max-w-[250px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input data-testid="search-assets" className={`${inputClass} pl-8`} placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {canCreate && <button className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 flex items-center gap-1.5" onClick={() => setShowNewCollection(true)}><Plus size={14} /> New Collection</button>}
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button className={`rounded-lg px-3 py-1.5 text-[13px] font-medium border ${filterType === 'ALL' ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'bg-transparent border-[var(--border-default)] text-[var(--text-secondary)]'}`} onClick={() => setFilterType('ALL')}>All</button>
        {COLLECTION_TYPES.map(ct => (
          <button key={ct.value} className={`rounded-lg px-3 py-1.5 text-[13px] font-medium border ${filterType === ct.value ? 'text-white border-transparent' : 'bg-transparent border-[var(--border-default)] text-[var(--text-secondary)]'}`}
            style={filterType === ct.value ? { background: ct.color } : {}} onClick={() => setFilterType(ct.value)}>{ct.label}</button>
        ))}
      </div>

      {search.trim() && searchResults.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl mb-3">
          <div className="px-4 py-3 border-b border-[var(--border-default)] font-semibold text-[var(--text-primary)]">Search Results ({searchResults.length})</div>
          <div className="p-3 grid grid-cols-4 gap-2">
            {searchResults.map(a => (
              <div key={a.id} className="p-2 rounded flex items-center gap-2 bg-[var(--bg-elevated)] cursor-pointer hover:bg-[var(--bg-primary)] transition-colors" onClick={() => setShowPreview(a)}>
                <span className="text-[var(--text-muted)]">&#128196;</span>
                <div><div className="text-[12px] font-semibold text-[var(--text-primary)]">{a.name}</div><span className="text-[11px] text-[var(--text-muted)]">{a.collection?.name}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-10"><Loader2 size={24} className="mx-auto animate-spin text-[#7C3AED]" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredCollections.length === 0 ? (
            <div className="col-span-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-center py-10 text-[var(--text-muted)]">
              No collections yet
              {canCreate && <button className="block mx-auto mt-3 bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold" onClick={() => setShowNewCollection(true)}>Create First Collection</button>}
            </div>
          ) : filteredCollections.map(c => {
            const ct = COLLECTION_TYPES.find(t => t.value === c.type) || COLLECTION_TYPES[0];
            return (
              <div key={c.id} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-lg overflow-hidden"
                onClick={() => { setSelectedCollection(c.id); fetchDetail(c.id); }}>
                <div className="h-20 flex items-center justify-center rounded-t-xl text-white text-[32px]" style={{ background: `linear-gradient(135deg, ${c.color || ct.color}, ${c.color || ct.color}88)` }}>&#9733;</div>
                <div className="p-3">
                  <h6 className="font-bold mb-1 text-[var(--text-primary)]">{c.name}</h6>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${ct.color}20`, color: ct.color }}>{ct.label}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">{c._count?.assets || 0} assets</span>
                  </div>
                  {c.description && <span className="text-[11px] text-[var(--text-muted)] block truncate">{c.description}</span>}
                </div>
                <div className="px-3 pb-2 flex items-center gap-2">
                  <Avatar u={c.createdBy} size={18} />
                  <span className="text-[11px] text-[var(--text-muted)]">{c.createdBy?.firstName}</span>
                  <span className="text-[10px] text-[var(--text-muted)] ml-auto">{timeAgo(c.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Collection Modal */}
      {showNewCollection && (
        <div className="fixed inset-0 bg-black/50 z-[1050] flex items-center justify-center" onClick={() => setShowNewCollection(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[480px] max-w-[95vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
              <h5 className="m-0 font-bold text-[var(--text-primary)]">New Collection</h5>
              <button className="text-[var(--text-secondary)] bg-transparent border-none cursor-pointer" onClick={() => setShowNewCollection(false)}><X size={18} /></button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div><label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">Name *</label><input className={inputClass} value={collForm.name} onChange={e => setCollForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Brand Assets v3" /></div>
              <div><label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">Type *</label><select className={inputClass} value={collForm.type} onChange={e => setCollForm(p => ({ ...p, type: e.target.value }))}>{COLLECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div><label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">Description</label><textarea className={`${inputClass} resize-y`} rows={2} value={collForm.description} onChange={e => setCollForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div><label className="block text-[13px] font-semibold text-[var(--text-secondary)] mb-1">Color</label><input className={inputClass} type="color" value={collForm.color} onChange={e => setCollForm(p => ({ ...p, color: e.target.value }))} /></div>
            </div>
            <div className="px-5 py-4 border-t border-[var(--border-default)] flex justify-end gap-2">
              <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px]" onClick={() => setShowNewCollection(false)}>Cancel</button>
              <button className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 disabled:opacity-70" onClick={handleCreateCollection} disabled={submitting}>{submitting ? 'Creating...' : 'Create Collection'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
