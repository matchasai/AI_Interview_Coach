export function ProgressBar({ value = 0, max = 100 }) {
  const v = Math.max(0, Math.min(Number(value) || 0, Number(max) || 0))
  const pct = max > 0 ? (v / max) * 100 : 0

  return (
    <div className="h-2 w-full rounded-full bg-slate-700/70">
      <div
        className="h-2 rounded-full bg-indigo-600 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
