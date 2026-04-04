import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../hooks/useAuth'
import { api, getErrorMessage } from '../services/api'
import { toastError, toastSuccess } from '../utils/toast'

export function Profile() {
  const { refresh } = useAuth()
  const { setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reminderLoading, setReminderLoading] = useState(false)
  const [user, setUser] = useState(null)

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      password: '',
      themePreference: 'light',
      practiceReminderEnabled: false,
      practiceReminderChannel: 'email',
    },
  })

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await api.get('/api/user/profile')
        if (!active) return
        setUser(res.data.user)
        reset({
          name: res.data.user?.name || '',
          password: '',
          themePreference: res.data.user?.themePreference || 'light',
          practiceReminderEnabled: Boolean(res.data.user?.practiceReminderEnabled),
          practiceReminderChannel: res.data.user?.practiceReminderChannel || 'email',
        })
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
  }, [reset])

  const onSubmit = useMemo(
    () =>
      handleSubmit(async (values) => {
        setError('')
        setSuccess('')

        try {
          const payload = {}
          if (values.name && values.name.trim().length) payload.name = values.name
          if (values.password && values.password.length) payload.password = values.password
          payload.themePreference = values.themePreference
          payload.practiceReminderEnabled = Boolean(values.practiceReminderEnabled)
          payload.practiceReminderChannel = values.practiceReminderChannel

          const res = await api.put('/api/user/profile', payload)
          setUser(res.data.user)
          setSuccess('Profile updated.')
          reset({
            name: res.data.user?.name || '',
            password: '',
            themePreference: res.data.user?.themePreference || 'light',
            practiceReminderEnabled: Boolean(res.data.user?.practiceReminderEnabled),
            practiceReminderChannel: res.data.user?.practiceReminderChannel || 'email',
          })
          setTheme(values.themePreference)
          await refresh()
        } catch (e) {
          setError(getErrorMessage(e))
        }
      }),
    [handleSubmit, refresh, reset, setTheme],
  )

  async function sendPracticeReminder() {
    setError('')
    setSuccess('')
    setReminderLoading(true)

    try {
      const channel = getValues('practiceReminderChannel') || user?.practiceReminderChannel || 'email'

      if (channel === 'notification' && typeof window !== 'undefined' && 'Notification' in window) {
        const permission = Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission

        if (permission !== 'granted') {
          throw new Error('Browser notifications are blocked. Allow notifications or switch to email.')
        }

        const guidesRes = await api.get('/api/user/study-guides')
        const topGuide = guidesRes.data.studyGuides?.weakestRoles?.[0]
        const title = 'IntervAI Coach practice reminder'
        const body = topGuide
          ? `Focus on ${topGuide.role}: ${topGuide.focusAreas?.slice(0, 2).join(', ')}`
          : 'Open your dashboard and practice one interview session today.'

        new Notification(title, {
          body,
          icon: '/favicon.svg',
        })

        toastSuccess('Browser reminder sent')
        return
      }

      const res = await api.post('/api/user/practice-reminders/send')
      toastSuccess(res.data.message || 'Practice reminder sent to your email')
    } catch (e) {
      const message = getErrorMessage(e)
      setError(message)
      toastError(message)
    } finally {
      setReminderLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner label="Loading profile…" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader title="Profile" subtitle="Update your account" />

        {user ? (
          <p className="mb-4 text-sm text-slate-700">
            Signed in as <span className="font-medium text-slate-900">{user.email}</span>
          </p>
        ) : null}

        {error ? (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            error={errors.name?.message}
            {...register('name', {
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            })}
          />
          <Input
            label="New Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password', {
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
            })}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Theme Preference</span>
              <select
                className="w-full rounded-2xl border border-slate-300/90 bg-white/90 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-300 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                {...register('themePreference')}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Reminder Channel</span>
              <select
                className="w-full rounded-2xl border border-slate-300/90 bg-white/90 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-300 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                {...register('practiceReminderChannel')}
              >
                <option value="email">Email</option>
                <option value="notification">Browser Notification</option>
              </select>
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              {...register('practiceReminderEnabled')}
            />
            <span>
              <span className="block font-semibold text-slate-900">Enable practice reminders</span>
              <span className="block text-xs text-slate-500">
                We can send practice reminders by email or show a browser notification.
              </span>
            </span>
          </label>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={reminderLoading}
            onClick={sendPracticeReminder}
          >
            {reminderLoading ? 'Sending reminder…' : 'Send Practice Reminder Now'}
          </Button>
        </form>
      </Card>
    </div>
  )
}

