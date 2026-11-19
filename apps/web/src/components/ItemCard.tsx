import { ArrowUpRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ItemRecord } from '../items/types'
import { NeuAvatar, NeuBadge, NeuCard } from './ui'

export default function ItemCard({ item }: { item: ItemRecord }) {
  const location = [item.owner.block ? `Block ${item.owner.block}` : '', item.owner.floor ? `Floor ${item.owner.floor}` : ''].filter(Boolean).join(' · ')
  return <NeuCard as="article" className="listing-card">
    <Link to={`/items/${item.id}`} className="listing-card__link" aria-label={`View ${item.title}`}>
      <div className="listing-card__photo">
        {item.photos[0] ? <img src={item.photos[0].thumbnailUrl} alt="" loading="lazy" /> : <span className="listing-card__placeholder" aria-hidden="true"><PackageIllustration /></span>}
        <NeuBadge tone={item.status === 'available' ? 'success' : item.status === 'hidden' ? 'neutral' : 'warning'}>{item.status === 'available' ? 'Available' : item.status === 'hidden' ? 'Hidden' : 'On loan'}</NeuBadge>
      </div>
      <div className="listing-card__body">
        <div className="listing-card__meta"><span>{item.category}</span><span>{item.condition}</span></div>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
        <div className="listing-card__owner">
          <NeuAvatar name={item.owner.name} size="sm" src={item.owner.avatarUrl} />
          <span><strong>{item.owner.name}</strong><small><MapPin size={12} />{location || 'Hostel member'}</small></span>
          <ArrowUpRight size={16} className="listing-card__arrow" aria-hidden="true" />
        </div>
      </div>
    </Link>
  </NeuCard>
}

function PackageIllustration() {
  return <svg width="58" height="50" viewBox="0 0 58 50" fill="none" aria-hidden="true"><path d="m8 15 20-9 21 9-20 10-21-10Z" stroke="currentColor"/><path d="M8 15v22l21 9V25M49 15v22l-20 9" stroke="currentColor"/><path d="m18 11 20 10" stroke="currentColor" opacity=".5"/></svg>
}
