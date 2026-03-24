import { ScreenData } from '../api'
import VideoPlayer from './VideoPlayer'
import Slideshow from './Slideshow'
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
      const images = tileIds
        .map(id => screen.tiles.find(t => t.id === id))
        .filter(t => t?.imageUrl)
        .map(t => t!.imageUrl!)
      if (images.length > 0) {
        return <Slideshow images={images} onInteraction={onInteraction} />
      }
    } catch { /* ignore */ }
    return null
  }

  // 'Static' (tile-based default) is now handled directly in HomeScreen

  return null
}
