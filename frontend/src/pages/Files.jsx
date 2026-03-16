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
  folder: { icon: Folder, color: '#F59E0B' },
  pdf: { icon: FileText, color: '#EF4444' },
  doc: { icon: FileText, color: '#3B82F6' },
  docx: { icon: FileText, color: '#3B82F6' },
  xls: { icon: FileText, color: '#10B981' },
  xlsx: { icon: FileText, color: '#10B981' },
  csv: { icon: FileText, color: '#10B981' },
  ppt: { icon: FileText, color: '#F97316' },
  pptx: { icon: FileText, color: '#F97316' },
  key: { icon: FileText, color: '#3B82F6' },
  jpg: { icon: Image, color: '#8B5CF6' },
  jpeg: { icon: Image, color: '#8B5CF6' },
  png: { icon: Image, color: '#8B5CF6' },
  gif: { icon: Image, color: '#8B5CF6' },
  webp: { icon: Image, color: '#8B5CF6' },
  svg: { icon: Image, color: '#8B5CF6' },
  mp4: { icon: Film, color: '#EC4899' },
  mov: { icon: Film, color: '#EC4899' },
  avi: { icon: Film, color: '#EC4899' },
  mp3: { icon: Music, color: '#F97316' },
  wav: { icon: Music, color: '#F97316' },
  zip: { icon: Archive, color: '#6B7280' },
  rar: { icon: Archive, color: '#6B7280' },
  js: { icon: Code, color: '#F59E0B' },
  ts: { icon: Code, color: '#3B82F6' },
  py: { icon: Code, color: '#10B981' },
  html: { icon: Code, color: '#EF4444' },
  css: { icon: Code, color: '#8B5CF6' },
};

const getFileIcon = (file) => {
  if (file.type === 'folder' || file.isFolder) return FILE_ICONS.folder;
  const ext = (file.name || '').split('.').pop()?.toLowerCase();
  return FILE_ICONS[ext] || { icon: File, color: '#6B7280' };
};

const formatSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
};

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Files() {
  const dispatch = useDispatch();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [path, setPath] = useState([]);
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [viewerFile, setViewerFile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [uploadProjectId, setUploadProjectId] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Files' });
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [path, selectedProjectId]);

  const currentFolderId = path.length > 0 ? path[path.length - 1].id : null;

  const fetchProjects = async () => {
    try {
      const { data } = await projectsApi.list();
      const items = data?.data || data?.projects || (Array.isArray(data) ? data : []);
      setProjects(items);
    } catch {
      // Non-critical, ignore
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (currentFolderId) params.folderId = currentFolderId;
      if (search) params.search = search;
      if (selectedProjectId) params.projectId = selectedProjectId;
      const { data } = await filesApi.list(params);
      const items = data.files || data.data || data.items || (Array.isArray(data) ? data : []);
      setFiles(items);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError('');
    try {
      for (const file of fileList) {
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolderId) formData.append('folderId', currentFolderId);
        if (uploadProjectId) formData.append('projectId', uploadProjectId);
        await filesApi.upload(formData);
      }
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to upload file(s)');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, [currentFolderId, uploadProjectId]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const formData = new FormData();
      formData.append('name', newFolderName.trim());
      formData.append('isFolder', 'true');
      if (currentFolderId) formData.append('folderId', currentFolderId);
      if (uploadProjectId) formData.append('projectId', uploadProjectId);
      await filesApi.upload(formData);
      setNewFolderName('');
      setShowNewFolder(false);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create folder');
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    try {
      await filesApi.delete(file._id || file.id);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to delete');
    }
  };

  const handleDownload = (file) => {
    const url = file.url || file.downloadUrl;
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleFileClick = (file) => {
    if (file.type === 'folder' || file.isFolder) {
      navigateToFolder(file);
    } else {
      setViewerFile(file);
    }
  };

  const navigateToFolder = (file) => {
    setPath(prev => [...prev, { id: file._id || file.id, name: file.name }]);
  };

  const navigateToBreadcrumb = (index) => {
    if (index === -1) setPath([]);
    else setPath(prev => prev.slice(0, index + 1));
  };

  const filteredFiles = search
    ? files.filter(f => f.name?.toLowerCase().includes(search.toLowerCase()))
    : files;

  const folders = filteredFiles.filter(f => f.type === 'folder' || f.isFolder);
  const regularFiles = filteredFiles.filter(f => f.type !== 'folder' && !f.isFolder);
  const sortedFiles = [...folders, ...regularFiles];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Files</h1>
          <p>Manage and organize your team files</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowNewFolder(true)} className="kai-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FolderPlus size={16} /> New Folder
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="kai-btn kai-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Upload size={16} /> Upload
          </button>
          <input ref={fileInputRef} type="file" multiple hidden onChange={e => handleUpload(e.target.files)} />
        </div>
      </div>

      {/* Breadcrumbs + Search + Filters + View toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
          <button onClick={() => navigateToBreadcrumb(-1)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: path.length > 0 ? '#146DF7' : '#10222F',
            fontWeight: 600, fontSize: 14, padding: '4px 8px', borderRadius: 6,
          }}>
            Files
          </button>
          {path.map((p, i) => (
            <span key={p.id} style={{ display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={14} style={{ color: '#9CA3AF' }} />
              <button onClick={() => navigateToBreadcrumb(i)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: i === path.length - 1 ? '#10222F' : '#146DF7',
                fontWeight: i === path.length - 1 ? 600 : 400, fontSize: 14, padding: '4px 8px', borderRadius: 6,
              }}>
                {p.name}
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Project Filter */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Filter size={14} style={{ position: 'absolute', left: 10, color: '#9CA3AF', pointerEvents: 'none' }} />
            <select
              className="kai-input"
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              style={{ paddingLeft: 30, height: 36, fontSize: 13, minWidth: 160 }}
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {/* Upload Project Selector */}
          <select
            className="kai-input"
            value={uploadProjectId}
            onChange={e => setUploadProjectId(e.target.value)}
            style={{ height: 36, fontSize: 13, minWidth: 140 }}
            title="Project for new uploads"
          >
            <option value="">Upload: Global</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>Upload: {p.name}</option>
            ))}
          </select>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 9, color: '#9CA3AF' }} />
            <input className="kai-input" placeholder="Search files..." value={search}
              onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, width: 200, height: 36 }} />
          </div>
          <div style={{ display: 'flex', border: '1px solid #E8EBED', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setViewMode('grid')} style={{
              padding: '6px 10px', border: 'none', cursor: 'pointer',
              background: viewMode === 'grid' ? '#146DF7' : '#fff', color: viewMode === 'grid' ? '#fff' : '#5B6B76',
            }}>
              <Grid size={16} />
            </button>
            <button onClick={() => setViewMode('list')} style={{
              padding: '6px 10px', border: 'none', cursor: 'pointer',
              background: viewMode === 'list' ? '#146DF7' : '#fff', color: viewMode === 'list' ? '#fff' : '#5B6B76',
            }}>
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowNewFolder(false)}>
          <div className="kai-card" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="kai-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#10222F', margin: 0 }}>Create New Folder</h3>
                <button onClick={() => setShowNewFolder(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5B6B76' }}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateFolder}>
                <label className="kai-label">Folder Name</label>
                <input className="kai-input" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name" autoFocus required />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button type="button" onClick={() => setShowNewFolder(false)} className="kai-btn">Cancel</button>
                  <button type="submit" className="kai-btn kai-btn-primary">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, background: '#FEE2E2', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Upload Dropzone */}
      <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragOver ? '#146DF7' : '#E8EBED'}`, borderRadius: 12,
          padding: dragOver ? 40 : 24, textAlign: 'center', marginBottom: 20,
          background: dragOver ? '#EBF3FE' : '#FAFAFA', transition: 'all 0.2s', cursor: 'pointer',
        }}
        onClick={() => fileInputRef.current?.click()}>
        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#146DF7' }} />
            <span style={{ color: '#146DF7', fontWeight: 500 }}>Uploading...</span>
          </div>
        ) : (
          <>
            <UploadCloud size={32} style={{ color: dragOver ? '#146DF7' : '#9CA3AF', marginBottom: 8 }} />
            <p style={{ color: '#5B6B76', fontSize: 14, margin: 0 }}>
              {dragOver ? 'Drop files here' : 'Drag and drop files here, or click to browse (max 50MB)'}
            </p>
          </>
        )}
      </div>

      {/* Files Display */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#146DF7' }} />
        </div>
      ) : sortedFiles.length === 0 ? (
        <div className="kai-card">
          <div className="kai-card-body" style={{ textAlign: 'center', padding: 60, color: '#5B6B76' }}>
            <Folder size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>No files here</p>
            <p style={{ fontSize: 13 }}>Upload files or create a folder to get started</p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {sortedFiles.map(file => {
            const fi = getFileIcon(file);
            const Icon = fi.icon;
            const isFolder = file.type === 'folder' || file.isFolder;
            return (
              <div key={file._id || file.id} className="kai-card" style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                onClick={() => handleFileClick(file)}>
                <div className="kai-card-body" style={{ textAlign: 'center', padding: 20 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14, margin: '0 auto 12px',
                    background: `${fi.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={28} style={{ color: fi.color }} />
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 13, color: '#10222F', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#5B6B76', marginBottom: 4 }}>
                    {isFolder ? `${file._count?.children || file.count || 0} items` : formatSize(file.size)}
                  </div>
                  {file.project && (
                    <div style={{ fontSize: 10, color: '#146DF7', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.project.name}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {file.uploadedBy ? `${file.uploadedBy.firstName || ''} ${file.uploadedBy.lastName || ''}`.trim() : ''}{file.uploadedBy ? ' - ' : ''}{formatDate(file.createdAt || file.uploadedAt)}
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
                    {!isFolder && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setViewerFile(file); }}
                          className="kai-btn" style={{ padding: '4px 8px', fontSize: 11 }} title="Preview">
                          <Eye size={13} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                          className="kai-btn" style={{ padding: '4px 8px', fontSize: 11 }} title="Download">
                          <Download size={13} />
                        </button>
                      </>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                      className="kai-btn" style={{ padding: '4px 8px', fontSize: 11, color: '#EF4444' }} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="kai-card">
          <div className="kai-card-body" style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="kai-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Size</th>
                  <th style={thStyle}>Project</th>
                  <th style={thStyle}>Uploaded By</th>
                  <th style={thStyle}>Date</th>
                  <th style={{ ...thStyle, width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedFiles.map(file => {
                  const fi = getFileIcon(file);
                  const Icon = fi.icon;
                  const isFolder = file.type === 'folder' || file.isFolder;
                  return (
                    <tr key={file._id || file.id} style={{ borderBottom: '1px solid #F0F2F4', cursor: 'pointer' }}
                      onClick={() => handleFileClick(file)}>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Icon size={20} style={{ color: fi.color, flexShrink: 0 }} />
                          <span style={{ fontWeight: 500, fontSize: 13, color: '#10222F' }}>{file.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#5B6B76' }}>
                        {isFolder ? `${file._count?.children || file.count || 0} items` : formatSize(file.size)}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#146DF7' }}>
                        {file.project?.name || '-'}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#5B6B76' }}>
                        {file.uploadedBy ? `${file.uploadedBy.firstName || ''} ${file.uploadedBy.lastName || ''}`.trim() : '-'}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, color: '#5B6B76' }}>
                        {formatDate(file.createdAt || file.uploadedAt)}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!isFolder && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setViewerFile(file); }}
                                className="kai-btn" style={{ padding: '4px 8px' }} title="Preview">
                                <Eye size={14} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                                className="kai-btn" style={{ padding: '4px 8px' }} title="Download">
                                <Download size={14} />
                              </button>
                            </>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                            className="kai-btn" style={{ padding: '4px 8px', color: '#EF4444' }} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewerFile && (
        <DocumentViewer file={viewerFile} onClose={() => setViewerFile(null)} />
      )}
    </div>
  );
}

const thStyle = {
  padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600,
  color: '#5B6B76', textTransform: 'uppercase', letterSpacing: 0.5,
  background: '#F8F9FA', borderBottom: '2px solid #E8EBED',
};
