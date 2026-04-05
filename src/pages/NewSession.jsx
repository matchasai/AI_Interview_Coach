import { motion as Motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Input, Select } from '../components/ui/Input'
import { api, getErrorMessage } from '../services/api'
import { fadeUp } from '../utils/motion'
import { toastError, toastSuccess } from '../utils/toast'

const ROLES = [
  'SDE',
  'Frontend Developer',
  'Backend Developer',
  'Machine Learning Engineer',
  'Data Scientist',
  'Data Analyst',
  'DevOps Engineer',
  'Product Manager',
  'Full Stack Developer',
  'System Design',
  'Database Engineering',
  'Cloud Architecture',
  'Cyber Security',
  'Mobile Development',
  '__custom__',
]

export function NewSession() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [recommendation, setRecommendation] = useState(null)
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState({ shown: false, applied: false, final: false })

  useEffect(() => {
    if (serverError) toastError(serverError)
  }, [serverError])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm({
    defaultValues: {
      role: 'SDE',
      customRole: '',
      difficulty: 'easy',
      questionCount: 5,
      companyMode: 'general',
    },
  })

  const selectedRole = watch('role')
  const customRole = watch('customRole')
  const finalRole = selectedRole === '__custom__' ? (customRole || '').trim() : selectedRole

  const onSubmit = handleSubmit(async (values) => {
    setServerError('')
    try {
      if (!finalRole || finalRole.length < 2) {
        setServerError('Please enter a topic/role with at least 2 characters.')
        return
      }

      if (recommendation && !feedbackSent.final) {
        const finalEvent = values.difficulty === recommendation.difficulty ? 'applied' : 'overridden'
        api
          .post('/api/session/recommendation/feedback', {
            event: finalEvent,
            role: finalRole,
            recommendedDifficulty: recommendation.difficulty,
            selectedDifficulty: values.difficulty,
          })
          .catch(() => {})
        setFeedbackSent((prev) => ({ ...prev, final: true }))
      }

      const res = await api.post('/api/session/start', {
        role: finalRole,
        difficulty: values.difficulty,
        questionCount: Number(values.questionCount),
      })
      const id = res.data?.session?._id
      toastSuccess('Session started')
      navigate(`/session/${id}`, { replace: true })
    } catch (e) {
      setServerError(getErrorMessage(e))
    }
  })

  useEffect(() => {
    let active = true

    async function loadRecommendation() {
      if (!finalRole || finalRole.length < 2) return
      setRecommendationLoading(true)

      try {
        const res = await api.get('/api/session/recommendation', {
          params: { role: finalRole },
        })

        if (!active) return

        const nextRecommendation = res.data?.recommendation || null
        setRecommendation(nextRecommendation)
        setFeedbackSent({ shown: false, applied: false, final: false })

        if (nextRecommendation?.difficulty) {
          api
            .post('/api/session/recommendation/feedback', {
              event: 'shown',
              role: finalRole,
              recommendedDifficulty: nextRecommendation.difficulty,
            })
            .catch(() => {})
          if (active) {
            setFeedbackSent((prev) => ({ ...prev, shown: true }))
          }
        }

        if (nextRecommendation?.difficulty && !dirtyFields?.difficulty) {
          setValue('difficulty', nextRecommendation.difficulty, { shouldDirty: false })
        }
      } catch {
        if (!active) return
        setRecommendation(null)
      } finally {
        if (active) setRecommendationLoading(false)
      }
    }

    loadRecommendation()

    return () => {
      active = false
    }
  }, [finalRole, setValue, dirtyFields])

  function applyRecommendedDifficulty() {
    if (!recommendation?.difficulty) return
    setValue('difficulty', recommendation.difficulty, { shouldDirty: true })
    if (!feedbackSent.applied) {
      api
        .post('/api/session/recommendation/feedback', {
          event: 'applied',
          role: finalRole,
          recommendedDifficulty: recommendation.difficulty,
          selectedDifficulty: recommendation.difficulty,
        })
        .catch(() => {})
      setFeedbackSent((prev) => ({ ...prev, applied: true }))
    }
    toastSuccess(`Difficulty set to ${recommendation.difficulty}`)
  }

  const signals = recommendation?.signals || []

  return (
    <Motion.div className="mx-auto max-w-xl" initial={fadeUp.initial} animate={fadeUp.animate} transition={fadeUp.transition}>
      <Card>
        <CardHeader title="New Session" subtitle="Choose role, difficulty, and question count" />

        {serverError ? (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <Select label="Role" error={errors.role?.message} {...register('role', { required: 'Role is required' })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r === '__custom__' ? 'Custom topic/role' : r}
              </option>
            ))}
          </Select>

          {selectedRole === '__custom__' ? (
            <Input
              label="Custom topic/role"
              placeholder="e.g. React Performance, Kafka, Kubernetes, OS, DBMS..."
              error={errors.customRole?.message}
              {...register('customRole', {
                required: 'Please enter your custom topic/role',
                minLength: { value: 2, message: 'Must be at least 2 characters' },
                maxLength: { value: 80, message: 'Must be at most 80 characters' },
              })}
            />
          ) : null}

          <Select
            label="Difficulty"
            error={errors.difficulty?.message}
            {...register('difficulty', { required: 'Difficulty is required' })}
          >
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </Select>

          {recommendationLoading ? (
            <p className="text-xs text-slate-500">Loading difficulty recommendation…</p>
          ) : recommendation ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold text-slate-700">
                Recommended: <span className="uppercase">{recommendation.difficulty}</span>
                <span className="ml-2 font-normal text-slate-500">({recommendation.confidence}% confidence)</span>
              </p>
              <p className="mt-1 text-xs text-slate-600">{recommendation.reason}</p>
              {signals.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {signals.map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600"
                    >
                      {signal.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="px-3 py-1 text-xs"
                  onClick={applyRecommendedDifficulty}
                >
                  Apply Recommendation
                </Button>
              </div>
            </div>
          ) : null}

          <Select
            label="Question Count"
            error={errors.questionCount?.message}
            {...register('questionCount', { required: 'Question count is required' })}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
          </Select>

          <Select label="Company Mode" {...register('companyMode')}>
            <option value="general">General</option>
            <option value="faang">FAANG-style</option>
            <option value="startup">Startup</option>
          </Select>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Starting…' : 'Start Session'}
          </Button>
        </form>
      </Card>
    </Motion.div>
  )
}



