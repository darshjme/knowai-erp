import { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Form, Spinner, InputGroup, Tab, Nav, Dropdown } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { contentWorkspaceApi } from '../services/api';

const COLLECTION_TYPES = [
  { value: 'ASSET_PACK', label: 'Asset Pack', icon: 'bi-images', color: '#7C3AED' },
  { value: 'ELEMENT_PACK', label: 'Element Pack', icon: 'bi-grid-3x3', color: '#2563EB' },
  { value: 'VIDEO_PROTOCOL', label: 'Video Protocol', icon: 'bi-camera-video', color: '#DC2626' },
  { value: 'MOOD_BOARD', label: 'Mood Board', icon: 'bi-palette2', color: '#DB2777' },
  { value: 'EMBEDS', label: 'Embeds & Links', icon: 'bi-link-45deg', color: '#059669' },
];

const FILE_TYPES = ['IMAGE', 'SVG', 'VIDEO', 'PDF', 'FIGMA', 'MIRO', 'DOCUMENT', 'OTHER'];

function Avatar({ u, size = 28 }) {
  if (!u) return <div style={{ width: size, height: size, borderRadius: '50%', background: '#e2e8f0' }} />;
  if (u.avatar) return <img src={u.avatar} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  const i = ((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase();
  return <div style={{ width: size, height: size, borderRadius: '50%', background: '#146DF7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 600 }}>{i}</div>;
}

function fmtBytes(b) { if (!b) return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
function timeAgo(d) { if (!d) return ''; const s = (Date.now() - new Date(d).getTime()) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; }

const SENIOR_ROLES = ['CEO', 'CTO', 'CFO', 'BRAND_FACE', 'PRODUCT_OWNER', 'HR', 'ADMIN'];

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
    try {
      setLoading(true);
      const params = {};
      if (filterType !== 'ALL') params.type = filterType;
      const res = await contentWorkspaceApi.list(params);
      const rd = res.data;
      setCollections(rd?.collections || (Array.isArray(rd) ? rd : []));
    } catch { toast.error('Failed to load workspace'); }
    finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const fetchDetail = async (id) => {
    try {
      setDetailLoading(true);
      const res = await contentWorkspaceApi.list({ collectionId: id });
      const rd = res.data;
      setCollectionDetail(rd?.data || rd);
    } catch { toast.error('Failed to load collection'); }
    finally { setDetailLoading(false); }
  };

  const handleSearch = async () => {
    if (!search.trim()) { setSearchResults([]); return; }
    try {
      const res = await contentWorkspaceApi.list({ search: search.trim() });
      const rd = res.data;
      setSearchResults(rd?.assets || []);
    } catch {}
  };

  useEffect(() => { const t = setTimeout(handleSearch, 300); return () => clearTimeout(t); }, [search]);

  const handleCreateCollection = async () => {
    if (!collForm.name.trim()) return toast.error('Name is required');
    try {
      setSubmitting(true);
      await contentWorkspaceApi.createCollection(collForm);
      toast.success('Collection created');
      setShowNewCollection(false);
      setCollForm({ name: '', description: '', type: 'ASSET_PACK', color: '#3b82f6' });
      fetchCollections();
    } catch (e) { toast.error(e.message || 'Failed to create'); }
    finally { setSubmitting(false); }
  };

  const handleAddAsset = async () => {
    if (!assetForm.name.trim()) return toast.error('Name is required');
    if (!assetForm.file && !assetForm.embedUrl.trim()) return toast.error('Upload a file or paste an embed URL');
    try {
      setSubmitting(true);
      let fileUrl = '', thumbnailUrl = '', mimeType = '', fileSize = 0;
      if (assetForm.file) {
        const fd = new FormData();
        fd.append('file', assetForm.file);
        const uploadRes = await fetch('/api/files', { method: 'POST', body: fd, credentials: 'include' });
        const uploadData = await uploadRes.json();
        const fi = uploadData?.data || uploadData;
        fileUrl = fi?.url || fi?.fileUrl || `/api/files/serve/${fi?.fileName || assetForm.file.name}`;
        mimeType = assetForm.file.type;
        fileSize = assetForm.file.size;
        if (assetForm.file.type.startsWith('image/')) thumbnailUrl = fileUrl;
      }
      await contentWorkspaceApi.addAsset({
        name: assetForm.name.trim(),
        description: assetForm.description,
        fileUrl: fileUrl || assetForm.embedUrl,
        thumbnailUrl,
        fileType: assetForm.fileType,
        mimeType, fileSize,
        embedUrl: assetForm.embedUrl || undefined,
        tags: assetForm.tags ? assetForm.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [],
        collectionId: selectedCollection,
      });
      toast.success('Asset added');
      setShowAddAsset(false);
      setAssetForm({ name: '', description: '', fileType: 'IMAGE', file: null, embedUrl: '', tags: '' });
      fetchDetail(selectedCollection);
    } catch (e) { toast.error(e.message || 'Failed to add asset'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteAsset = async (id) => {
    if (!confirm('Delete this asset?')) return;
    try {
      await contentWorkspaceApi.delete(id, 'asset');
      fetchDetail(selectedCollection);
    } catch (e) { toast.error(e.message || 'Failed to delete'); }
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
      <Container fluid className="py-3 px-4">
        <div className="d-flex align-items-center gap-3 mb-4">
          <Button variant="outline-secondary" size="sm" onClick={() => { setSelectedCollection(null); setCollectionDetail(null); }}>
            <i className="bi bi-arrow-left me-1" />Back
          </Button>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: ct.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`bi ${ct.icon} text-white`} style={{ fontSize: 18 }} />
          </div>
          <div>
            <h5 className="mb-0 fw-bold">{collectionDetail.name}</h5>
            <small className="text-muted">{ct.label} &middot; {collectionDetail._count?.assets || collectionDetail.assets?.length || 0} assets</small>
          </div>
          <Button className="ms-auto" style={{ background: '#146DF7', border: 'none' }} onClick={() => setShowAddAsset(true)}>
            <i className="bi bi-plus-lg me-1" />Add Asset
          </Button>
        </div>

        {collectionDetail.description && <p className="text-muted mb-3">{collectionDetail.description}</p>}

        {detailLoading ? <div className="text-center py-5"><Spinner style={{ color: '#146DF7' }} /></div> : (
          <Row className="g-3">
            {(!collectionDetail.assets || collectionDetail.assets.length === 0) ? (
              <Col><Card className="kai-card text-center py-5"><Card.Body>
                <i className="bi bi-inbox" style={{ fontSize: 48, color: '#94a3b8' }} />
                <p className="text-muted mt-2">No assets yet. Add your first asset.</p>
              </Card.Body></Card></Col>
            ) : collectionDetail.assets.map(asset => (
              <Col key={asset.id} xl={3} lg={4} md={6}>
                <Card className="kai-card h-100" style={{ cursor: 'pointer' }} onClick={() => setShowPreview(asset)}>
                  <div style={{ height: 140, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
                    {asset.thumbnailUrl || (asset.fileType === 'IMAGE' || asset.fileType === 'SVG') ?
                      <img src={asset.thumbnailUrl || asset.fileUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                      : asset.fileType === 'FIGMA' ? <i className="bi bi-vector-pen" style={{ fontSize: 36, color: '#a259ff' }} />
                      : asset.fileType === 'MIRO' ? <i className="bi bi-kanban" style={{ fontSize: 36, color: '#ffd02f' }} />
                      : asset.fileType === 'VIDEO' ? <i className="bi bi-play-circle" style={{ fontSize: 36, color: '#dc2626' }} />
                      : asset.fileType === 'PDF' ? <i className="bi bi-file-pdf" style={{ fontSize: 36, color: '#dc2626' }} />
                      : <i className="bi bi-file-earmark" style={{ fontSize: 36, color: '#64748b' }} />}
                  </div>
                  <Card.Body className="pb-2">
                    <h6 className="fw-semibold mb-1 text-truncate" style={{ fontSize: 13 }}>{asset.name}</h6>
                    <div className="d-flex align-items-center gap-1 mb-1">
                      <Badge bg="light" text="dark" style={{ fontSize: 10 }}>{asset.fileType}</Badge>
                      {asset.fileSize > 0 && <small className="text-muted">{fmtBytes(asset.fileSize)}</small>}
                    </div>
                    {asset.tags?.length > 0 && (
                      <div className="d-flex gap-1 flex-wrap">
                        {asset.tags.slice(0, 3).map(t => <Badge key={t} bg="secondary" style={{ fontSize: 9 }}>{t}</Badge>)}
                        {asset.tags.length > 3 && <Badge bg="secondary" style={{ fontSize: 9 }}>+{asset.tags.length - 3}</Badge>}
                      </div>
                    )}
                  </Card.Body>
                  <Card.Footer className="bg-transparent border-0 pt-0 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-1">
                      <Avatar u={asset.uploadedBy} size={18} />
                      <small className="text-muted" style={{ fontSize: 11 }}>{asset.uploadedBy?.firstName}</small>
                    </div>
                    <small className="text-muted" style={{ fontSize: 10 }}>{timeAgo(asset.createdAt)}</small>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Add Asset Modal */}
        <Modal show={showAddAsset} onHide={() => setShowAddAsset(false)} centered>
          <Modal.Header closeButton><Modal.Title>Add Asset</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Name *</Form.Label>
              <Form.Control value={assetForm.name} onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Type</Form.Label>
              <Form.Select value={assetForm.fileType} onChange={e => setAssetForm(p => ({ ...p, fileType: e.target.value }))}>
                {FILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Description</Form.Label>
              <Form.Control as="textarea" rows={2} value={assetForm.description} onChange={e => setAssetForm(p => ({ ...p, description: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Upload File</Form.Label>
              <Form.Control type="file" onChange={e => setAssetForm(p => ({ ...p, file: e.target.files?.[0] || null }))}
                accept="image/*,video/*,.svg,.pdf,.doc,.docx,.pptx,.fig" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Or Embed URL (Figma, Miro, etc.)</Form.Label>
              <Form.Control type="url" value={assetForm.embedUrl} onChange={e => setAssetForm(p => ({ ...p, embedUrl: e.target.value }))}
                placeholder="https://www.figma.com/file/..." />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Tags (comma separated)</Form.Label>
              <Form.Control value={assetForm.tags} onChange={e => setAssetForm(p => ({ ...p, tags: e.target.value }))} placeholder="brand, logo, v2" />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddAsset(false)}>Cancel</Button>
            <Button style={{ background: '#146DF7', border: 'none' }} onClick={handleAddAsset} disabled={submitting}>
              {submitting ? <Spinner size="sm" /> : 'Add Asset'}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Preview Modal */}
        <Modal show={!!showPreview} onHide={() => setShowPreview(null)} size="lg" centered>
          {showPreview && <>
            <Modal.Header closeButton>
              <Modal.Title>{showPreview.name}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div style={{ background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, overflow: 'hidden' }}>
                {(showPreview.fileType === 'IMAGE' || showPreview.fileType === 'SVG') ?
                  <img src={showPreview.fileUrl} alt={showPreview.name} style={{ maxWidth: '100%', maxHeight: 500 }} />
                : showPreview.fileType === 'VIDEO' ?
                  <video src={showPreview.fileUrl} controls style={{ maxWidth: '100%', maxHeight: 500 }} />
                : showPreview.embedUrl ?
                  <iframe src={showPreview.embedUrl} style={{ width: '100%', height: 500, border: 'none' }} allowFullScreen />
                : showPreview.fileType === 'PDF' ?
                  <iframe src={showPreview.fileUrl} style={{ width: '100%', height: 500, border: 'none' }} />
                :
                  <div className="text-center py-4">
                    <i className="bi bi-file-earmark" style={{ fontSize: 64, color: '#94a3b8' }} />
                    <p className="mt-2 text-muted">Preview not available</p>
                  </div>
                }
              </div>
              {showPreview.description && <p className="mt-3 text-muted">{showPreview.description}</p>}
              <div className="d-flex gap-2 mt-3 flex-wrap">
                {showPreview.tags?.map(t => <Badge key={t} bg="info">{t}</Badge>)}
              </div>
              <div className="d-flex align-items-center gap-2 mt-3">
                <Avatar u={showPreview.uploadedBy} size={24} />
                <small>Uploaded by {showPreview.uploadedBy?.firstName} {showPreview.uploadedBy?.lastName}</small>
                <small className="text-muted ms-auto">{fmtBytes(showPreview.fileSize)}</small>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-danger" size="sm" onClick={() => { handleDeleteAsset(showPreview.id); setShowPreview(null); }}>
                <i className="bi bi-trash me-1" />Delete
              </Button>
              <a href={showPreview.fileUrl} download target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ background: '#146DF7', border: 'none' }}>
                <i className="bi bi-download me-1" />Download
              </a>
            </Modal.Footer>
          </>}
        </Modal>
      </Container>
    );
  }

  // Main collections view
  return (
    <Container fluid className="py-3 px-4">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-0 fw-bold" style={{ color: '#10222F' }}>
            <i className="bi bi-layers me-2" />Content Workspace
          </h4>
          <small className="text-muted">Organized IP assets, mood boards, protocols & embeds</small>
        </div>
        <div className="d-flex gap-2">
          <InputGroup style={{ maxWidth: 250 }}>
            <InputGroup.Text><i className="bi bi-search" /></InputGroup.Text>
            <Form.Control placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} />
          </InputGroup>
          {canCreate && (
            <Button style={{ background: '#146DF7', border: 'none' }} onClick={() => setShowNewCollection(true)}>
              <i className="bi bi-plus-lg me-1" />New Collection
            </Button>
          )}
        </div>
      </div>

      {/* Type filter */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <Button size="sm" variant={filterType === 'ALL' ? 'primary' : 'outline-secondary'} onClick={() => setFilterType('ALL')}
          style={filterType === 'ALL' ? { background: '#146DF7', border: 'none' } : {}}>All</Button>
        {COLLECTION_TYPES.map(ct => (
          <Button key={ct.value} size="sm" variant={filterType === ct.value ? 'primary' : 'outline-secondary'}
            onClick={() => setFilterType(ct.value)}
            style={filterType === ct.value ? { background: ct.color, border: 'none' } : {}}>
            <i className={`bi ${ct.icon} me-1`} />{ct.label}
          </Button>
        ))}
      </div>

      {/* Search results */}
      {search.trim() && searchResults.length > 0 && (
        <Card className="kai-card mb-3">
          <Card.Header className="bg-transparent"><strong>Search Results</strong> ({searchResults.length})</Card.Header>
          <Card.Body>
            <Row className="g-2">
              {searchResults.map(a => (
                <Col key={a.id} md={3}>
                  <div className="p-2 rounded d-flex align-items-center gap-2" style={{ background: '#f8fafc', cursor: 'pointer' }} onClick={() => setShowPreview(a)}>
                    <i className={`bi ${a.fileType === 'IMAGE' ? 'bi-image' : a.fileType === 'VIDEO' ? 'bi-play-circle' : 'bi-file-earmark'}`} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div>
                      <small className="text-muted">{a.collection?.name}</small>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Collections Grid */}
      {loading ? <div className="text-center py-5"><Spinner style={{ color: '#146DF7' }} /></div> : (
        <Row className="g-3">
          {filteredCollections.length === 0 ? (
            <Col><Card className="kai-card text-center py-5"><Card.Body>
              <i className="bi bi-inbox" style={{ fontSize: 48, color: '#94a3b8' }} />
              <p className="text-muted mt-2">No collections yet</p>
              {canCreate && <Button style={{ background: '#146DF7', border: 'none' }} onClick={() => setShowNewCollection(true)}>Create First Collection</Button>}
            </Card.Body></Card></Col>
          ) : filteredCollections.map(c => {
            const ct = COLLECTION_TYPES.find(t => t.value === c.type) || COLLECTION_TYPES[0];
            return (
              <Col key={c.id} xl={3} lg={4} md={6}>
                <Card className="kai-card h-100" style={{ cursor: 'pointer', transition: 'transform .15s' }}
                  onClick={() => { setSelectedCollection(c.id); fetchDetail(c.id); }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = ''}>
                  <div style={{ height: 80, background: `linear-gradient(135deg, ${c.color || ct.color}, ${c.color || ct.color}88)`, borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`bi ${ct.icon} text-white`} style={{ fontSize: 32 }} />
                  </div>
                  <Card.Body>
                    <h6 className="fw-bold mb-1">{c.name}</h6>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <Badge style={{ background: `${ct.color}20`, color: ct.color, fontSize: 10 }}>{ct.label}</Badge>
                      <small className="text-muted">{c._count?.assets || 0} assets</small>
                    </div>
                    {c.description && <small className="text-muted d-block text-truncate">{c.description}</small>}
                  </Card.Body>
                  <Card.Footer className="bg-transparent border-0 pt-0 d-flex align-items-center gap-2">
                    <Avatar u={c.createdBy} size={18} />
                    <small className="text-muted" style={{ fontSize: 11 }}>{c.createdBy?.firstName}</small>
                    <small className="text-muted ms-auto" style={{ fontSize: 10 }}>{timeAgo(c.createdAt)}</small>
                  </Card.Footer>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      {/* New Collection Modal */}
      <Modal show={showNewCollection} onHide={() => setShowNewCollection(false)} centered>
        <Modal.Header closeButton><Modal.Title>New Collection</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Name *</Form.Label>
            <Form.Control value={collForm.name} onChange={e => setCollForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Brand Assets v3" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Type *</Form.Label>
            <Form.Select value={collForm.type} onChange={e => setCollForm(p => ({ ...p, type: e.target.value }))}>
              {COLLECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Description</Form.Label>
            <Form.Control as="textarea" rows={2} value={collForm.description} onChange={e => setCollForm(p => ({ ...p, description: e.target.value }))} />
          </Form.Group>
          <Form.Group>
            <Form.Label className="fw-semibold">Color</Form.Label>
            <Form.Control type="color" value={collForm.color} onChange={e => setCollForm(p => ({ ...p, color: e.target.value }))} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNewCollection(false)}>Cancel</Button>
          <Button style={{ background: '#146DF7', border: 'none' }} onClick={handleCreateCollection} disabled={submitting}>
            {submitting ? <Spinner size="sm" /> : 'Create Collection'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
