import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { screensApi, tilesApi, mediaApi, ScreenList, TileList } from '../api'
import './Dashboard.css'

export default function Dashboard() {
  const [screens, setScreens] = useState<ScreenList[]>([])
  const [tiles, setTiles] = useState<TileList[]>([])
  const [mediaCount, setMediaCount] = useState(0)

  useEffect(() => {
    screensApi.list().then(setScreens).catch(() => {})
    tilesApi.list().then(setTiles).catch(() => {})
    mediaApi.list().then((m) => setMediaCount(m.length)).catch(() => {})
  }, [])

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
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

      <div className="dashboard__sections">
        <section>
          <h2>Screens</h2>
          {screens.length === 0 ? (
            <p className="empty">Noch keine Screens erstellt. <Link to="/screens/new">Jetzt erstellen</Link></p>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Name</th><th>Slug</th><th>Inhalte</th><th>Status</th></tr>
              </thead>
              <tbody>
                {screens.map((s) => (
                  <tr key={s.id}>
                    <td><Link to={`/screens/${s.id}`}>{s.name}</Link></td>
                    <td><code>{s.slug}</code></td>
                    <td>{s.tileCount}</td>
                    <td><span className={`badge ${s.isActive ? 'badge--success' : 'badge--muted'}`}>{s.isActive ? 'Aktiv' : 'Inaktiv'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
