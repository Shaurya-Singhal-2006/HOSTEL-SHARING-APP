import { ClipboardList, HeartHandshake } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { NeuCard } from '../components/ui'

export default function ComingSoonPage() {
  const location = useLocation()
  const isWanted = location.pathname === '/wanted'
  const Icon = isWanted ? HeartHandshake : ClipboardList
  const title = isWanted ? 'Wanted board' : 'Borrow requests'
  return <NeuCard className="state-panel coming-soon"><span><Icon size={22} /></span><p className="section-kicker">COMING IN PHASE 4</p><h1>{title}</h1><p>{isWanted ? 'Post what you need and help neighbours answer the call.' : 'Borrow requests and handoffs are the next piece of the loop.'}</p><Link to="/" className="neu-button neu-button--primary">Explore shared items</Link></NeuCard>
}
