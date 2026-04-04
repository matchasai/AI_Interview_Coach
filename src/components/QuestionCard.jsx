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
      <p className="text-sm leading-relaxed text-white">{questionText}</p>

      {topicOverview ? (
        <div className="mt-3 rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Topic overview</p>
          <p className="mt-1 text-sm text-gray-200">{topicOverview}</p>
        </div>
      ) : null}

      {realWorldExample ? (
        <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Real-world example</p>
          <p className="mt-1 text-sm text-gray-200">{realWorldExample}</p>
        </div>
      ) : null}

      {Array.isArray(applications) && applications.length ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Applications</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-200">
            {applications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {programmingUsage ? (
        <div className="mt-3 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-200">Programming usage</p>
          <p className="mt-1 text-sm text-gray-200">{programmingUsage}</p>
        </div>
      ) : null}
    </Card>
  )
}
