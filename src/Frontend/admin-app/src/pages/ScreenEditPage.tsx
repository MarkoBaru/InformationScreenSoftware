import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { screensApi, tilesApi, TileList } from '../api'
import './PageStyles.css'

type DefaultMode = 'None' | 'Static' | 'Slideshow'

export default function ScreenEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [defaultMode, setDefaultMode] = useState<DefaultMode>('None')
  const [selectedTileId, setSelectedTileId] = useState('')
  const [slideshowTileIds, setSlideshowTileIds] = useState<Set<number>>(new Set())
  const [idleTimeoutSeconds, setIdleTimeoutSeconds] = useState(120)
  const [isActive, setIsActive] = useState(true)
  const [allTiles, setAllTiles] = useState<TileList[]>([])
  const [assignedTileIds, setAssignedTileIds] = useState<Set<number>>(new Set())
  const [orderedTileIds, setOrderedTileIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  // Drag & drop state
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  useEffect(() => {
    tilesApi.list().then(setAllTiles).catch(() => {})
    if (!isNew) {
      screensApi.get(Number(id)).then((s) => {
        setName(s.name)
        setSlug(s.slug)
        setIdleTimeoutSeconds(s.idleTimeoutSeconds)
        setIsActive(s.isActive)
        const tileIds = s.tiles.map((t) => t.id)
        setAssignedTileIds(new Set(tileIds))
        setOrderedTileIds(tileIds)

        // Map backend types to our UI mode
        if (s.defaultContentType === 'Static' && s.defaultContentData) {
          setDefaultMode('Static')
          setSelectedTileId(s.defaultContentData)
        } else if (s.defaultContentType === 'Slideshow' && s.defaultContentData) {
          setDefaultMode('Slideshow')
          try {
            const ids: number[] = JSON.parse(s.defaultContentData)
            setSlideshowTileIds(new Set(ids))
          } catch { /* ignore */ }
        } else {
          setDefaultMode('None')
        }
      }).catch(() => navigate('/screens'))
    }
  }, [id, isNew, navigate])

  const handleSlugify = (value: string) => {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (isNew) setSlug(handleSlugify(value))
  }

  const toggleTile = (tileId: number) => {
    setAssignedTileIds((prev) => {
      const next = new Set(prev)
      if (next.has(tileId)) {
        next.delete(tileId)
        setOrderedTileIds((ids) => ids.filter((id) => id !== tileId))
      } else {
        next.add(tileId)
        setOrderedTileIds((ids) => [...ids, tileId])
      }
      return next
    })
  }

  const toggleSlideshowTile = (tileId: number) => {
    setSlideshowTileIds((prev) => {
      const next = new Set(prev)
      if (next.has(tileId)) next.delete(tileId)
      else next.add(tileId)
      return next
    })
  }

  // Compute backend values from UI state
  const getDefaultContentType = (): string => {
    return defaultMode
  }

  const getDefaultContentData = (): string | undefined => {
    if (defaultMode === 'Static') return selectedTileId || undefined
    if (defaultMode === 'Slideshow') {
      const ids = Array.from(slideshowTileIds)
      return ids.length > 0 ? JSON.stringify(ids) : undefined
    }
    return undefined
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const defaultContentType = getDefaultContentType()
      const defaultContentData = getDefaultContentData()

      if (isNew) {
        const screen = await screensApi.create({
          name, slug, defaultContentType,
          defaultContentData,
          idleTimeoutSeconds,
        })
        if (orderedTileIds.length > 0) {
          await screensApi.updateTiles(screen.id,
            orderedTileIds.filter(tid => assignedTileIds.has(tid)).map((tileId, i) => ({ tileId, sortOrderOverride: i }))
          )
        }
      } else {
        await screensApi.update(Number(id), {
          name, slug, defaultContentType,
          defaultContentData,
          idleTimeoutSeconds, isActive,
        })
        const tileAssignments = orderedTileIds.filter(tid => assignedTileIds.has(tid)).map((tileId, i) => ({ tileId, sortOrderOverride: i }))
        await screensApi.updateTiles(Number(id), tileAssignments)
      }
      navigate('/screens')
    } catch (err) {
      alert('Fehler beim Speichern: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const selectedTile = allTiles.find(t => String(t.id) === selectedTileId)

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index
  }, [])

  const handleDragEnter = useCallback((index: number) => {
    dragOverItem.current = index
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const items = [...orderedTileIds]
    const [dragged] = items.splice(dragItem.current, 1)
    items.splice(dragOverItem.current, 0, dragged)
    setOrderedTileIds(items)
    dragItem.current = null
    dragOverItem.current = null
  }, [orderedTileIds])

  const assignedOrdered = orderedTileIds.filter((tid) => assignedTileIds.has(tid))

  return (
    <div className="page">
      <div className="page__header">
        <h1>{isNew ? 'Neuer Screen' : `Screen bearbeiten: ${name}`}</h1>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name</label>
          <input value={name} onChange={(e) => handleNameChange(e.target.value)} required />
        </div>

        <div className="form-group">
          <label>Slug (URL)</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} required pattern="[-a-z0-9]+" />
          <p className="hint">Kiosk-URL: /kiosk/{slug}</p>
        </div>

        {/* Default Content Mode Selector */}
        <div className="form-group">
          <label>Default-Content Modus</label>
          <select
            value={defaultMode}
            onChange={(e) => setDefaultMode(e.target.value as DefaultMode)}
          >
            <option value="None">Keiner</option>
            <option value="Static">Spezifischer Inhalt</option>
            <option value="Slideshow">Slideshow</option>
          </select>
          <p className="hint">Wird nach dem Idle-Timeout als Standardansicht angezeigt</p>
        </div>

        {/* Specific Tile Selector */}
        {defaultMode === 'Static' && (
          <div className="form-group">
            <label>Inhalt auswählen</label>
            <select
              value={selectedTileId}
              onChange={(e) => setSelectedTileId(e.target.value)}
            >
              <option value="">— Inhalt wählen —</option>
              {allTiles.map((t) => (
                <option key={t.id} value={String(t.id)}>{t.title}</option>
              ))}
            </select>
            {selectedTile && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#f8f8f8', borderRadius: 'var(--radius)' }}>
                {selectedTile.imageUrl && (
                  <img src={selectedTile.imageUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />
                )}
                <span style={{ fontWeight: 600 }}>{selectedTile.title}</span>
              </div>
            )}
          </div>
        )}

        {/* Slideshow Tile Checklist */}
        {defaultMode === 'Slideshow' && (
          <div className="form-group">
            <label>Inhalte für Slideshow</label>
            {allTiles.length === 0 ? (
              <p className="hint">Noch keine Inhalte vorhanden.</p>
            ) : (
              <div className="checkbox-group">
                {allTiles.map((t) => (
                  <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={slideshowTileIds.has(t.id)}
                      onChange={() => toggleSlideshowTile(t.id)}
                    />
                    {t.imageUrl && (
                      <img src={t.imageUrl} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                    )}
                    {t.title}
                  </label>
                ))}
              </div>
            )}
            <p className="hint">Ausgewählte Inhalte werden als Slideshow durchgewechselt</p>
          </div>
        )}

        <div className="form-group">
          <label>Idle-Timeout (Sekunden)</label>
          <input
            type="number" min={10} max={3600}
            value={idleTimeoutSeconds}
            onChange={(e) => setIdleTimeoutSeconds(Number(e.target.value))}
          />
          <p className="hint">Nach dieser Zeit ohne Interaktion wird der Default-Content angezeigt</p>
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
          <label>Inhalte zuweisen</label>
          {allTiles.length === 0 ? (
            <p className="hint">Noch keine Inhalte vorhanden. Erstellen Sie zuerst Inhalte.</p>
          ) : (
            <div className="checkbox-group">
              {allTiles.map((t) => (
                <label key={t.id}>
                  <input
                    type="checkbox"
                    checked={assignedTileIds.has(t.id)}
                    onChange={() => toggleTile(t.id)}
                  />
                  {t.title}
                </label>
              ))}
            </div>
          )}
        </div>

        {assignedOrdered.length > 1 && (
          <div className="form-group">
            <label>Reihenfolge (Drag & Drop)</label>
            <div className="sortable-list">
              {assignedOrdered.map((tileId, index) => {
                const tile = allTiles.find((t) => t.id === tileId)
                if (!tile) return null
                return (
                  <div
                    key={tileId}
                    className="sortable-list__item"
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={() => handleDragEnter(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <span className="sortable-list__handle">⠿</span>
                    <span className="sortable-list__pos">{index + 1}</span>
                    {tile.imageUrl && (
                      <img src={tile.imageUrl} alt="" style={{ width: 36, height: 24, objectFit: 'cover', borderRadius: 3 }} />
                    )}
                    <span className="sortable-list__title">{tile.title}</span>
                    {tile.categoryName && (
                      <span className="badge badge--muted" style={{ marginLeft: 'auto' }}>{tile.categoryName}</span>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="hint">Ziehen Sie die Einträge um die Reihenfolge für diesen Screen zu ändern</p>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
          <button type="button" className="btn" onClick={() => navigate('/screens')}>
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}
