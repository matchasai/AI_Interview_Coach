import { AnimatePresence, motion as Motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FeedbackPanel } from '../components/FeedbackPanel'
import { QuestionCard } from '../components/QuestionCard'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Skeleton } from '../components/ui/Skeleton'
import { VoiceInput } from '../components/VoiceInput'
import { useSession } from '../hooks/useSession'
import { api } from '../services/api'
import { fadeUp } from '../utils/motion'
import { toastError, toastSuccess } from '../utils/toast'

function formatElapsed(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function evaluationFromQuestion(q) {
  if (!q) return null
  if (typeof q.score !== 'number') return null
  return {
    score: q.score,
    feedback: q.feedback,
    missingKeywords: q.missingKeywords,
    improvementTip: q.improvementTip,
    correctAnswer: q.correctAnswer,
    rubric: q.rubric,
    evidence: q.evidence,
    source: q.evaluationSource,
    provider: q.evaluationProvider,
  }
}

export function Session() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { loading, session, error, submitAnswer, complete, answeredCount } = useSession(id)

  const [activeIndex, setActiveIndex] = useState(0)
  const [answerText, setAnswerText] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [nextDifficultyHint, setNextDifficultyHint] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [pauseLoading, setPauseLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showAdvancedFeedback, setShowAdvancedFeedback] = useState(true)

  useEffect(() => {
    setElapsed(0)
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [id])

  useEffect(() => {
    if (!session) return
    if (session.status === 'completed') {
      navigate(`/session/${id}/results`, { replace: true })
    }
  }, [session, id, navigate])

  useEffect(() => {
    if (!session?.questions?.length) return

    const firstUnanswered = (session.questions || []).findIndex((q) => !q.userAnswer)
    const nextIndex = firstUnanswered === -1 ? 0 : firstUnanswered

    setActiveIndex((prev) => {
      if (prev >= (session.questions || []).length) return nextIndex
      return prev
    })
  }, [session])

  useEffect(() => {
    const q = session?.questions?.[activeIndex]
    setAnswerText(q?.userAnswer || '')
    setEvaluation(evaluationFromQuestion(q))
  }, [session, activeIndex])

  const totalQuestions = session?.questions?.length || 0
  const currentQuestion = session?.questions?.[activeIndex] || null

  const hasNextUnanswered = useMemo(() => {
    const qs = session?.questions || []
    return qs.findIndex((q, idx) => idx > activeIndex && !q.userAnswer) !== -1
  }, [session, activeIndex])

  const allAnswered = answeredCount === totalQuestions && totalQuestions > 0

  async function submitCurrent() {
    if (!session || !currentQuestion) return
    setSubmitting(true)

    try {
      const res = await submitAnswer({
        questionId: currentQuestion.questionId,
        answerText,
      })
      setEvaluation(res.evaluation)
      setNextDifficultyHint(res.nextRecommendedDifficulty || '')
      toastSuccess('Answer submitted')
    } catch (e) {
      toastError(e)
    } finally {
      setSubmitting(false)
    }
  }

  function goNext() {
    const qs = session?.questions || []
    const idx = qs.findIndex((q, i) => i > activeIndex && !q.userAnswer)
    if (idx === -1) return

    setActiveIndex(idx)
  }

  async function completeSession() {
    setSubmitting(true)

    try {
      await complete()
      toastSuccess('Session completed')
      navigate(`/session/${id}/results`, { replace: true })
    } catch (e) {
      toastError(e)
    } finally {
      setSubmitting(false)
    }
  }

  async function togglePause() {
    setPauseLoading(true)

    try {
      const res = await api.put(`/api/session/${id}/pause`)
      toastSuccess(res.data.session.status === 'paused' ? 'Session paused' : 'Session resumed')
      window.location.reload()
    } catch (e) {
      toastError(e)
    } finally {
      setPauseLoading(false)
    }
  }

  async function deleteSession() {
    if (!session) return

    const isRunning = session.status === 'active' || session.status === 'paused'
    if (!isRunning) {
      toastError('Only active or paused sessions can be deleted.')
      return
    }

    const confirmed = window.confirm('Delete this running session? This action cannot be undone.')
    if (!confirmed) return

    setDeleteLoading(true)
    try {
      await api.delete(`/api/session/${id}`)
      toastSuccess('Session deleted')
      navigate('/dashboard', { replace: true })
    } catch (e) {
      toastError(e)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Interview Session</h1>
            <p className="mt-1 text-sm text-slate-600">Loading questions…</p>
          </div>
          <div className="w-28">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    )
  }

  if (error && !session) {
    return (
      <Card>
        <CardHeader title="Session" subtitle="Unable to load" />
        <p className="text-sm text-red-700">{error}</p>
        <div className="mt-4">
          <Link to="/dashboard">
            <Button variant="secondary">Back to Dashboard</Button>
          </Link>
        </div>
      </Card>
    )
  }

  if (!session || !currentQuestion) {
    return (
      <Card>
        <CardHeader title="Session" subtitle="No questions found" />
        <Link to="/dashboard">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Motion.section initial={fadeUp.initial} animate={fadeUp.animate} transition={fadeUp.transition} className="surface-card surface-glow relative overflow-hidden rounded-3xl border border-white/70 p-5 md:p-6">
        <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-16 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">Interview Session</h1>
            <p className="mt-1 text-sm text-slate-600">
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700">{session.role}</span>{' '}
              <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-700">{session.difficulty}</span>{' '}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{answeredCount}/{totalQuestions} answered</span>{' '}
              <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">Elapsed {formatElapsed(elapsed)}</span>
              {session.status === 'paused' && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">Paused</span>}
            </p>
            <div className="mt-3 max-w-sm">
              <ProgressBar value={answeredCount} max={totalQuestions || 1} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowAdvancedFeedback((v) => !v)}
              disabled={submitting}
            >
              {showAdvancedFeedback ? 'Hide Detailed Feedback' : 'Show Detailed Feedback'}
            </Button>
            <Button
              variant="secondary"
              onClick={togglePause}
              disabled={pauseLoading || deleteLoading}
            >
              {pauseLoading ? 'Loading…' : session.status === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="ghost"
              onClick={deleteSession}
              disabled={deleteLoading || pauseLoading || submitting}
              className="text-red-700 hover:text-red-800"
            >
              {deleteLoading ? 'Deleting…' : 'Delete Session'}
            </Button>
            <Link to="/dashboard">
              <Button variant="secondary">Back</Button>
            </Link>
          </div>
        </div>
      </Motion.section>

      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            <Motion.div
              key={currentQuestion.questionId}
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              exit={{ opacity: 0, y: -8 }}
              transition={fadeUp.transition}
            >
              <QuestionCard
                index={activeIndex}
                total={totalQuestions}
                questionText={currentQuestion.questionText}
                timerLabel={`Elapsed ${formatElapsed(elapsed)}`}
                topicOverview={currentQuestion.topicOverview}
                realWorldExample={currentQuestion.realWorldExample}
                applications={currentQuestion.applications}
                programmingUsage={currentQuestion.programmingUsage}
              />
            </Motion.div>
          </AnimatePresence>

          <Card>
            <CardHeader title="Your Answer" subtitle="Type or use voice input" />
            {session.status === 'paused' && (
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                This session is paused. Click "Resume" to continue.
              </p>
            )}
            <textarea
              className="min-h-40 w-full rounded-2xl border border-slate-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-300 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:shadow-[0_0_0_1px_rgba(99,102,241,.2),0_10px_30px_rgba(99,102,241,.16)] disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Write your answer here…"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              disabled={submitting || session.status === 'paused'}
            />

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setAnswerText('')
                  setEvaluation(null)
                }}
                disabled={submitting || session.status === 'paused'}
              >
                Clear
              </Button>

              <Button onClick={submitCurrent} disabled={submitting || !answerText.trim() || session.status === 'paused'}>
                {submitting ? 'Submitting…' : evaluation ? 'Re-check Answer' : 'Submit Answer'}
              </Button>

              {hasNextUnanswered ? (
                <Button variant="secondary" onClick={goNext} disabled={submitting || session.status === 'paused'}>
                  Next Unanswered
                </Button>
              ) : null}

              {allAnswered ? (
                <Button onClick={completeSession} disabled={submitting || session.status === 'paused'}>
                  Complete Session
                </Button>
              ) : null}
            </div>
          </Card>

          <VoiceInput
            onTranscript={(t) => {
              setAnswerText(t)
            }}
          />
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            <Motion.div
              key={evaluation ? `${currentQuestion.questionId}-eval` : `${currentQuestion.questionId}-noeval`}
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              exit={{ opacity: 0, y: -8 }}
              transition={fadeUp.transition}
            >
              <FeedbackPanel evaluation={evaluation} showAdvanced={showAdvancedFeedback} />

              {evaluation ? (
                <Card className="mt-4">
                  <CardHeader title="Next Steps" />
                  <p className="text-sm text-slate-700">
                    Review feedback, improve your answer, and continue to the next unanswered question.
                  </p>
                  {nextDifficultyHint ? (
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-indigo-700">
                      Adaptive next difficulty: {nextDifficultyHint}
                    </p>
                  ) : null}
                </Card>
              ) : (
                <Card className="mt-4">
                  <CardHeader title="Feedback" subtitle="Submit an answer to see feedback" />
                  <p className="text-sm text-slate-700">
                    Tip: Use a clear structure — definition, approach, example, and edge cases.
                  </p>
                </Card>
              )}
            </Motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
