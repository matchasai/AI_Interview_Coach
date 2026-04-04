import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'themePreference'

function resolveTheme(theme) {
  if (theme === 'system') {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return theme === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return

  const resolved = resolveTheme(theme)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.style.colorScheme = resolved
}

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return localStorage.getItem(STORAGE_KEY) || user?.themePreference || 'light'
  })

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (stored) {
      setTheme(stored)
      return
    }

    if (user?.themePreference) {
      setTheme(user.themePreference)
    }
  }, [user?.themePreference])

  useEffect(() => {
    applyTheme(theme)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme)
    }
  }, [theme])

  const updateTheme = useCallback((nextTheme) => {
    setTheme(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (resolveTheme(current) === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: resolveTheme(theme),
      setTheme: updateTheme,
      toggleTheme,
    }),
    [theme, updateTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}