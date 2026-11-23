import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../api/client'
import { ME_QUERY_KEY, type CurrentUser, useAuth } from '../auth/AuthProvider'
import { useCommunity } from '../auth/CommunityProvider'
import AuthFrame from '../components/AuthFrame'
import ProfileEditor from '../components/ProfileEditor'

export default function OnboardingPage() {
  const { user } = useAuth()
  const community = useCommunity()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  if (!user) return null

  return <AuthFrame title="Make it feel like home" description="Add your details so neighbours know where to find you.">
    <div className="account-line"><span>Google account</span><strong>{user.email}</strong></div>
    <ProfileEditor
      user={user}
      community={community.active}
      submitLabel="Save and continue"
      onSave={async (values) => {
        const result = await apiRequest<{ user: CurrentUser }>('/api/me', { method: 'PATCH', body: { name: values.name, phone: values.phone || null } })
        if (community.active && (community.active.level1Label || community.active.level2Label)) await apiRequest(`/api/communities/${community.active.id}/me`, { method: 'PATCH', body: { ...(community.active.level1Label ? { level1: values.floor } : {}), ...(community.active.level2Label ? { level2: values.room.trim() || null } : {}) } })
        queryClient.setQueryData(ME_QUERY_KEY, result.user)
        await community.refresh()
        navigate('/tour', { replace: true })
      }}
    />
  </AuthFrame>
}
