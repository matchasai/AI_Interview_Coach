import { scoreBadgeClasses } from '../utils/scoreUtils'

export function ScoreCard({ score, max = 10 }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm shadow-slate-900/10">
      <span className={`rounded-lg px-2.5 py-1 text-sm font-semibold ${scoreBadgeClasses(score)}`}>
        {score}/{max}
      </span>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-600">Score</span>
    </div>
  )
}





