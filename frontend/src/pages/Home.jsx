import { motion as Motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import { fadeUp, stagger } from '../utils/motion'

export function Home() {
  const { isAuthenticated } = useAuth()

  return (
    <Motion.div className="space-y-6" variants={stagger} initial="initial" animate="animate">
      <Motion.div variants={fadeUp}>
        <h1 className="text-2xl font-semibold text-slate-900">AI Interview Coach</h1>
        <p className="mt-1 text-slate-600">
          Practice interview questions, get instant feedback, and track your progress.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
              <Link to="/session/new">
                <Button variant="secondary">Start New Session</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button>Login</Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary">Create Account</Button>
              </Link>
            </>
          )}
        </div>
      </Motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Role-based" subtitle="Pick your target role" />
            <p className="text-sm text-slate-700">
              Sessions generate questions tailored to your selected role and difficulty.
            </p>
          </Card>
        </Motion.div>
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Instant feedback" subtitle="Score + tips" />
            <p className="text-sm text-slate-700">
              Submit answers one-by-one and get scores, missing keywords, and improvement tips.
            </p>
          </Card>
        </Motion.div>
        <Motion.div variants={fadeUp}>
          <Card>
            <CardHeader title="Voice input" subtitle="Web Speech API" />
            <p className="text-sm text-slate-700">
              Speak answers and convert the transcript into text with one click.
            </p>
          </Card>
        </Motion.div>
      </div>
    </Motion.div>
  )
}
