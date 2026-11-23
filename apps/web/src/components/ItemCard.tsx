import { ArrowUpRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ItemRecord } from '../items/types'
import { formatLocation } from '../items/location'
import ItemVisual from './ItemVisual'
import { NeuAvatar, NeuBadge, NeuCard } from './ui'
import ReputationButton from './ReputationButton'
import { useCommunity } from '../auth/CommunityProvider'

export default function ItemCard({ item }: { item: ItemRecord }) {
  const { active } = useCommunity()
  const location = formatLocation(item.owner, active)
  return <NeuCard as="article" className="listing-card">
    <Link to={`/items/${item.id}`} className="listing-card__link" aria-label={`View ${item.title}`}>
      <div className="listing-card__photo">
        <ItemVisual item={item} size="card" />
        <NeuBadge tone={item.status === 'available' ? 'success' : item.status === 'hidden' ? 'neutral' : 'warning'}>{item.status === 'available' ? 'Available' : item.status === 'hidden' ? 'Hidden' : 'Lent out'}</NeuBadge>
      </div>
      <div className="listing-card__body">
        <div className="listing-card__meta"><span>{item.category}</span><span>{item.condition}</span></div>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
      </div>
    </Link>
    <div className="listing-card__owner">
      <NeuAvatar name={item.owner.name} size="sm" src={item.owner.avatarUrl} />
      <span><strong><ReputationButton userId={item.owner.id} name={item.owner.name}/></strong>{location && <small><MapPin size={12} />{location}</small>}</span>
      <Link to={`/items/${item.id}`} aria-label={`View ${item.title}`}><ArrowUpRight size={16} className="listing-card__arrow" aria-hidden="true" /></Link>
    </div>
  </NeuCard>
}
