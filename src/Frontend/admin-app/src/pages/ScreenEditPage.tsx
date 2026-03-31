import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { screensApi, tilesApi, categoriesApi, TileList, Category } from '../api'
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

  // Tile assign filter state
  const [tileSearch, setTileSearch] = useState('')
  const [tileFilterType, setTileFilterType] = useState('')
  const [tileFilterCat, setTileFilterCat] = useState('')
  const [tileSortBy, setTileSortBy] = useState<'title' | 'contentType' | 'sortOrder'>('title')
  const [allCategories, setAllCategories] = useState<Category[]>([])

  // Drag & drop state
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  useEffect(() => {
    tilesApi.list().then(setAllTiles).catch(() => {})
    categoriesApi.list().then(setAllCategories).catch(() => {})
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

  const contentTypes = useMemo(() =>
    [...new Set(allTiles.map(t => t.contentType))].sort(),
    [allTiles]
  )

  const filteredAssignTiles = useMemo(() => {
    let list = [...allTiles]
    if (tileSearch) {
      const q = tileSearch.toLowerCase()
      list = list.filter(t => t.title.toLowerCase().includes(q))
    }
    if (tileFilterType) list = list.filter(t => t.contentType === tileFilterType)
    if (tileFilterCat) {
      if (tileFilterCat === '__none__') list = list.filter(t => !t.categoryId)
      else list = list.filter(t => t.categoryName === tileFilterCat)
    }
    list.sort((a, b) => {
      // Assigned tiles first
      const aAssigned = assignedTileIds.has(a.id) ? 0 : 1
      const bAssigned = assignedTileIds.has(b.id) ? 0 : 1
      if (aAssigned !== bAssigned) return aAssigned - bAssigned
      if (tileSortBy === 'title') return a.title.localeCompare(b.title)
      if (tileSortBy === 'contentType') return a.contentType.localeCompare(b.contentType)
      return a.sortOrder - b.sortOrder
    })
    return list
  }, [allTiles, tileSearch, tileFilterType, tileFilterCat, tileSortBy, assignedTileIds])

  // Group assigned tiles by category for display (mirrors kiosk rendering)
  const groupedAssigned = (() => {
    const groups: { name: string; tileIds: number[] }[] = []
    const catMap = new Map<string, number[]>()
    for (const tid of assignedOrdered) {
      const tile = allTiles.find((t) => t.id === tid)
      const catName = tile?.categoryName || 'Allgemein'
      if (!catMap.has(catName)) catMap.set(catName, [])
      catMap.get(catName)!.push(tid)
    }
    for (const [name, tileIds] of catMap) {
      groups.push({ name, tileIds })
    }
    return groups
  })()

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
          <label>Inhalte zuweisen ({assignedTileIds.size} ausgewählt)</label>
          {allTiles.length === 0 ? (
            <p className="hint">Noch keine Inhalte vorhanden. Erstellen Sie zuerst Inhalte.</p>
          ) : (
            <>
              <div className="folder-picker-toolbar">
                <input
                  type="text"
                  placeholder="Suche nach Titel..."
                  value={tileSearch}
                  onChange={e => setTileSearch(e.target.value)}
                  className="folder-picker-toolbar__search"
                />
                <select value={tileFilterType} onChange={e => setTileFilterType(e.target.value)}>
                  <option value="">Alle Typen</option>
                  {contentTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                </select>
                <select value={tileFilterCat} onChange={e => setTileFilterCat(e.target.value)}>
                  <option value="">Alle Kategorien</option>
                  <option value="__none__">Ohne Kategorie</option>
                  {allCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <select value={tileSortBy} onChange={e => setTileSortBy(e.target.value as 'title' | 'contentType' | 'sortOrder')}>
                  <option value="title">Name A-Z</option>
                  <option value="contentType">Typ</option>
                  <option value="sortOrder">Sortierung</option>
                </select>
              </div>
              <div className="folder-picker-list">
                {filteredAssignTiles.map((t) => (
                  <div key={t.id} className="folder-child-row" onClick={() => toggleTile(t.id)} style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={assignedTileIds.has(t.id)}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: 'auto', flexShrink: 0 }}
                    />
                    <span className="folder-child-row__icon" style={{ fontSize: '0.9rem' }}>
                      {({'Link':'🔗','FullscreenImage':'🖼️','Video':'🎬','Pdf':'📄','Article':'📰','Schichtplan':'📋','Stream':'📡','Folder':'📂'} as Record<string,string>)[t.contentType] || '📎'}
                    </span>
                    <span className="folder-child-row__title" style={{ color: assignedTileIds.has(t.id) ? 'var(--primary)' : 'var(--text)' }}>{t.title}</span>
                    <span className="folder-child-row__type">{t.contentType}</span>
                    {t.categoryName && <span style={{ fontSize: '0.7rem', background: '#e8f0fe', color: 'var(--primary)', padding: '1px 6px', borderRadius: 8 }}>{t.categoryName}</span>}
                  </div>
                ))}
                {filteredAssignTiles.length === 0 && (
                  <div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: '0.85rem' }}>Keine Inhalte gefunden.</div>
                )}
              </div>
            </>
          )}
        </div>

        {assignedOrdered.length > 1 && (
          <div className="form-group">
            <label>Reihenfolge (Drag & Drop)</label>
            <div className="sortable-list">
              {groupedAssigned.map((group) => (
                <div key={group.name}>
                  <div style={{
                    padding: '6px 12px', marginTop: 8, marginBottom: 4,
                    background: '#f0f0f0', borderRadius: 6, fontWeight: 600,
                    fontSize: '0.85rem', color: '#555'
                  }}>
                    {group.name}
                  </div>
                  {group.tileIds.map((tileId) => {
                    const globalIndex = assignedOrdered.indexOf(tileId)
                    const tile = allTiles.find((t) => t.id === tileId)
                    if (!tile) return null
                    return (
                      <div
                        key={tileId}
                        className="sortable-list__item"
                        draggable
                        onDragStart={() => handleDragStart(globalIndex)}
                        onDragEnter={() => handleDragEnter(globalIndex)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <span className="sortable-list__handle">&#x2807;</span>
                        <span className="sortable-list__pos">{globalIndex + 1}</span>
                        {tile.imageUrl && (
                          <img src={tile.imageUrl} alt="" style={{ width: 36, height: 24, objectFit: 'cover', borderRadius: 3 }} />
                        )}
                        <span className="sortable-list__title">{tile.title}</span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <p className="hint">Tiles sind nach Kategorien gruppiert — so wie im Kiosk angezeigt. Ziehen Sie Einträge um die Reihenfolge innerhalb einer Kategorie zu ändern.</p>
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
