import { motion as Motion } from 'framer-motion'
import { cardHover } from '../../utils/motion'

export function Card({ children, className = '' }) {
  return (
    <Motion.div
      {...cardHover}
      className={`rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm ring-1 ring-slate-900/5 backdrop-blur supports-[backdrop-filter]:bg-white/70 hover:border-indigo-200/80 ${className}`}
    >
      {children}
    </Motion.div>
  )
}

export function CardHeader({ title, subtitle, right }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}
