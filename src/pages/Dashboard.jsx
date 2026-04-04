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
import { toastError, toastPromise, toastSuccess } from '../utils/toast'

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
  const [studyGuides, setStudyGuides] = useState([])
  const [filterRole, setFilterRole] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [exporting, setExporting] = useState('')
  const [deletingSessionId, setDeletingSessionId] = useState('')

  useEffect(() => {
    if (error) toastError(error)
  }, [error])

  useEffect(() => {
    let active = true

    async function run() {
      setLoading(true)
      setError('')
      try {
        const [statsRes, historyRes, studyGuidesRes] = await Promise.all([
          api.get('/api/user/stats'),
          api.get('/api/session/history'),
          api.get('/api/user/study-guides').catch(() => ({ data: { studyGuides: { weakestRoles: [] } } })),
        ])

        if (!active) return
        setStats(statsRes.data.stats)
        setSessions(historyRes.data.sessions || [])
        setStudyGuides(studyGuidesRes.data.studyGuides?.weakestRoles || [])
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

  async function deleteSession(session) {
    const isRunning = session?.status === 'active' || session?.status === 'paused'
    if (!isRunning) {
      toastError('Only active or paused sessions can be deleted.')
      return
    }

    setDeletingSessionId(session._id)
    
    const deletePromise = api.delete(`/api/session/${session._id}`).then(() => {
      setSessions((prev) => (prev || []).filter((item) => item._id !== session._id))
    })

    toastPromise(
      deletePromise,
      {
        loading: `Deleting ${session.role} session...`,
        success: 'Session deleted successfully',
        error: (err) => `Failed to delete: ${getErrorMessage(err)}`,
      }
    )

    try {
      await deletePromise
    } catch (e) {
      setDeletingSessionId('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Loading your progress…</p>
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
      <Motion.section variants={fadeUp} className="surface-card surface-glow relative overflow-hidden rounded-3xl border border-white/70 p-5 md:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-20 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-200">
              Insights hub
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Performance Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">Your progress, trends, and session history in one place.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/session/new">
              <Button className="px-5">Start New Session</Button>
            </Link>
            <Link to="/doubt-session">
              <Button variant="secondary" className="px-5">Open Doubt Session</Button>
            </Link>
          </div>
        </div>
      </Motion.section>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
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
            <div className="mt-3 h-1.5 rounded-full bg-gradient-to-r from-blue-500/85 to-indigo-500/85" />
          </Card>
        </Motion.div>
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Average Score" subtitle="Across completed sessions" />
            <p className="text-2xl font-semibold text-slate-900">
              <AnimatedNumber value={stats?.avgScore ?? 0} />%
            </p>
            <div className="mt-3 h-1.5 rounded-full bg-gradient-to-r from-emerald-500/85 to-teal-500/85" />
          </Card>
        </Motion.div>
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Best Role" subtitle="By average score" />
            <p className="text-lg font-semibold text-slate-900">{stats?.bestRole || '—'}</p>
            <div className="mt-3 h-1.5 rounded-full bg-gradient-to-r from-violet-500/85 to-fuchsia-500/85" />
          </Card>
        </Motion.div>
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Avg Duration" subtitle="Completed sessions" />
            <p className="text-lg font-semibold text-slate-900">{formatDuration(stats?.avgDurationSeconds ?? 0)}</p>
            <div className="mt-3 h-1.5 rounded-full bg-gradient-to-r from-amber-500/85 to-orange-500/85" />
          </Card>
        </Motion.div>
      </div>

      {studyGuides.length > 0 ? (
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Study Guides" subtitle="Focus areas based on your weakest roles" />
            <div className="grid gap-4 md:grid-cols-2">
              {studyGuides.slice(0, 4).map((guide) => (
                <div key={guide.role} className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{guide.role}</p>
                      <p className="text-xs text-slate-500">Average score: {guide.averageScore}%</p>
                    </div>
                    <span className="rounded-full bg-indigo-500/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-200">
                      {guide.priority}
                    </span>
                  </div>

                  <div className="mt-3 space-y-3 text-sm text-slate-600">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Focus Areas</p>
                      <p className="mt-1">{(guide.focusAreas || []).join(' • ')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Drills</p>
                      <p className="mt-1">{(guide.drills || []).join(' • ')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resources</p>
                      <p className="mt-1">{(guide.resources || []).join(' • ')}</p>
                    </div>
                    <div className="rounded-xl bg-white/80 px-3 py-2 text-xs text-slate-600">
                      Next target: reach {guide.nextTargetScore}% on {guide.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Motion.div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Motion.div variants={fadeUp}>
          <ProgressChart data={chartData} />
        </Motion.div>

        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Recent Sessions" subtitle={`Your latest history (${filteredSessions.length} total)`} />

            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-3 border-b border-slate-200/80 pb-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="mt-1 rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-1.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Difficulty</label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="mt-1 rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-1.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="all">All Levels</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="mt-1 rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-1.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
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
              <p className="text-sm text-slate-600">No sessions matching filters.</p>
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
                  <tbody className="text-gray-200">
                    {filteredSessions.slice(0, 15).map((s) => (
                      <tr key={s._id} className="border-t border-slate-200/80 transition-colors hover:bg-slate-50">
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
                                className="rounded-md px-1 text-gray-200 transition hover:bg-indigo-500/20 hover:text-indigo-200 hover:underline"
                              >
                                View
                              </Link>
                            ) : (
                              <Link
                                to={`/session/${s._id}`}
                                className="rounded-md px-1 text-gray-200 transition hover:bg-indigo-500/20 hover:text-indigo-200 hover:underline"
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
                            {(s.status === 'active' || s.status === 'paused') ? (
                              <Button
                                variant="ghost"
                                className="px-2 py-1 text-xs text-red-300 hover:text-red-200"
                                disabled={Boolean(deletingSessionId) || Boolean(exporting)}
                                onClick={() => deleteSession(s)}
                              >
                                {deletingSessionId === s._id ? 'Deleting…' : 'Delete'}
                              </Button>
                            ) : null}
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
                <tbody className="text-gray-200">
                  {stats.perRole.map((r) => (
                    <tr key={r.role} className="border-t border-slate-200/80">
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

      {stats?.learningProgress ? (
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Learning Progress" subtitle="Weak topics, repeated mistakes, and next plan" />
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weak Topics</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-200">
                  {(stats.learningProgress.weakTopics || []).length ? (
                    stats.learningProgress.weakTopics.map((topic) => <li key={topic}>{topic}</li>)
                  ) : (
                    <li>No weak topics detected yet.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Repeated Mistakes</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-200">
                  {(stats.learningProgress.repeatedMistakes || []).length ? (
                    stats.learningProgress.repeatedMistakes.map((item) => (
                      <li key={item.keyword}>{item.keyword} ({item.count})</li>
                    ))
                  ) : (
                    <li>No repeated mistakes yet.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested Practice Plan</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-200">
                  {(stats.learningProgress.practicePlan || []).length ? (
                    stats.learningProgress.practicePlan.map((step) => <li key={step}>{step}</li>)
                  ) : (
                    <li>Complete one session to generate your plan.</li>
                  )}
                </ol>
              </div>
            </div>
          </Card>
        </Motion.div>
      ) : null}
    </Motion.div>
  )
}

