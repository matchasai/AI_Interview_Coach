import { useEffect, useMemo, useState } from 'react'

export function AnimatedNumber({ value = 0, durationMs = 900, className = '' }) {
  const target = Number(value) || 0
  const [display, setDisplay] = useState(0)

  const startValue = useMemo(() => 0, [])

  useEffect(() => {
    let raf = null
    const start = performance.now()

    function tick(now) {
      const t = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = Math.round(startValue + (target - startValue) * eased)
      setDisplay(next)
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [target, durationMs, startValue])

  return <span className={className}>{display}</span>
}



