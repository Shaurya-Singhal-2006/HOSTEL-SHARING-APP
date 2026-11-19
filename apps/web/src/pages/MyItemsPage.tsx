import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, PackagePlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { NeuBadge, NeuButton, NeuCard, NeuEmptyState, NeuSkeleton } from '../components/ui'
import type { ItemRecord } from '../items/types'

export default function MyItemsPage() {
  const queryClient = useQueryClient()
  const itemsQuery = useQuery({ queryKey: ['items', 'mine'], queryFn: async () => (await apiRequest<{ items: ItemRecord[] }>('/api/items/mine')).items })
  const items = itemsQuery.data ?? []

  return <div className="my-items-page">
    <div className="section-heading"><div><p className="section-kicker">YOUR SHARED THINGS</p><h1>My items</h1><p>Keep your listings current and easy to find.</p></div><Link to="/items/new" className="neu-button neu-button--primary"><PackagePlus size={16} />Add item</Link></div>
    {itemsQuery.isPending && <div className="my-items-grid">{[0, 1, 2].map((index) => <NeuCard className="my-item-card" key={index}><NeuSkeleton className="listing-card__skeleton-photo" /><NeuSkeleton /></NeuCard>)}</div>}
    {itemsQuery.isError && <NeuCard className="state-panel"><h2>Your listings didn’t load</h2><p>{itemsQuery.error.message}</p><NeuButton variant="primary" onClick={() => { void itemsQuery.refetch() }}>Try again</NeuButton></NeuCard>}
    {itemsQuery.isSuccess && items.length === 0 && <NeuCard className="state-panel"><NeuEmptyState title="Your shelf is still empty" description="List a tool, kitchen item, or anything else your hostel neighbours might need." action={<Link to="/items/new" className="neu-button neu-button--primary"><PackagePlus size={16} />Add your first item</Link>} /></NeuCard>}
    {items.length > 0 && <div className="my-items-grid">{items.map((item) => <MyItemCard item={item} key={item.id} onChanged={() => queryClient.invalidateQueries({ queryKey: ['items'] })} />)}</div>}
  </div>
}

function MyItemCard({ item, onChanged }: { item: ItemRecord; onChanged: () => void }) {
  const mutation = useMutation({
    mutationFn: (status: ItemRecord['status']) => apiRequest<{ item: ItemRecord }>(`/api/items/${item.id}`, { method: 'PATCH', body: { status } }),
    onSuccess: onChanged,
  })
  const photo = item.photos[0]
  return <NeuCard as="article" className="my-item-card">
    <Link className="my-item-card__photo" to={`/items/${item.id}`}>{photo ? <img src={photo.thumbnailUrl} alt="" loading="lazy" /> : <span aria-hidden="true">LL</span>}</Link>
    <div className="my-item-card__body"><div className="my-item-card__heading"><NeuBadge tone={item.status === 'available' ? 'success' : item.status === 'hidden' ? 'neutral' : 'warning'}>{item.status === 'available' ? 'Available' : item.status === 'hidden' ? 'Hidden' : 'Lent'}</NeuBadge><Link to={`/items/${item.id}`} aria-label={`View ${item.title}`}><ArrowUpRight size={16} /></Link></div>
      <h2><Link to={`/items/${item.id}`}>{item.title}</Link></h2><p>{item.category} · {item.condition}</p>
      <label className="field my-item-status"><span className="field__label">Listing status</span><select className="neu-select" value={item.status} onChange={(event) => mutation.mutate(event.target.value as ItemRecord['status'])} disabled={mutation.isPending}>
        <option value="available">Available</option><option value="lent">Lent</option><option value="hidden">Hidden</option>
      </select></label>
      {mutation.isError && <p className="form-error" role="alert">{mutation.error.message}</p>}
      <div className="my-item-card__actions"><Link to={`/items/${item.id}/edit`} className="neu-button">Edit</Link><Link to={`/items/${item.id}`} className="neu-button neu-button--primary">View listing</Link></div>
    </div>
  </NeuCard>
}
