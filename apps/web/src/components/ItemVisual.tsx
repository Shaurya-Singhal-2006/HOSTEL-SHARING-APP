import { getItemIcon } from '../items/item-icon'
import type { ItemRecord } from '../items/types'
import { communityAssetUrl } from '../api/client'

export default function ItemVisual({ item, size = 'card' }: { item: Pick<ItemRecord, 'title' | 'category' | 'photos'>; size?: 'card' | 'detail' | 'compact' }) {
  const Icon = getItemIcon(item.title, item.category)
  const photo = item.photos[0]
  if (photo) return <div className={`item-visual-shared item-visual-shared--${size}`}><img src={communityAssetUrl(size === 'compact' ? photo.thumbnailUrl : photo.url)} alt={`${item.title}`} /></div>
  return <div className={`item-visual-shared item-visual-shared--${size} item-visual-shared--icon item-visual-shared--${categoryClass(item.category)}`} role="img" aria-label={`${Icon.displayName ?? 'Item'} icon`}><span><Icon size={size === 'detail' ? 64 : size === 'compact' ? 28 : 42} strokeWidth={1.6} aria-hidden="true" /></span></div>
}

function categoryClass(category: string) { return category.toLowerCase().replace(/[^a-z]+/g, '-') }
