import { motion as Motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { api, getErrorMessage } from '../services/api'
import { fadeUp } from '../utils/motion'
import { toastError, toastSuccess } from '../utils/toast'

export function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, setAuthToken } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokenInvalid, setTokenInvalid] = useState(false)

  useEffect(() => {
    if (!success) return undefined
    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true })
    }, 1500)
    return () => clearTimeout(timer)
  }, [success, navigate])

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  if (!token || tokenInvalid) {
    return (
      <Motion.div
        className="mx-auto max-w-md"
        initial={fadeUp.initial}
        animate={fadeUp.animate}
        transition={fadeUp.transition}
      >
        <Card>
          <CardHeader title="Invalid Link" subtitle="Reset link is invalid, missing, or expired" />
          <p className="mb-4 text-sm text-red-700 dark:text-red-200">
            The password reset link is invalid or has expired. Request a new reset link to continue.
          </p>
          <Link to="/forgot-password">
            <Button className="w-full">Request New Link</Button>
          </Link>
        </Card>
      </Motion.div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      toastError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      toastError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const res = await api.post('/api/auth/reset-password', { token, password })
      setAuthToken(res.data.token)
      toastSuccess('Password reset successfully! You are now logged in.')
      setSuccess(true)
    } catch (e) {
      const code = e?.response?.data?.code
      if (code === 'INVALID_TOKEN' || code === 'TOKEN_EXPIRED') {
        setTokenInvalid(true)
      }
      const msg = getErrorMessage(e)
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Motion.div
      className="mx-auto max-w-md"
      initial={fadeUp.initial}
      animate={fadeUp.animate}
      transition={fadeUp.transition}
    >
      <Card>
        <CardHeader title="Reset Password" subtitle="Create a new password" />

        {error ? (
          <p className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
            {error}
          </p>
        ) : null}

        {success ? (
          <div className="space-y-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
            <p className="text-sm text-green-700 dark:text-green-200">✓ Password reset successfully!</p>
            <p className="text-sm text-green-600 dark:text-green-300">Redirecting to dashboard…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" disabled={loading || !password || !confirmPassword}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </Button>
          </form>
        )}

        <p className="mt-4 text-sm text-slate-500">
          Know your password?{' '}
          <Link to="/login" className="font-medium text-slate-900 hover:underline">
            Login
          </Link>
        </p>
      </Card>
    </Motion.div>
  )
}


