import type { ReactNode } from 'react'
import { ClipboardList, HeartHandshake, Home, Package, Plus, UserRound } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { NeuAvatar } from './ui'

const links = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Wanted', to: '/wanted', icon: HeartHandshake },
  { label: 'Add item', to: '/items/new', icon: Plus },
  { label: 'Requests', to: '/requests', icon: ClipboardList },
  { label: 'Profile', to: '/profile', icon: UserRound },
]

function Navigation({ mobile = false }: { mobile?: boolean }) {
  return <nav className={`app-nav ${mobile ? 'app-nav--mobile' : ''}`} aria-label="Main navigation">
    {links.map(({ label, to, icon: Icon, end }) => <NavLink key={label} to={to} end={end} className={({ isActive }) => `app-nav__link ${isActive ? 'is-active' : ''}`}>
      <Icon size={19} strokeWidth={1.8} /><span>{label}</span>
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
      <Link className="sidebar-person" to="/profile"><NeuAvatar name={user.name} size="sm" src={user.avatarUrl} /><span><strong>{user.name}</strong><small>Block {user.block} · Floor {user.floor}</small></span></Link>
    </aside>
    <main className="app-main">
      <header className="app-topbar"><span className="community-label"><span className="community-indicator" />LendLoop Hostel</span><div className="app-topbar__profile"><span>Welcome, {name}</span><NeuAvatar name={user.name} size="sm" src={user.avatarUrl} /></div></header>
      <div className="app-content">{children}</div>
    </main>
    <div className="app-mobile-nav"><Navigation mobile /></div>
  </div>
}
