import { useState, useEffect, useCallback, useRef } from 'react'

export function useIdleTimer(timeoutSeconds: number, onIdle: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isIdle, setIsIdle] = useState(false)

  const resetTimer = useCallback(() => {
    setIsIdle(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsIdle(true)
      onIdle()
    }, timeoutSeconds * 1000)
  }, [timeoutSeconds, onIdle])

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'touchstart', 'touchmove', 'keydown', 'scroll']
    events.forEach((event) => document.addEventListener(event, resetTimer))
    resetTimer()

    return () => {
      events.forEach((event) => document.removeEventListener(event, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  return { isIdle, resetTimer }
}
