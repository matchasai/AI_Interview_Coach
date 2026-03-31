import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { Card, CardHeader } from './ui/Card'

function formatDateLabel(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

export function ProgressChart({ data }) {
  return (
    <Card>
      <CardHeader title="Progress" subtitle="Score trend over sessions" />
      <div className="h-56 min-h-[224px] w-full min-w-0 text-indigo-700">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
          <AreaChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatDateLabel} />
            <YAxis domain={[0, 100]} />
            <Tooltip labelFormatter={formatDateLabel} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="currentColor"
              fill="currentColor"
              fillOpacity={0.12}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
