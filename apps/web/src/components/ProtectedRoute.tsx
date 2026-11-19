import { Link, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { profileIsComplete, routeForUser, useAuth } from '../auth/AuthProvider'
import { NeuButton, NeuCard, NeuSkeleton } from './ui'

export type ProtectedPage = 'login' | 'join' | 'onboarding' | 'profile' | 'callback' | 'home' | 'app'

export default function ProtectedRoute({ page, children }: { page: ProtectedPage; children?: ReactNode }) {
  const { user, isLoading, error, refresh } = useAuth()
  if (isLoading) return <AuthState title="Checking your sign-in" />
  if (error) return <AuthState title="We couldn’t reach your account" message={error.message} onRetry={() => { void refresh().catch(() => {}) }} />

  if (page === 'login') {
    return user ? <Navigate to={routeForUser(user)} replace /> : <>{children}</>
  }
  if (page === 'join') {
    if (!user) return <Navigate to="/login" replace />
    if (user.joinedHostel) return <Navigate to={profileIsComplete(user) ? '/' : '/onboarding'} replace />
    return <>{children}</>
  }
  if (page === 'onboarding') {
    if (!user) return <Navigate to="/login" replace />
    if (!user.joinedHostel) return <Navigate to="/join" replace />
    if (profileIsComplete(user)) return <Navigate to="/" replace />
    return <>{children}</>
  }
  if (page === 'profile' || page === 'app') {
    if (!user) return <Navigate to="/login" replace />
    if (!user.joinedHostel) return <Navigate to="/join" replace />
    if (!profileIsComplete(user)) return <Navigate to="/onboarding" replace />
    return <>{children}</>
  }
  if (page === 'home' || page === 'callback') return <Navigate to={routeForUser(user)} replace />
  return <Navigate to="/login" replace />
}

function AuthState({ title, message, onRetry }: { title: string; message?: string; onRetry?: () => void }) {
  return <main className="auth-screen"><NeuCard className="auth-card auth-card--status">
    <span className="brand-mark" aria-hidden="true"><span /><span /></span>
    <h1>{title}</h1>
    {message ? <p className="auth-error" role="alert">{message}</p> : <div className="auth-loading"><NeuSkeleton /><NeuSkeleton /><NeuSkeleton /></div>}
    {onRetry && <NeuButton variant="primary" onClick={onRetry}>Try again</NeuButton>}
    {onRetry && <Link className="auth-back-link" to="/login">Return to sign in</Link>}
  </NeuCard></main>
}
