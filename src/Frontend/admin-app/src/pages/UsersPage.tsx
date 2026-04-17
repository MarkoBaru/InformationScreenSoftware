import { useState, useEffect } from 'react'
import { usersApi, categoriesApi, User, Category } from '../api'
import { useAuth } from '../context/AuthContext'
import './PageStyles.css'

interface UserForm {
  username: string
  password: string
  displayName: string
  role: 'User' | 'Admin'
  defaultCategoryId: number | null
}

const emptyForm: UserForm = { username: '', password: '', displayName: '', role: 'User', defaultCategoryId: null }

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsers()
    categoriesApi.list().then(setCategories).catch(() => {})
  }, [])

  const loadUsers = async () => {
    try {
      const data = await usersApi.list()
      setUsers(data)
    } catch {
      setError('Benutzer konnten nicht geladen werden.')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.username.trim() || !form.password || !form.displayName.trim()) {
      setError('Bitte alle Felder ausfüllen.')
      return
    }
    try {
      const newUser = await usersApi.create({
        username: form.username.trim(),
        password: form.password,
        displayName: form.displayName.trim(),
        role: form.role,
        defaultCategoryId: form.defaultCategoryId,
      })
      setUsers((prev) => [...prev, newUser])
      setForm(emptyForm)
      setShowForm(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen.')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId === null) return
    setError('')
    if (!form.displayName.trim()) {
      setError('Anzeigename ist erforderlich.')
      return
    }
    try {
      const updated = await usersApi.update(editingId, {
        displayName: form.displayName.trim(),
        role: form.role,
        isActive: true,
        defaultCategoryId: form.defaultCategoryId,
        ...(form.password ? { password: form.password } : {}),
      })
      setUsers((prev) => prev.map((u) => (u.id === editingId ? updated : u)))
      setEditingId(null)
      setForm(emptyForm)
      setShowForm(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren.')
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      const updated = await usersApi.update(user.id, {
        displayName: user.displayName,
        role: user.role,
        isActive: !user.isActive,
      })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)))
    } catch {
      setError('Status konnte nicht geändert werden.')
    }
  }

  const handleDelete = async (user: User) => {
    if (user.id === currentUser?.id) return
    if (!confirm(`Benutzer "${user.displayName}" wirklich löschen?`)) return
    try {
      await usersApi.delete(user.id)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen.')
    }
  }

  const startEdit = (user: User) => {
    setEditingId(user.id)
    setForm({ username: user.username, password: '', displayName: user.displayName, role: user.role, defaultCategoryId: user.defaultCategoryId })
    setShowForm(true)
    setError('')
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setError('')
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>Benutzerverwaltung</h1>
        {!showForm && (
          <button className="btn btn--primary" onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setError('') }}>
            + Neuer Benutzer
          </button>
        )}
      </div>

      {error && <div style={{ background: '#fff0f0', color: '#c62828', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>{error}</div>}

      {showForm && (
        <form className="form-card" onSubmit={editingId ? handleUpdate : handleCreate} style={{ marginBottom: 24 }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>{editingId ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}</h3>
          <div className="form-group">
            <label>Benutzername</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Benutzername"
              disabled={editingId !== null}
              autoFocus={!editingId}
            />
          </div>
          <div className="form-group">
            <label>{editingId ? 'Neues Passwort (leer lassen = unverändert)' : 'Passwort'}</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editingId ? 'Neues Passwort' : 'Passwort'}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label>Anzeigename</label>
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Anzeigename"
            />
          </div>
          <div className="form-group">
            <label>Rolle</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'User' | 'Admin' })}>
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="form-group">
            <label>Standard-Kategorie</label>
            <select
              value={form.defaultCategoryId ?? ''}
              onChange={(e) => setForm({ ...form, defaultCategoryId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Alle Kategorien (kein Filter)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="hint">Schränkt die sichtbaren Inhalte auf der Übersichtsseite für diesen Benutzer ein</p>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary">{editingId ? 'Speichern' : 'Erstellen'}</button>
            <button type="button" className="btn" onClick={cancelForm}>Abbrechen</button>
          </div>
        </form>
      )}

      {users.length === 0 ? (
        <div className="empty-state">
          <p>Noch keine Benutzer vorhanden.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Benutzername</th>
              <th>Anzeigename</th>
              <th>Rolle</th>
              <th>Standard-Kategorie</th>
              <th>Status</th>
              <th>Erstellt am</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.5 }}>
                <td><code>{u.username}</code></td>
                <td>{u.displayName}</td>
                <td>
                  <span className={u.role === 'Admin' ? 'badge badge--success' : 'badge badge--muted'}>
                    {u.role === 'Admin' ? 'Administrator' : 'Benutzer'}
                  </span>
                </td>
                <td>
                  {u.defaultCategoryId
                    ? categories.find(c => c.id === u.defaultCategoryId)?.name || `ID ${u.defaultCategoryId}`
                    : <span style={{ color: '#999' }}>Alle</span>}
                </td>
                <td>
                  <span className={u.isActive ? 'badge badge--success' : 'badge badge--muted'}>
                    {u.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString('de-DE')}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn btn--small" onClick={() => startEdit(u)}>Bearbeiten</button>
                    {u.isActive ? (
                      <button className="btn btn--small btn--danger" onClick={() => handleToggleActive(u)} disabled={u.id === currentUser?.id}>Deaktivieren</button>
                    ) : (
                      <button className="btn btn--small btn--primary" onClick={() => handleToggleActive(u)}>Aktivieren</button>
                    )}
                    <button className="btn btn--small btn--danger" onClick={() => handleDelete(u)} disabled={u.id === currentUser?.id}>Löschen</button>
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
