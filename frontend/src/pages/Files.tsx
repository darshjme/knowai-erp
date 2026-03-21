import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { filesApi, projectsApi } from '../services/api';
import DocumentViewer from '../components/ui/DocumentViewer';
import {
  Upload, FolderPlus, Grid, List, Trash2, Download, File, FileText, Image,
  Film, Music, Archive, Code, Folder, ChevronRight, Loader2, AlertCircle,
  X, UploadCloud, Search, Eye, Filter
} from 'lucide-react';

const FILE_ICONS = {
  folder: { icon: Folder, color: '#F59E0B' }, pdf: { icon: FileText, color: '#EF4444' }, doc: { icon: FileText, color: '#3B82F6' }, docx: { icon: FileText, color: '#3B82F6' },
  xls: { icon: FileText, color: '#10B981' }, xlsx: { icon: FileText, color: '#10B981' }, csv: { icon: FileText, color: '#10B981' },
  ppt: { icon: FileText, color: '#F97316' }, pptx: { icon: FileText, color: '#F97316' }, key: { icon: FileText, color: '#3B82F6' },
  jpg: { icon: Image, color: '#8B5CF6' }, jpeg: { icon: Image, color: '#8B5CF6' }, png: { icon: Image, color: '#8B5CF6' }, gif: { icon: Image, color: '#8B5CF6' }, webp: { icon: Image, color: '#8B5CF6' }, svg: { icon: Image, color: '#8B5CF6' },
  mp4: { icon: Film, color: '#EC4899' }, mov: { icon: Film, color: '#EC4899' }, avi: { icon: Film, color: '#EC4899' },
  mp3: { icon: Music, color: '#F97316' }, wav: { icon: Music, color: '#F97316' },
  zip: { icon: Archive, color: '#6B7280' }, rar: { icon: Archive, color: '#6B7280' },
  js: { icon: Code, color: '#F59E0B' }, ts: { icon: Code, color: '#3B82F6' }, py: { icon: Code, color: '#10B981' }, html: { icon: Code, color: '#EF4444' }, css: { icon: Code, color: '#8B5CF6' },
};

const getFileIcon = (file) => { if (file.type === 'folder' || file.isFolder) return FILE_ICONS.folder; const ext = (file.name || '').split('.').pop()?.toLowerCase(); return FILE_ICONS[ext] || { icon: File, color: '#6B7280' }; };
const formatSize = (bytes) => { if (!bytes) return '-'; if (bytes < 1024) return bytes + ' B'; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'; if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'; return (bytes / 1073741824).toFixed(1) + ' GB'; };
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';

export default function Files() {
  const dispatch = useDispatch();
  const [files, setFiles] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); const [path, setPath] = useState([]); const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false); const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false); const [newFolderName, setNewFolderName] = useState('');
  const [viewerFile, setViewerFile] = useState(null); const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(''); const [uploadProjectId, setUploadProjectId] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Files' }); fetchProjects(); }, []);
  useEffect(() => { fetchFiles(); }, [path, selectedProjectId]);

  const currentFolderId = path.length > 0 ? path[path.length - 1].id : null;

  const fetchProjects = async () => { try { const { data } = await projectsApi.list(); setProjects(data?.data || data?.projects || (Array.isArray(data) ? data : [])); } catch {} };
  const fetchFiles = async () => {
    setLoading(true); setError('');
    try {
      const params = {}; if (currentFolderId) params.folderId = currentFolderId; if (search) params.search = search; if (selectedProjectId) params.projectId = selectedProjectId;
      const { data } = await filesApi.list(params); setFiles(data.files || data.data || data.items || (Array.isArray(data) ? data : []));
    } catch (err) { setError(err.response?.data?.error || err.message || 'Failed to load files'); setFiles([]); } finally { setLoading(false); }
  };

  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return; setUploading(true); setError('');
    try { for (const file of fileList) { const formData = new FormData(); formData.append('file', file); if (currentFolderId) formData.append('folderId', currentFolderId); if (uploadProjectId) formData.append('projectId', uploadProjectId); await filesApi.upload(formData); } fetchFiles(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to upload'); } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }, [currentFolderId, uploadProjectId]);
  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => { setDragOver(false); }, []);

  const handleCreateFolder = async (e) => {
    e.preventDefault(); if (!newFolderName.trim()) return;
    try { const fd = new FormData(); fd.append('name', newFolderName.trim()); fd.append('isFolder', 'true'); if (currentFolderId) fd.append('folderId', currentFolderId); if (uploadProjectId) fd.append('projectId', uploadProjectId); await filesApi.upload(fd); setNewFolderName(''); setShowNewFolder(false); fetchFiles(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to create folder'); }
  };

  const handleDelete = async (file) => { if (!window.confirm(`Delete "${file.name}"?`)) return; try { await filesApi.delete(file._id || file.id); fetchFiles(); } catch (err) { setError('Failed to delete'); } };
  const handleDownload = (file) => { const url = file.url || file.downloadUrl; if (url) { const a = document.createElement('a'); a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); document.body.removeChild(a); } };
  const handleFileClick = (file) => { if (file.type === 'folder' || file.isFolder) setPath(prev => [...prev, { id: file._id || file.id, name: file.name }]); else setViewerFile(file); };
  const navigateToBreadcrumb = (index) => { if (index === -1) setPath([]); else setPath(prev => prev.slice(0, index + 1)); };

  const filteredFiles = search ? files.filter(f => f.name?.toLowerCase().includes(search.toLowerCase())) : files;
  const sortedFiles = [...filteredFiles.filter(f => f.type === 'folder' || f.isFolder), ...filteredFiles.filter(f => f.type !== 'folder' && !f.isFolder)];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] tracking-tight font-[Manrope]">Files</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">Manage and organize your team files</p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => setShowNewFolder(true)} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1.5"><FolderPlus size={16} /> New Folder</button>
          <button data-testid="upload-file" onClick={() => fileInputRef.current?.click()} className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-1.5"><Upload size={16} /> Upload</button>
          <input ref={fileInputRef} type="file" multiple hidden onChange={e => handleUpload(e.target.files)} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-1 text-[14px]">
          <button onClick={() => navigateToBreadcrumb(-1)} className={`bg-transparent border-none cursor-pointer font-semibold text-[14px] px-2 py-1 rounded-md ${path.length > 0 ? 'text-[#7C3AED]' : 'text-[var(--text-primary)]'}`}>Files</button>
          {path.map((p, i) => (<span key={p.id} className="flex items-center"><ChevronRight size={14} className="text-[var(--text-muted)]" /><button onClick={() => navigateToBreadcrumb(i)} className={`bg-transparent border-none cursor-pointer text-[14px] px-2 py-1 rounded-md ${i === path.length - 1 ? 'font-semibold text-[var(--text-primary)]' : 'text-[#7C3AED]'}`}>{p.name}</button></span>))}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative"><Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" /><select className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg pl-8 pr-3 py-2 text-[var(--text-primary)] focus:border-[#7C3AED] outline-none text-[13px] min-w-[160px] h-9" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}><option value="">All Projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <select className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] outline-none text-[13px] min-w-[140px] h-9" value={uploadProjectId} onChange={e => setUploadProjectId(e.target.value)}><option value="">Upload: Global</option>{projects.map(p => <option key={p.id} value={p.id}>Upload: {p.name}</option>)}</select>
          <div className="relative"><Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input data-testid="search-files" className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg pl-9 pr-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] outline-none text-[13px] w-[200px] h-9" placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="flex border border-[var(--border-default)] rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`px-2.5 py-1.5 border-none cursor-pointer ${viewMode === 'grid' ? 'bg-[#7C3AED] text-white' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'}`}><Grid size={16} /></button>
            <button onClick={() => setViewMode('list')} className={`px-2.5 py-1.5 border-none cursor-pointer ${viewMode === 'list' ? 'bg-[#7C3AED] text-white' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'}`}><List size={16} /></button>
          </div>
        </div>
      </div>

      {showNewFolder && (
        <div className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center" onClick={() => setShowNewFolder(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl w-[400px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex justify-between items-center mb-5"><h3 className="text-[18px] font-semibold text-[var(--text-primary)] m-0">Create New Folder</h3><button onClick={() => setShowNewFolder(false)} className="bg-transparent border-none cursor-pointer text-[var(--text-muted)]"><X size={20} /></button></div>
              <form onSubmit={handleCreateFolder}>
                <label className="block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Folder Name</label>
                <input className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] outline-none text-[13px]" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Enter folder name" autoFocus required />
                <div className="flex gap-2.5 justify-end mt-5"><button type="button" onClick={() => setShowNewFolder(false)} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)]">Cancel</button><button type="submit" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90">Create</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {error && <div className="px-4 py-3 rounded-lg mb-5 text-[13px] bg-[#CB3939]/10 text-[#CB3939] flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

      <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className={`border-2 border-dashed rounded-xl text-center mb-5 cursor-pointer transition-all ${dragOver ? 'border-[#7C3AED] p-10 bg-[#7C3AED]/5' : 'border-[var(--border-default)] p-6 bg-[var(--bg-elevated)]'}`} onClick={() => fileInputRef.current?.click()}>
        {uploading ? (<div className="flex items-center justify-center gap-2.5"><Loader2 size={24} className="animate-spin text-[#7C3AED]" /><span className="text-[var(--text-primary)] font-medium">Uploading...</span></div>) : (<><UploadCloud size={32} className={`mx-auto mb-2 ${dragOver ? 'text-[#7C3AED]' : 'text-[var(--text-muted)]'}`} /><p className="text-[var(--text-secondary)] text-[14px] m-0">{dragOver ? 'Drop files here' : 'Drag and drop files here, or click to browse (max 50MB)'}</p></>)}
      </div>

      {loading ? (<div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-[#7C3AED]" /></div>) : sortedFiles.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-center py-16 text-[var(--text-muted)]"><Folder size={40} className="mx-auto mb-3 opacity-40" /><p className="text-[15px] font-medium">No files here</p><p className="text-[13px]">Upload files or create a folder</p></div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sortedFiles.map(file => { const fi = getFileIcon(file); const Icon = fi.icon; const isFolder = file.type === 'folder' || file.isFolder; return (
            <div key={file._id || file.id} className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl cursor-pointer hover:border-[#7C3AED]/30 transition-colors" onClick={() => handleFileClick(file)}>
              <div className="text-center p-5">
                <div className="w-14 h-14 rounded-[14px] mx-auto mb-3 flex items-center justify-center" style={{ background: `${fi.color}12` }}><Icon size={28} style={{ color: fi.color }} /></div>
                <div className="font-medium text-[13px] text-[var(--text-primary)] mb-1 truncate">{file.name}</div>
                <div className="text-[11px] text-[var(--text-muted)] mb-1">{isFolder ? `${file._count?.children || file.count || 0} items` : formatSize(file.size)}</div>
                {file.project && <div className="text-[10px] text-[#7C3AED] mb-1 truncate">{file.project.name}</div>}
                <div className="text-[11px] text-[var(--text-muted)]">{file.uploadedBy ? `${file.uploadedBy.firstName || ''} ${file.uploadedBy.lastName || ''}`.trim() : ''}{file.uploadedBy ? ' - ' : ''}{formatDate(file.createdAt || file.uploadedAt)}</div>
                <div className="flex gap-1.5 justify-center mt-2.5">
                  {!isFolder && (<><button onClick={e => { e.stopPropagation(); setViewerFile(file); }} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-md px-2 py-1 text-[11px] hover:bg-[var(--bg-elevated)]" title="Preview"><Eye size={13} /></button><button onClick={e => { e.stopPropagation(); handleDownload(file); }} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-md px-2 py-1 text-[11px] hover:bg-[var(--bg-elevated)]" title="Download"><Download size={13} /></button></>)}
                  <button onClick={e => { e.stopPropagation(); handleDelete(file); }} className="bg-transparent border border-[var(--border-default)] text-[#CB3939] rounded-md px-2 py-1 text-[11px] hover:bg-[var(--bg-elevated)]" title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ); })}
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="border-b-2 border-[var(--border-default)]">{['Name', 'Size', 'Project', 'Uploaded By', 'Date', 'Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody>{sortedFiles.map(file => { const fi = getFileIcon(file); const Icon = fi.icon; const isFolder = file.type === 'folder' || file.isFolder; return (
              <tr key={file._id || file.id} className="border-b border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--bg-elevated)]" onClick={() => handleFileClick(file)}>
                <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><Icon size={20} style={{ color: fi.color }} className="flex-shrink-0" /><span className="font-medium text-[var(--text-primary)]">{file.name}</span></div></td>
                <td className="px-4 py-2.5 text-[var(--text-muted)]">{isFolder ? `${file._count?.children || file.count || 0} items` : formatSize(file.size)}</td>
                <td className="px-4 py-2.5 text-[#7C3AED]">{file.project?.name || '-'}</td>
                <td className="px-4 py-2.5 text-[var(--text-muted)]">{file.uploadedBy ? `${file.uploadedBy.firstName || ''} ${file.uploadedBy.lastName || ''}`.trim() : '-'}</td>
                <td className="px-4 py-2.5 text-[var(--text-muted)]">{formatDate(file.createdAt || file.uploadedAt)}</td>
                <td className="px-4 py-2.5"><div className="flex gap-1.5">{!isFolder && (<><button onClick={e => { e.stopPropagation(); setViewerFile(file); }} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-md px-2 py-1 hover:bg-[var(--bg-elevated)]" title="Preview"><Eye size={14} /></button><button onClick={e => { e.stopPropagation(); handleDownload(file); }} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-md px-2 py-1 hover:bg-[var(--bg-elevated)]" title="Download"><Download size={14} /></button></>)}<button onClick={e => { e.stopPropagation(); handleDelete(file); }} className="bg-transparent border border-[var(--border-default)] text-[#CB3939] rounded-md px-2 py-1 hover:bg-[var(--bg-elevated)]" title="Delete"><Trash2 size={14} /></button></div></td>
              </tr>
            ); })}</tbody>
          </table>
        </div>
      )}

      {viewerFile && <DocumentViewer file={viewerFile} onClose={() => setViewerFile(null)} />}
    </div>
  );
}
