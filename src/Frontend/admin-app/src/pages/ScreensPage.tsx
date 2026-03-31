import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { screensApi, tilesApi, mediaApi, ScreenList, TileList } from '../api'
import './PageStyles.css'

export default function ScreensPage() {
  const [screens, setScreens] = useState<ScreenList[]>([])
  const [tiles, setTiles] = useState<TileList[]>([])
  const [mediaCount, setMediaCount] = useState(0)
  const navigate = useNavigate()

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Duplicate dialog state
  const [dupSource, setDupSource] = useState<ScreenList | null>(null)
  const [dupName, setDupName] = useState('')
  const [dupSlug, setDupSlug] = useState('')
  const [dupSaving, setDupSaving] = useState(false)

  useEffect(() => {
    screensApi.list().then(setScreens).catch(() => {})
    tilesApi.list().then(setTiles).catch(() => {})
    mediaApi.list().then((m) => setMediaCount(m.length)).catch(() => {})
  }, [])

  const filteredScreens = useMemo(() => {
    return screens.filter((s) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.slug.toLowerCase().includes(search.toLowerCase())) return false
      if (filterStatus === 'active' && !s.isActive) return false
      if (filterStatus === 'inactive' && s.isActive) return false
      return true
    })
  }, [screens, search, filterStatus])

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Screen "${name}" wirklich löschen?`)) return
    await screensApi.delete(id)
    setScreens((prev) => prev.filter((s) => s.id !== id))
  }

  const slugify = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const openDuplicate = (screen: ScreenList) => {
    const newName = `Kopie von ${screen.name}`
    setDupSource(screen)
    setDupName(newName)
    setDupSlug(slugify(newName))
  }

  const handleDuplicate = async () => {
    if (!dupSource || !dupName.trim() || !dupSlug.trim()) return
    setDupSaving(true)
    try {
      const original = await screensApi.get(dupSource.id)
      const created = await screensApi.create({
        name: dupName.trim(),
        slug: dupSlug.trim(),
        defaultContentType: original.defaultContentType,
        defaultContentData: original.defaultContentData ?? undefined,
        idleTimeoutSeconds: original.idleTimeoutSeconds,
      })
      if (original.tiles.length > 0) {
        await screensApi.updateTiles(
          created.id,
          original.tiles.map((t, i) => ({ tileId: t.id, sortOrderOverride: i }))
        )
      }
      setDupSource(null)
      const updated = await screensApi.list()
      setScreens(updated)
    } catch (err) {
      alert('Fehler beim Duplizieren: ' + (err as Error).message)
    } finally {
      setDupSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="stats-grid">
        <Link to="/screens" className="stat-card">
          <div className="stat-card__number">{screens.length}</div>
          <div className="stat-card__label">Screens</div>
        </Link>
        <Link to="/tiles" className="stat-card">
          <div className="stat-card__number">{tiles.length}</div>
          <div className="stat-card__label">Inhalte</div>
        </Link>
        <Link to="/media" className="stat-card">
          <div className="stat-card__number">{mediaCount}</div>
          <div className="stat-card__label">Medien</div>
        </Link>
        <div className="stat-card">
          <div className="stat-card__number">{tiles.filter(t => t.isActive).length}</div>
          <div className="stat-card__label">Aktive Inhalte</div>
        </div>
      </div>

      <div className="page__header">
        <h1>Screens</h1>
        <button className="btn btn--primary" onClick={() => navigate('/screens/new')}>
          + Neuer Screen
        </button>
      </div>

      <div className="filter-bar">
        <input
          className="filter-bar__search"
          type="text"
          placeholder="Suche nach Name oder Slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
        </select>
      </div>

      {filteredScreens.length === 0 ? (
        <div className="empty-state">
          <p>{screens.length === 0 ? 'Noch keine Screens vorhanden.' : 'Keine Screens für diesen Filter.'}</p>
          {screens.length === 0 && <Link to="/screens/new" className="btn btn--primary">Ersten Screen erstellen</Link>}
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Slug</th><th>Default-Content</th>
              <th>Idle (s)</th><th>Inhalte</th><th>Status</th><th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredScreens.map((s) => (
              <tr key={s.id}>
                <td><Link to={`/screens/${s.id}`}>{s.name}</Link></td>
                <td><code>{s.slug}</code></td>
                <td>{s.defaultContentType}</td>
                <td>{s.idleTimeoutSeconds}</td>
                <td>{s.tileCount}</td>
                <td>
                  <span className={`badge ${s.isActive ? 'badge--success' : 'badge--muted'}`}>
                    {s.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <a className="btn btn--small" href={`/kiosk/${s.slug}`} target="_blank" rel="noopener noreferrer">Ansehen</a>
                    <button className="btn btn--small" onClick={() => navigate(`/screens/${s.id}`)}>Bearbeiten</button>
                    <button className="btn btn--small" onClick={() => openDuplicate(s)}>Duplizieren</button>
                    <button className="btn btn--small btn--danger" onClick={() => handleDelete(s.id, s.name)}>Löschen</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {dupSource && (
        <div className="media-picker-overlay" onClick={() => !dupSaving && setDupSource(null)}>
          <div className="media-picker" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="media-picker__header">
              <h3>Screen duplizieren</h3>
              <button type="button" className="btn btn--small" onClick={() => setDupSource(null)} disabled={dupSaving}>Schließen</button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
                Erstellt eine Kopie von <strong>{dupSource.name}</strong> mit allen zugewiesenen Inhalten.
              </p>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Name</label>
                <input
                  value={dupName}
                  onChange={(e) => { setDupName(e.target.value); setDupSlug(slugify(e.target.value)) }}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Slug (URL)</label>
                <input
                  value={dupSlug}
                  onChange={(e) => setDupSlug(e.target.value)}
                  required
                  pattern="[-a-z0-9]+"
                />
                <p className="hint">Kiosk-URL: /kiosk/{dupSlug}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn" onClick={() => setDupSource(null)} disabled={dupSaving}>Abbrechen</button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleDuplicate}
                  disabled={dupSaving || !dupName.trim() || !dupSlug.trim()}
                >
                  {dupSaving ? 'Wird erstellt...' : 'Duplizieren'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
