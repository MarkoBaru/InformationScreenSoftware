import { useState, useEffect, useRef, useMemo } from 'react'
import { mediaApi, MediaAsset, tilesApi, TileList } from '../api'
import './PageStyles.css'
import './MediaPage.css'

export default function MediaPage() {
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [allTiles, setAllTiles] = useState<TileList[]>([])
  const [uploading, setUploading] = useState(false)
  const [filterUsage, setFilterUsage] = useState<'' | 'used' | 'unused'>('')
  const [filterType, setFilterType] = useState<'' | 'image' | 'video' | 'pdf'>('')
  const [searchName, setSearchName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    mediaApi.list().then(setMedia).catch(() => {})
    tilesApi.list().then(setAllTiles).catch(() => {})
  }, [])

  const usedUrls = useMemo(() => {
    const urls = new Set<string>()
    for (const t of allTiles) {
      if (t.imageUrl) urls.add(t.imageUrl)
      if (t.linkUrl) urls.add(t.linkUrl)
    }
    return urls
  }, [allTiles])

  const filteredMedia = useMemo(() => {
    let list = media
    if (searchName) {
      const q = searchName.toLowerCase()
      list = list.filter(m =>
        m.fileName.toLowerCase().includes(q) ||
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.tags && m.tags.toLowerCase().includes(q))
      )
    }
    if (filterType === 'image') list = list.filter(m => m.mimeType.startsWith('image/'))
    if (filterType === 'video') list = list.filter(m => m.mimeType.startsWith('video/'))
    if (filterType === 'pdf') list = list.filter(m => m.mimeType === 'application/pdf')
    if (filterUsage === 'used') list = list.filter(m => usedUrls.has(m.url))
    if (filterUsage === 'unused') list = list.filter(m => !usedUrls.has(m.url))
    return list
  }, [media, searchName, filterType, filterUsage, usedUrls])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    const maxSize = 1024 * 1024 * 1024 // 1 GB
    const tooLarge = Array.from(files).filter(f => f.size > maxSize)
    if (tooLarge.length > 0) {
      alert(`Folgende Dateien sind zu gross (max. 1 GB):\n${tooLarge.map(f => `• ${f.name} (${(f.size / 1024 / 1024).toFixed(0)} MB)`).join('\n')}`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const asset = await mediaApi.upload(file)
        setMedia((prev) => [asset, ...prev])
      }
    } catch (err) {
      alert('Upload fehlgeschlagen: ' + (err as Error).message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`"${name}" wirklich löschen?`)) return
    await mediaApi.delete(id)
    setMedia((prev) => prev.filter((m) => m.id !== id))
  }

  const startEditing = (m: MediaAsset) => {
    setEditingId(m.id)
    setEditTitle(m.title || '')
    setEditDescription(m.description || '')
    setEditTags(m.tags || '')
  }

  const saveMetadata = async (id: number) => {
    try {
      const updated = await mediaApi.update(id, {
        title: editTitle || undefined,
        description: editDescription || undefined,
        tags: editTags || undefined,
      })
      setMedia(prev => prev.map(m => m.id === id ? updated : m))
      setEditingId(null)
    } catch (err) {
      alert('Fehler beim Speichern: ' + (err as Error).message)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>Medien</h1>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <label className="btn btn--primary" style={{ cursor: 'pointer' }}>
            {uploading ? 'Wird hochgeladen...' : '+ Datei hochladen'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              multiple
              onChange={handleUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>
          <span style={{ fontSize: '0.75rem', color: '#888' }}>Max. 1 GB · Bilder, Videos, PDF</span>
        </div>
      </div>

      {media.length === 0 ? (
        <div className="empty-state">
          <p>Noch keine Medien hochgeladen.</p>
        </div>
      ) : (
        <>
          <div className="filter-bar" style={{ marginBottom: 16 }}>
            <input
              className="filter-bar__search"
              type="text"
              placeholder="Suche nach Name, Titel, Tags..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
            />
            <select value={filterType} onChange={e => setFilterType(e.target.value as '' | 'image' | 'video' | 'pdf')}>
              <option value="">Alle Typen</option>
              <option value="image">Bilder ({media.filter(m => m.mimeType.startsWith('image/')).length})</option>
              <option value="video">Videos ({media.filter(m => m.mimeType.startsWith('video/')).length})</option>
              <option value="pdf">PDFs ({media.filter(m => m.mimeType === 'application/pdf').length})</option>
            </select>
            <select value={filterUsage} onChange={e => setFilterUsage(e.target.value as '' | 'used' | 'unused')}>
              <option value="">Alle ({media.length})</option>
              <option value="used">Verwendet ({media.filter(m => usedUrls.has(m.url)).length})</option>
              <option value="unused">Unverwendet ({media.filter(m => !usedUrls.has(m.url)).length})</option>
            </select>
          </div>
          {filteredMedia.length === 0 ? (
            <div className="empty-state"><p>Keine Medien für diesen Filter.</p></div>
          ) : (
          <div className="media-grid">
            {filteredMedia.map((m) => (
            <div key={m.id} className="media-card">
              {m.mimeType.startsWith('image/') ? (
                <img src={m.url} alt={m.fileName} className="media-card__preview" />
              ) : m.mimeType.startsWith('video/') ? (
                <video src={m.url} className="media-card__preview" muted />
              ) : (
                <div className="media-card__preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontSize: 28, fontWeight: 700, color: '#999' }}>PDF</div>
              )}
              <div className="media-card__info">
                {editingId === m.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Titel" style={{ fontSize: '0.8rem', padding: '2px 6px' }} />
                    <input value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Beschreibung" style={{ fontSize: '0.8rem', padding: '2px 6px' }} />
                    <input value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="Tags (kommagetrennt)" style={{ fontSize: '0.8rem', padding: '2px 6px' }} />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn--small btn--primary" onClick={() => saveMetadata(m.id)}>Speichern</button>
                      <button className="btn btn--small" onClick={() => setEditingId(null)}>Abbrechen</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="media-card__name" title={m.title || m.fileName}>
                      {m.title || m.fileName}
                    </p>
                    {m.title && <p style={{ fontSize: '0.7rem', color: '#999', margin: '0 0 2px' }}>{m.fileName}</p>}
                    {m.description && <p style={{ fontSize: '0.75rem', color: '#666', margin: '0 0 2px' }}>{m.description}</p>}
                    {m.tags && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', margin: '2px 0' }}>
                        {m.tags.split(',').map((tag, i) => (
                          <span key={i} style={{ fontSize: '0.65rem', background: '#e0e0e0', borderRadius: 8, padding: '1px 6px' }}>{tag.trim()}</span>
                        ))}
                      </div>
                    )}
                    <p className="media-card__meta">
                      {formatSize(m.fileSizeBytes)}
                      {' · '}
                      <span style={{ color: usedUrls.has(m.url) ? '#2e7d32' : '#c62828', fontWeight: 600 }}>
                        {usedUrls.has(m.url) ? 'Verwendet' : 'Unverwendet'}
                      </span>
                    </p>
                    <p className="media-card__url">
                      <code>{m.url}</code>
                    </p>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn--small" onClick={() => startEditing(m)}>Bearbeiten</button>
                      <button className="btn btn--small btn--danger" onClick={() => handleDelete(m.id, m.title || m.fileName)}>Löschen</button>
                    </div>
                  </>
                )}
              </div>
            </div>
            ))}
          </div>
          )}
        </>
      )}
    </div>
  )
}
