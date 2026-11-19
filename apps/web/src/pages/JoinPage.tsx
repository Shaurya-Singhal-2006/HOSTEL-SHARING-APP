import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiRequest } from '../api/client'
import { ME_QUERY_KEY, type CurrentUser, useAuth } from '../auth/AuthProvider'
import { useQueryClient } from '@tanstack/react-query'
import AuthFrame from '../components/AuthFrame'
import { NeuButton, NeuInput } from '../components/ui'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest<{ user: CurrentUser }>('/api/join', { method: 'POST', body: { code } })
      queryClient.setQueryData(ME_QUERY_KEY, result.user)
      navigate('/onboarding', { replace: true })
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not check that invite code. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return <AuthFrame title="Join your hostel" description="Enter the invite code shared by your hostel to continue.">
    <div className="account-line"><span>Signed in as</span><strong>{user?.email}</strong></div>
    <form className="auth-form" onSubmit={submit}>
      <NeuInput
        label="Hostel invite code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="Enter your code"
        autoComplete="off"
        required
        maxLength={128}
        error={error || undefined}
        aria-describedby={error ? 'join-error' : undefined}
      />
      <NeuButton variant="primary" type="submit" disabled={busy || !code.trim()}>{busy ? 'Checking code…' : 'Join hostel'}</NeuButton>
      {error && <span id="join-error" className="sr-only" role="alert">{error}</span>}
    </form>
    <p className="auth-privacy">Invite codes are limited to five attempts every 15 minutes.</p>
  </AuthFrame>
}
