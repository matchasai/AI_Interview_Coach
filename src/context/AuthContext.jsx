import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'

import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const setAuthToken = useCallback((nextToken) => {
    if (nextToken) {
      localStorage.setItem('token', nextToken)
      setToken(nextToken)
    } else {
      localStorage.removeItem('token')
      setToken(null)
    }
  }, [])

  const fetchMe = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const res = await api.get('/api/auth/me')
      setUser(res.data.user)
    } catch {
      setAuthToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [setAuthToken])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const login = useCallback(
    async ({ email, password }) => {
      const res = await api.post('/api/auth/login', { email, password })
      setAuthToken(res.data.token)
      setUser(res.data.user)
      return res.data.user
    },
    [setAuthToken],
  )

  const register = useCallback(
    async ({ name, email, password }) => {
      const res = await api.post('/api/auth/register', { name, email, password })
      setAuthToken(res.data.token)
      setUser(res.data.user)
      return res.data.user
    },
    [setAuthToken],
  )

  const logout = useCallback(() => {
    setAuthToken(null)
    setUser(null)
  }, [setAuthToken])

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
      refresh: fetchMe,
      setAuthToken,
    }),
    [token, user, loading, login, register, logout, fetchMe, setAuthToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}



