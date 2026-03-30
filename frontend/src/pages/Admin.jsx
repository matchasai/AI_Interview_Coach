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

  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    if (error) toastError(error)
  }, [error])

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [statsRes, usersRes, sessionsRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
        api.get('/api/admin/sessions'),
      ])

      setStats(statsRes.data.stats)
      setUsers(usersRes.data.users || [])
      setSessions(sessionsRes.data.sessions || [])
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

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

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
