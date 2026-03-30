import { KeywordChips } from './KeywordChips'
import { ScoreCard } from './ScoreCard'
import { Card, CardHeader } from './ui/Card'

export function FeedbackPanel({ evaluation }) {
  if (!evaluation) return null

  return (
    <Card>
      <CardHeader title="Feedback" right={<ScoreCard score={evaluation.score} />} />
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Feedback</p>
          <p className="mt-1 text-sm text-slate-900">{evaluation.feedback || '—'}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Missing Keywords</p>
          <div className="mt-1">
            <KeywordChips keywords={evaluation.missingKeywords} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Improvement Tip</p>
          <p className="mt-1 text-sm text-slate-900">{evaluation.improvementTip || '—'}</p>
        </div>
      </div>
    </Card>
  )
}
