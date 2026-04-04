export function KeywordChips({ keywords = [] }) {
  if (!keywords || keywords.length === 0) {
    return <p className="text-sm text-slate-500">No missing keywords.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((k) => (
        <span
          key={k}
          className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-800 dark:text-gray-200"
        >
          {k}
        </span>
      ))}
    </div>
  )
}


