import { useState, useEffect, useCallback } from 'react'
import './Slideshow.css'

interface SlideshowProps {
  images: string[]
  intervalMs?: number
  onInteraction: () => void
}

export default function Slideshow({ images, intervalMs = 5000, onInteraction }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(nextSlide, intervalMs)
    return () => clearInterval(timer)
  }, [nextSlide, intervalMs, images.length])

  if (images.length === 0) return null

  return (
    <div className="slideshow" onClick={onInteraction} onTouchStart={onInteraction}>
      {images.map((img, i) => (
        <img
          key={img}
          className={`slideshow__image ${i === currentIndex ? 'active' : ''}`}
          src={img}
          alt={`Slide ${i + 1}`}
        />
      ))}
      <div className="slideshow__overlay">
        <p>Berühren Sie den Bildschirm, um fortzufahren</p>
      </div>
      {images.length > 1 && (
        <div className="slideshow__dots">
          {images.map((_, i) => (
            <span key={i} className={`slideshow__dot ${i === currentIndex ? 'active' : ''}`} />
          ))}
        </div>
      )}
    </div>
  )
}
