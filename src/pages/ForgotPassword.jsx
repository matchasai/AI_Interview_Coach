import { motion as Motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { api, getErrorMessage } from '../services/api'
import { fadeUp } from '../utils/motion'
import { toastError, toastSuccess } from '../utils/toast'

export function ForgotPassword() {
  const { isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/api/auth/forgot-password', { email })
      toastSuccess(res.data.message || 'Check your email for reset link')
      setSubmitted(true)
      setCooldown(30)
    } catch (e) {
      const msg = getErrorMessage(e)
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email.trim() || cooldown > 0) return
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/api/auth/forgot-password', { email })
      toastSuccess(res.data.message || 'Reset link sent again')
      setCooldown(30)
    } catch (e) {
      const msg = getErrorMessage(e)
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Motion.div className="mx-auto max-w-md" initial={fadeUp.initial} animate={fadeUp.animate} transition={fadeUp.transition}>
      <Card>
        <CardHeader
          title="Forgot Password"
          subtitle={submitted ? 'Check your email' : 'Reset your password'}
        />

        {error ? (
          <p className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        ) : null}

        {submitted ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              If an account exists for <span className="font-medium text-slate-900">{email}</span>, a password
              reset link has been sent.
            </p>
            <p className="text-sm text-slate-500">Check your inbox (and spam folder) for a reset link.</p>
            <p className="text-sm text-slate-500">The link expires in 1 hour.</p>

            <Button
              variant="secondary"
              className="w-full"
              onClick={handleResend}
              disabled={loading || cooldown > 0}
            >
              {loading ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Reset Link'}
            </Button>

            <Link to="/login">
              <Button className="w-full">Back to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </Button>
          </form>
        )}

        <p className="mt-4 text-sm text-slate-500">
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-slate-900 hover:underline">
            Login
          </Link>
        </p>
      </Card>
    </Motion.div>
  )
}


