import { motion as Motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { ProgressChart } from '../components/ProgressChart'
import { StatusBadge } from '../components/StatusBadge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { api, getErrorMessage } from '../services/api'
import { fadeUp, stagger } from '../utils/motion'
import {
    computeSessionDurationSeconds,
    downloadSessionJson,
    downloadSessionPdf,
    formatDuration,
} from '../utils/sessionExport'
import { toastError, toastSuccess } from '../utils/toast'

function formatDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])
  const [filterRole, setFilterRole] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [exporting, setExporting] = useState('')

  useEffect(() => {
    if (error) toastError(error)
  }, [error])

  useEffect(() => {
    let active = true

    async function run() {
      setLoading(true)
      setError('')
      try {
        const [statsRes, historyRes] = await Promise.all([
          api.get('/api/user/stats'),
          api.get('/api/session/history'),
        ])

        if (!active) return
        setStats(statsRes.data.stats)
        setSessions(historyRes.data.sessions || [])
      } catch (e) {
        if (!active) return
        setError(getErrorMessage(e))
      } finally {
        if (active) setLoading(false)
      }
    }

    run()
    return () => {
      active = false
    }
  }, [])

  const chartData = useMemo(() => {
    const completed = (sessions || []).filter((s) => s.status === 'completed')
    const latest = completed.slice(0, 10).reverse()
    return latest.map((s) => ({
      date: s.completedAt || s.createdAt,
      score: typeof s.totalScore === 'number' ? s.totalScore : 0,
    }))
  }, [sessions])

  const filteredSessions = useMemo(() => {
    let filtered = sessions || []

    if (filterRole !== 'all') {
      filtered = filtered.filter((s) => s.role === filterRole)
    }

    if (filterDifficulty !== 'all') {
      filtered = filtered.filter((s) => s.difficulty === filterDifficulty)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((s) => s.status === filterStatus)
    }

    return filtered
  }, [sessions, filterRole, filterDifficulty, filterStatus])

  const uniqueRoles = useMemo(() => {
    const roles = new Set((sessions || []).map((s) => s.role))
    return Array.from(roles).sort()
  }, [sessions])

  async function exportSession(sessionId, type) {
    setExporting(`${sessionId}:${type}`)
    try {
      const res = await api.get(`/api/session/${sessionId}`)
      const fullSession = res.data.session
      if (type === 'json') {
        downloadSessionJson(fullSession)
      } else {
        await downloadSessionPdf(fullSession)
      }
      toastSuccess(`Session ${type.toUpperCase()} exported`)
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setExporting('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">Loading your progress…</p>
          </div>
          <div className="w-44">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    )
  }

  return (
    <Motion.div className="space-y-6" variants={stagger} initial="initial" animate="animate">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Your progress and session history.</p>
        </div>
        <Link to="/session/new">
          <Button>Start New Session</Button>
        </Link>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Total Sessions" />
            <p className="text-2xl font-semibold text-slate-900">
              <AnimatedNumber value={stats?.totalSessions ?? 0} />
            </p>
          </Card>
        </Motion.div>
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Average Score" subtitle="Across completed sessions" />
            <p className="text-2xl font-semibold text-slate-900">
              <AnimatedNumber value={stats?.avgScore ?? 0} />%
            </p>
          </Card>
        </Motion.div>
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Best Role" subtitle="By average score" />
            <p className="text-lg font-semibold text-slate-900">{stats?.bestRole || '—'}</p>
          </Card>
        </Motion.div>
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Avg Duration" subtitle="Completed sessions" />
            <p className="text-lg font-semibold text-slate-900">{formatDuration(stats?.avgDurationSeconds ?? 0)}</p>
          </Card>
        </Motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Motion.div variants={fadeUp}>
          <ProgressChart data={chartData} />
        </Motion.div>

        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Recent Sessions" subtitle={`Your latest history (${filteredSessions.length} total)`} />

            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-3 border-b border-slate-200 pb-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="all">All Roles</option>
                  {uniqueRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Difficulty</label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="all">All Levels</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="abandoned">Abandoned</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFilterRole('all')
                    setFilterDifficulty('all')
                    setFilterStatus('all')
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <p className="text-sm text-slate-700">No sessions matching filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2">Role</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Score</th>
                      <th className="py-2">Duration</th>
                      <th className="py-2">Created</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    {filteredSessions.slice(0, 15).map((s) => (
                      <tr key={s._id} className="border-t border-slate-100">
                        <td className="py-2 pr-2 font-medium text-slate-900">{s.role}</td>
                        <td className="py-2 pr-2">
                          <StatusBadge status={s.status} difficulty={s.difficulty} />
                        </td>
                        <td className="py-2 pr-2">
                          {typeof s.totalScore === 'number' ? `${s.totalScore}%` : '—'}
                        </td>
                        <td className="py-2 pr-2">{formatDuration(computeSessionDurationSeconds(s))}</td>
                        <td className="py-2 pr-2">{formatDateTime(s.createdAt)}</td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {s.status === 'completed' ? (
                              <Link
                                to={`/session/${s._id}/results`}
                                className="text-slate-900 hover:text-indigo-700 hover:underline"
                              >
                                View
                              </Link>
                            ) : (
                              <Link
                                to={`/session/${s._id}`}
                                className="text-slate-900 hover:text-indigo-700 hover:underline"
                              >
                                Continue
                              </Link>
                            )}
                            <Button
                              variant="ghost"
                              className="px-2 py-1 text-xs"
                              disabled={Boolean(exporting)}
                              onClick={() => exportSession(s._id, 'json')}
                            >
                              {exporting === `${s._id}:json` ? '…' : 'JSON'}
                            </Button>
                            <Button
                              variant="ghost"
                              className="px-2 py-1 text-xs"
                              disabled={Boolean(exporting)}
                              onClick={() => exportSession(s._id, 'pdf')}
                            >
                              {exporting === `${s._id}:pdf` ? '…' : 'PDF'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </Motion.div>
      </div>

      {stats?.perRole?.length ? (
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Per Role" subtitle="Your performance breakdown" />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2">Role</th>
                    <th className="py-2">Sessions</th>
                    <th className="py-2">Avg Score</th>
                    <th className="py-2">Best Score</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {stats.perRole.map((r) => (
                    <tr key={r.role} className="border-t border-slate-100">
                      <td className="py-2 pr-2 font-medium text-slate-900">{r.role}</td>
                      <td className="py-2 pr-2">{r.sessions}</td>
                      <td className="py-2 pr-2">{r.avgScore}%</td>
                      <td className="py-2 pr-2">{r.bestScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Motion.div>
      ) : null}
    </Motion.div>
  )
}
