import { motion as Motion } from 'framer-motion'
import { cardHover } from '../../utils/motion'

export function Card({ children, className = '', accent = true }) {
  return (
    <Motion.div
      {...cardHover}
      className={`group relative overflow-hidden rounded-3xl border border-white/30 bg-white/65 p-[1px] shadow-xl shadow-indigo-500/10 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_24px_58px_-16px_rgba(79,70,229,0.35)] ${className}`}
    >
      <div className="relative overflow-hidden rounded-[22px] border border-white/55 bg-gradient-to-b from-white/85 to-white/60 p-5 pl-7">
        {accent ? (
          <span className="pointer-events-none absolute bottom-5 left-3 top-5 w-[3px] rounded-full bg-gradient-to-b from-blue-500 via-violet-500 to-pink-500 opacity-85" />
        ) : null}

        {children}

        {accent ? (
          <span className="pointer-events-none absolute bottom-0 left-6 right-6 h-[2px] rounded-full bg-gradient-to-r from-blue-500/75 via-violet-500/80 to-pink-500/75 opacity-70 transition-all duration-300 group-hover:opacity-100" />
        ) : null}
      </div>
    </Motion.div>
  )
}

export function CardHeader({ title, subtitle, right }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}
