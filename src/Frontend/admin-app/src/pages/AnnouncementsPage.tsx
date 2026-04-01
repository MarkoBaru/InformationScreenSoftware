import { useState, useEffect, useMemo } from 'react'
import { announcementsApi, screensApi, Announcement, ScreenList } from '../api'
import './PageStyles.css'

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([])
  const [allScreens, setAllScreens] = useState<ScreenList[]>([])
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [isNew, setIsNew] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [activeFrom, setActiveFrom] = useState('')
  const [activeTo, setActiveTo] = useState('')
  const [excludedScreenIds, setExcludedScreenIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  const [filterStatus, setFilterStatus] = useState('')
  const [loadError, setLoadError] = useState('')

  const load = () => {
    setLoadError('')
    announcementsApi.list().then(setItems).catch(err => {
      console.error('Announcements load failed:', err)
      setLoadError('Nachrichten konnten nicht geladen werden: ' + (err as Error).message)
    })
    screensApi.list().then(setAllScreens).catch(() => {})
  }

  useEffect(load, [])

  const filtered = useMemo(() => {
    let list = items
    if (filterStatus === 'active') list = list.filter(a => a.isActive)
    if (filterStatus === 'inactive') list = list.filter(a => !a.isActive)
    return list
  }, [items, filterStatus])

  const openNew = () => {
    setIsNew(true)
    setEditing(null)
    setTitle('')
    setMessage('')
    setIsActive(true)
    setActiveFrom('')
    setActiveTo('')
    setExcludedScreenIds([])
  }

  const openEdit = (a: Announcement) => {
    setIsNew(false)
    setEditing(a)
    setTitle(a.title)
    setMessage(a.message)
    setIsActive(a.isActive)
    setActiveFrom(a.activeFrom ? a.activeFrom.slice(0, 16) : '')
    setActiveTo(a.activeTo ? a.activeTo.slice(0, 16) : '')
    setExcludedScreenIds(a.excludedScreenIds || [])
  }

  const closeForm = () => {
    setEditing(null)
    setIsNew(false)
  }

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        isActive,
        activeFrom: activeFrom || undefined,
        activeTo: activeTo || undefined,
        excludedScreenIds,
      }
      if (isNew) {
        await announcementsApi.create(payload)
      } else if (editing) {
        await announcementsApi.update(editing.id, payload)
      }
      closeForm()
      load()
    } catch (err) {
      alert('Fehler: ' + (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number, t: string) => {
    if (!confirm(`Nachricht "${t}" wirklich löschen?`)) return
    await announcementsApi.delete(id)
    load()
  }

  const toggleExcluded = (screenId: number) => {
    setExcludedScreenIds(prev =>
      prev.includes(screenId) ? prev.filter(id => id !== screenId) : [...prev, screenId]
    )
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('de-CH', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const isScheduleActive = (a: Announcement) => {
    if (!a.isActive) return false
    const now = new Date()
    if (a.activeFrom && new Date(a.activeFrom) > now) return false
    if (a.activeTo && new Date(a.activeTo) < now) return false
    return true
  }

  const showForm = isNew || editing !== null

  return (
    <div className="page">
      <div className="page__header">
        <h1>Nachrichten</h1>
        <button className="btn btn--primary" onClick={openNew}>+ Neue Nachricht</button>
      </div>

      {showForm && (
        <div className="form-card" style={{ marginBottom: 24, maxWidth: 'none' }}>
          <h3 style={{ marginTop: 0 }}>{isNew ? 'Neue Nachricht erstellen' : 'Nachricht bearbeiten'}</h3>

          <div className="form-group">
            <label>Titel *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Wartungsarbeiten" />
          </div>

          <div className="form-group">
            <label>Nachricht *</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="z.B. Am 05.04. finden Wartungsarbeiten statt..."
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Aktiv von</label>
              <input type="datetime-local" value={activeFrom} onChange={e => setActiveFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label>Aktiv bis</label>
              <input type="datetime-local" value={activeTo} onChange={e => setActiveTo(e.target.value)} />
            </div>
          </div>

          {!isNew && (
            <div className="form-group">
              <div className="checkbox-group">
                <label>
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  Aktiv
                </label>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Nicht anzeigen auf diesen Screens:</label>
            <div className="checkbox-group" style={{ marginTop: 4 }}>
              {allScreens.map(s => (
                <label key={s.id} className={`screen-chip ${excludedScreenIds.includes(s.id) ? 'screen-chip--excluded' : ''}`}>
                  <input
                    type="checkbox"
                    checked={excludedScreenIds.includes(s.id)}
                    onChange={() => toggleExcluded(s.id)}
                  />
                  {s.name}
                </label>
              ))}
              {allScreens.length === 0 && <span className="hint">Keine Screens vorhanden</span>}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn--primary" onClick={handleSave} disabled={saving || !title.trim() || !message.trim()}>
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
            <button className="btn" onClick={closeForm}>Abbrechen</button>
          </div>
        </div>
      )}

      <div className="page__toolbar">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Alle ({items.length})</option>
          <option value="active">Aktiv ({items.filter(a => a.isActive).length})</option>
          <option value="inactive">Inaktiv ({items.filter(a => !a.isActive).length})</option>
        </select>
      </div>

      {loadError && (
        <div className="error-banner">
          {loadError}
          <button className="btn btn--small" onClick={load}>Erneut laden</button>
        </div>
      )}

      {filtered.length === 0 && !loadError ? (
        <div className="empty-state">
          <p>Keine Nachrichten vorhanden.</p>
          {!showForm && <button className="btn btn--primary" onClick={openNew}>Erste Nachricht erstellen</button>}
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Titel</th>
              <th>Nachricht</th>
              <th>Von</th>
              <th>Bis</th>
              <th>Ausgeschlossen</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id}>
                <td>
                  <span className={`badge ${isScheduleActive(a) ? 'badge--success' : 'badge--muted'}`}>
                    {isScheduleActive(a) ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{a.title}</td>
                <td className="text-truncate">{a.message}</td>
                <td>{a.activeFrom ? fmtDate(a.activeFrom) : '—'}</td>
                <td>{a.activeTo ? fmtDate(a.activeTo) : '—'}</td>
                <td>
                  {a.excludedScreenIds.length > 0
                    ? a.excludedScreenIds.map(id => allScreens.find(s => s.id === id)?.name || `#${id}`).join(', ')
                    : '—'}
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn--small" onClick={() => openEdit(a)}>Bearbeiten</button>
                    <button className="btn btn--small btn--danger" onClick={() => handleDelete(a.id, a.title)}>Löschen</button>
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
