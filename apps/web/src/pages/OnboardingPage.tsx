import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../api/client'
import { ME_QUERY_KEY, type CurrentUser, useAuth } from '../auth/AuthProvider'
import AuthFrame from '../components/AuthFrame'
import ProfileEditor from '../components/ProfileEditor'

export default function OnboardingPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  if (!user) return null

  return <AuthFrame title="Make it feel like home" description="Add your hostel details so neighbours know where to find you.">
    <div className="account-line"><span>Google account</span><strong>{user.email}</strong></div>
    <ProfileEditor
      user={user}
      submitLabel="Save and continue"
      onSave={async (values) => {
        const result = await apiRequest<{ user: CurrentUser }>('/api/me', {
          method: 'PATCH',
          body: { name: values.name, floor: Number(values.floor), room: values.room, phone: values.phone || null },
        })
        queryClient.setQueryData(ME_QUERY_KEY, result.user)
        navigate('/', { replace: true })
      }}
    />
  </AuthFrame>
}
