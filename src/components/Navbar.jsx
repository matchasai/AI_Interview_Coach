import { motion as Motion } from 'framer-motion'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui/Button'

function navClass({ isActive }) {
  return `rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ${
    isActive
      ? 'bg-gradient-to-r from-blue-600/12 to-violet-600/12 text-indigo-700 ring-1 ring-indigo-200'
      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
  }`
}

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Motion.div whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 450, damping: 32 }}>
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-sm font-bold tracking-tight text-white shadow-lg shadow-indigo-500/30 transition-transform duration-300 group-hover:scale-105">
              AI
            </span>
            <span className="text-sm font-semibold text-slate-900">
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
