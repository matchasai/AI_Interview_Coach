import { motion as Motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { api, getErrorMessage } from '../services/api'
import { fadeUp, stagger } from '../utils/motion'
import { toastError, toastSuccess } from '../utils/toast'

function formatDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export function Admin() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [sessions, setSessions] = useState([])
  const [emailQueueStatus, setEmailQueueStatus] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    if (error) toastError(error)
  }, [error])

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [statsRes, usersRes, sessionsRes, queueRes, analyticsRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
        api.get('/api/admin/sessions'),
        api.get('/api/admin/email-queue-status').catch(() => ({ data: { queueStatus: {} } })),
        api.get('/api/admin/analytics').catch(() => ({ data: { analytics: {} } })),
      ])

      setStats(statsRes.data.stats)
      setUsers(usersRes.data.users || [])
      setSessions(sessionsRes.data.sessions || [])
      setEmailQueueStatus(queueRes.data.queueStatus || {})
      setAnalytics(analyticsRes.data.analytics || {})
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function softDeleteSession(sessionId) {
    const ok = window.confirm('Soft-delete this session? It will be hidden from the user.')
    if (!ok) return

    try {
      await api.delete(`/api/session/${sessionId}`)
      toastSuccess('Session deleted')
      await load()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  async function recoverSession(sessionId) {
    try {
      setActionLoading(`recover:${sessionId}`)
      await api.post(`/api/admin/sessions/${sessionId}/recover`)
      toastSuccess('Session recovered')
      await load()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setActionLoading('')
    }
  }

  async function deleteUser(userId) {
    const ok = window.confirm('Deactivate this user account?')
    if (!ok) return

    try {
      setActionLoading(`delete:${userId}`)
      await api.delete(`/api/admin/users/${userId}`)
      toastSuccess('User deactivated')
      await load()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setActionLoading('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
            <p className="mt-1 text-sm text-slate-600">Loading platform stats…</p>
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>

        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  return (
    <Motion.div className="space-y-6" variants={stagger} initial="initial" animate="animate">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
          <p className="mt-1 text-sm text-slate-600">Platform overview and controls.</p>
        </div>
        <Button variant="secondary" onClick={load}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-slate-200">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'email', label: 'Email Queue' },
          { id: 'recovery', label: 'Recovery' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-4 font-medium transition ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Motion.div variants={fadeUp}>
              <Card>
                <CardHeader title="Totals" />
                <p className="text-sm text-slate-700">Users: {stats?.userCount ?? 0}</p>
                <p className="text-sm text-slate-700">Sessions: {stats?.sessionCount ?? 0}</p>
              </Card>
            </Motion.div>

            <Motion.div variants={fadeUp}>
              <Card>
                <CardHeader title="Role Distribution" subtitle="Completed sessions" />
                {stats?.roleDistribution?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="py-2">Role</th>
                          <th className="py-2">Count</th>
                          <th className="py-2">Avg Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.roleDistribution.map((r) => (
                          <tr key={r.role} className="border-t border-slate-100">
                            <td className="py-2 pr-2 font-medium text-slate-900">{r.role}</td>
                            <td className="py-2 pr-2">{r.count}</td>
                            <td className="py-2 pr-2">{r.avgScore}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700">No completed sessions yet.</p>
                )}
              </Card>
            </Motion.div>
          </div>

          <Motion.div variants={fadeUp}>
            <Card>
              <CardHeader title="Users" subtitle="Latest users" />
              {users.length === 0 ? (
                <p className="text-sm text-slate-700">No users found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="py-2">Name</th>
                        <th className="py-2">Email</th>
                        <th className="py-2">Role</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Sessions</th>
                        <th className="py-2">Avg Score</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody className="text-slate-800">
                      {users.slice(0, 20).map((u) => (
                        <tr key={u._id} className="border-t border-slate-100">
                          <td className="py-2 pr-2 font-medium text-slate-900">{u.name}</td>
                          <td className="py-2 pr-2">{u.email}</td>
                          <td className="py-2 pr-2">{u.role}</td>
                          <td className="py-2 pr-2">
                            <span className={`text-xs px-2 py-1 rounded ${u.emailVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {u.emailVerified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                          <td className="py-2 pr-2">{u.totalSessions ?? 0}</td>
                          <td className="py-2 pr-2">{u.avgScore ?? 0}%</td>
                          <td className="py-2 text-right">
                            <Button
                              variant="danger"
                              className="px-2 py-1 text-xs"
                              disabled={actionLoading === `delete:${u._id}`}
                              onClick={() => deleteUser(u._id)}
                            >
                              Deactivate
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </Motion.div>

          <Motion.div variants={fadeUp}>
            <Card>
              <CardHeader title="Sessions" subtitle="Latest sessions" />
              {sessions.length === 0 ? (
                <p className="text-sm text-slate-700">No sessions found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="py-2">Role</th>
                        <th className="py-2">Difficulty</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Score</th>
                        <th className="py-2">Created</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody className="text-slate-800">
                      {sessions.slice(0, 20).map((s) => (
                        <tr key={s._id} className="border-t border-slate-100">
                          <td className="py-2 pr-2 font-medium text-slate-900">{s.role}</td>
                          <td className="py-2 pr-2">{s.difficulty}</td>
                          <td className="py-2 pr-2">{s.status}</td>
                          <td className="py-2 pr-2">
                            {typeof s.totalScore === 'number' ? `${s.totalScore}%` : '—'}
                          </td>
                          <td className="py-2 pr-2">{formatDateTime(s.createdAt)}</td>
                          <td className="py-2 text-right">
                            {s.status !== 'abandoned' ? (
                              <Button
                                variant="danger"
                                className="px-3 py-1 text-xs"
                                onClick={() => softDeleteSession(s._id)}
                              >
                                Delete
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-500">Deleted</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </Motion.div>
        </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Platform Analytics" subtitle="Performance metrics" />
            {analytics?.totalSessions ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Sessions</p>
                    <p className="text-3xl font-bold text-blue-600">{analytics.totalSessions}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Average Score</p>
                    <p className="text-3xl font-bold text-green-600">{(analytics.averageScore || 0).toFixed(1)}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Weak Areas</p>
                    <p className="text-3xl font-bold text-purple-600">{analytics.weakAreas?.length || 0}</p>
                  </div>
                </div>

                {analytics.rolePerformance && Object.keys(analytics.rolePerformance).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Performance by Role</h3>
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="py-2 text-left">Role</th>
                          <th className="py-2 text-left">Average Score</th>
                          <th className="py-2 text-left">Attempts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.entries(analytics.rolePerformance).slice(0, 10).map(([role, stats]) => (
                          <tr key={role}>
                            <td className="py-2 font-medium text-slate-900">{role}</td>
                            <td className="py-2 text-blue-600">{stats.average.toFixed(1)}</td>
                            <td className="py-2 text-slate-600">{stats.attempts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-700">No analytics data available.</p>
            )}
          </Card>
        </Motion.div>
      )}

      {/* Email Queue Tab */}
      {activeTab === 'email' && (
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Email Queue Status" subtitle="Background email processing" />
            {emailQueueStatus ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Pending Emails</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{emailQueueStatus.pending || 0}</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Retrying</p>
                  <p className="text-3xl font-bold text-amber-600 mt-2">{emailQueueStatus.retrying || 0}</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Failed</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{emailQueueStatus.failed || 0}</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Processed</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{emailQueueStatus.processed || 0}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-700">No email queue data available.</p>
            )}
          </Card>
        </Motion.div>
      )}

      {/* Recovery Tab */}
      {activeTab === 'recovery' && (
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Abandoned Sessions" subtitle="Sessions deleted by admin can be recovered" />
            {sessions.filter((s) => s.status === 'abandoned').length === 0 ? (
              <p className="text-sm text-slate-700">No abandoned sessions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2">User</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Score</th>
                      <th className="py-2">Deleted</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody className="text-slate-800">
                    {sessions
                      .filter((s) => s.status === 'abandoned')
                      .slice(0, 20)
                      .map((s) => (
                        <tr key={s._id} className="border-t border-slate-100">
                          <td className="py-2 pr-2 font-medium text-slate-900">{s.userId}</td>
                          <td className="py-2 pr-2">{s.role}</td>
                          <td className="py-2 pr-2">{s.totalScore || 0}%</td>
                          <td className="py-2 pr-2">{formatDateTime(s.deletedAt || s.updatedAt)}</td>
                          <td className="py-2 text-right">
                            <Button
                              className="px-3 py-1 text-xs"
                              disabled={actionLoading === `recover:${s._id}`}
                              onClick={() => recoverSession(s._id)}
                            >
                              Recover
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </Motion.div>
      )}
    </Motion.div>
  )
}
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2">Name</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Sessions</th>
                    <th className="py-2">Avg Score</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {users.slice(0, 20).map((u) => (
                    <tr key={u._id} className="border-t border-slate-100">
                      <td className="py-2 pr-2 font-medium text-slate-900">{u.name}</td>
                      <td className="py-2 pr-2">{u.email}</td>
                      <td className="py-2 pr-2">{u.role}</td>
                      <td className="py-2 pr-2">{u.totalSessions ?? 0}</td>
                      <td className="py-2 pr-2">{u.avgScore ?? 0}%</td>
                      <td className="py-2 pr-2">{formatDateTime(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Motion.div>

      <Motion.div variants={fadeUp}>
        <Card>
          <CardHeader title="Sessions" subtitle="Latest sessions" />
          {sessions.length === 0 ? (
            <p className="text-sm text-slate-700">No sessions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2">Role</th>
                    <th className="py-2">Difficulty</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Score</th>
                    <th className="py-2">Created</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {sessions.slice(0, 20).map((s) => (
                    <tr key={s._id} className="border-t border-slate-100">
                      <td className="py-2 pr-2 font-medium text-slate-900">{s.role}</td>
                      <td className="py-2 pr-2">{s.difficulty}</td>
                      <td className="py-2 pr-2">{s.status}</td>
                      <td className="py-2 pr-2">
                        {typeof s.totalScore === 'number' ? `${s.totalScore}%` : '—'}
                      </td>
                      <td className="py-2 pr-2">{formatDateTime(s.createdAt)}</td>
                      <td className="py-2 text-right">
                        {s.status !== 'abandoned' ? (
                          <Button
                            variant="danger"
                            className="px-3 py-1"
                            onClick={() => softDeleteSession(s._id)}
                          >
                            Delete
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">Deleted</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Motion.div>
    </Motion.div>
  )
}
