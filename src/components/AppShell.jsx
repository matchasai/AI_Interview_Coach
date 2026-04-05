import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { pageTransition } from '../utils/motion'
import { Navbar } from './Navbar'

export function AppShell() {
  const location = useLocation()

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900 dark:from-[#0f172a] dark:via-[#020617] dark:to-[#1e293b] dark:text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-10rem] top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-[-10rem] h-[24rem] w-[24rem] rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.09)_1px,transparent_1px)] [background-size:30px_30px]" />
      </div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
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



