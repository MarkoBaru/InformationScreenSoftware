import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { screensApi, ScreenList } from '../api'
import './PageStyles.css'

export default function ScreensPage() {
  const [screens, setScreens] = useState<ScreenList[]>([])
  const navigate = useNavigate()

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    screensApi.list().then(setScreens).catch(() => {})
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

  return (
    <div className="page">
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
                    <a className="btn btn--small" href={`http://localhost:5173/kiosk/${s.slug}`} target="_blank" rel="noopener noreferrer">Ansehen</a>
                    <button className="btn btn--small" onClick={() => navigate(`/screens/${s.id}`)}>Bearbeiten</button>
                    <button className="btn btn--small btn--danger" onClick={() => handleDelete(s.id, s.name)}>Löschen</button>
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
