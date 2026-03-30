import { Card, CardHeader } from './ui/Card'

export function QuestionCard({ index, total, questionText, timerLabel }) {
  return (
    <Card>
      <CardHeader
        title={`Question ${index + 1} of ${total}`}
        subtitle={timerLabel}
      />
      <p className="text-sm leading-relaxed text-slate-900">{questionText}</p>
    </Card>
  )
}
