import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tilesApi, screensApi, categoriesApi, TileList, ScreenList, Category } from '../api'
import './PageStyles.css'

export default function TilesPage() {
  const [tiles, setTiles] = useState<TileList[]>([])
  const [allScreens, setAllScreens] = useState<ScreenList[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const navigate = useNavigate()

  // Filters
  const [search, setSearch] = useState('')
  const [filterScreen, setFilterScreen] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    tilesApi.list().then(setTiles).catch(() => {})
    screensApi.list().then(setAllScreens).catch(() => {})
    categoriesApi.list().then(setAllCategories).catch(() => {})
  }, [])

  const filteredTiles = useMemo(() => {
    return tiles.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterScreen && !t.assignedScreens.includes(filterScreen)) return false
      if (filterCategory) {
        if (filterCategory === '__none__') {
          if (t.categoryId !== null) return false
        } else if (t.categoryName !== filterCategory) return false
      }
      if (filterType && t.contentType !== filterType) return false
      if (filterStatus === 'active' && !t.isActive) return false
      if (filterStatus === 'inactive' && t.isActive) return false
      return true
    })
  }, [tiles, search, filterScreen, filterCategory, filterType, filterStatus])

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
        <select value={filterScreen} onChange={(e) => setFilterScreen(e.target.value)}>
          <option value="">Alle Screens</option>
          {allScreens.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
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
          <option value="Video">Video</option>
          <option value="Pdf">PDF</option>
          <option value="Article">Beitrag</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Alle Status</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
        </select>
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
              <th>Screens</th><th>Status</th><th>Aktionen</th>
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
                <td><Link to={`/tiles/${t.id}`}>{t.title}</Link></td>
                <td>
                  <span className="badge badge--muted">
                    {t.contentType === 'Article' ? 'Beitrag' : t.contentType}
                  </span>
                </td>
                <td>{t.categoryName || '—'}</td>
                <td>{t.assignedScreens.join(', ') || '—'}</td>
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
