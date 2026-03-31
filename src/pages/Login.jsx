import { motion as Motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage } from '../services/api'
import { fadeUp } from '../utils/motion'
import { toastError, toastSuccess } from '../utils/toast'

export function Login() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    if (serverError) toastError(serverError)
  }, [serverError])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = useMemo(
    () =>
      handleSubmit(async (values) => {
        setServerError('')
        try {
          await login(values)
          toastSuccess('Welcome back')
          navigate('/dashboard', { replace: true })
        } catch (e) {
          setServerError(getErrorMessage(e))
        }
      }),
    [handleSubmit, login, navigate],
  )

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <Motion.div className="mx-auto max-w-md" initial={fadeUp.initial} animate={fadeUp.animate} transition={fadeUp.transition}>
      <Card>
        <CardHeader title="Login" subtitle="Access your account" />

        {serverError ? (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
            })}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
            })}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Login'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Don’t have an account?{' '}
          <Link to="/register" className="font-medium text-slate-900 hover:underline">
            Register
          </Link>
        </p>
      </Card>
    </Motion.div>
  )
}
