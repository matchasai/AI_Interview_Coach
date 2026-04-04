export function KeywordChips({ keywords = [] }) {
  if (!keywords || keywords.length === 0) {
    return <p className="text-sm text-gray-400">No missing keywords.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((k) => (
        <span
          key={k}
          className="rounded-full border border-white/10 bg-[#273549] px-3 py-1 text-xs font-medium text-gray-200"
        >
          {k}
        </span>
      ))}
    </div>
  )
}
