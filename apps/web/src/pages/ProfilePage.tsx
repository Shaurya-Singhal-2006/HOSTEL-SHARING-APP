import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, MapPin, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react'
import { apiRequest } from '../api/client'
import { ME_QUERY_KEY, type CurrentUser, useAuth } from '../auth/AuthProvider'
import { useCommunity } from '../auth/CommunityProvider'
import ProfileEditor from '../components/ProfileEditor'
import { NeuAvatar, NeuButton, NeuCard } from '../components/ui'
import { formatCommunityLocation } from '../items/location'
import { NeuBadge } from '../components/ui'
import ThemeToggle from '../components/ThemeToggle'
import TextSizeControl from '../components/TextSizeControl'

function safeAvatar(url: string | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname === 'lh3.googleusercontent.com' ? parsed.toString() : null
  } catch {
    return null
  }
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const community = useCommunity()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [logoutError, setLogoutError] = useState('')
  const reputation=useQuery({queryKey:['reputation',user?.id,community.active?.id??null],enabled:Boolean(user&&community.active),queryFn:async()=> (await apiRequest<{reputation:{trustScore:number;thumbsUp:number;thumbsDown:number;totalCompletedLends:number;totalBorrows:number;badges:string[]}}>(`/api/ratings/users/${user!.id}/reputation`)).reputation})
  if (!user) return null
  const avatar = safeAvatar(user.avatarUrl)

  return <div className="profile-screen profile-screen--in-app">
    <div className="profile-content">
      <div className="profile-heading"><div><h1>Your profile</h1><p>Help your neighbours borrow with confidence.</p></div><div className="profile-heading__actions"><Link to="/tour?replay=1" className="neu-button">Replay the tour</Link><Link to="/help" className="neu-button">Help and answers</Link><Link to="/my-items" className="neu-button">My items</Link><NeuButton onClick={async () => {
      setLogoutError('')
      try {
        await logout()
        navigate('/login', { replace: true })
      } catch {
        setLogoutError('Could not sign out. Please try again.')
      }
    }} icon={<LogOut size={16} />}>Sign out</NeuButton></div></div>
      <div className="profile-layout">
        <NeuCard className="profile-summary">
          <div className="profile-summary__person">
            {avatar ? <img className="profile-photo" src={avatar} alt="" referrerPolicy="no-referrer" /> : <NeuAvatar name={user.name} size="lg" />}
            <div><h2>{user.name}</h2><p>{user.email}</p></div>
          </div>
          {community.active && formatCommunityLocation(community.active, community.active) && <div className="profile-detail"><MapPin size={17} /><span>{formatCommunityLocation(community.active, community.active)}</span></div>}
          <div className="profile-detail"><ShieldCheck size={17} /><span>Member of {community.active?.name ?? 'your community'}</span></div>
          {reputation.data&&<div className="profile-reputation"><strong>Trust score {reputation.data.trustScore}</strong><span><ThumbsUp size={14}/>{reputation.data.thumbsUp} · <ThumbsDown size={14}/>{reputation.data.thumbsDown}</span><span>{reputation.data.totalCompletedLends} completed lends · {reputation.data.totalBorrows} borrows</span><div>{reputation.data.badges.map(b=><NeuBadge key={b} tone={b==='Reliable'||b==='Top lender'?'success':'neutral'}>{b}</NeuBadge>)}</div></div>}
          <div className="profile-summary__note">Your phone stays private. It’s shared after a borrow request is accepted, or with neighbours who respond to your open Wanted posts.</div>
          {logoutError && <p className="auth-error" role="alert">{logoutError}</p>}
        </NeuCard>
        <NeuCard className="profile-edit-card">
          <div className="profile-edit-card__heading"><h2>Edit your details</h2><span>PRIVATE TO YOUR COMMUNITY</span></div>
          <ProfileEditor
            user={user}
            community={community.active}
            submitLabel="Save changes"
            onSave={async (values) => {
              const result = await apiRequest<{ user: CurrentUser }>('/api/me', { method: 'PATCH', body: { name: values.name, phone: values.phone || null } })
              if (community.active && (community.active.level1Label || community.active.level2Label)) await apiRequest(`/api/communities/${community.active.id}/me`, { method: 'PATCH', body: { ...(community.active.level1Label ? { level1: values.floor || null } : {}), ...(community.active.level2Label ? { level2: values.room.trim() || null } : {}) } })
              queryClient.setQueryData(ME_QUERY_KEY, result.user)
              await community.refresh()
            }}
          />
        </NeuCard>
      </div>
      <NeuCard className="profile-preferences">
        <div><h2>Display and reading</h2><p>Choose the colors and text size that feel comfortable.</p></div>
        <ThemeToggle />
        <TextSizeControl />
      </NeuCard>
    </div>
  </div>
}
