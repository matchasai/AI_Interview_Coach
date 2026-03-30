import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import { api, getErrorMessage } from '../services/api'

export function Profile() {
  const { refresh } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [user, setUser] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { name: '', password: '' },
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
        reset({ name: res.data.user?.name || '', password: '' })
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

          const res = await api.put('/api/user/profile', payload)
          setUser(res.data.user)
          setSuccess('Profile updated.')
          reset({ name: res.data.user?.name || '', password: '' })
          await refresh()
        } catch (e) {
          setError(getErrorMessage(e))
        }
      }),
    [handleSubmit, reset, refresh],
  )

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

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
