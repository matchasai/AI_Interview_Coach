import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'themePreference'
const ALLOWED_THEMES = new Set(['light', 'dark', 'system'])

function normalizeTheme(value) {
  return ALLOWED_THEMES.has(value) ? value : 'light'
}

function resolveTheme(theme) {
  if (theme === 'system') {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return theme === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return

  const resolved = resolveTheme(normalizeTheme(theme))
  const isDark = resolved === 'dark'
  document.documentElement.classList.remove('dark')
  document.body.classList.remove('dark')
  if (isDark) {
    document.documentElement.classList.add('dark')
    document.body.classList.add('dark')
  }
  document.documentElement.setAttribute('data-theme', resolved)
  document.body.setAttribute('data-theme', resolved)
  const root = document.getElementById('root')
  if (root) {
    root.classList.remove('dark')
    if (isDark) root.classList.add('dark')
    root.setAttribute('data-theme', resolved)
  }
  document.documentElement.style.colorScheme = resolved
}

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return normalizeTheme(localStorage.getItem(STORAGE_KEY) || user?.themePreference || 'light')
  })

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    const normalizedStored = normalizeTheme(stored)
    if (stored && normalizedStored === stored) {
      setTheme(normalizedStored)
      return
    }

    if (user?.themePreference) {
      setTheme(normalizeTheme(user.themePreference))
    }
  }, [user?.themePreference])

  useEffect(() => {
    applyTheme(theme)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme)
    }
  }, [theme])

  const updateTheme = useCallback((nextTheme) => {
    setTheme(normalizeTheme(nextTheme))
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


