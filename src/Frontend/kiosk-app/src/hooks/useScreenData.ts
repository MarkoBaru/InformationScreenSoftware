import { useState, useEffect, useRef } from 'react'
import { fetchScreen, ScreenData } from '../api'

const POLL_INTERVAL_MS = 30_000 // 30 Sekunden

export function useScreenData(slug: string) {
  const [screen, setScreen] = useState<ScreenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialLoad = useRef(true)

  useEffect(() => {
    let cancelled = false
    initialLoad.current = true
    setLoading(true)
    setError(null)

    const load = () => {
      fetchScreen(slug)
        .then((data) => {
          if (!cancelled) {
            setScreen(data)
            if (initialLoad.current) {
              setLoading(false)
              initialLoad.current = false
            }
          }
        })
        .catch((err) => {
          if (!cancelled && initialLoad.current) {
            setError(err.message)
            setLoading(false)
            initialLoad.current = false
          }
        })
    }

    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)

    return () => { cancelled = true; clearInterval(interval) }
  }, [slug])

  return { screen, loading, error }
}
