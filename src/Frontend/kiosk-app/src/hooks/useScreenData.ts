import { useState, useEffect } from 'react'
import { fetchScreen, ScreenData } from '../api'

export function useScreenData(slug: string) {
  const [screen, setScreen] = useState<ScreenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchScreen(slug)
      .then((data) => {
        if (!cancelled) {
          setScreen(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [slug])

  return { screen, loading, error }
}
