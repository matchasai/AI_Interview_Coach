import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { RequireAdmin } from './components/RequireAdmin'
import { RequireAuth } from './components/RequireAuth'
import { Admin } from './pages/Admin'
import Analytics from './pages/Analytics'
import { Dashboard } from './pages/Dashboard'
import { DoubtSession } from './pages/DoubtSession'
import { ForgotPassword } from './pages/ForgotPassword'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { NewSession } from './pages/NewSession'
import { Profile } from './pages/Profile'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'
import { Results } from './pages/Results'
import { Session } from './pages/Session'
import { VerifyEmail } from './pages/VerifyEmail'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/doubt-session"
          element={
            <RequireAuth>
              <DoubtSession />
            </RequireAuth>
          }
        />
        <Route
          path="/session/new"
          element={
            <RequireAuth>
              <NewSession />
            </RequireAuth>
          }
        />
        <Route
          path="/session/:id"
          element={
            <RequireAuth>
              <Session />
            </RequireAuth>
          }
        />
        <Route
          path="/session/:id/results"
          element={
            <RequireAuth>
              <Results />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route
          path="/analytics"
          element={
            <RequireAuth>
              <Analytics />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Admin />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}



