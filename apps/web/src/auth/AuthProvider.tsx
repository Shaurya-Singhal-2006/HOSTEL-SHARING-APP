import { createContext, useContext, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { apiRequest } from '../api/client'

export const ME_QUERY_KEY = ['me'] as const

export type CurrentUser = {
  id: string
  communityId: string
  name: string
  email: string
  avatarUrl: string | null
  joinedHostel: boolean
  floor: number | null
  room: string | null
  phone: string | null
  trustScore: number
  profileComplete: boolean
  onboardingTourCompleted: boolean
}

type AuthValue = {
  user: CurrentUser | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<CurrentUser | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

async function loadMe(): Promise<CurrentUser | null> {
  try {
    const result = await apiRequest<{ user: CurrentUser }>('/api/me')
    return result.user
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 401) return null
    throw error
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const location = useLocation()
  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: loadMe,
    enabled: location.pathname !== '/design',
    retry: false,
    staleTime: 30_000,
  })

  const value = useMemo<AuthValue>(() => ({
    user: meQuery.data ?? null,
    isLoading: meQuery.isPending,
    error: meQuery.error instanceof Error ? meQuery.error : null,
    refresh: async () => {
      const result = await meQuery.refetch()
      if (result.error) throw result.error
      return result.data ?? null
    },
    logout: async () => {
      await apiRequest<{ ok: true }>('/api/auth/logout', { method: 'POST' })
      queryClient.setQueryData(ME_QUERY_KEY, null)
    },
  }), [meQuery.data, meQuery.error, meQuery.isPending, meQuery.refetch, queryClient])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export function profileIsComplete(user: CurrentUser | null): boolean {
  return Boolean(user?.name.trim() && user.floor !== null && /^[A-Z][0-9]{1,3}$/.test(user.room?.trim().toUpperCase() ?? ''))
}

export function routeForUser(user: CurrentUser | null): string {
  if (!user) return '/login'
  if (!user.joinedHostel) return '/join'
  if (!profileIsComplete(user)) return '/onboarding'
  return user.onboardingTourCompleted ? '/' : '/tour'
}
