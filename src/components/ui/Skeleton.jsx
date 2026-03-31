export function Skeleton({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-slate-200/70 ${className}`}
      aria-hidden="true"
    >
      <span className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  )
}
