import { useState, useEffect, useRef } from 'react'
import { mediaApi, MediaAsset } from '../api'
import './PageStyles.css'
import './MediaPage.css'

export default function MediaPage() {
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    mediaApi.list().then(setMedia).catch(() => {})
  }, [])

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
        <div className="media-grid">
          {media.map((m) => (
            <div key={m.id} className="media-card">
              {m.mimeType.startsWith('image/') ? (
                <img src={m.url} alt={m.fileName} className="media-card__preview" />
              ) : (
                <video src={m.url} className="media-card__preview" muted />
              )}
              <div className="media-card__info">
                <p className="media-card__name" title={m.fileName}>{m.fileName}</p>
                <p className="media-card__meta">{formatSize(m.fileSizeBytes)}</p>
                <p className="media-card__url">
                  <code>{m.url}</code>
                </p>
                <button
                  className="btn btn--small btn--danger"
                  onClick={() => handleDelete(m.id, m.fileName)}
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
