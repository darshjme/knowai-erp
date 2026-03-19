import { useState } from 'react';
import { X, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, FileText } from 'lucide-react';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
const PDF_EXTS = ['pdf'];
const OFFICE_EXTS = ['xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt', 'key'];

function getExtension(name) {
  if (!name) return '';
  return name.split('.').pop()?.toLowerCase() || '';
}

function getFileCategory(name) {
  const ext = getExtension(name);
  if (PDF_EXTS.includes(ext)) return 'pdf';
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (OFFICE_EXTS.includes(ext)) return 'office';
  return 'other';
}

export default function DocumentViewer({ file, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!file) return null;

  const category = getFileCategory(file.name);
  const serveUrl = file.url || `/api/files/serve/${file.id}`;
  const downloadUrl = serveUrl;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex', flexDirection: 'column',
      }}
      onClick={onClose}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', background: 'rgba(0, 0, 0, 0.6)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileText size={20} style={{ color: '#fff' }} />
          <span style={{ color: '#fff', fontWeight: 500, fontSize: 15 }}>{file.name}</span>
          {file.size && (
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              ({formatFileSize(file.size)})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {category === 'image' && (
            <>
              <ToolbarButton icon={<ZoomOut size={18} />} onClick={handleZoomOut} title="Zoom out" />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, minWidth: 45, textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </span>
              <ToolbarButton icon={<ZoomIn size={18} />} onClick={handleZoomIn} title="Zoom in" />
              <ToolbarButton icon={<RotateCw size={18} />} onClick={handleRotate} title="Rotate" />
              <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
            </>
          )}
          <ToolbarButton icon={<Download size={18} />} onClick={handleDownload} title="Download" />
          <ToolbarButton icon={<X size={20} />} onClick={onClose} title="Close" />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'auto', padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {category === 'pdf' && (
          <iframe
            src={serveUrl}
            style={{
              width: '90%', height: '100%', border: 'none',
              borderRadius: 8, background: '#fff',
            }}
            title={file.name}
          />
        )}

        {category === 'image' && (
          <div style={{ overflow: 'auto', maxWidth: '100%', maxHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={serveUrl}
              alt={file.name}
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease',
                borderRadius: 4,
              }}
            />
          </div>
        )}

        {category === 'office' && (
          <div style={{
            background: '#fff', borderRadius: 12, padding: 40,
            maxWidth: 480, textAlign: 'center',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 16, margin: '0 auto 20px',
              background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={36} style={{ color: getOfficeColor(file.name) }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
              {file.name}
            </h3>
            <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>
              Office files cannot be previewed directly. Download to view in your preferred application.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleDownload}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: '#146DF7', color: '#fff', fontWeight: 500,
                  cursor: 'pointer', fontSize: 14,
                }}
              >
                <Download size={16} /> Download File
              </button>
              <button
                onClick={() => {
                  const googleUrl = `https://docs.google.com/gview?url=${encodeURIComponent(window.location.origin + serveUrl)}&embedded=true`;
                  window.open(googleUrl, '_blank');
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8,
                  border: '1px solid #D1D5DB', background: '#fff',
                  color: '#374151', fontWeight: 500,
                  cursor: 'pointer', fontSize: 14,
                }}
              >
                <ExternalLink size={16} /> Open in Google Docs
              </button>
            </div>
          </div>
        )}

        {category === 'other' && (
          <div style={{
            background: '#fff', borderRadius: 12, padding: 40,
            maxWidth: 400, textAlign: 'center',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 16, margin: '0 auto 20px',
              background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={36} style={{ color: '#6B7280' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
              {file.name}
            </h3>
            <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>
              This file type cannot be previewed. Click below to download.
            </p>
            <button
              onClick={handleDownload}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto',
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: '#146DF7', color: '#fff', fontWeight: 500,
                cursor: 'pointer', fontSize: 14,
              }}
            >
              <Download size={16} /> Download File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({ icon, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 6, padding: 6, cursor: 'pointer',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
    >
      {icon}
    </button>
  );
}

function getOfficeColor(name) {
  const ext = getExtension(name);
  if (['xlsx', 'xls', 'csv'].includes(ext)) return '#10B981';
  if (['docx', 'doc'].includes(ext)) return '#3B82F6';
  if (['pptx', 'ppt'].includes(ext)) return '#F97316';
  if (ext === 'key') return '#3B82F6';
  return '#6B7280';
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}
