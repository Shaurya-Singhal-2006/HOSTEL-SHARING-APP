import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { API_BASE, apiRequest } from '../api/client'
import AuthFrame from '../components/AuthFrame'
import { NeuButton } from '../components/ui'

type DemoUser = { id: string; name: string; email: string; communities: Array<{ id: string; name: string }> }

function errorMessage(code: string | null): string | null {
  if (code === 'google_cancelled') return 'Sign-in was cancelled. You can try again whenever you’re ready.'
  if (code === 'google_auth_failed') return 'Google sign-in didn’t finish. Check your connection and try again.'
  if (code === 'oauth') return 'We couldn’t confirm your Google session. Please sign in again.'
  return null
}

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(errorMessage(searchParams.get('error')))
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([])
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState('')

  async function openDemoPicker() {
    setDemoOpen((open) => !open)
    setDemoError('')
    if (demoUsers.length) return
    setDemoLoading(true)
    try {
      const result = await apiRequest<{ users: DemoUser[] }>('/api/auth/demo/users')
      setDemoUsers(result.users)
      if (!result.users.length) setDemoError('No sample accounts yet. Run npm run db:seed:demo, then reload this page.')
    } catch (caught) {
      setDemoError(caught instanceof Error ? caught.message : 'Could not load demo accounts.')
    } finally { setDemoLoading(false) }
  }

  async function signInAsDemo(userId: string) {
    setDemoLoading(true)
    setDemoError('')
    try {
      await apiRequest('/api/auth/demo', { method: 'POST', body: { userId } })
      window.location.assign('/')
    } catch (caught) {
      setDemoError(caught instanceof Error ? caught.message : 'Could not sign in to the demo account.')
      setDemoLoading(false)
    }
  }

  return <AuthFrame title="Welcome to LendLoop" description="Borrow a little. Share a lot. Sign in to join your community.">
    <div className="auth-callout"><span className="auth-callout__dot" />Create a community for your apartment, hostel, or office, or join one with an invite code.</div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <NeuButton
      className="google-button"
      disabled={starting}
      onClick={() => {
        setError(null)
        setStarting(true)
        const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
        if (from?.startsWith('/join/')) { try { window.sessionStorage.setItem('lendloop.afterLogin', from) } catch { /* Optional convenience only. */ } }
        window.location.assign(`${API_BASE}/api/v1/auth/google`)
      }}
    >
      <span className="google-g" aria-hidden="true">G</span>
      {starting ? 'Opening Google…' : 'Continue with Google'}
    </NeuButton>
    {import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true' && <section className="demo-login">
      <NeuButton type="button" onClick={() => { void openDemoPicker() }}>Sign in as a demo user</NeuButton>
      {demoOpen && <div className="demo-login__picker" aria-label="Demo user accounts">
        {demoLoading && <p role="status">Loading sample accounts…</p>}
        {demoUsers.map((demoUser) => <NeuButton key={demoUser.id} type="button" disabled={demoLoading} onClick={() => { void signInAsDemo(demoUser.id) }}>
          <span>{demoUser.name}</span><small>{demoUser.communities.map((community) => community.name).join(', ')}</small>
        </NeuButton>)}
        {demoError && <p className="auth-error" role="alert">{demoError}</p>}
      </div>}
    </section>}
    <p className="auth-privacy">Your phone number stays private and is only shown after a borrow request is accepted.</p>
  </AuthFrame>
}
