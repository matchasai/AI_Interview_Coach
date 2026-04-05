import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from './ui/Spinner'

export function RequireAdmin({ children }) {
  const { loading, isAuthenticated, user } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner label="Loading account…" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}



