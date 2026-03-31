import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { tilesApi, screensApi, categoriesApi, mediaApi, ScreenList, Category, MediaAsset, TileList } from '../api'
import RichTextEditor from '../components/RichTextEditor'
import './PageStyles.css'

type ContentType = 'Link' | 'FullscreenImage' | 'Video' | 'Pdf' | 'Article' | 'Schichtplan' | 'Stream' | 'Folder'

const CONTENT_ICONS: Record<string, string> = {
  Link: '\ud83d\udd17', FullscreenImage: '\ud83d\uddbc\ufe0f', Video: '\ud83c\udfac', Pdf: '\ud83d\udcc4',
  Article: '\ud83d\udcf0', Schichtplan: '\ud83d\udccb', Stream: '\ud83d\udce1', Folder: '\ud83d\udcc2',
}

function FolderChildrenManager({ folderId, allTiles, onTilesChanged }: {
  folderId: number | null
  allTiles: TileList[]
  onTilesChanged: () => void
}) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'contentType' | 'sortOrder'>('sortOrder')
  const [filterType, setFilterType] = useState('')
  const [busy, setBusy] = useState<number | null>(null)

  const childTiles = useMemo(() =>
    folderId ? allTiles.filter(t => t.parentTileId === folderId) : [],
    [allTiles, folderId]
  )

  const availableTiles = useMemo(() => {
    let list = allTiles.filter(t =>
      t.id !== folderId &&
      t.parentTileId !== folderId &&
      t.contentType !== 'Folder'
    )
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.contentType.toLowerCase().includes(q))
    }
    if (filterType) list = list.filter(t => t.contentType === filterType)

    list.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'contentType') return a.contentType.localeCompare(b.contentType)
      return a.sortOrder - b.sortOrder
    })
    return list
  }, [allTiles, folderId, search, filterType, sortBy])

  const contentTypes = useMemo(() =>
    [...new Set(allTiles.filter(t => t.id !== folderId && t.contentType !== 'Folder').map(t => t.contentType))].sort(),
    [allTiles, folderId]
  )

  const assignChild = async (tileId: number) => {
    setBusy(tileId)
    try {
      const t = allTiles.find(x => x.id === tileId)
      if (!t) return
      await tilesApi.update(tileId, {
        title: t.title, description: t.description || undefined,
        imageUrl: t.imageUrl || undefined, linkUrl: t.linkUrl || undefined,
        linkTarget: t.linkTarget, contentType: t.contentType,
        articleBody: t.articleBody || undefined, sortOrder: t.sortOrder,
        isActive: t.isActive, activeFrom: t.activeFrom || undefined,
        activeTo: t.activeTo || undefined,
        parentTileId: folderId!,
        categoryId: t.categoryId || undefined,
        screenIds: t.assignedScreens?.map(name => allTiles.find(x => x.assignedScreens?.includes(name))?.id).filter((x): x is number => !!x),
      })
      onTilesChanged()
    } catch (err) {
      alert('Fehler: ' + (err as Error).message)
    } finally { setBusy(null) }
  }

  const removeChild = async (tileId: number) => {
    setBusy(tileId)
    try {
      const t = allTiles.find(x => x.id === tileId)
      if (!t) return
      await tilesApi.update(tileId, {
        title: t.title, description: t.description || undefined,
        imageUrl: t.imageUrl || undefined, linkUrl: t.linkUrl || undefined,
        linkTarget: t.linkTarget, contentType: t.contentType,
        articleBody: t.articleBody || undefined, sortOrder: t.sortOrder,
        isActive: t.isActive, activeFrom: t.activeFrom || undefined,
        activeTo: t.activeTo || undefined,
        parentTileId: undefined,
        categoryId: t.categoryId || undefined,
      })
      onTilesChanged()
    } catch (err) {
      alert('Fehler: ' + (err as Error).message)
    } finally { setBusy(null) }
  }

  if (!folderId) {
    return (
      <div className="form-group">
        <p style={{ padding: '12px 16px', background: 'var(--primary-light, #e8f0fe)', borderRadius: 6, color: 'var(--text)', margin: 0 }}>
          Speichern Sie den Ordner zuerst, um Inhalte zuweisen zu können.
        </p>
      </div>
    )
  }

  return (
    <div className="form-group">
      <label>Ordner-Inhalte ({childTiles.length})</label>
      <p style={{ padding: '8px 12px', background: 'var(--primary-light, #e8f0fe)', borderRadius: 6, fontSize: '0.85rem', margin: '0 0 12px' }}>
        Im Kiosk-Modus öffnet ein Klick auf diesen Ordner eine Unterseite mit den zugewiesenen Inhalten.
      </p>

      {/* Current children */}
      {childTiles.length > 0 && (
        <div className="folder-children__list" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#555' }}>Zugewiesene Inhalte</div>
          {childTiles.map(t => (
            <div key={t.id} className="folder-child-row">
              <span className="folder-child-row__icon">{CONTENT_ICONS[t.contentType] || '\ud83d\udcce'}</span>
              <Link to={`/tiles/${t.id}`} className="folder-child-row__title">{t.title}</Link>
              <span className="folder-child-row__type">{t.contentType}</span>
              <span className={`badge ${t.isActive ? 'badge--success' : 'badge--muted'}`} style={{ fontSize: '0.7rem' }}>
                {t.isActive ? 'Aktiv' : 'Inaktiv'}
              </span>
              <button
                type="button"
                className="btn btn--small btn--danger"
                disabled={busy === t.id}
                onClick={() => removeChild(t.id)}
              >
                {busy === t.id ? '...' : 'Entfernen'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Picker for available tiles */}
      <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6, color: '#555' }}>Inhalt hinzufügen</div>
      <div className="folder-picker-toolbar">
        <input
          type="text"
          placeholder="Suche nach Titel..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="folder-picker-toolbar__search"
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Alle Typen</option>
          {contentTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'title' | 'contentType' | 'sortOrder')}>
          <option value="sortOrder">Sortierung</option>
          <option value="title">Name A-Z</option>
          <option value="contentType">Typ</option>
        </select>
      </div>

      <div className="folder-picker-list">
        {availableTiles.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: '0.85rem' }}>
            {search || filterType ? 'Keine Inhalte gefunden.' : 'Alle Inhalte sind bereits zugewiesen.'}
          </div>
        ) : (
          availableTiles.map(t => (
            <div key={t.id} className="folder-child-row folder-child-row--available">
              <span className="folder-child-row__icon">{CONTENT_ICONS[t.contentType] || '\ud83d\udcce'}</span>
              <span className="folder-child-row__title" style={{ color: 'var(--text)' }}>{t.title}</span>
              <span className="folder-child-row__type">{t.contentType}</span>
              {t.parentTileId && (
                <span style={{ fontSize: '0.7rem', color: '#c62828' }}>
                  in anderem Ordner
                </span>
              )}
              <button
                type="button"
                className="btn btn--small btn--primary"
                disabled={busy === t.id}
                onClick={() => assignChild(t.id)}
              >
                {busy === t.id ? '...' : 'Hinzufügen'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

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
  const [activeFrom, setActiveFrom] = useState('')
  const [activeTo, setActiveTo] = useState('')
  const [parentTileId, setParentTileId] = useState<number | ''>('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [screenIds, setScreenIds] = useState<Set<number>>(new Set())
  const [allScreens, setAllScreens] = useState<ScreenList[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [showMediaPicker, setShowMediaPicker] = useState<'button' | 'article' | 'image' | 'video' | 'pdf' | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allTiles, setAllTiles] = useState<TileList[]>([])

  // Schichtplan-spezifische Felder
  const [spBaseUrl, setSpBaseUrl] = useState('https://abb.sharepoint.com/teams/CHCMC-Produktion9/_layouts/15/Doc.aspx?sourcedoc={DOCUMENT-ID}')
  const [spYear, setSpYear] = useState(new Date().getFullYear().toString())
  const [spMonthMode, setSpMonthMode] = useState<string>('current')

  useEffect(() => {
    screensApi.list().then(setAllScreens).catch(() => {})
    categoriesApi.list().then(setAllCategories).catch(() => {})
    tilesApi.list().then(setAllTiles).catch(() => {})

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
        setActiveFrom(t.activeFrom ? t.activeFrom.substring(0, 16) : '')
        setActiveTo(t.activeTo ? t.activeTo.substring(0, 16) : '')
        setParentTileId(t.parentTileId ?? '')
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
        linkUrl: (contentType === 'Article' || contentType === 'Schichtplan' || contentType === 'Folder') ? undefined : (linkUrl || undefined),
        linkTarget,
        contentType,
        articleBody: contentType === 'Article' ? articleBody : (contentType === 'Schichtplan' ? schichtplanConfig : undefined),
        sortOrder, categoryId: categoryId === '' ? undefined : categoryId,
        activeFrom: activeFrom ? new Date(activeFrom).toISOString() : undefined,
        activeTo: activeTo ? new Date(activeTo).toISOString() : undefined,
        parentTileId: parentTileId === '' ? undefined : parentTileId,
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

  const openMediaPicker = (purpose: 'button' | 'article' | 'image' | 'video' | 'pdf') => {
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
      } else if (showMediaPicker === 'image' || showMediaPicker === 'video' || showMediaPicker === 'pdf') {
        setLinkUrl(asset.url)
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
    const pickerConfig: Record<string, { filter: (m: MediaAsset) => boolean; title: string; accept: string; uploadLabel: string; emptyText: string }> = {
      button:  { filter: m => m.mimeType.startsWith('image/'), title: 'Button-Bild wählen', accept: 'image/*', uploadLabel: 'Bild hochladen', emptyText: 'Keine Bilder vorhanden' },
      article: { filter: m => m.mimeType.startsWith('image/'), title: 'Beitragsbild wählen', accept: 'image/*', uploadLabel: 'Bild hochladen', emptyText: 'Keine Bilder vorhanden' },
      image:   { filter: m => m.mimeType.startsWith('image/'), title: 'Bild wählen', accept: 'image/*', uploadLabel: 'Bild hochladen', emptyText: 'Keine Bilder vorhanden' },
      video:   { filter: m => m.mimeType.startsWith('video/'), title: 'Video wählen', accept: 'video/*', uploadLabel: 'Video hochladen', emptyText: 'Keine Videos vorhanden' },
      pdf:     { filter: m => m.mimeType === 'application/pdf', title: 'PDF wählen', accept: 'application/pdf', uploadLabel: 'PDF hochladen', emptyText: 'Keine PDFs vorhanden' },
    }
    const cfg = pickerConfig[showMediaPicker]
    const filtered = mediaAssets.filter(cfg.filter)
    const selectedUrl = showMediaPicker === 'button' ? imageUrl : linkUrl

    return (
      <div className="media-picker-overlay" onClick={() => setShowMediaPicker(null)}>
        <div className="media-picker" onClick={(e) => e.stopPropagation()}>
          <div className="media-picker__header">
            <h3>{cfg.title}</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="btn btn--small btn--primary" style={{ cursor: 'pointer', margin: 0 }}>
                {uploading ? 'Wird hochgeladen...' : cfg.uploadLabel}
                <input
                  type="file" accept={cfg.accept} style={{ display: 'none' }}
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
                className={`media-picker__item ${selectedUrl === m.url ? 'media-picker__item--selected' : ''}`}
                onClick={() => {
                  if (showMediaPicker === 'button') setImageUrl(m.url)
                  else if (showMediaPicker === 'article') {
                    setArticleBody(prev => prev + `<img src="${m.url}" alt="${m.fileName}" style="max-width:100%" />`)
                  } else {
                    setLinkUrl(m.url)
                  }
                  setShowMediaPicker(null)
                }}
              >
                {m.mimeType.startsWith('image/') && <img src={m.url} alt={m.fileName} />}
                {m.mimeType.startsWith('video/') && <video src={m.url} style={{ width: '100%', height: 80, objectFit: 'cover' }} />}
                {m.mimeType === 'application/pdf' && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, background: 'var(--bg-secondary, #f5f5f5)', borderRadius: 4, fontSize: 24 }}>PDF</div>}
                <span>{m.fileName}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-light)', padding: 24 }}>
                {cfg.emptyText} – laden Sie eine Datei über den Button oben hoch.
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
              ['FullscreenImage', 'Bild'],
              ['Video', 'Video'],
              ['Pdf', 'PDF'],
              ['Article', 'Beitrag'],
              ['Schichtplan', 'Schichtplan'],
              ['Stream', 'Stream'],
              ['Folder', 'Ordner'],
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

        {/* FULLSCREEN IMAGE */}
        {contentType === 'FullscreenImage' && (
          <div className="form-group">
            <label>Vollbild-Bild</label>
            {linkUrl && (
              <div style={{ marginBottom: 8 }}>
                <img src={linkUrl} alt="Vorschau" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 4 }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Bild-URL oder aus Medien wählen" style={{ flex: 1 }} />
              <button type="button" className="btn btn--small btn--primary" onClick={() => openMediaPicker('image')}>
                Aus Medien wählen
              </button>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#888' }}>Dieses Bild wird im Kiosk-Modus als Vollbild angezeigt.</p>
          </div>
        )}

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
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Video-URL oder aus Medien wählen" style={{ flex: 1 }} />
              <button type="button" className="btn btn--small btn--primary" onClick={() => openMediaPicker('video')}>
                Aus Medien wählen
              </button>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#888' }}>Max. 1 GB · Formate: MP4, WebM, OGG</p>
          </div>
        )}

        {/* PDF */}
        {contentType === 'Pdf' && (
          <div className="form-group">
            <label>PDF</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="PDF-URL oder aus Medien wählen" style={{ flex: 1 }} />
              <button type="button" className="btn btn--small btn--primary" onClick={() => openMediaPicker('pdf')}>
                Aus Medien wählen
              </button>
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

        {/* FOLDER / Ordner */}
        {contentType === 'Folder' && (
          <FolderChildrenManager
            folderId={isNew ? null : Number(id)}
            allTiles={allTiles}
            onTilesChanged={() => tilesApi.list().then(setAllTiles)}
          />
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
          <label>Aktiv schalten zwischen</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="datetime-local"
              value={activeFrom}
              onChange={(e) => setActiveFrom(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
            <span>bis</span>
            <input
              type="datetime-local"
              value={activeTo}
              onChange={(e) => setActiveTo(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#888' }}>
            Leer lassen = immer aktiv (sofern Aktiv-Toggle an ist). Wird nur einer der Werte gesetzt, gilt dieser als einzige Grenze.
          </p>
        </div>

        <div className="form-group">
          <label>Übergeordneter Ordner</label>
          <select value={parentTileId} onChange={(e) => setParentTileId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="">Kein Ordner (Hauptebene)</option>
            {allTiles.filter(t => t.contentType === 'Folder' && t.id !== Number(id)).map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#888' }}>
            Diesem Inhalt einem Ordner zuweisen, um ihn als Unterinhalt anzuzeigen.
          </p>
        </div>

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
