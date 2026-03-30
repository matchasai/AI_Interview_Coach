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

export function Register() {
  const navigate = useNavigate()
  const { isAuthenticated, register: registerUser } = useAuth()
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    if (serverError) toastError(serverError)
  }, [serverError])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { name: '', email: '', password: '' },
  })

  const onSubmit = useMemo(
    () =>
      handleSubmit(async (values) => {
        setServerError('')
        try {
          await registerUser(values)
          toastSuccess('Account created')
          navigate('/dashboard', { replace: true })
        } catch (e) {
          setServerError(getErrorMessage(e))
        }
      }),
    [handleSubmit, registerUser, navigate],
  )

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <Motion.div className="mx-auto max-w-md" initial={fadeUp.initial} animate={fadeUp.animate} transition={fadeUp.transition}>
      <Card>
        <CardHeader title="Register" subtitle="Create your account" />

        {serverError ? (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Name"
            error={errors.name?.message}
            {...register('name', {
              required: 'Name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            })}
          />
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
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
            })}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Register'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-slate-900 hover:underline">
            Login
          </Link>
        </p>
      </Card>
    </Motion.div>
  )
}
