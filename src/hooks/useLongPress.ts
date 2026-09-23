import { useRef } from 'react'

const LONG_PRESS_DELAY_MS = 500
const MOVE_CANCEL_THRESHOLD_PX = 10

export function useLongPress(onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    startRef.current = null
  }

  function onTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0]
    startRef.current = { x: touch.clientX, y: touch.clientY }
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      onLongPress()
    }, LONG_PRESS_DELAY_MS)
  }

  function onTouchMove(event: React.TouchEvent) {
    if (!startRef.current) return
    const touch = event.touches[0]
    const dx = touch.clientX - startRef.current.x
    const dy = touch.clientY - startRef.current.y
    if (Math.hypot(dx, dy) > MOVE_CANCEL_THRESHOLD_PX) clearTimer()
  }

  function onTouchEnd() {
    clearTimer()
  }

  function onTouchCancel() {
    clearTimer()
  }

  function consumeLongPress() {
    const fired = firedRef.current
    firedRef.current = false
    return fired
  }

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, consumeLongPress }
}
