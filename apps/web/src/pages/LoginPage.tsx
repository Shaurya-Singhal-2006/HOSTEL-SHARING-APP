import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_BASE } from '../api/client'
import AuthFrame from '../components/AuthFrame'
import { NeuButton } from '../components/ui'

function errorMessage(code: string | null): string | null {
  if (code === 'google_cancelled') return 'Sign-in was cancelled. You can try again whenever you’re ready.'
  if (code === 'google_auth_failed') return 'Google sign-in didn’t finish. Check your connection and try again.'
  if (code === 'oauth') return 'We couldn’t confirm your Google session. Please sign in again.'
  return null
}

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(errorMessage(searchParams.get('error')))

  return <AuthFrame title="Welcome to LendLoop" description="Borrow a little. Share a lot. Sign in to join your hostel community.">
    <div className="auth-callout"><span className="auth-callout__dot" />Any Google account can join with a hostel invite code.</div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <NeuButton
      className="google-button"
      disabled={starting}
      onClick={() => {
        setError(null)
        setStarting(true)
        window.location.assign(`${API_BASE}/api/auth/google`)
      }}
    >
      <span className="google-g" aria-hidden="true">G</span>
      {starting ? 'Opening Google…' : 'Continue with Google'}
    </NeuButton>
    <p className="auth-privacy">Your phone number stays private and is only shown after a borrow request is accepted.</p>
  </AuthFrame>
}
