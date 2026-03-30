import { scoreBadgeClasses } from '../utils/scoreUtils'

export function ScoreCard({ score, max = 10 }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-md px-2 py-1 text-sm font-semibold ${scoreBadgeClasses(score)}`}>
        {score}/{max}
      </span>
      <span className="text-sm text-slate-600">Score</span>
    </div>
  )
}
