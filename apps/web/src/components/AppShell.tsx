import type { ReactNode } from 'react'
import { ClipboardList, HeartHandshake, Home, Package, Plus, UserRound } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { NeuAvatar } from './ui'
import { formatLocation } from '../items/location'
import NotificationBell from './NotificationBell'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../api/client'

const links = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Wanted', to: '/wanted', icon: HeartHandshake },
  { label: 'Add item', to: '/items/new', icon: Plus },
  { label: 'Requests', to: '/requests', icon: ClipboardList },
  { label: 'Profile', to: '/profile', icon: UserRound },
]

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pendingQuery = useQuery({ queryKey: ['requests', 'pending-count'], queryFn: async () => (await apiRequest<{ requests: unknown[] }>('/api/requests/mine?role=owner&status=pending')).requests.length, refetchInterval: 30_000 })
  const wantedQuery = useQuery({ queryKey: ['notifications'], queryFn: () => apiRequest<{ wantedUnreadCount: number }>('/api/notifications'), refetchInterval: 30_000 })
  return <nav className={`app-nav ${mobile ? 'app-nav--mobile' : ''}`} aria-label="Main navigation">
    {links.map(({ label, to, icon: Icon, end }) => <NavLink key={label} to={to} end={end} className={({ isActive }) => `app-nav__link ${isActive ? 'is-active' : ''}`}>
      <Icon size={19} strokeWidth={1.8} /><span>{label}</span>{label === 'Requests' && (pendingQuery.data ?? 0) > 0 && <span className="nav-count">{pendingQuery.data}</span>}{label === 'Wanted' && (wantedQuery.data?.wantedUnreadCount ?? 0) > 0 && <span className="nav-count">{wantedQuery.data?.wantedUnreadCount}</span>}
    </NavLink>)}
  </nav>
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return null
  const name = user.name.trim().split(/\s+/)[0] || 'there'
  return <div className="app-shell">
    <aside className="app-sidebar">
      <Link className="brand" to="/" aria-label="LendLoop home"><span className="brand__glyph"><span /><span /></span><span>Lend<span className="brand__accent">Loop</span></span></Link>
      <p className="sidebar-copy">The little things we share<br />make this place home.</p>
      <Navigation />
      <Link to="/my-items" className={`sidebar-secondary ${location.pathname === '/my-items' ? 'is-active' : ''}`}><Package size={18} />My items</Link>
      <div className="sidebar-notifications"><NotificationBell compact /></div>
      <Link className="sidebar-person" to="/profile"><NeuAvatar name={user.name} size="sm" src={user.avatarUrl} /><span><strong>{user.name}</strong><small>{formatLocation(user.floor, user.room)}</small></span></Link>
    </aside>
    <main className="app-main">
      <header className="app-topbar"><span className="community-label"><span className="community-indicator" />LendLoop Hostel</span><div className="app-topbar__profile"><NotificationBell /><span>Welcome, {name}</span><NeuAvatar name={user.name} size="sm" src={user.avatarUrl} /></div></header>
      <div className="app-content">{children}</div>
    </main>
    <div className="app-mobile-nav"><Navigation mobile /></div>
  </div>
}
