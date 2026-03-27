import { useState, useEffect } from 'react'
import { settingsApi } from '../api'
import './PageStyles.css'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    settingsApi.get().then(setSettings).catch(() => {})
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const updated = await settingsApi.update(settings)
      setSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>Einstellungen</h1>
      </div>

      <form onSubmit={handleSave} className="page__content">
        <div className="settings-section">
          <h2>Streaming</h2>
          <p className="settings-hint">
            RTSPtoWeb muss im selben Netzwerk wie die Kameras laufen.
            Die Kiosk-Terminals verbinden sich direkt über den Browser.
          </p>

          <label className="settings-field">
            <span className="settings-label">RTSPtoWeb URL</span>
            <input
              type="url"
              className="settings-input"
              placeholder="z.B. http://192.168.1.100:8083"
              value={settings.rtsptowebUrl || ''}
              onChange={(e) => setSettings({ ...settings, rtsptowebUrl: e.target.value })}
            />
            <span className="settings-description">
              Basis-URL des lokalen RTSPtoWeb-Servers (Leer = über nginx-Proxy)
            </span>
          </label>
        </div>

        <div className="settings-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
          {saved && <span className="settings-saved">✓ Gespeichert</span>}
        </div>
      </form>
    </div>
  )
}
