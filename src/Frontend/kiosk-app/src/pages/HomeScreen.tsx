import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { TileData } from '../api'
import { useScreenData } from '../hooks/useScreenData'
import { useIdleTimer } from '../hooks/useIdleTimer'
import TileGrid from '../components/TileGrid'
import ContentViewer from '../components/ContentViewer'
import IdleOverlay from '../components/IdleOverlay'
import './HomeScreen.css'

export default function HomeScreen() {
  const { slug = 'default' } = useParams<{ slug: string }>()
  const { screen, loading, error } = useScreenData(slug)
  const [viewingTile, setViewingTile] = useState<TileData | null>(null)
  const [showIdle, setShowIdle] = useState(false)

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
    // Articles always render inline (no URL needed)
    if (tile.contentType === 'Article') {
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
            <h1>{screen.name}</h1>
          </header>
          <TileGrid tiles={screen.tiles} onTileClick={handleTileClick} />
        </>
      )}
    </div>
  )
}
