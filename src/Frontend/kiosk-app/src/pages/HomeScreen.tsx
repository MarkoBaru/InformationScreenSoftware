import { useState, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { TileData } from '../api'
import { useScreenData } from '../hooks/useScreenData'
import { useIdleTimer } from '../hooks/useIdleTimer'
import TileGrid from '../components/TileGrid'
import ContentViewer from '../components/ContentViewer'
import IdleOverlay from '../components/IdleOverlay'
import './HomeScreen.css'
import '../components/ContentViewer.css'

export default function HomeScreen() {
  const { slug = 'default' } = useParams<{ slug: string }>()
  const { screen, loading, error } = useScreenData(slug)
  const [viewingTile, setViewingTile] = useState<TileData | null>(null)
  const [showIdle, setShowIdle] = useState(false)
  const [folderStack, setFolderStack] = useState<TileData[]>([])

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

  // Group tiles by category, filtered by schedule and current folder context
  const groupedTiles = useMemo(() => {
    if (!screen) return []

    // Filter: only tiles in the current folder level, scheduled active
    const filtered = screen.tiles.filter(tile => {
      // Parent filter: show only tiles belonging to current folder (or root if no folder)
      if (currentFolderId !== null) {
        if (tile.parentTileId !== currentFolderId) return false
      } else {
        if (tile.parentTileId !== null) return false
      }
      // Schedule filter
      if (!isTileScheduledActive(tile)) return false
      return true
    })

    const groups: { name: string; tiles: typeof screen.tiles }[] = []
    const catMap = new Map<string, typeof screen.tiles>()

    for (const tile of filtered) {
      const catName = tile.categoryName || 'Allgemein'
      if (!catMap.has(catName)) catMap.set(catName, [])
      catMap.get(catName)!.push(tile)
    }

    for (const [name, tiles] of catMap) {
      groups.push({ name, tiles })
    }
    return groups
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
          <header className="home-screen__header">
            {folderStack.length > 0 ? (
              <h1 style={{ margin: 0 }}>
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
              <h1>{screen.name}</h1>
            )}
          </header>
          <div className="home-screen__categories">
            {groupedTiles.map((group) => (
              <section key={group.name} className="home-screen__category-section">
                <h2 className="home-screen__category-title">{group.name}</h2>
                <TileGrid tiles={group.tiles} onTileClick={handleTileClick} />
              </section>
            ))}
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
