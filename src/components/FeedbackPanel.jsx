import { useMemo, useState } from 'react'
import { KeywordChips } from './KeywordChips'
import { ScoreCard } from './ScoreCard'
import { Card, CardHeader } from './ui/Card'

export function FeedbackPanel({ evaluation, showAdvanced = true }) {
  const [answerFormat, setAnswerFormat] = useState('short')

  const answerText = useMemo(() => {
    if (!evaluation) return '—'
    const value = evaluation.correctAnswer || {}
    if (answerFormat === 'long') return value.long || value.short || '—'
    if (answerFormat === 'bullets') {
      return Array.isArray(value.bulletPoints) && value.bulletPoints.length
        ? value.bulletPoints.map((p) => `• ${p}`).join('\n')
        : value.short || '—'
    }
    return value.short || value.long || '—'
  }, [evaluation, answerFormat])

  const sourceLabel = useMemo(() => {
    if (!evaluation) return '—'

    if (evaluation.source === 'live-ai') {
      if (evaluation.provider === 'groq') return 'Live AI (Groq)'
      if (evaluation.provider === 'gemini') return 'Live AI (Gemini)'
      return `Live AI (${evaluation.provider || 'Provider'})`
    }

    return 'Fallback Heuristic'
  }, [evaluation])

  if (!evaluation) return null

  return (
    <Card>
      <CardHeader
        title="Feedback"
        subtitle={`Source: ${sourceLabel}`}
        right={<ScoreCard score={evaluation.score} />}
      />
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

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Correct Answer</p>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              {['short', 'long', 'bullets'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setAnswerFormat(f)}
                  className={`rounded-md px-2 py-1 transition ${
                    answerFormat === f ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{answerText}</p>
        </div>

        {showAdvanced ? (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Rubric (0-10)</p>
              <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-slate-800">
                <p>Concept Accuracy: {evaluation.rubric?.conceptAccuracy ?? '—'}</p>
                <p>Depth: {evaluation.rubric?.depth ?? '—'}</p>
                <p>Example Quality: {evaluation.rubric?.exampleQuality ?? '—'}</p>
                <p>Tradeoff Awareness: {evaluation.rubric?.tradeoffAwareness ?? '—'}</p>
                <p>Communication: {evaluation.rubric?.communication ?? '—'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Evidence-Based Feedback</p>
              {!evaluation.evidence?.length ? (
                <p className="mt-1 text-sm text-slate-900">—</p>
              ) : (
                <div className="mt-1 space-y-2">
                  {evaluation.evidence.map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 bg-white/80 p-2 text-sm">
                      <p className="font-medium text-slate-900">"{item.quote || '—'}"</p>
                      <p className="text-emerald-700">Strength: {item.strength || '—'}</p>
                      <p className="text-amber-700">Gap: {item.gap || '—'}</p>
                      <p className="text-indigo-700">Action: {item.action || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Card>
  )
}
