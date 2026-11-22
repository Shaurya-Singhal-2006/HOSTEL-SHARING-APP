import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, apiRequest } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { useCommunity } from '../auth/CommunityProvider'
import AuthFrame from '../components/AuthFrame'
import { NeuButton, NeuInput } from '../components/ui'

export default function JoinPage() {
  const location = useLocation()
  if (location.pathname === '/waiting') return <WaitingPage />
  if (location.pathname === '/start') return <StartPage />
  return <JoinCommunityPage />
}

function StartPage() {
  const { user } = useAuth()
  return <AuthFrame title="Your community starts here" description="Join a community with an invite code to see what people nearby are sharing.">
    {user && <div className="account-line"><span>Signed in as</span><strong>{user.email}</strong></div>}
    <div className="community-start-card"><h2>Join with an invite code</h2><p>Enter the code shared by your community admin.</p><Link to="/join" className="neu-button neu-button--primary">Enter invite code</Link></div>
    <p className="auth-privacy">Community creation will be available here in the next setup step.</p>
  </AuthFrame>
}

function JoinCommunityPage() {
  const { code: routeCode } = useParams()
  const [code, setCode] = useState(routeCode ?? '')
  const [level1, setLevel1] = useState('')
  const [level2, setLevel2] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const community = useCommunity()
  useEffect(() => { if (routeCode) setCode(routeCode.toUpperCase()) }, [routeCode])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest<{ status: 'active' | 'pending'; membership: { communityId: string } }>('/api/communities/join', {
        method: 'POST', body: { inviteCode: code.trim().toUpperCase(), level1: level1.trim() || undefined, level2: level2.trim() || undefined, acceptGuidelines: accepted },
      })
      await queryClient.invalidateQueries({ queryKey: ['communities', 'mine'] })
      await community.refresh()
      if (result.status === 'pending') navigate('/waiting', { replace: true })
      else {
        community.setActive(result.membership.communityId)
        navigate('/onboarding', { replace: true })
      }
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 404 ? 'That invite code wasn’t recognized. Check it with the community admin and try again.' : caught instanceof Error ? caught.message : 'Could not join this community. Please try again.')
    } finally { setBusy(false) }
  }

  return <AuthFrame title="Join a community" description="Enter the invite code your admin shared with you.">
    {user && <div className="account-line"><span>Signed in as</span><strong>{user.email}</strong></div>}
    <form className="auth-form" onSubmit={(event) => { void submit(event) }}>
      <NeuInput label="Invite code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="e.g. A1B2C3D4" autoComplete="off" required maxLength={32} error={error || undefined} />
      <NeuInput label="Location level 1 (optional)" value={level1} onChange={(event) => setLevel1(event.target.value)} placeholder="e.g. Floor 2 or Tower B" maxLength={40} />
      <NeuInput label="Location level 2 (optional)" value={level2} onChange={(event) => setLevel2(event.target.value)} placeholder="e.g. Room 16 or Flat 402" maxLength={10} />
      <label className="community-guidelines-check"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /><span>I agree to follow this community’s guidelines.</span></label>
      <NeuButton variant="primary" type="submit" disabled={busy || !code.trim() || !accepted}>{busy ? 'Checking code…' : 'Join community'}</NeuButton>
      <Link className="auth-back-link" to="/start">Back</Link>
    </form>
    <p className="auth-privacy">Invite codes are rate-limited to protect community access.</p>
  </AuthFrame>
}

function WaitingPage() {
  const { pending, refresh } = useCommunity()
  return <AuthFrame title="Waiting for approval" description={pending ? `Your request to join ${pending.name} is waiting for an admin.` : 'Your membership status is being checked.'}>
    {pending?.icon && <span className="community-waiting-icon" aria-hidden="true">{pending.icon}</span>}
    <p className="auth-privacy">We’ll check again automatically. You can also refresh now.</p>
    <NeuButton variant="primary" onClick={() => { void refresh() }}>Check status</NeuButton>
  </AuthFrame>
}
