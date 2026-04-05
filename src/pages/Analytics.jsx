import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { api, getErrorMessage } from '../services/api'

const chartGrid = { stroke: 'rgba(148,163,184,0.22)' }
const chartAxis = { stroke: 'rgba(156,163,175,0.8)' }
const chartTooltipStyle = {
  background: '#1e293b',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#fff',
}

function emptyAnalytics(scope) {
  return {
    scope,
    totalSessions: 0,
    averageScore: 0,
    weakAreas: [],
    strongAreas: [],
    performanceTrend: [],
    difficultyBreakdown: {},
    rolePerformance: {},
    bestRole: null,
    avgDurationSeconds: 0,
  }
}

function buildUserAnalytics(stats, sessions, roleFilter, difficultyFilter) {
  const filteredSessions = (sessions || []).filter((session) => {
    const roleMatches = !roleFilter || session.role === roleFilter
    const difficultyMatches = !difficultyFilter || session.difficulty === difficultyFilter
    return roleMatches && difficultyMatches
  })

  const completedSessions = filteredSessions.filter((session) => session.status === 'completed')

  const averageScore = completedSessions.length
    ? completedSessions.reduce((sum, session) => sum + (Number(session.totalScore) || 0), 0) / completedSessions.length
    : Number(stats?.avgScore) || 0

  const performanceTrend = completedSessions
    .slice(0, 10)
    .reverse()
    .map((session, index) => ({
      session: `#${index + 1}`,
      score: Number(session.totalScore) || 0,
      role: session.role,
      difficulty: session.difficulty,
    }))

  const difficultyBreakdown = completedSessions.reduce((acc, session) => {
    const key = session.difficulty || 'unknown'
    if (!acc[key]) {
      acc[key] = { attempts: 0, totalScore: 0, average: 0 }
    }
    acc[key].attempts += 1
    acc[key].totalScore += Number(session.totalScore) || 0
    acc[key].average = acc[key].totalScore / acc[key].attempts
    return acc
  }, {})

  const rolePerformance = (stats?.perRole || []).reduce((acc, row) => {
    acc[row.role] = {
      average: Number(row.avgScore) || 0,
      attempts: Number(row.sessions) || 0,
      bestScore: Number(row.bestScore) || 0,
    }
    return acc
  }, {})

  const rankedRoles = [...(stats?.perRole || [])].sort((a, b) => (a.avgScore || 0) - (b.avgScore || 0))
  const weakAreas = rankedRoles.slice(0, 3).map((row) => ({
    area: row.role,
    score: Number(row.avgScore) || 0,
    attempts: Number(row.sessions) || 0,
  }))
  const strongAreas = rankedRoles.slice(-3).reverse().map((row) => ({
    area: row.role,
    score: Number(row.avgScore) || 0,
    attempts: Number(row.sessions) || 0,
  }))

  return {
    scope: 'user',
    totalSessions: completedSessions.length || Number(stats?.totalSessions) || 0,
    averageScore,
    weakAreas,
    strongAreas,
    performanceTrend,
    difficultyBreakdown,
    rolePerformance,
    bestRole: stats?.bestRole || null,
    avgDurationSeconds: Number(stats?.avgDurationSeconds) || 0,
  }
}

function normalizeAdminAnalytics(payload) {
  return {
    scope: 'admin',
    totalSessions: Number(payload?.totalSessions) || 0,
    averageScore: Number(payload?.averageScore) || 0,
    weakAreas: payload?.weakAreas || [],
    strongAreas: payload?.strongAreas || [],
    performanceTrend: payload?.performanceTrend || [],
    difficultyBreakdown: payload?.difficultyBreakdown || {},
    rolePerformance: payload?.rolePerformance || {},
    bestRole: payload?.bestRole || null,
    avgDurationSeconds: Number(payload?.avgDurationSeconds) || 0,
  }
}

export default function Analytics() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(emptyAnalytics(user?.role === 'admin' ? 'admin' : 'user'))
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [roleFilter, setRoleFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')

  useEffect(() => {
    let active = true

    async function fetchAnalytics() {
      try {
        setLoading(true)

        if (user?.role === 'admin') {
          const params = {}
          if (roleFilter) params.roleFilter = roleFilter
          if (difficultyFilter) params.difficultyFilter = difficultyFilter

          const response = await api.get('/api/admin/analytics', { params })
          if (!active) return
          setAnalytics(normalizeAdminAnalytics(response.data.analytics))
          setSessions([])
          return
        }

        const [statsRes, historyRes] = await Promise.all([
          api.get('/api/user/stats'),
          api.get('/api/session/history'),
        ])

        if (!active) return
        const history = historyRes.data.sessions || []
        setSessions(history)
        setAnalytics(buildUserAnalytics(statsRes.data.stats, history, roleFilter, difficultyFilter))
      } catch (err) {
        if (!active) return
        toast.error(getErrorMessage(err))
        setAnalytics(emptyAnalytics(user?.role === 'admin' ? 'admin' : 'user'))
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchAnalytics()
    return () => {
      active = false
    }
  }, [user?.role, roleFilter, difficultyFilter, refreshKey])

  const roleOptions = useMemo(() => {
    const options = new Set()
    sessions.forEach((session) => {
      if (session.role) options.add(session.role)
    })
    Object.keys(analytics.rolePerformance || {}).forEach((role) => options.add(role))
    return Array.from(options).sort()
  }, [analytics.rolePerformance, sessions])

  const difficultyBreakdownData = useMemo(
    () =>
      Object.entries(analytics.difficultyBreakdown || {}).map(([difficulty, stats]) => ({
        difficulty,
        ...stats,
      })),
    [analytics.difficultyBreakdown],
  )

  const rolePerformanceData = useMemo(
    () =>
      Object.entries(analytics.rolePerformance || {}).map(([role, stats]) => ({
        role,
        average: Number(stats.average) || 0,
        attempts: Number(stats.attempts) || 0,
        bestScore: Number(stats.bestScore) || 0,
      })),
    [analytics.rolePerformance],
  )

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    )
  }

  const scopeLabel = analytics.scope === 'admin' ? 'Platform Analytics' : 'Your Analytics'
  const filterHint =
    analytics.scope === 'admin'
      ? 'Admin filters apply to the platform analytics endpoint.'
      : 'Filters apply to your own session history.'

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-300">Analytics</p>
            <h1 className="text-4xl font-bold text-white">{scopeLabel}</h1>
            <p className="mt-2 text-sm text-gray-400">{filterHint}</p>
          </div>
          <button
            onClick={() => setRefreshKey((value) => value + 1)}
            className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2 text-white shadow-lg shadow-indigo-900/35 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/35"
          >
            Refresh
          </button>
        </div>

        <div className="mb-8 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Filter by role..."
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#1e293b] px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#1e293b] px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#1e293b] px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">All Roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="saas-card p-6">
            <p className="text-sm font-medium text-gray-400">Total Sessions</p>
            <p className="mt-2 text-4xl font-bold text-blue-600">{analytics.totalSessions || 0}</p>
          </div>
          <div className="saas-card p-6">
            <p className="text-sm font-medium text-gray-400">Average Score</p>
            <p className="mt-2 text-4xl font-bold text-green-600">{Number(analytics.averageScore || 0).toFixed(1)}</p>
          </div>
          <div className="saas-card p-6">
            <p className="text-sm font-medium text-gray-400">Best Role</p>
            <p className="mt-2 text-2xl font-bold text-white">{analytics.bestRole || '—'}</p>
          </div>
          <div className="saas-card p-6">
            <p className="text-sm font-medium text-gray-400">Avg Duration</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {Math.round(analytics.avgDurationSeconds || 0)}s
            </p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="saas-card min-w-0 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Performance Trend</h2>
            {analytics.performanceTrend.length > 0 ? (
              <div className="h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                  <LineChart data={analytics.performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" {...chartGrid} />
                    <XAxis dataKey="session" {...chartAxis} />
                    <YAxis domain={[0, 100]} {...chartAxis} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Complete a few sessions to see your performance trend.</p>
            )}
          </div>

          <div className="saas-card min-w-0 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">By Difficulty</h2>
            {difficultyBreakdownData.length > 0 ? (
              <div className="h-[300px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                  <BarChart data={difficultyBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" {...chartGrid} />
                    <XAxis dataKey="difficulty" {...chartAxis} />
                    <YAxis yAxisId="left" {...chartAxis} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} {...chartAxis} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="attempts" fill="#3b82f6" name="Attempts" />
                    <Bar yAxisId="right" dataKey="average" fill="#10b981" name="Avg Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No completed sessions yet.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="saas-card p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Weak Areas</h2>
            <div className="space-y-4">
              {analytics.weakAreas.length > 0 ? (
                analytics.weakAreas.map((area, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <p className="font-medium text-white">{area.area}</p>
                      <p className="text-sm text-gray-400">{area.attempts} attempts</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{Number(area.score || 0).toFixed(1)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No weak areas identified</p>
              )}
            </div>
          </div>

          <div className="saas-card p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Strong Areas</h2>
            <div className="space-y-4">
              {analytics.strongAreas.length > 0 ? (
                analytics.strongAreas.map((area, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <p className="font-medium text-white">{area.area}</p>
                      <p className="text-sm text-gray-400">{area.attempts} attempts</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{Number(area.score || 0).toFixed(1)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No strong areas identified</p>
              )}
            </div>
          </div>
        </div>

        {rolePerformanceData.length > 0 && (
          <div className="saas-card mt-8 min-w-0 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Performance by Role</h2>
            <div className="h-[320px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
                <BarChart data={rolePerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" {...chartGrid} />
                  <XAxis dataKey="role" {...chartAxis} />
                  <YAxis domain={[0, 100]} {...chartAxis} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Bar dataKey="average" fill="#3b82f6" name="Average Score" />
                  <Bar dataKey="bestScore" fill="#10b981" name="Best Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[#273549]">
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-200">Role</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-200">Average Score</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-200">Attempts</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-200">Best Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {rolePerformanceData.map((row) => (
                    <tr key={row.role} className="hover:bg-[#273549]">
                      <td className="px-6 py-3 text-sm text-gray-200">{row.role}</td>
                      <td className="px-6 py-3 text-sm font-medium text-blue-600">{row.average.toFixed(1)}</td>
                      <td className="px-6 py-3 text-sm text-gray-400">{row.attempts}</td>
                      <td className="px-6 py-3 text-sm text-gray-400">{row.bestScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}




