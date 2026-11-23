import { Link, Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useCommunity } from '../auth/CommunityProvider'
import { NeuButton, NeuCard, NeuSkeleton } from './ui'

export type ProtectedPage = 'login' | 'join' | 'start' | 'waiting' | 'onboarding' | 'profile' | 'callback' | 'home' | 'app'

export default function ProtectedRoute({ page, children }: { page: ProtectedPage; children?: ReactNode }) {
  const { user, isLoading, error, refresh } = useAuth()
  const community = useCommunity()
  const location = useLocation()
  if (isLoading) return <AuthState title="Checking your sign-in" />
  if (error) return <AuthState title="We couldn’t reach your account" message={error.message} onRetry={() => { void refresh().catch(() => {}) }} />

  if (page === 'login') {
    if (!user) return <>{children}</>
    if (community.isLoading) return <AuthState title="Loading your communities" />
    if (community.error) return <AuthState title="We couldn’t load your communities" message={community.error.message} onRetry={() => { void community.refresh().catch(() => {}) }} />
    return <Navigate to={homeFor(community.active, community.pending)} replace />
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (community.isLoading) return <AuthState title="Loading your communities" />
  if (community.error) return <AuthState title="We couldn’t load your communities" message={community.error.message} onRetry={() => { void community.refresh().catch(() => {}) }} />

  if (page === 'start') {
    return community.active ? <Navigate to={profileComplete(user.name, community.active) ? '/' : '/onboarding'} replace /> : community.pending ? <Navigate to="/waiting" replace /> : <>{children}</>
  }
  if (page === 'join') {
    if (!community.active && community.pending) return <Navigate to="/waiting" replace />
    return <>{children}</>
  }
  if (page === 'waiting') return community.active ? <Navigate to={profileComplete(user.name, community.active) ? '/' : '/onboarding'} replace /> : community.pending ? <>{children}</> : <Navigate to="/start" replace />
  if (page === 'onboarding') {
    if (!community.active) return <Navigate to={community.pending ? '/waiting' : '/start'} replace />
    if (profileComplete(user.name, community.active)) return <Navigate to={user.onboardingTourCompleted ? '/' : '/tour'} replace />
    return <>{children}</>
  }
  if (page === 'profile' || page === 'app') {
    if (!community.active) return <Navigate to={community.pending ? '/waiting' : '/start'} replace />
    if (!profileComplete(user.name, community.active)) return <Navigate to="/onboarding" replace />
    if (!user.onboardingTourCompleted && location.pathname !== '/tour') return <Navigate to="/tour" replace />
    return <>{children}</>
  }
  if (page === 'home' || page === 'callback') {
    if (page === 'callback') {
      try {
        const returnTo = window.sessionStorage.getItem('lendloop.afterLogin')
        if (returnTo?.startsWith('/join/')) { window.sessionStorage.removeItem('lendloop.afterLogin'); return <Navigate to={returnTo} replace /> }
      } catch { /* Ignore unavailable session storage. */ }
    }
    return <Navigate to={homeFor(community.active, community.pending)} replace />
  }
  return <Navigate to="/login" replace />
}

export function profileComplete(name: string, community: { type: string; level1Label: string; level2Label: string; level1Options: string[]; level1Value: string | null; level2Value: string | null }): boolean {
  return Boolean(name.trim() &&
    (!community.level1Label || Boolean(community.level1Value && (!community.level1Options.length || community.level1Options.includes(community.level1Value)))) &&
    (!community.level2Label || community.type === 'office' || Boolean(community.level2Value?.trim() && community.level2Value.length <= 10)))
}

function homeFor(active: ReturnType<typeof useCommunity>['active'], pending: ReturnType<typeof useCommunity>['pending']): string {
  if (active) return '/'
  return pending ? '/waiting' : '/start'
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
