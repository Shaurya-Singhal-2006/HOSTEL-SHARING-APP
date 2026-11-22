import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client'
import ItemVisual from './ItemVisual'
import { useCommunity } from '../auth/CommunityProvider'

type Notice = { id: string; requestId: string | null; wantedPostId: string | null; type: string; message: string; read: boolean; createdAt: string; item: { id: string; title: string; category: string; photos: Array<{ path: string; url: string; thumbnailUrl: string }> } | null }

export default function NotificationBell({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const client = useQueryClient()
  const { active } = useCommunity()
  const communityId = active?.id ?? null
  const query = useQuery({ queryKey: ['notifications', communityId], enabled: Boolean(communityId), queryFn: () => apiRequest<{ notifications: Notice[]; unreadCount: number; wantedUnreadCount: number }>('/api/notifications'), refetchInterval: 30_000 })
  const readAll = useMutation({ mutationFn: () => apiRequest('/api/notifications/read-all', { method: 'PATCH' }), onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }) })
  const unread = query.data?.unreadCount ?? 0
  return <div className={`notification-bell ${compact ? 'notification-bell--compact' : ''}`}>
    <button type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} className="notification-bell__trigger" onClick={() => { const next = !open; setOpen(next); if (next && unread) readAll.mutate() }}><Bell size={18} />{unread > 0 && <span className="notification-count">{unread > 99 ? '99+' : unread}</span>}</button>
    {open && <div className="notification-popover" role="region" aria-label="Recent notifications"><div className="notification-popover__heading"><strong>Notifications</strong><Link to="/requests" onClick={() => setOpen(false)}>Requests</Link></div>
      {query.isPending && <p className="notification-empty">Loading…</p>}
      {query.isError && <p className="notification-empty">Notifications could not load.</p>}
      {query.data?.notifications.length === 0 && <div className="notification-empty"><CheckCircle2 size={19}/><p>You’re all caught up.</p><Link to="/requests" onClick={()=>setOpen(false)}>See your requests</Link></div>}
      {query.data?.notifications.map((notice) => <Link to={notice.wantedPostId ? `/wanted/${notice.wantedPostId}` : `/requests?focus=${notice.requestId}`} onClick={() => setOpen(false)} className={`notification-row ${notice.read ? '' : 'is-unread'}`} key={notice.id}>{notice.item&&<ItemVisual item={notice.item} size="compact" />}<span><strong>{notice.message}</strong><small>{new Date(notice.createdAt).toLocaleString()}</small></span></Link>)}
    </div>}
  </div>
}
