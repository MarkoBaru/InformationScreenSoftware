import { useState, useEffect, useRef, useCallback } from 'react'
import { categoriesApi, Category } from '../api'
import './PageStyles.css'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  // Drag & drop state
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {})
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const cat = await categoriesApi.create({ name: newName.trim() })
    setCategories((prev) => [...prev, cat])
    setNewName('')
  }

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return
    const cat = await categoriesApi.update(id, { name: editName.trim() })
    if (cat) {
      setCategories((prev) => prev.map((c) => (c.id === id ? cat : c)))
    }
    setEditingId(null)
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Kategorie "${name}" wirklich löschen?`)) return
    await categoriesApi.delete(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index
  }, [])

  const handleDragEnter = useCallback((index: number) => {
    dragOverItem.current = index
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const items = [...categories]
    const [dragged] = items.splice(dragItem.current, 1)
    items.splice(dragOverItem.current, 0, dragged)
    setCategories(items)
    dragItem.current = null
    dragOverItem.current = null
    // Save new order to backend
    categoriesApi.reorder(items.map((c) => c.id)).catch(() => {})
  }, [categories])

  return (
    <div className="page">
      <div className="page__header">
        <h1>Kategorien</h1>
      </div>

      <form className="form-card" onSubmit={handleCreate} style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label>Neue Kategorie</label>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Kategorie-Name" />
        </div>
        <button type="submit" className="btn btn--primary" style={{ height: 42 }}>Erstellen</button>
      </form>

      {categories.length === 0 ? (
        <div className="empty-state">
          <p>Noch keine Kategorien vorhanden.</p>
        </div>
      ) : (
        <div className="sortable-list">
          {categories.map((c, index) => (
            <div
              key={c.id}
              className="sortable-list__item"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              <span className="sortable-list__handle">☰</span>
              <span className="sortable-list__pos">{index + 1}</span>
              <span className="sortable-list__title" style={{ flex: 1 }}>
                {editingId === c.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(c.id); if (e.key === 'Escape') setEditingId(null) }}
                    autoFocus
                    style={{ padding: '4px 8px', width: '100%' }}
                  />
                ) : c.name}
              </span>
              <span style={{ color: '#888', fontSize: '0.85rem', marginRight: 8 }}>{c.tileCount} Kacheln</span>
              <div className="action-buttons">
                {editingId === c.id ? (
                  <>
                    <button className="btn btn--small btn--primary" type="button" onClick={() => handleUpdate(c.id)}>Speichern</button>
                    <button className="btn btn--small" type="button" onClick={() => setEditingId(null)}>Abbrechen</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn--small" onClick={() => { setEditingId(c.id); setEditName(c.name) }}>Bearbeiten</button>
                    <button className="btn btn--small btn--danger" onClick={() => handleDelete(c.id, c.name)}>Löschen</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
