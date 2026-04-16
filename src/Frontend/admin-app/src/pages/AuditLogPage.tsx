import { useState, useEffect } from 'react'
import { auditLogApi, AuditLog } from '../api'
import './PageStyles.css'

const actionColors: Record<string, string> = {
  Login: '#2196f3',
  Erstellt: '#4caf50',
  Bearbeitet: '#ff9800',
  Gelöscht: '#f44336',
  Hochgeladen: '#9c27b0',
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')

  useEffect(() => {
    setLoading(true)
    auditLogApi.list(500)
      .then(setLogs)
      .catch(err => setError('Logs konnten nicht geladen werden: ' + (err as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const users = [...new Set(logs.map(l => l.username))].sort()
  const actions = [...new Set(logs.map(l => l.action))].sort()
  const entityTypes = [...new Set(logs.map(l => l.entityType))].sort()

  const filtered = logs.filter(l => {
    if (filterUser && l.username !== filterUser) return false
    if (filterAction && l.action !== filterAction) return false
    if (filterEntity && l.entityType !== filterEntity) return false
    return true
  })

  if (loading) return <div className="page"><p>Lade Audit-Log...</p></div>
  if (error) return <div className="page"><p style={{ color: 'red' }}>{error}</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Audit-Log</h1>
        <span style={{ color: '#888', fontSize: '0.9rem' }}>{filtered.length} Einträge</span>
      </div>

      <div className="filter-bar">
        <select value={filterUser} onChange={e => setFilterUser(e.target.value)}>
          <option value="">Alle Benutzer</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="">Alle Aktionen</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}>
          <option value="">Alle Bereiche</option>
          {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="audit-table">
          <thead>
            <tr>
              <th>Zeitpunkt</th>
              <th>Benutzer</th>
              <th>Aktion</th>
              <th>Bereich</th>
              <th>ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatTimestamp(log.timestamp)}</td>
                <td><strong>{log.username}</strong></td>
                <td>
                  <span className="audit-badge" style={{ background: actionColors[log.action] || '#666' }}>
                    {log.action}
                  </span>
                </td>
                <td>{log.entityType}</td>
                <td>{log.entityId ?? '–'}</td>
                <td>{log.details ?? '–'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Keine Einträge gefunden</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
