import { Card, CardHeader } from './ui/Card'

export function QuestionCard({
  index,
  total,
  questionText,
  timerLabel,
  topicOverview,
  realWorldExample,
  applications,
  programmingUsage,
}) {
  return (
    <Card>
      <CardHeader
        title={`Question ${index + 1} of ${total}`}
        subtitle={timerLabel}
      />
      <p className="text-sm leading-relaxed text-slate-900">{questionText}</p>

      {topicOverview ? (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Topic overview</p>
          <p className="mt-1 text-sm text-slate-700">{topicOverview}</p>
        </div>
      ) : null}

      {realWorldExample ? (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Real-world example</p>
          <p className="mt-1 text-sm text-slate-700">{realWorldExample}</p>
        </div>
      ) : null}

      {Array.isArray(applications) && applications.length ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Applications</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {applications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {programmingUsage ? (
        <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Programming usage</p>
          <p className="mt-1 text-sm text-slate-700">{programmingUsage}</p>
        </div>
      ) : null}
    </Card>
  )
}
