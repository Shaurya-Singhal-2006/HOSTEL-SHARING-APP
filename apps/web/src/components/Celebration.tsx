import { useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'
import type { CSSProperties } from 'react'

export default function Celebration({ active, onDone }: { active: boolean; onDone: () => void }) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(onDone, reduceMotion ? 80 : 1500)
    return () => window.clearTimeout(timer)
  }, [active, onDone, reduceMotion])

  if (!active || reduceMotion) return null
  return <div className="confetti-burst" aria-hidden="true">
    {Array.from({ length: 18 }, (_, index) => <span key={index} style={{ '--confetti-index': index } as CSSProperties} />)}
  </div>
}
