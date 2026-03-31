export function KeywordChips({ keywords = [] }) {
  if (!keywords || keywords.length === 0) {
    return <p className="text-sm text-slate-600">No missing keywords.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((k) => (
        <span
          key={k}
          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
        >
          {k}
        </span>
      ))}
    </div>
  )
}
