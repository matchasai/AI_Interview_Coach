import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { pageTransition } from '../utils/motion'
import { Navbar } from './Navbar'

export function AppShell() {
  const location = useLocation()

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-8rem] top-[-10rem] h-80 w-80 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-[-8rem] h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AnimatePresence mode="wait">
          <Motion.div
            key={location.pathname}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            transition={pageTransition.transition}
          >
            <Outlet />
          </Motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
