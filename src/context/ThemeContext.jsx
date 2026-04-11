import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'themePreference'
const FORCED_THEME = 'light'

function applyTheme() {
  if (typeof document === 'undefined') return

  const resolved = FORCED_THEME
  document.documentElement.classList.remove('dark')
  document.body.classList.remove('dark')
  document.documentElement.setAttribute('data-theme', resolved)
  document.body.setAttribute('data-theme', resolved)
  const root = document.getElementById('root')
  if (root) {
    root.classList.remove('dark')
    root.setAttribute('data-theme', resolved)
  }
  document.documentElement.style.colorScheme = resolved
}

export function ThemeProvider({ children }) {
  useEffect(() => {
    applyTheme()
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, FORCED_THEME)
    }
  }, [])

  const keepLightTheme = useCallback(() => {
    applyTheme()
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, FORCED_THEME)
    }
  }, [])

  const value = useMemo(
    () => ({
      theme: FORCED_THEME,
      resolvedTheme: FORCED_THEME,
      setTheme: keepLightTheme,
      toggleTheme: keepLightTheme,
    }),
    [keepLightTheme],
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


