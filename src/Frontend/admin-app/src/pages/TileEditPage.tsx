import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { tilesApi, screensApi, categoriesApi, mediaApi, ScreenList, Category, MediaAsset } from '../api'
import RichTextEditor from '../components/RichTextEditor'
import './PageStyles.css'

type ContentType = 'Link' | 'Video' | 'Pdf' | 'Article' | 'Schichtplan' | 'Stream'

export default function TileEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [contentType, setContentType] = useState<ContentType>('Link')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTarget, setLinkTarget] = useState('Embedded')
  const [articleBody, setArticleBody] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [screenIds, setScreenIds] = useState<Set<number>>(new Set())
  const [allScreens, setAllScreens] = useState<ScreenList[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [showMediaPicker, setShowMediaPicker] = useState<'button' | 'article' | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Schichtplan-spezifische Felder
  const [spBaseUrl, setSpBaseUrl] = useState('https://abb.sharepoint.com/teams/CHCMC-Produktion9/_layouts/15/Doc.aspx?sourcedoc={DOCUMENT-ID}')
  const [spYear, setSpYear] = useState(new Date().getFullYear().toString())
  const [spMonthMode, setSpMonthMode] = useState<string>('current')

  useEffect(() => {
    screensApi.list().then(setAllScreens).catch(() => {})
    categoriesApi.list().then(setAllCategories).catch(() => {})

    if (!isNew) {
      tilesApi.get(Number(id)).then((t) => {
        setTitle(t.title)
        setDescription(t.description || '')
        setImageUrl(t.imageUrl || '')
        setContentType((t.contentType as ContentType) || 'Link')
        setLinkUrl(t.linkUrl || '')
        setLinkTarget(t.linkTarget)
        setArticleBody(t.articleBody || '')
        // Schichtplan-Config aus articleBody laden
        if (t.contentType === 'Schichtplan' && t.articleBody) {
          try {
            const cfg = JSON.parse(t.articleBody)
            setSpBaseUrl(cfg.baseUrl || '')
            setSpYear(cfg.year || new Date().getFullYear().toString())
            setSpMonthMode(cfg.monthMode || 'current')
          } catch { /* ignore parse errors */ }
        }
        setSortOrder(t.sortOrder)
        setIsActive(t.isActive)
        setCategoryId(t.categoryId ?? '')
        screensApi.list().then((screens) => {
          const ids = new Set(
            t.assignedScreens
              .map((name) => screens.find((s) => s.name === name)?.id)
              .filter((id): id is number => id !== undefined)
          )
          setScreenIds(ids)
        })
      }).catch(() => navigate('/tiles'))
    }
  }, [id, isNew, navigate])

  const toggleScreen = (screenId: number) => {
    setScreenIds((prev) => {
      const next = new Set(prev)
      if (next.has(screenId)) next.delete(screenId)
      else next.add(screenId)
      return next
    })
  }

  const handleFileUpload = async (file: File) => {
    const maxSize = 1024 * 1024 * 1024 // 1 GB
    if (file.size > maxSize) {
      alert(`Die Datei "${file.name}" ist zu gross (${(file.size / 1024 / 1024).toFixed(0)} MB).\nMaximal erlaubt: 1 GB.`)
      return
    }
    setUploading(true)
    try {
      const asset = await mediaApi.upload(file)
      setLinkUrl(asset.url)
    } catch (err) {
      alert('Upload fehlgeschlagen: ' + (err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const schichtplanConfig = contentType === 'Schichtplan'
        ? JSON.stringify({ baseUrl: spBaseUrl, year: spYear, monthMode: spMonthMode })
        : undefined

      const data = {
        title, description: description || undefined,
        imageUrl: imageUrl || undefined,
        linkUrl: (contentType === 'Article' || contentType === 'Schichtplan') ? undefined : (linkUrl || undefined),
        linkTarget,
        contentType,
        articleBody: contentType === 'Article' ? articleBody : (contentType === 'Schichtplan' ? schichtplanConfig : undefined),
        sortOrder, categoryId: categoryId === '' ? undefined : categoryId,
        screenIds: Array.from(screenIds),
      }

      if (isNew) {
        await tilesApi.create(data)
      } else {
        await tilesApi.update(Number(id), { ...data, isActive })
      }
      navigate('/tiles')
    } catch (err) {
      alert('Fehler beim Speichern: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const openMediaPicker = (purpose: 'button' | 'article') => {
    mediaApi.list().then(setMediaAssets)
    setShowMediaPicker(purpose)
  }

  const handleMediaPickerUpload = async (file: File) => {
    const maxSize = 1024 * 1024 * 1024 // 1 GB
    if (file.size > maxSize) {
      alert(`Die Datei "${file.name}" ist zu gross (${(file.size / 1024 / 1024).toFixed(0)} MB).\nMaximal erlaubt: 1 GB.`)
      return
    }
    setUploading(true)
    try {
      const asset = await mediaApi.upload(file)
      setMediaAssets(prev => [...prev, asset])
      if (showMediaPicker === 'button') {
        setImageUrl(asset.url)
      } else if (showMediaPicker === 'article') {
        setArticleBody(prev => prev + `<img src="${asset.url}" alt="${asset.fileName}" style="max-width:100%" />`)
      }
      setShowMediaPicker(null)
    } catch (err) {
      alert('Upload fehlgeschlagen: ' + (err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const renderMediaPicker = () => {
    if (!showMediaPicker) return null
    const isImagePicker = showMediaPicker === 'button' || showMediaPicker === 'article'
    const filtered = mediaAssets.filter(m => isImagePicker ? m.mimeType.startsWith('image/') : true)
    const pickerTitle = showMediaPicker === 'button' ? 'Button-Bild wählen' : 'Beitragsbild wählen'

    return (
      <div className="media-picker-overlay" onClick={() => setShowMediaPicker(null)}>
        <div className="media-picker" onClick={(e) => e.stopPropagation()}>
          <div className="media-picker__header">
            <h3>{pickerTitle}</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="btn btn--small btn--primary" style={{ cursor: 'pointer', margin: 0 }}>
                {uploading ? 'Wird hochgeladen...' : 'Bild hochladen'}
                <input
                  type="file" accept="image/*" style={{ display: 'none' }}
                  disabled={uploading}
                  onChange={(e) => { if (e.target.files?.[0]) handleMediaPickerUpload(e.target.files[0]) }}
                />
              </label>
              <span style={{ fontSize: '0.75rem', color: '#888' }}>Max. 1 GB</span>
              <button type="button" className="btn btn--small" onClick={() => setShowMediaPicker(null)}>Schließen</button>
            </div>
          </div>
          <div className="media-picker__grid">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`media-picker__item ${imageUrl === m.url ? 'media-picker__item--selected' : ''}`}
                onClick={() => {
                  if (showMediaPicker === 'button') setImageUrl(m.url)
                  else if (showMediaPicker === 'article') {
                    setArticleBody(prev => prev + `<img src="${m.url}" alt="${m.fileName}" style="max-width:100%" />`)
                  }
                  setShowMediaPicker(null)
                }}
              >
                <img src={m.url} alt={m.fileName} />
                <span>{m.fileName}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-light)', padding: 24 }}>
                Keine Medien vorhanden – laden Sie ein Bild über den Button oben hoch.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>{isNew ? 'Neuer Inhalt' : `Inhalt bearbeiten: ${title}`}</h1>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {/* Content Type Selector */}
        <div className="form-group">
          <label>Inhaltstyp</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              ['Link', 'Link'],
              ['Video', 'Video'],
              ['Pdf', 'PDF'],
              ['Article', 'Beitrag'],
              ['Schichtplan', 'Schichtplan'],
              ['Stream', 'Stream'],
            ] as [ContentType, string][]).map(([val, label]) => (
              <label key={val} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '8px 16px', borderRadius: 6, cursor: 'pointer',
                border: contentType === val ? '2px solid var(--primary)' : '2px solid var(--border)',
                background: contentType === val ? 'var(--primary-light, #e8f0fe)' : 'transparent',
                fontWeight: contentType === val ? 600 : 400,
              }}>
                <input
                  type="radio" name="contentType"
                  value={val} checked={contentType === val}
                  onChange={() => setContentType(val)}
                  style={{ display: 'none' }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Common fields: Title, Description */}
        <div className="form-group">
          <label>Titel</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Beschreibung (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {/* Button image */}
        <div className="form-group">
          <label>Button-Bild</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/api/media/1 oder externe URL" style={{ flex: 1 }} />
            <button type="button" className="btn btn--small btn--primary" onClick={() => openMediaPicker('button')}>
              Aus Medien wählen
            </button>
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="Vorschau" style={{ marginTop: 8, maxWidth: 200, maxHeight: 120, objectFit: 'cover', borderRadius: 4 }} />
          )}
        </div>

        {/* === Type-specific fields === */}

        {/* LINK */}
        {contentType === 'Link' && (
          <>
            <div className="form-group">
              <label>Link-URL</label>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required placeholder="https://..." />
            </div>
            <div className="form-group">
              <label>Link-Ziel</label>
              <select value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)}>
                <option value="Embedded">Eingebettet (iFrame)</option>
                <option value="NewTab">Neuer Tab</option>
                <option value="SameWindow">Gleiches Fenster</option>
              </select>
            </div>
          </>
        )}

        {/* VIDEO */}
        {contentType === 'Video' && (
          <div className="form-group">
            <label>Video</label>
            {linkUrl && (
              <div style={{ marginBottom: 8 }}>
                <video src={linkUrl} controls style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4 }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Video-URL oder hochladen" style={{ flex: 1 }} />
              <label className="btn btn--small btn--primary" style={{ cursor: 'pointer', margin: 0 }}>
                {uploading ? 'Wird hochgeladen...' : 'Video hochladen'}
                <input
                  type="file" accept="video/*" style={{ display: 'none' }}
                  disabled={uploading}
                  onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }}
                />
              </label>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#888' }}>Max. 1 GB · Formate: MP4, WebM, OGG</p>
          </div>
        )}

        {/* PDF */}
        {contentType === 'Pdf' && (
          <div className="form-group">
            <label>PDF</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="PDF-URL oder hochladen" style={{ flex: 1 }} />
              <label className="btn btn--small btn--primary" style={{ cursor: 'pointer', margin: 0 }}>
                {uploading ? 'Wird hochgeladen...' : 'PDF hochladen'}
                <input
                  type="file" accept="application/pdf" style={{ display: 'none' }}
                  disabled={uploading}
                  onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }}
                />
              </label>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#888' }}>Max. 1 GB · Format: PDF</p>
            {linkUrl && (
              <p className="hint" style={{ marginTop: 4 }}>Aktuell: {linkUrl}</p>
            )}
          </div>
        )}

        {/* ARTICLE / Beitrag */}
        {contentType === 'Article' && (
          <div className="form-group">
            <label>Beitragstext</label>
            <RichTextEditor
              value={articleBody}
              onChange={setArticleBody}
              onInsertImage={() => openMediaPicker('article')}
              placeholder="Schreiben Sie hier Ihren Beitrag..."
            />
          </div>
        )}

        {/* SCHICHTPLAN */}
        {contentType === 'Schichtplan' && (
          <>
            <div className="form-group">
              <label>SharePoint Dokument-URL</label>
              <input
                value={spBaseUrl}
                onChange={(e) => setSpBaseUrl(e.target.value)}
                required
                placeholder="https://abb.sharepoint.com/teams/.../Doc.aspx?sourcedoc={...}"
              />
              <p className="hint" style={{ marginTop: 4 }}>
                Die URL findest du in SharePoint unter Einbetten/Embed. Der Teil bis inkl. sourcedoc=&#123;...&#125;
              </p>
            </div>

            <div className="form-group">
              <label>Jahr</label>
              <input
                value={spYear}
                onChange={(e) => setSpYear(e.target.value)}
                required
                placeholder="2025"
              />
            </div>

            <div className="form-group">
              <label>Monatsanzeige</label>
              <select value={spMonthMode} onChange={(e) => setSpMonthMode(e.target.value)}>
                <option value="current">Aktueller Monat</option>
                <option value="next">Nächster Monat</option>
                <option value="nextNext">Übernächster Monat</option>
                <option value="Januar">Januar</option>
                <option value="Februar">Februar</option>
                <option value="März">März</option>
                <option value="April">April</option>
                <option value="Mai">Mai</option>
                <option value="Juni">Juni</option>
                <option value="Juli">Juli</option>
                <option value="August">August</option>
                <option value="September">September</option>
                <option value="Oktober">Oktober</option>
                <option value="November">November</option>
                <option value="Dezember">Dezember</option>
              </select>
            </div>
          </>
        )}

        {/* STREAM */}
        {contentType === 'Stream' && (
          <div className="form-group">
            <label>Stream-URL</label>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              required
              placeholder="rtsp://benutzer:passwort@10.41.213.13:554/h264Preview_01_main"
            />
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#888' }}>
              RTSP-Streams werden automatisch via go2rtc in ein browserkompatibles Format konvertiert.
              Unterstützte Formate: RTSP, RTMP, HTTP-MJPEG, HLS (m3u8).
            </p>
          </div>
        )}

        {/* Common fields continued */}
        <div className="form-group">
          <label>Sortierung</label>
          <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </div>

        <div className="form-group">
          <label>Kategorie</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Keine Kategorie</option>
            {allCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {!isNew && (
          <div className="form-group">
            <label className="toggle-switch">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Aktiv
            </label>
          </div>
        )}

        <div className="form-group">
          <label>Screens zuweisen</label>
          {allScreens.length === 0 ? (
            <p className="hint">Noch keine Screens vorhanden.</p>
          ) : (
            <div className="checkbox-group">
              {allScreens.map((s) => (
                <label key={s.id}>
                  <input
                    type="checkbox"
                    checked={screenIds.has(s.id)}
                    onChange={() => toggleScreen(s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
          <button type="button" className="btn" onClick={() => navigate('/tiles')}>
            Abbrechen
          </button>
        </div>
      </form>

      {renderMediaPicker()}
    </div>
  )
}
