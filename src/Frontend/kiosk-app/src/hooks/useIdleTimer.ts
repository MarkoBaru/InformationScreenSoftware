import { useState, useEffect, useCallback, useRef } from 'react'

export function useIdleTimer(timeoutSeconds: number, onIdle: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isIdle, setIsIdle] = useState(false)
  const lastMousePos = useRef<{ x: number; y: number } | null>(null)

  const resetTimer = useCallback(() => {
    setIsIdle(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsIdle(true)
      onIdle()
    }, timeoutSeconds * 1000)
  }, [timeoutSeconds, onIdle])

  // Separate handler for mousemove: only reset on significant movement (>10px)
  // to avoid phantom mouse events from touch screen digitizers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const prev = lastMousePos.current
    if (prev) {
      const dx = Math.abs(e.clientX - prev.x)
      const dy = Math.abs(e.clientY - prev.y)
      if (dx > 10 || dy > 10) {
        lastMousePos.current = { x: e.clientX, y: e.clientY }
        resetTimer()
      }
    } else {
      lastMousePos.current = { x: e.clientX, y: e.clientY }
    }
  }, [resetTimer])

  useEffect(() => {
    const events = ['mousedown', 'touchstart', 'touchmove', 'keydown', 'scroll']
    events.forEach((event) => document.addEventListener(event, resetTimer))
    document.addEventListener('mousemove', handleMouseMove as EventListener)
    resetTimer()

    return () => {
      events.forEach((event) => document.removeEventListener(event, resetTimer))
      document.removeEventListener('mousemove', handleMouseMove as EventListener)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer, handleMouseMove])

  return { isIdle, resetTimer }
}
