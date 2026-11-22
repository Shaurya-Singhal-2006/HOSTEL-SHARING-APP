import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiRequest, setRequestCommunityId } from '../api/client'
import { useAuth } from './AuthProvider'

export const COMMUNITIES_QUERY_KEY = ['communities', 'mine'] as const
export const ACTIVE_COMMUNITY_STORAGE_KEY = 'lendloop.activeCommunityId'

export type CommunityMembership = {
  id: string
  name: string
  type: 'hostel' | 'apartment' | 'office' | 'college' | 'other'
  description: string | null
  icon: string | null
  accentColor: string | null
  level1Label: string
  level2Label: string
  level1Options: string[]
  joinMode: 'open_with_code' | 'approval_required'
  memberCount: number
  role: 'admin' | 'member'
  status: 'active' | 'pending' | 'removed'
  level1Value: string | null
  level2Value: string | null
}

type CommunityValue = {
  communities: CommunityMembership[]
  active: CommunityMembership | null
  pending: CommunityMembership | null
  role: CommunityMembership['role'] | null
  isLoading: boolean
  error: Error | null
  notice: string
  setActive: (id: string) => void
  clearNotice: () => void
  refresh: () => Promise<void>
}

const CommunityContext = createContext<CommunityValue | null>(null)

function readSavedCommunity(): string | null {
  try { return window.localStorage.getItem(ACTIVE_COMMUNITY_STORAGE_KEY) } catch { return null }
}
async function loadCommunities() {
  return apiRequest<{ communities: CommunityMembership[] }>('/api/communities/mine')
}

export function CommunityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: COMMUNITIES_QUERY_KEY, queryFn: loadCommunities, enabled: Boolean(user), retry: false, staleTime: 15_000, refetchInterval: user ? 30_000 : false })
  const [selectedId, setSelectedId] = useState<string | null>(readSavedCommunity)
  const [notice, setNotice] = useState('')
  const communities = useMemo(() => query.data?.communities.filter((community) => community.status !== 'removed') ?? [], [query.data?.communities])
  const activeMemberships = useMemo(() => communities.filter((community) => community.status === 'active'), [communities])
  const active = activeMemberships.find((community) => community.id === selectedId) ?? activeMemberships[0] ?? null
  const pending = communities.find((community) => community.status === 'pending') ?? null

  const selectActive = useCallback((id: string | null, announcement = '') => {
    setSelectedId(id)
    setRequestCommunityId(id)
    try {
      if (id) window.localStorage.setItem(ACTIVE_COMMUNITY_STORAGE_KEY, id)
      else window.localStorage.removeItem(ACTIVE_COMMUNITY_STORAGE_KEY)
    } catch { /* Storage can be disabled; in-memory selection still works. */ }
    queryClient.removeQueries({ predicate: (entry) => entry.queryKey[0] !== 'me' && !(entry.queryKey[0] === 'communities' && entry.queryKey[1] === 'mine') })
    if (announcement) setNotice(announcement)
  }, [queryClient])

  useLayoutEffect(() => { setRequestCommunityId(active?.id ?? null) }, [active?.id])

  useEffect(() => {
    if (!user || !query.isSuccess) return
    if (selectedId && activeMemberships.some((community) => community.id === selectedId)) return
    const staleSelection = Boolean(selectedId)
    selectActive(activeMemberships[0]?.id ?? null, staleSelection ? 'Your previous community is unavailable. Choose another community or join again.' : '')
  }, [activeMemberships, query.isSuccess, selectActive, selectedId, user])

  useEffect(() => {
    const onInvalidCommunity = () => {
      const next = activeMemberships.find((community) => community.id !== active?.id)
      selectActive(next?.id ?? null, next ? 'That community is no longer available. Switched to another community.' : 'That community is no longer available. Join or create a community to continue.')
      void query.refetch()
    }
    window.addEventListener('lendloop:community-invalid', onInvalidCommunity)
    return () => window.removeEventListener('lendloop:community-invalid', onInvalidCommunity)
  }, [active?.id, activeMemberships, query.refetch, selectActive])

  const value = useMemo<CommunityValue>(() => ({
    communities, active, pending, role: active?.role ?? null,
    isLoading: Boolean(user && query.isPending), error: query.error instanceof Error ? query.error : null,
    notice, setActive: (id) => selectActive(id),
    clearNotice: () => setNotice(''),
    refresh: async () => { await query.refetch() },
  }), [active, activeMemberships, communities, notice, pending, query.error, query.isPending, query.refetch, selectActive, user])

  return <CommunityContext.Provider value={value}>
    {notice && <div className="community-notice" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>×</button></div>}
    {children}
  </CommunityContext.Provider>
}

export function useCommunity() {
  const context = useContext(CommunityContext)
  if (!context) throw new Error('useCommunity must be used inside CommunityProvider')
  return context
}
