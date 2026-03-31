export function scoreColor(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return 'text-slate-700'
  if (n <= 3) return 'text-red-600'
  if (n <= 6) return 'text-yellow-600'
  return 'text-green-600'
}

export function scoreBadgeClasses(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return 'bg-slate-100 text-slate-700'
  if (n <= 3) return 'bg-red-50 text-red-700'
  if (n <= 6) return 'bg-yellow-50 text-yellow-700'
  return 'bg-green-50 text-green-700'
}
