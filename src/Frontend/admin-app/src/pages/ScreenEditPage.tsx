import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { screensApi, tilesApi, TileList, Tile } from '../api'
import './PageStyles.css'

type DefaultMode = 'None' | 'Static' | 'Slideshow' | 'Home'

export default function ScreenEditPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [defaultMode, setDefaultMode] = useState<DefaultMode>('None')
  const [selectedTileId, setSelectedTileId] = useState('')
  const [slideshowTileIds, setSlideshowTileIds] = useState<Set<number>>(new Set())
  const [slideshowIntervalSeconds, setSlideshowIntervalSeconds] = useState(10)
  const [idleTimeoutSeconds, setIdleTimeoutSeconds] = useState(120)
  const [isActive, setIsActive] = useState(true)
  const [allTiles, setAllTiles] = useState<TileList[]>([])
  const [saving, setSaving] = useState(false)
  const [parentScreenId, setParentScreenId] = useState<number | null>(null)
  const [parentScreenName, setParentScreenName] = useState<string | null>(null)
  const [inheritedTiles, setInheritedTiles] = useState<Tile[]>([])

  useEffect(() => {
    tilesApi.list().then(setAllTiles).catch(() => {})
    if (!isNew) {
      screensApi.get(Number(id)).then((s) => {
        setName(s.name)
        setSlug(s.slug)
        setIdleTimeoutSeconds(s.idleTimeoutSeconds)
        setSlideshowIntervalSeconds(s.slideshowIntervalSeconds ?? 10)
        setIsActive(s.isActive)
        setParentScreenId(s.parentScreenId ?? null)
        setParentScreenName(s.parentScreenName ?? null)
        setInheritedTiles(s.inheritedTiles ?? [])

        // Map backend types to our UI mode
        if (s.defaultContentType === 'Home') {
          setDefaultMode('Home')
        } else if (s.defaultContentType === 'Static' && s.defaultContentData) {
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
          slideshowIntervalSeconds,
          parentScreenId,
        })
      } else {
        await screensApi.update(Number(id), {
          name, slug, defaultContentType,
          defaultContentData,
          idleTimeoutSeconds, slideshowIntervalSeconds, isActive,
          parentScreenId,
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
        {/* Parent Screen Info Banner */}
        {parentScreenId && (
          <div style={{ padding: '10px 14px', background: '#eef3ff', borderRadius: 'var(--radius)', borderLeft: '3px solid #4f7ef7', marginBottom: 8, fontSize: '0.875rem', color: '#3a5cbf' }}>
            <strong>Child-Screen</strong> — erbt alle Inhalte von <strong>{parentScreenName}</strong>.
            Der Default-Modus, Slug und Idle-Timeout können unabhängig eingestellt werden.
          </div>
        )}

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
            <option value="Home">Home-Seite</option>
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
            <div style={{ marginTop: 12 }}>
              <label>Wechselintervall (Sekunden)</label>
              <input
                type="number" min={3} max={300}
                value={slideshowIntervalSeconds}
                onChange={(e) => setSlideshowIntervalSeconds(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
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

      {/* Inherited Tiles Section (read-only) */}
      {!isNew && inheritedTiles.length > 0 && (
        <div className="form-card" style={{ marginTop: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#3a5cbf' }}>
            Geerbte Inhalte vom Parent „{parentScreenName}"
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#666' }}>
            Diese Inhalte stammen vom Parent-Screen und werden automatisch auf diesem Child-Screen angezeigt.
            Sie können hier nur beim Parent-Screen geändert werden.
          </p>
          <table className="data-table">
            <thead>
              <tr><th>Titel</th><th>Typ</th><th>Kategorie</th><th>Status</th></tr>
            </thead>
            <tbody>
              {inheritedTiles.map((t) => (
                <tr key={t.id} style={{ opacity: 0.7 }}>
                  <td>{t.title}</td>
                  <td><span className="badge badge--muted">{t.contentType}</span></td>
                  <td>{t.categoryName ?? '—'}</td>
                  <td>
                    <span className={`badge ${t.isActive ? 'badge--success' : 'badge--muted'}`}>
                      {t.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
