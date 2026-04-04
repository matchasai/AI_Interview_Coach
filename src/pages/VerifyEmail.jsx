import { motion as Motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { api, getErrorMessage } from '../services/api'
import { fadeUp } from '../utils/motion'
import { toastError, toastSuccess } from '../utils/toast'

export function VerifyEmail() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function run() {
      if (!token) {
        if (!active) return
        setError('Verification token is missing.')
        setLoading(false)
        return
      }

      try {
        await api.post('/api/auth/verify-email', { token })
        if (!active) return
        setVerified(true)
        toastSuccess('Email verified successfully. You can login now.')
      } catch (e) {
        if (!active) return
        const msg = getErrorMessage(e)
        setError(msg)
        toastError(msg)
      } finally {
        if (active) setLoading(false)
      }
    }

    run()
    return () => {
      active = false
    }
  }, [token])

  return (
    <Motion.div
      className="mx-auto max-w-md"
      initial={fadeUp.initial}
      animate={fadeUp.animate}
      transition={fadeUp.transition}
    >
      <Card>
        <CardHeader
          title="Email Verification"
          subtitle={loading ? 'Verifying your email...' : verified ? 'Verification complete' : 'Verification failed'}
        />

        {loading ? (
          <p className="text-sm text-slate-600">Please wait while we verify your email link.</p>
        ) : verified ? (
          <div className="space-y-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
            <p className="text-sm text-green-200">Your email is verified successfully.</p>
            <Link to="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error || 'Verification failed. The link may be invalid or expired.'}
            </p>
            <p className="text-sm text-slate-500">You can request a new verification email from the login page.</p>
            <Link to="/login">
              <Button variant="secondary" className="w-full">Back to Login</Button>
            </Link>
          </div>
        )}
      </Card>
    </Motion.div>
  )
}

