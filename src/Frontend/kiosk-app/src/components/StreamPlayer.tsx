import { useEffect, useRef } from 'react'

interface StreamPlayerProps {
  url: string
  style?: React.CSSProperties
  className?: string
}

/**
 * Plays an RTSP (or other) stream via go2rtc's WebSocket MSE endpoint.
 * go2rtc converts RTSP → fMP4 fragments sent over WebSocket.
 * The browser plays them via MediaSource Extensions.
 */
export default function StreamPlayer({ url, style, className }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const msRef = useRef<MediaSource | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return

    let sourceBuffer: SourceBuffer | null = null
    let queue: ArrayBuffer[] = []
    let isUpdating = false

    const flushQueue = () => {
      if (!sourceBuffer || isUpdating || queue.length === 0) return
      isUpdating = true
      sourceBuffer.appendBuffer(queue.shift()!)
    }

    const ms = new MediaSource()
    msRef.current = ms
    video.src = URL.createObjectURL(ms)

    ms.addEventListener('sourceopen', () => {
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${wsProto}//${window.location.host}/stream/api/ws?src=${encodeURIComponent(url)}`

      const ws = new WebSocket(wsUrl)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          // First message is the codec MIME type, e.g. "video/mp4; codecs=\"avc1.640029\""
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'mse' && msg.value) {
              sourceBuffer = ms.addSourceBuffer(msg.value)
              sourceBuffer.mode = 'segments'
              sourceBuffer.addEventListener('updateend', () => {
                isUpdating = false
                flushQueue()
              })
            }
          } catch {
            // Older go2rtc sends raw codec string
            if (!sourceBuffer && ms.readyState === 'open') {
              sourceBuffer = ms.addSourceBuffer(event.data)
              sourceBuffer.mode = 'segments'
              sourceBuffer.addEventListener('updateend', () => {
                isUpdating = false
                flushQueue()
              })
            }
          }
        } else if (event.data instanceof ArrayBuffer) {
          if (sourceBuffer) {
            queue.push(event.data)
            flushQueue()
          }
        }
      }

      ws.onclose = () => {
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.dispatchEvent(new Event('reconnect'))
          }
        }, 3000)
      }

      ws.onerror = () => {
        ws.close()
      }
    })

    video.play().catch(() => {})

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (msRef.current && msRef.current.readyState === 'open') {
        try { msRef.current.endOfStream() } catch { /* ignore */ }
      }
      if (video.src) {
        URL.revokeObjectURL(video.src)
        video.src = ''
      }
    }
  }, [url])

  // Handle reconnect
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const reconnect = () => {
      // Trigger re-mount by toggling key - parent handles this via url prop
      // For now, just re-run the effect by changing src
      video.load()
    }
    video.addEventListener('reconnect', reconnect)
    return () => video.removeEventListener('reconnect', reconnect)
  }, [])

  return (
    <video
      ref={videoRef}
      className={className}
      style={style}
      autoPlay
      muted
      playsInline
    />
  )
}
