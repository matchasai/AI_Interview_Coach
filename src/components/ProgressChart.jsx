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
      <div className="h-56 min-h-[224px] w-full min-w-0 text-blue-400">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
          <AreaChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
            <XAxis dataKey="date" tickFormatter={formatDateLabel} stroke="rgba(156,163,175,0.8)" />
            <YAxis domain={[0, 100]} stroke="rgba(156,163,175,0.8)" />
            <Tooltip
              labelFormatter={formatDateLabel}
              contentStyle={{
                background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

