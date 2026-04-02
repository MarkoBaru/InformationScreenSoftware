import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tilesApi, categoriesApi, TileList, Category } from '../api'
import './PageStyles.css'

export default function TilesPage() {
  const [tiles, setTiles] = useState<TileList[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const navigate = useNavigate()

  // Filters
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterParent, setFilterParent] = useState('')
  const [filterUsage, setFilterUsage] = useState('')
  const [filterFromStart, setFilterFromStart] = useState('')
  const [filterFromEnd, setFilterFromEnd] = useState('')
  const [filterToStart, setFilterToStart] = useState('')
  const [filterToEnd, setFilterToEnd] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'sortOrder' | 'contentType' | 'activeFrom' | 'activeTo' | 'hierarchy'>('sortOrder')

  useEffect(() => {
    tilesApi.list().then(setTiles).catch(() => {})
    categoriesApi.list().then(setAllCategories).catch(() => {})
  }, [])

  const filteredTiles = useMemo(() => {
    let list = tiles.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCategory) {
        if (filterCategory === '__none__') {
          if (t.categoryId !== null) return false
        } else if (t.categoryName !== filterCategory) return false
      }
      if (filterType && t.contentType !== filterType) return false
      if (filterStatus === 'active' && !t.isActive) return false
      if (filterStatus === 'inactive' && t.isActive) return false
      if (filterParent === '__none__' && t.parentTileId !== null) return false
      if (filterParent === '__has__' && t.parentTileId === null) return false
      if (filterParent && filterParent !== '__none__' && filterParent !== '__has__' && t.parentTileId !== Number(filterParent)) return false
      const isUsed = t.assignedScreens.length > 0 || t.parentTileId !== null
      if (filterUsage === 'used' && !isUsed) return false
      if (filterUsage === 'unused' && isUsed) return false
      if (filterFromStart && (!t.activeFrom || t.activeFrom.slice(0, 10) < filterFromStart)) return false
      if (filterFromEnd && (!t.activeFrom || t.activeFrom.slice(0, 10) > filterFromEnd)) return false
      if (filterToStart && (!t.activeTo || t.activeTo.slice(0, 10) < filterToStart)) return false
      if (filterToEnd && (!t.activeTo || t.activeTo.slice(0, 10) > filterToEnd)) return false
      return true
    })

    list.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'contentType') return a.contentType.localeCompare(b.contentType)
      if (sortBy === 'activeFrom') {
        const aFrom = a.activeFrom || ''
        const bFrom = b.activeFrom || ''
        if (!aFrom && !bFrom) return 0
        if (!aFrom) return 1
        if (!bFrom) return -1
        return aFrom.localeCompare(bFrom)
      }
      if (sortBy === 'activeTo') {
        const aTo = a.activeTo || ''
        const bTo = b.activeTo || ''
        if (!aTo && !bTo) return 0
        if (!aTo) return 1
        if (!bTo) return -1
        return aTo.localeCompare(bTo)
      }
      if (sortBy === 'hierarchy') {
        const aDepth = a.parentTileId === null ? 0 : 1
        const bDepth = b.parentTileId === null ? 0 : 1
        if (aDepth !== bDepth) return aDepth - bDepth
        return a.sortOrder - b.sortOrder
      }
      return a.sortOrder - b.sortOrder
    })

    return list
  }, [tiles, search, filterCategory, filterType, filterStatus, filterParent, filterUsage, filterFromStart, filterFromEnd, filterToStart, filterToEnd, sortBy])

  const folderTiles = useMemo(() => tiles.filter(t => t.contentType === 'Folder'), [tiles])

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Inhalt "${title}" wirklich löschen?`)) return
    await tilesApi.delete(id)
    setTiles((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>Inhalte</h1>
        <button className="btn btn--primary" onClick={() => navigate('/tiles/new')}>
          + Neuer Inhalt
        </button>
      </div>

      <div className="filter-bar">
        <input
          className="filter-bar__search"
          type="text"
          placeholder="Suche nach Titel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">Alle Kategorien</option>
          <option value="__none__">Ohne Kategorie</option>
          {allCategories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Alle Typen</option>
          <option value="Link">Link</option>
          <option value="FullscreenImage">Fullscreen-Bild</option>
          <option value="Video">Video</option>
          <option value="Pdf">PDF</option>
          <option value="Article">Beitrag</option>
          <option value="Schichtplan">Schichtplan</option>
          <option value="Stream">Stream</option>
          <option value="Folder">Ordner</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
        </select>
        <select value={filterUsage} onChange={(e) => setFilterUsage(e.target.value)}>
          <option value="">Alle Zuweisungen</option>
          <option value="used">Eingebunden ({tiles.filter(t => t.assignedScreens.length > 0 || t.parentTileId !== null).length})</option>
          <option value="unused">Nicht eingebunden ({tiles.filter(t => t.assignedScreens.length === 0 && t.parentTileId === null).length})</option>
        </select>
        <select value={filterParent} onChange={(e) => setFilterParent(e.target.value)}>
          <option value="">Alle Ebenen</option>
          <option value="__none__">Nur Root-Inhalte</option>
          <option value="__has__">Nur Unterinhalte</option>
          {folderTiles.map((f) => (
            <option key={f.id} value={String(f.id)}>In: {f.title}</option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
          <option value="sortOrder">Sortierung</option>
          <option value="title">Titel</option>
          <option value="contentType">Typ</option>
          <option value="activeFrom">Aktiv von</option>
          <option value="activeTo">Aktiv bis</option>
          <option value="hierarchy">Hierarchie</option>
        </select>
      </div>

      <div className="filter-bar" style={{ paddingTop: 0, alignItems: 'center' }}>
        <div className="filter-bar__date-group">
          <span>Aktiv von:</span>
          <input type="date" value={filterFromStart} onChange={e => setFilterFromStart(e.target.value)} />
          <span>–</span>
          <input type="date" value={filterFromEnd} onChange={e => setFilterFromEnd(e.target.value)} />
        </div>
        <div className="filter-bar__date-group">
          <span>Aktiv bis:</span>
          <input type="date" value={filterToStart} onChange={e => setFilterToStart(e.target.value)} />
          <span>–</span>
          <input type="date" value={filterToEnd} onChange={e => setFilterToEnd(e.target.value)} />
        </div>
        {(filterFromStart || filterFromEnd || filterToStart || filterToEnd) && (
          <button className="btn btn--small" onClick={() => { setFilterFromStart(''); setFilterFromEnd(''); setFilterToStart(''); setFilterToEnd('') }}>
            Datum zurücksetzen
          </button>
        )}
      </div>

      {filteredTiles.length === 0 ? (
        <div className="empty-state">
          <p>{tiles.length === 0 ? 'Noch keine Inhalte vorhanden.' : 'Keine Inhalte für diesen Filter.'}</p>
          {tiles.length === 0 && <Link to="/tiles/new" className="btn btn--primary">Ersten Inhalt erstellen</Link>}
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Bild</th><th>Titel</th><th>Typ</th><th>Kategorie</th>
              <th>Aktiv von</th><th>Aktiv bis</th><th>Status</th><th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredTiles.map((t) => (
              <tr key={t.id}>
                <td>
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt="" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                  ) : (
                    <span style={{ color: '#ccc' }}>—</span>
                  )}
                </td>
                <td>
                  <Link to={`/tiles/${t.id}`}>{t.title}</Link>
                  {t.parentTileId !== null && (
                    <span className="badge badge--muted" style={{ marginLeft: 6, fontSize: '0.7em' }}>Unterinhalt</span>
                  )}
                </td>
                <td>
                  <span className="badge badge--muted">
                    {t.contentType === 'Article' ? 'Beitrag' : t.contentType}
                  </span>
                </td>
                <td>{t.categoryName || '—'}</td>
                <td>{t.activeFrom ? new Date(t.activeFrom).toLocaleDateString('de-CH') : '—'}</td>
                <td>{t.activeTo ? new Date(t.activeTo).toLocaleDateString('de-CH') : '—'}</td>
                <td>
                  <span className={`badge ${t.isActive ? 'badge--success' : 'badge--muted'}`}>
                    {t.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn--small" onClick={() => navigate(`/tiles/${t.id}`)}>Bearbeiten</button>
                    <button className="btn btn--small btn--danger" onClick={() => handleDelete(t.id, t.title)}>Löschen</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
