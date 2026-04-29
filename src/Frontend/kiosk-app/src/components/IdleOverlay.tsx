import { useState, useEffect, useCallback } from 'react'
import { ScreenData } from '../api'
import VideoPlayer from './VideoPlayer'
import ContentViewer from './ContentViewer'
import './IdleOverlay.css'

interface IdleOverlayProps {
  screen: ScreenData
  onInteraction: () => void
}

export default function IdleOverlay({ screen, onInteraction }: IdleOverlayProps) {
  const data = screen.defaultContentData

  if (screen.defaultContentType === 'Video' && data) {
    return <VideoPlayer src={data} onInteraction={onInteraction} />
  }

  if (screen.defaultContentType === 'Slideshow' && data) {
    try {
      const tileIds: number[] = JSON.parse(data)
      const allTiles = [...screen.inheritedTiles, ...screen.ownTiles]
      const tiles = tileIds
        .map(id => allTiles.find(t => t.id === id))
        .filter((t): t is NonNullable<typeof t> => !!t)
      if (tiles.length > 0) {
        return <TileContentRotation tiles={tiles} intervalMs={(screen.slideshowIntervalSeconds ?? 10) * 1000} onInteraction={onInteraction} />
      }
    } catch { /* ignore */ }
    return null
  }

  return null
}

function TileContentRotation({ tiles, intervalMs, onInteraction }: { tiles: NonNullable<ReturnType<typeof Array.prototype.find>>[], intervalMs: number, onInteraction: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % tiles.length)
  }, [tiles.length])

  useEffect(() => {
    if (tiles.length <= 1) return
    const timer = setInterval(nextSlide, intervalMs)
    return () => clearInterval(timer)
  }, [nextSlide, intervalMs, tiles.length])

  const tile = tiles[currentIndex]

  return (
    <div className="idle-overlay" onClick={onInteraction} onTouchStart={onInteraction}>
      <ContentViewer
        url={tile.linkUrl}
        contentType={tile.contentType}
        articleBody={tile.articleBody}
        title={tile.title}
        onBack={onInteraction}
      />
      {tiles.length > 1 && (
        <div className="idle-overlay__dots">
          {tiles.map((_, i) => (
            <span key={i} className={`idle-overlay__dot ${i === currentIndex ? 'active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  )
}
