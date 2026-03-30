import { motion as Motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { KeywordChips } from '../components/KeywordChips'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { api, getErrorMessage } from '../services/api'
import { fadeUp, stagger } from '../utils/motion'
import { toastError } from '../utils/toast'

function formatDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export function Results() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)

  useEffect(() => {
    if (error) toastError(error)
  }, [error])

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await api.get(`/api/session/${id}`)
        if (!active) return
        setSession(res.data.session)
      } catch (e) {
        if (!active) return
        setError(getErrorMessage(e))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [id])

  const answered = useMemo(() => {
    const qs = session?.questions || []
    return qs.filter((q) => Boolean(q.userAnswer)).length
  }, [session])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Session Results</h1>
            <p className="mt-1 text-sm text-slate-600">Loading…</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader title="Results" subtitle="Unable to load" />
        <p className="text-sm text-red-700">{error}</p>
        <div className="mt-4">
          <Link to="/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    )
  }

  if (!session) {
    return null
  }

  return (
    <Motion.div className="space-y-6" variants={stagger} initial="initial" animate="animate">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Session Results</h1>
          <p className="mt-1 text-sm text-slate-600">
            {session.role} · {session.difficulty} · Created {formatDateTime(session.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
          <Link to="/dashboard">
            <Button>Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Motion.div variants={fadeUp}>
          <Card>
          <CardHeader title="Status" />
          <p className="text-lg font-semibold text-slate-900">{session.status}</p>
          </Card>
        </Motion.div>
        <Motion.div variants={fadeUp}>
          <Card>
          <CardHeader title="Answered" />
          <p className="text-lg font-semibold text-slate-900">
            {answered}/{session.questions?.length || 0}
          </p>
          </Card>
        </Motion.div>
        <Motion.div variants={fadeUp}>
          <Card>
          <CardHeader title="Total Score" subtitle="Percent" />
          <p className="text-2xl font-semibold text-slate-900">
            <AnimatedNumber value={session.totalScore ?? 0} />%
          </p>
          </Card>
        </Motion.div>
      </div>

      {session.status !== 'completed' ? (
        <Card>
          <CardHeader title="Session not completed" />
          <p className="text-sm text-slate-700">
            This session is not marked as completed yet. You can continue answering questions.
          </p>
          <div className="mt-3">
            <Link to={`/session/${session._id}`}>
              <Button>Continue Session</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <div className="space-y-4">
        {(session.questions || []).map((q, idx) => (
          <Motion.div key={q.questionId} variants={fadeUp}>
            <Card>
            <CardHeader title={`Question ${idx + 1}`} subtitle={`Score: ${q.score ?? '—'}/10`} />
            <p className="text-sm font-medium text-slate-900">{q.questionText}</p>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Your Answer</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{q.userAnswer || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Feedback</p>
                <p className="mt-1 text-sm text-slate-900">{q.feedback || '—'}</p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Missing Keywords</p>
              <div className="mt-1">
                <KeywordChips keywords={q.missingKeywords} />
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Improvement Tip</p>
              <p className="mt-1 text-sm text-slate-900">{q.improvementTip || '—'}</p>
            </div>
            </Card>
          </Motion.div>
        ))}
      </div>
    </Motion.div>
  )
}
