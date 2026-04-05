import { motion as Motion } from 'framer-motion'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui/Button'

function navClass({ isActive }) {
  return `rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ${
    isActive
      ? 'bg-gradient-to-r from-indigo-500/25 to-purple-600/25 text-slate-900 ring-1 ring-indigo-300/70 shadow-md shadow-indigo-900/20 dark:from-indigo-500/35 dark:to-purple-600/35 dark:text-white dark:ring-indigo-400/50 dark:shadow-indigo-900/30'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white'
  }`
}

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/65 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Motion.div whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 450, damping: 32 }}>
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-sm font-bold tracking-tight text-white shadow-lg shadow-indigo-500/30 transition-transform duration-300 group-hover:scale-105">
              AI
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              <span className="brand-gradient">IntervAI Coach</span>
            </span>
          </Link>
        </Motion.div>

        <nav className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>
              <NavLink to="/analytics" className={navClass}>
                Analytics
              </NavLink>
              <NavLink to="/profile" className={navClass}>
                Profile
              </NavLink>
              {user?.role === 'admin' ? (
                <NavLink to="/admin" className={navClass}>
                  Admin
                </NavLink>
              ) : null}
              <Button
                variant="secondary"
                className="px-3 py-2"
                onClick={() => {
                  logout()
                  window.location.href = '/login'
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass}>
                Login
              </NavLink>
              <NavLink to="/register" className={navClass}>
                Register
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}




