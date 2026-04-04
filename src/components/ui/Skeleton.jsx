export function Skeleton({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-slate-700/50 ${className}`}
      aria-hidden="true"
    >
      <span className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  )
}

