import { motion as Motion } from 'framer-motion'
import { cardHover } from '../../utils/motion'

export function Card({ children, className = '', accent = true }) {
  return (
    <Motion.div
      {...cardHover}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#1e293b] p-[1px] shadow-lg shadow-black/30 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:bg-[#273549] hover:shadow-[0_24px_58px_-16px_rgba(15,23,42,0.65)] ${className}`}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1e293b] to-[#1b2638] p-5 pl-7 transition-all duration-300 group-hover:from-[#273549] group-hover:to-[#223247]">
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
        <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
        {subtitle ? <p className="text-sm text-gray-400">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}
