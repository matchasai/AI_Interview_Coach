export function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 shadow-[0_0_12px_rgba(99,102,241,.45)]" />
      <span>{label}</span>
    </div>
  )
}
