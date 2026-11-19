import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, MapPin, ShieldCheck } from 'lucide-react'
import { apiRequest } from '../api/client'
import { ME_QUERY_KEY, type CurrentUser, useAuth } from '../auth/AuthProvider'
import ProfileEditor from '../components/ProfileEditor'
import { NeuAvatar, NeuButton, NeuCard } from '../components/ui'
import { formatLocation } from '../items/location'

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
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [logoutError, setLogoutError] = useState('')
  if (!user) return null
  const avatar = safeAvatar(user.avatarUrl)

  return <div className="profile-screen profile-screen--in-app">
    <div className="profile-content">
      <div className="profile-heading"><div><h1>Your profile</h1><p>Make it easy for your hostel neighbours to borrow with confidence.</p></div><div className="profile-heading__actions"><Link to="/my-items" className="neu-button">My items</Link><NeuButton onClick={async () => {
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
          <div className="profile-detail"><MapPin size={17} /><span>{formatLocation(user.floor, user.room)}</span></div>
          <div className="profile-detail"><ShieldCheck size={17} /><span>Member of LendLoop Hostel</span></div>
          <div className="profile-summary__note">Your phone number stays private and is only shared when a borrow request is accepted.</div>
          {logoutError && <p className="auth-error" role="alert">{logoutError}</p>}
        </NeuCard>
        <NeuCard className="profile-edit-card">
          <div className="profile-edit-card__heading"><h2>Edit your details</h2><span>PRIVATE TO YOUR HOSTEL</span></div>
          <ProfileEditor
            user={user}
            submitLabel="Save changes"
            onSave={async (values) => {
              const result = await apiRequest<{ user: CurrentUser }>('/api/me', {
                method: 'PATCH',
                body: { name: values.name, floor: Number(values.floor), room: values.room, phone: values.phone || null },
              })
              queryClient.setQueryData(ME_QUERY_KEY, result.user)
            }}
          />
        </NeuCard>
      </div>
    </div>
  </div>
}
