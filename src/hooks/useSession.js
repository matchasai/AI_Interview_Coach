import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, getErrorMessage } from '../services/api'

export function useSession(sessionId) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!sessionId) return

    setLoading(true)
    setError('')

    try {
      const res = await api.get(`/api/session/${sessionId}`)
      setSession(res.data.session)
    } catch (e) {
      setError(getErrorMessage(e))
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const submitAnswer = useCallback(
    async ({ questionId, answerText }) => {
      const res = await api.post(`/api/session/${sessionId}/answer`, {
        questionId,
        answerText,
      })

      const updatedQuestion = res.data.question
      const evaluation = res.data.evaluation
      const nextRecommendedDifficulty = res.data.nextRecommendedDifficulty || null

      setSession((prev) => {
        if (!prev) return prev
        const nextQuestions = (prev.questions || []).map((q) =>
          q.questionId === updatedQuestion.questionId ? { ...q, ...updatedQuestion } : q,
        )
        return { ...prev, questions: nextQuestions }
      })

      return { updatedQuestion, evaluation, nextRecommendedDifficulty }
    },
    [sessionId],
  )

  const complete = useCallback(async () => {
    const res = await api.put(`/api/session/${sessionId}/complete`)
    setSession(res.data.session)
    return res.data.session
  }, [sessionId])

  const pauseOrResume = useCallback(async () => {
    const res = await api.put(`/api/session/${sessionId}/pause`)
    setSession(res.data.session)
    return res.data.session
  }, [sessionId])

  const answeredCount = useMemo(() => {
    const qs = session?.questions || []
    return qs.filter((q) => Boolean(q.userAnswer)).length
  }, [session])

  return {
    loading,
    session,
    error,
    refresh,
    submitAnswer,
    complete,
    pauseOrResume,
    answeredCount,
  }
}
