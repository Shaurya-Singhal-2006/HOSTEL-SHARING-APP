import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useCommunity } from '../auth/CommunityProvider'
import AuthFrame from '../components/AuthFrame'
import { NeuButton } from '../components/ui'

export default function AuthCallbackPage() {
  const { refresh } = useAuth()
  const communities = useCommunity()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const user = await refresh()
        if (!user) throw new Error('Google sign-in could not be confirmed. Please try again.')
        await communities.refresh()
        if (!mounted) return
        let returnTo: string | null = null
        try { returnTo = window.sessionStorage.getItem('lendloop.afterLogin'); window.sessionStorage.removeItem('lendloop.afterLogin') } catch { /* Optional convenience only. */ }
        navigate(returnTo?.startsWith('/join/') ? returnTo : '/', { replace: true })
      } catch (caught) {
        if (mounted) { setError(caught instanceof Error ? caught.message : 'Google sign-in could not be confirmed.'); setBusy(false) }
      }
    })()
    return () => { mounted = false }
  }, [communities.refresh, navigate, refresh])

  return <AuthFrame title={busy ? 'Finishing sign-in' : 'Sign-in needs another try'} description={busy ? 'Checking your account and community access.' : 'Your session could not be loaded.'}>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {!busy && <NeuButton variant="primary" onClick={() => navigate('/login', { replace: true })}>Return to sign in</NeuButton>}
  </AuthFrame>
}
