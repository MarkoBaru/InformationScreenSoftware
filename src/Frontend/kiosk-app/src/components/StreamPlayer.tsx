import { useEffect, useRef, useState } from 'react'

interface StreamPlayerProps {
  url: string
  style?: React.CSSProperties
  className?: string
}

/**
 * Plays an RTSP stream via RTSPtoWeb's MSE (MediaSource Extensions) endpoint.
 * 1. Fetches RTSPtoWeb base URL from backend settings
 * 2. Registers the RTSP URL as a stream at RTSPtoWeb via REST API
 * 3. Connects via WebSocket to /stream/{id}/channel/0/mse
 * 4. Receives fMP4 fragments and renders via MediaSource in a <video> element
 */
export default function StreamPlayer({ url, style, className }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !url) return

    let cancelled = false

    // Derive a stable stream ID from the URL
    const streamId = 'stream_' + btoa(url).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)

    const start = async () => {
      try {
        // Step 0: Fetch RTSPtoWeb base URL from settings
        let rtspBaseUrl = ''
        try {
          const settingsRes = await fetch('/api/settings')
          if (settingsRes.ok) {
            const settings = await settingsRes.json()
            rtspBaseUrl = (settings.rtsptowebUrl || '').replace(/\/+$/, '')
          }
        } catch { /* fallback to relative URLs */ }

        // Build API base URL
        const apiBase = rtspBaseUrl ? `${rtspBaseUrl}` : '/rtsp-api'

        // Step 1: Register stream at RTSPtoWeb
        const addRes = await fetch(`${apiBase}/stream/${encodeURIComponent(streamId)}/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: streamId,
            channels: {
              '0': {
                name: 'ch1',
                url: url,
                on_demand: true,
                debug: false,
                status: 0
              }
            }
          })
        })

        // Ignore "already exists" errors – just need it registered
        if (!addRes.ok) {
          const body = await addRes.json().catch(() => null)
          if (!body || body.status !== 0) {
            // Try to check if stream already exists
            const infoRes = await fetch(`${apiBase}/stream/${encodeURIComponent(streamId)}/info`)
            if (!infoRes.ok) {
              throw new Error(`RTSPtoWeb Registrierung fehlgeschlagen: ${addRes.status}`)
            }
          }
        }

        if (cancelled) return

        // Step 2: Connect WebSocket for MSE playback
        let wsUrl: string
        if (rtspBaseUrl) {
          // Direct connection to RTSPtoWeb (local network)
          const parsed = new URL(rtspBaseUrl)
          const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
          wsUrl = `${wsProto}//${parsed.host}/stream/${encodeURIComponent(streamId)}/channel/0/mse?uuid=${encodeURIComponent(streamId)}&channel=0`
        } else {
          // Proxied through nginx
          const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          wsUrl = `${wsProto}//${window.location.host}/stream/${encodeURIComponent(streamId)}/channel/0/mse?uuid=${encodeURIComponent(streamId)}&channel=0`
        }

        const mse = new MediaSource()
        video.src = URL.createObjectURL(mse)

        mse.addEventListener('sourceopen', () => {
          if (cancelled) return

          const ws = new WebSocket(wsUrl)
          ws.binaryType = 'arraybuffer'
          wsRef.current = ws

          let mseSourceBuffer: SourceBuffer | null = null
          let mseQueue: ArrayBuffer[] = []
          let mseStreamingStarted = false

          const pushPacket = () => {
            if (!mseSourceBuffer || mseSourceBuffer.updating) return
            if (mseQueue.length > 0) {
              const packet = mseQueue.shift()!
              mseSourceBuffer.appendBuffer(packet)
            } else {
              mseStreamingStarted = false
            }
          }

          const readPacket = (packet: ArrayBuffer) => {
            if (!mseStreamingStarted) {
              mseSourceBuffer!.appendBuffer(packet)
              mseStreamingStarted = true
              return
            }
            mseQueue.push(packet)
            if (!mseSourceBuffer!.updating) {
              pushPacket()
            }
          }

          ws.onmessage = (event) => {
            const data = new Uint8Array(event.data)
            if (data[0] === 9) {
              // First byte 9 = codec info follows
              const decoded = new TextDecoder('utf-8').decode(data.slice(1))
              if (mse.readyState === 'open' && !mseSourceBuffer) {
                mseSourceBuffer = mse.addSourceBuffer('video/mp4; codecs="' + decoded + '"')
                mseSourceBuffer.mode = 'segments'
                mseSourceBuffer.addEventListener('updateend', pushPacket)
              }
            } else if (mseSourceBuffer) {
              readPacket(event.data)
            }
          }

          ws.onerror = () => ws.close()
          ws.onclose = () => {
            if (!cancelled) {
              setTimeout(() => { if (!cancelled) start() }, 3000)
            }
          }
        })

        video.addEventListener('loadeddata', () => { video.play().catch(() => {}) }, { once: true })
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
