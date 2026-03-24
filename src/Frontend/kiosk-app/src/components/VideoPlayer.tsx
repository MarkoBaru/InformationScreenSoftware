import { useEffect, useRef } from 'react'
import './VideoPlayer.css'

interface VideoPlayerProps {
  src: string
  onInteraction: () => void
}

export default function VideoPlayer({ src, onInteraction }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    videoRef.current?.play().catch(() => {})
  }, [src])

  return (
    <div className="video-player" onClick={onInteraction} onTouchStart={onInteraction}>
      <video
        ref={videoRef}
        className="video-player__video"
        src={src}
        loop
        muted
        autoPlay
        playsInline
      />
      <div className="video-player__overlay">
        <p>Berühren Sie den Bildschirm, um fortzufahren</p>
      </div>
    </div>
  )
}
