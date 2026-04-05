export function StatusBadge({ status, difficulty }) {
  const statusColors = {
    active: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Active' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    abandoned: { bg: 'bg-slate-100', text: 'text-slate-600 dark:text-gray-400', label: 'Abandoned' },
    paused: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Paused' },
  }

  const difficultyColors = {
    easy: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Easy' },
    medium: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Medium' },
    hard: { bg: 'bg-red-100', text: 'text-red-700', label: 'Hard' },
  }

  const statusConfig = statusColors[status] || statusColors.active
  const diffConfig = difficultyColors[difficulty] || difficultyColors.easy

  return (
    <div className="flex gap-2">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
        {statusConfig.label}
      </span>
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${diffConfig.bg} ${diffConfig.text}`}>
        {diffConfig.label}
      </span>
    </div>
  )
}





