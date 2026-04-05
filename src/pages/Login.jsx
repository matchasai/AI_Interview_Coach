import { motion as Motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { api, getErrorMessage } from '../services/api'
import { fadeUp } from '../utils/motion'
import { toastError, toastSuccess } from '../utils/toast'

export function Login() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const [serverError, setServerError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  useEffect(() => {
    if (serverError) toastError(serverError)
  }, [serverError])

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { email: '', password: '' },
  })

  async function requestPasswordReset() {
    const email = (getValues('email') || '').trim()
    if (!email) {
      setServerError('Please enter your email first.')
      return
    }

    setForgotLoading(true)
    setServerError('')
    try {
      const res = await api.post('/api/auth/forgot-password', { email })
      toastSuccess(res?.data?.message || 'If an account exists, a reset link has been sent.')
    } catch (e) {
      const message = getErrorMessage(e)
      setServerError(message)
      toastError(message)
    } finally {
      setForgotLoading(false)
    }
  }

  async function resendVerification() {
    const email = (getValues('email') || '').trim()
    if (!email) {
      setServerError('Please enter your email first.')
      return
    }

    setResendLoading(true)
    setServerError('')
    try {
      const res = await api.post('/api/auth/resend-verification-email', { email })
      toastSuccess(res?.data?.message || 'Verification email sent.')
    } catch (e) {
      const message = getErrorMessage(e)
      setServerError(message)
      toastError(message)
    } finally {
      setResendLoading(false)
    }
  }

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
          <p className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
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

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              onClick={requestPasswordReset}
              disabled={forgotLoading || resendLoading || isSubmitting}
              className="font-medium text-indigo-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {forgotLoading ? 'Sending reset link…' : 'Forgot Password?'}
            </button>

            <button
              type="button"
              onClick={resendVerification}
              disabled={resendLoading || forgotLoading || isSubmitting}
              className="font-medium text-indigo-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resendLoading ? 'Sending verification…' : 'Resend verification email'}
            </button>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Login'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-slate-500">
          Don’t have an account?{' '}
          <Link to="/register" className="font-medium text-slate-900 hover:underline">
            Register
          </Link>
        </p>
      </Card>
    </Motion.div>
  )
}




