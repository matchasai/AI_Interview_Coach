import { motion as Motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import { fadeUp, stagger } from '../utils/motion'

function FeatureIcon({ kind }) {
  const base =
    'inline-flex h-11 w-11 items-center justify-center rounded-2xl p-2.5 text-white shadow-lg ring-1 ring-white/55'

  if (kind === 'role') {
    return (
      <span className={`${base} bg-gradient-to-br from-blue-500 to-indigo-600`}>
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 1 1 14 0H5Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'feedback') {
    return (
      <span className={`${base} bg-gradient-to-br from-emerald-500 to-teal-600`}>
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" aria-hidden="true">
          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  return (
    <span className={`${base} bg-gradient-to-br from-violet-500 to-fuchsia-600`}>
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" aria-hidden="true">
        <path d="M12 3v18M6 8c0-1.7 1.3-3 3-3h6a3 3 0 1 1 0 6H9a3 3 0 1 0 0 6h6c1.7 0 3-1.3 3-3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <Motion.div className="space-y-7 md:space-y-8" variants={stagger} initial="initial" animate="animate">
      <Motion.section variants={fadeUp} className="glass-hero surface-glow relative overflow-hidden p-6 md:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-400/16 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-24 h-56 w-56 rounded-full bg-blue-400/16 blur-3xl" />

        <div className="relative z-10 max-w-3xl">
          <p className="mb-3 inline-flex rounded-full border border-indigo-400/35 bg-indigo-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Interview prep reinvented
          </p>
          <h1>
            Land your next role with
            <span className="brand-gradient block">IntervAI Coach</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
            Practice role-specific interviews with voice input, instant AI feedback, and progress analytics that feel like a premium career co-pilot.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">High score: green</span>
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700">Average score: yellow</span>
            <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-700">Low score: red</span>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard">
                <Button className="px-5">Go to Dashboard</Button>
              </Link>
              <Link to="/session/new">
                <Button variant="secondary" className="px-5">Start New Session</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button className="px-5">Login</Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" className="px-5">Create Account</Button>
              </Link>
            </>
          )}
          </div>
        </div>
      </Motion.section>

      <div className="grid gap-4 md:grid-cols-3">
        <Motion.div variants={fadeUp}>
          <Card className="group">
            <CardHeader
              title="Role-based"
              subtitle="Pick your target role"
              right={<FeatureIcon kind="role" />}
            />
            <p className="text-sm leading-relaxed text-slate-600">
              Sessions generate questions tailored to your selected role and difficulty.
            </p>
          </Card>
        </Motion.div>
        <Motion.div variants={fadeUp}>
          <Card className="group">
            <CardHeader
              title="Instant feedback"
              subtitle="Score + tips"
              right={<FeatureIcon kind="feedback" />}
            />
            <p className="text-sm leading-relaxed text-slate-600">
              Submit answers one-by-one and get scores, missing keywords, and improvement tips.
            </p>
          </Card>
        </Motion.div>
        <Motion.div variants={fadeUp}>
          <Card className="group">
            <CardHeader
              title="Voice input"
              subtitle="Web Speech API"
              right={<FeatureIcon kind="voice" />}
            />
            <p className="text-sm leading-relaxed text-slate-600">
              Speak answers and convert the transcript into text with one click.
            </p>
          </Card>
        </Motion.div>
      </div>
    </Motion.div>
  )
}



