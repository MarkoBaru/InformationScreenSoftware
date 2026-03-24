import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { tilesApi, TileList } from '../api'
import './PageStyles.css'

export default function TilesPage() {
  const [tiles, setTiles] = useState<TileList[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    tilesApi.list().then(setTiles).catch(() => {})
  }, [])

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

      {tiles.length === 0 ? (
        <div className="empty-state">
          <p>Noch keine Inhalte vorhanden.</p>
          <Link to="/tiles/new" className="btn btn--primary">Ersten Inhalt erstellen</Link>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Bild</th><th>Titel</th><th>Link</th>
              <th>Screens</th><th>Status</th><th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {tiles.map((t) => (
              <tr key={t.id}>
                <td>
                  {t.imageUrl ? (
                    <img src={t.imageUrl} alt="" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                  ) : (
                    <span style={{ color: '#ccc' }}>—</span>
                  )}
                </td>
                <td><Link to={`/tiles/${t.id}`}>{t.title}</Link></td>
                <td><code>{(t.linkUrl || '').length > 40 ? (t.linkUrl || '').substring(0, 40) + '...' : (t.linkUrl || '—')}</code></td>
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
