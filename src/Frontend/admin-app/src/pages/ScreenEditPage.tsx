import { useState, useEffect } from 'react'
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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    tilesApi.list().then(setAllTiles).catch(() => {})
    if (!isNew) {
      screensApi.get(Number(id)).then((s) => {
        setName(s.name)
        setSlug(s.slug)
        setIdleTimeoutSeconds(s.idleTimeoutSeconds)
        setIsActive(s.isActive)

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
        await screensApi.create({
          name, slug, defaultContentType,
          defaultContentData,
          idleTimeoutSeconds,
        })
      } else {
        await screensApi.update(Number(id), {
          name, slug, defaultContentType,
          defaultContentData,
          idleTimeoutSeconds, isActive,
        })
      }
      navigate('/screens')
    } catch (err) {
      alert('Fehler beim Speichern: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const selectedTile = allTiles.find(t => String(t.id) === selectedTileId)

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
