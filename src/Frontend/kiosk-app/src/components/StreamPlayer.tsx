import { useEffect, useRef, useState } from 'react'

interface StreamPlayerProps {
  url: string
  style?: React.CSSProperties
  className?: string
}

/**
 * Plays an RTSP (or other) stream via go2rtc's WebSocket MSE endpoint.
 * 1. Registers the stream URL at go2rtc via REST API (PUT /stream/api/streams)
 * 2. Connects via WebSocket to receive fMP4 fragments
 * 3. Renders via MediaSource Extensions in a <video> element
 */
export default function StreamPlayer({ url, style, className }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return

    let cancelled = false

    // Derive a stable stream name from the URL
    const streamName = 'stream_' + btoa(url).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)

    const start = async () => {
      try {
        // Step 1: Register stream at go2rtc (both name and src as query params, no body)
        const registerUrl = `/stream/api/streams?name=${encodeURIComponent(streamName)}&src=${encodeURIComponent(url)}`
        const registerRes = await fetch(registerUrl, { method: 'PUT' })
        if (!registerRes.ok) {
          const errText = await registerRes.text()
          throw new Error(`go2rtc Registrierung fehlgeschlagen: ${registerRes.status} ${errText}`)
        }

        if (cancelled) return

        // Step 2: Connect WebSocket for MSE playback
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${wsProto}//${window.location.host}/stream/api/ws?src=${encodeURIComponent(streamName)}`

        const ms = new MediaSource()
        video.src = URL.createObjectURL(ms)

        ms.addEventListener('sourceopen', () => {
          if (cancelled) return

          const ws = new WebSocket(wsUrl)
          ws.binaryType = 'arraybuffer'
          wsRef.current = ws

          let sourceBuffer: SourceBuffer | null = null
          let queue: ArrayBuffer[] = []
          let isUpdating = false

          const flushQueue = () => {
            if (!sourceBuffer || isUpdating || queue.length === 0) return
            isUpdating = true
            try {
              sourceBuffer.appendBuffer(queue.shift()!)
            } catch {
              isUpdating = false
            }
          }

          ws.onmessage = (event) => {
            if (typeof event.data === 'string') {
              // go2rtc sends codec info as JSON or raw string
              try {
                const msg = JSON.parse(event.data)
                if (msg.type === 'mse' && msg.value && !sourceBuffer) {
                  sourceBuffer = ms.addSourceBuffer(msg.value)
                  sourceBuffer.mode = 'segments'
                  sourceBuffer.addEventListener('updateend', () => {
                    isUpdating = false
                    flushQueue()
                  })
                }
              } catch {
                // Raw codec string (older go2rtc)
                if (!sourceBuffer && ms.readyState === 'open') {
                  try {
                    sourceBuffer = ms.addSourceBuffer(event.data)
                    sourceBuffer.mode = 'segments'
                    sourceBuffer.addEventListener('updateend', () => {
                      isUpdating = false
                      flushQueue()
                    })
                  } catch { /* unsupported codec */ }
                }
              }
            } else if (event.data instanceof ArrayBuffer && sourceBuffer) {
              queue.push(event.data)
              flushQueue()
            }
          }

          ws.onerror = () => ws.close()
          ws.onclose = () => {
            if (!cancelled) {
              // Auto-reconnect after 3s
              setTimeout(() => { if (!cancelled) start() }, 3000)
            }
          }
        })

        video.play().catch(() => {})
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    }

    start()

    return () => {
      cancelled = true
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (video.src) {
        URL.revokeObjectURL(video.src)
        video.src = ''
      }
    }
  }, [url])

  if (error) {
    return (
      <div className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexDirection: 'column', gap: 8 }}>
        <p>Stream-Fehler: {error}</p>
        <p style={{ fontSize: '0.8em', color: '#888' }}>URL: {url}</p>
      </div>
    )
  }

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
