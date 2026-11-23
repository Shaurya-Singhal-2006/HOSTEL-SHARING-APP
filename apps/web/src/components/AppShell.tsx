import type { ReactNode } from 'react'
import { CircleHelp, ClipboardList, HeartHandshake, Home, PackagePlus, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { NeuAvatar } from './ui'
import { formatCommunityLocation } from '../items/location'
import NotificationBell from './NotificationBell'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../api/client'
import { useCommunity } from '../auth/CommunityProvider'
import ThemeToggle from './ThemeToggle'

const links = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Wanted', to: '/wanted', icon: HeartHandshake },
  { label: 'Share', to: '/items/new', icon: PackagePlus },
  { label: 'Requests', to: '/requests', icon: ClipboardList },
  { label: 'Profile', to: '/profile', icon: UserRound },
]

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const { active } = useCommunity()
  const communityId = active?.id ?? null
  const pendingQuery = useQuery({ queryKey: ['requests', communityId, 'pending-count'], enabled: Boolean(communityId), queryFn: async () => (await apiRequest<{ requests: unknown[] }>('/api/requests/mine?role=owner&status=pending')).requests.length, refetchInterval: 30_000 })
  const wantedQuery = useQuery({ queryKey: ['notifications', communityId], enabled: Boolean(communityId), queryFn: () => apiRequest<{ wantedUnreadCount: number }>('/api/notifications'), refetchInterval: 30_000 })
  return <nav className={`app-nav ${mobile ? 'app-nav--mobile' : ''}`} aria-label="Main navigation">
    {links.map(({ label, to, icon: Icon, end }) => <NavLink key={label} to={to} end={end} title={mobile ? undefined : label} className={({ isActive }) => `app-nav__link ${isActive ? 'is-active' : ''}`}>
      <Icon size={19} strokeWidth={1.8} /><span>{label}</span>{label === 'Requests' && (pendingQuery.data ?? 0) > 0 && <span className="nav-count">{pendingQuery.data}</span>}{label === 'Wanted' && (wantedQuery.data?.wantedUnreadCount ?? 0) > 0 && <span className="nav-count">{wantedQuery.data?.wantedUnreadCount}</span>}
    </NavLink>)}
  </nav>
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { active, communities, role, setActive } = useCommunity()
  if (!user) return null
  const name = user.name.trim().split(/\s+/)[0] || 'there'
  return <div className="app-shell">
    <aside className="app-sidebar">
      <Link className="brand" to="/" aria-label="LendLoop home"><span className="brand__glyph"><span /><span /></span><span>Lend<span className="brand__accent">Loop</span></span></Link>
      <p className="sidebar-copy">The little things we share<br />make this place home.</p>
      <CommunitySwitcher activeId={active?.id ?? ''} communities={communities.filter((item) => item.status === 'active')} role={role} onChange={setActive} />
      <Navigation />
      <div className="sidebar-create-actions" aria-label="Create something"><Link to="/items/new"><PackagePlus size={18}/>Share an item</Link><Link to="/wanted" state={{ openCreate: true }}><HeartHandshake size={18}/>Ask for something</Link></div>
      <div className="sidebar-notifications"><NotificationBell compact /></div>
      <Link className="sidebar-person" to="/profile"><NeuAvatar name={user.name} size="sm" src={user.avatarUrl} /><span><strong>{user.name}</strong><small>{formatCommunityLocation(active, active) || 'Your profile'}</small></span></Link>
    </aside>
    <main className="app-main">
      <header className="app-topbar"><CommunitySwitcher activeId={active?.id ?? ''} communities={communities.filter((item) => item.status === 'active')} role={role} onChange={setActive} compact /><div className="app-topbar__profile"><ThemeToggle compact/><Link className="topbar-help" to="/help" aria-label="Help and answers" title="Help and answers"><CircleHelp size={19}/><span>? Help</span></Link><NotificationBell /><span>Welcome, {name}</span><NeuAvatar name={user.name} size="sm" src={user.avatarUrl} /></div></header>
      <div className="app-content">{children}</div>
    </main>
    <div className="app-mobile-nav"><Navigation mobile /></div>
  </div>
}

function CommunitySwitcher({ activeId, communities, role, onChange, compact = false }: { activeId: string; communities: Array<{ id: string; name: string; icon: string | null; role: 'admin' | 'member' }>; role: 'admin' | 'member' | null; onChange: (id: string) => void; compact?: boolean }) {
  const active = communities.find((community) => community.id === activeId)
  return <label className={`community-switcher ${compact ? 'community-switcher--compact' : ''}`}>
    <span className="community-switcher__icon" aria-hidden="true">{active?.icon || '◉'}</span>
    <span className="community-switcher__text"><strong>{active?.name ?? 'Select community'}</strong><small>{role ?? active?.role ?? ''}</small></span>
    <select aria-label="Switch community" value={activeId} onChange={(event) => onChange(event.target.value)}>
      {communities.map((community) => <option key={community.id} value={community.id}>{community.name} · {community.role}</option>)}
    </select>
  </label>
}
