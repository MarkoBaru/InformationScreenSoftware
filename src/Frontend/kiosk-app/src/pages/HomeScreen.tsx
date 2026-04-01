import { useState, useCallback, useMemo, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { TileData, AnnouncementData, fetchAnnouncements, fetchNewsTiles } from '../api'
import { useScreenData } from '../hooks/useScreenData'
import { useIdleTimer } from '../hooks/useIdleTimer'
import TileGrid from '../components/TileGrid'
import ContentViewer from '../components/ContentViewer'
import IdleOverlay from '../components/IdleOverlay'
import './HomeScreen.css'
import '../components/ContentViewer.css'

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export default function HomeScreen() {
  const { slug = 'default' } = useParams<{ slug: string }>()
  const { screen, loading, error } = useScreenData(slug)
  const [viewingTile, setViewingTile] = useState<TileData | null>(null)
  const [showIdle, setShowIdle] = useState(false)
  const [folderStack, setFolderStack] = useState<TileData[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementData[]>([])
  const [newsTiles, setNewsTiles] = useState<TileData[]>([])
  const now = useClock()

  // Poll announcements when screen data is available
  useEffect(() => {
    if (!screen) return
    let cancelled = false
    const load = () => {
      fetchAnnouncements(screen.id).then(data => { if (!cancelled) setAnnouncements(data) }).catch(() => {})
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [screen?.id])

  // Poll news tiles when screen data is available
  useEffect(() => {
    if (!screen) return
    let cancelled = false
    const load = () => {
      fetchNewsTiles(screen.id).then(data => { if (!cancelled) setNewsTiles(data) }).catch(() => {})
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [screen?.id])

  // Filter helper: check if a tile is currently within its scheduled activation window
  const isTileScheduledActive = useCallback((tile: TileData) => {
    const now = new Date()
    if (tile.activeFrom && new Date(tile.activeFrom) > now) return false
    if (tile.activeTo && new Date(tile.activeTo) < now) return false
    return true
  }, [])

  const handleIdle = useCallback(() => {
    if (viewingTile) return
    // Tile-based default: open that tile's content directly
    if (screen?.defaultContentType === 'Static' && screen.defaultContentData) {
      const tileId = parseInt(screen.defaultContentData, 10)
      if (!isNaN(tileId)) {
        const defaultTile = screen.tiles.find(t => t.id === tileId)
        if (defaultTile) {
          setViewingTile(defaultTile)
          return
        }
      }
    }
    setShowIdle(true)
  }, [viewingTile, screen])

  const handleWakeUp = useCallback(() => {
    setShowIdle(false)
  }, [])

  useIdleTimer(screen?.idleTimeoutSeconds ?? 120, handleIdle)

  const handleTileClick = (tile: TileData) => {
    // Folder: navigate into it
    if (tile.contentType === 'Folder') {
      setFolderStack(prev => [...prev, tile])
      return
    }

    // Articles, PDFs and Streams always render inline
    if (tile.contentType === 'Article' || tile.contentType === 'Pdf' || tile.contentType === 'Schichtplan' || tile.contentType === 'Stream') {
      setViewingTile(tile)
      return
    }

    if (tile.linkTarget === 'NewTab') {
      window.open(tile.linkUrl || '', '_blank')
    } else if (tile.linkTarget === 'SameWindow') {
      window.location.href = tile.linkUrl || ''
    } else {
      const wv = (window as any).chrome?.webview
      if (wv && tile.linkUrl) {
        wv.postMessage({ action: 'openContent', url: tile.linkUrl })
      } else {
        setViewingTile(tile)
      }
    }
  }

  const handleBack = () => {
    setViewingTile(null)
  }

  const handleFolderBack = () => {
    setFolderStack(prev => prev.slice(0, -1))
  }

  // Current folder context
  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null

  // Flat list of tiles filtered by schedule and current folder context (no category grouping)
  const filteredTiles = useMemo(() => {
    if (!screen) return []
    return screen.tiles.filter(tile => {
      if (currentFolderId !== null) {
        if (tile.parentTileId !== currentFolderId) return false
      } else {
        if (tile.parentTileId !== null) return false
      }
      if (!isTileScheduledActive(tile)) return false
      return true
    })
  }, [screen, currentFolderId, isTileScheduledActive])

  if (loading) {
    return (
      <div className="home-screen home-screen--loading">
        <div className="spinner" />
        <p>Wird geladen...</p>
      </div>
    )
  }

  if (error || !screen) {
    return (
      <div className="home-screen home-screen--error">
        <h2>Screen nicht gefunden</h2>
        <p>{error || `Kein Screen mit dem Slug "${slug}" vorhanden.`}</p>
      </div>
    )
  }

  const dateStr = now.toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="home-screen">
      {showIdle && screen.defaultContentType !== 'None' && (
        <IdleOverlay screen={screen} onInteraction={handleWakeUp} />
      )}

      {viewingTile ? (
        <ContentViewer
          url={viewingTile.linkUrl}
          contentType={viewingTile.contentType}
          articleBody={viewingTile.articleBody}
          title={viewingTile.title}
          onBack={handleBack}
        />
      ) : (
        <>
          {/* Top bar: date/time + logo */}
          <header className="home-screen__topbar">
            <div className="home-screen__datetime">
              <span className="home-screen__time">{timeStr}</span>
              <span className="home-screen__date">{dateStr}</span>
            </div>
            {folderStack.length > 0 ? (
              <h1 className="home-screen__title">
                {folderStack.map((f, i) => (
                  <span key={f.id}>
                    {i > 0 && ' › '}
                    <span
                      style={{ cursor: i < folderStack.length - 1 ? 'pointer' : 'default', opacity: i < folderStack.length - 1 ? 0.7 : 1 }}
                      onClick={() => { if (i < folderStack.length - 1) setFolderStack(prev => prev.slice(0, i + 1)) }}
                    >
                      {f.title}
                    </span>
                  </span>
                ))}
              </h1>
            ) : (
              <h1 className="home-screen__title">{screen.name}</h1>
            )}
            <img src="/kiosk/ABB-Logo.svg" alt="ABB" className="home-screen__logo" />
          </header>

          {/* Breaking news ticker */}
          {announcements.length > 0 && (
            <div className="news-ticker">
              <span className="news-ticker__label">NEWS</span>
              <div className="news-ticker__track">
                <div className="news-ticker__scroll">
                  {announcements.map(a => (
                    <span key={a.id} className="news-ticker__item">
                      <strong>{a.title}</strong>{a.message ? ` — ${a.message}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main content area with optional news sidebar */}
          <div className={`home-screen__body ${newsTiles.length > 0 ? 'home-screen__body--with-news' : ''}`}>
            {/* Tile grid (flat, no category grouping) */}
            <div className="home-screen__tiles">
              <TileGrid tiles={filteredTiles} onTileClick={handleTileClick} />
            </div>

            {/* Neue Inhalte sidebar */}
            {newsTiles.length > 0 && (
              <aside className="home-screen__news">
                <h2 className="home-screen__news-title">Neue Inhalte</h2>
                <hr className="home-screen__news-divider" />
                <div className="home-screen__news-list">
                  {newsTiles.map(tile => (
                    <button
                      key={tile.id}
                      className="news-card"
                      onClick={() => handleTileClick(tile)}
                      type="button"
                    >
                      {tile.imageUrl && (
                        <img src={tile.imageUrl} alt={tile.title} className="news-card__img" />
                      )}
                      <span className="news-card__title">{tile.title}</span>
                    </button>
                  ))}
                </div>
              </aside>
            )}
          </div>

          {folderStack.length > 0 && (
            <button className="content-viewer__back" onClick={handleFolderBack} type="button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Zurück
            </button>
          )}
        </>
      )}
    </div>
  )
}
