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
        <div className="card" style={{ marginBottom: 24 }}>
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
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: 'auto' }} />
                Aktiv
              </label>
            </div>
          )}

          <div className="form-group">
            <label>Nicht anzeigen auf diesen Screens:</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {allScreens.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, background: excludedScreenIds.includes(s.id) ? '#ffebee' : '#f5f5f5', border: '1px solid ' + (excludedScreenIds.includes(s.id) ? '#ef9a9a' : '#e0e0e0') }}>
                  <input
                    type="checkbox"
                    checked={excludedScreenIds.includes(s.id)}
                    onChange={() => toggleExcluded(s.id)}
                    style={{ width: 'auto' }}
                  />
                  {s.name}
                </label>
              ))}
              {allScreens.length === 0 && <span style={{ color: '#999', fontSize: '0.85rem' }}>Keine Screens vorhanden</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn--primary" onClick={handleSave} disabled={saving || !title.trim() || !message.trim()}>
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
            <button className="btn" onClick={closeForm}>Abbrechen</button>
          </div>
        </div>
      )}

      <div className="page__toolbar" style={{ marginBottom: 12 }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Alle ({items.length})</option>
          <option value="active">Aktiv ({items.filter(a => a.isActive).length})</option>
          <option value="inactive">Inaktiv ({items.filter(a => !a.isActive).length})</option>
        </select>
      </div>

      {loadError && (
        <div style={{ background: '#fee', color: '#c00', padding: '12px 16px', borderRadius: 8, marginBottom: 12 }}>
          {loadError}
          <button className="btn" style={{ marginLeft: 12 }} onClick={load}>Erneut laden</button>
        </div>
      )}

      {filtered.length === 0 && !loadError ? (
        <div className="empty-state">
          <p>Keine Nachrichten vorhanden.</p>
          {!showForm && <button className="btn btn--primary" onClick={openNew}>Erste Nachricht erstellen</button>}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Titel</th>
                <th>Nachricht</th>
                <th>Von</th>
                <th>Bis</th>
                <th>Ausgeschlossen</th>
                <th style={{ width: 120 }}>Aktionen</th>
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
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</td>
                  <td style={{ fontSize: '0.85rem' }}>{a.activeFrom ? new Date(a.activeFrom).toLocaleString('de-CH') : '—'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{a.activeTo ? new Date(a.activeTo).toLocaleString('de-CH') : '—'}</td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {a.excludedScreenIds.length > 0
                      ? a.excludedScreenIds.map(id => allScreens.find(s => s.id === id)?.name || `#${id}`).join(', ')
                      : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn--small" onClick={() => openEdit(a)}>✏️</button>
                      <button className="btn btn--small btn--danger" onClick={() => handleDelete(a.id, a.title)}>🗑️</button>
                    </div>
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
