import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, Edit3, MapPin, ShieldCheck, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { NeuAvatar, NeuBadge, NeuButton, NeuCard, NeuSkeleton } from '../components/ui'
import type { ItemRecord } from '../items/types'

export default function ItemDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [photoIndex, setPhotoIndex] = useState(0)
  const [deleteError, setDeleteError] = useState('')
  const itemQuery = useQuery({
    queryKey: ['item', id],
    queryFn: async () => (await apiRequest<{ item: ItemRecord }>(`/api/items/${id}`)).item,
    enabled: Boolean(id),
  })
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest<null>(`/api/items/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['items'] })
      navigate('/my-items', { replace: true })
    },
    onError: (error) => setDeleteError(error.message),
  })

  if (itemQuery.isPending) return <div className="detail-loading"><NeuSkeleton className="detail-loading__photo" /><NeuSkeleton /><NeuSkeleton /><NeuSkeleton /></div>
  if (itemQuery.isError || !itemQuery.data) return <NeuCard className="state-panel"><h1>We couldn’t find this item</h1><p>{itemQuery.error?.message ?? 'This listing may have been removed.'}</p><Link to="/" className="neu-button neu-button--primary"><ArrowLeft size={16} />Back to home</Link></NeuCard>
  const item = itemQuery.data
  const photo = item.photos[photoIndex]
  const location = [item.owner.block ? `Block ${item.owner.block}` : '', item.owner.floor ? `Floor ${item.owner.floor}` : ''].filter(Boolean).join(' · ')

  return <div className="detail-page">
    <Link to={item.isOwner ? '/my-items' : '/'} className="back-link"><ArrowLeft size={16} />Back to listings</Link>
    <div className="detail-layout">
      <NeuCard className="detail-gallery">
        <div className="detail-gallery__stage">
          {photo ? <img src={photo.url} alt={`${item.title} photo ${photoIndex + 1}`} /> : <div className="detail-gallery__empty" aria-label="No photos available"><PackageIcon /></div>}
          {item.photos.length > 1 && <>
            <button type="button" className="gallery-control gallery-control--left" aria-label="Previous photo" onClick={() => setPhotoIndex((index) => (index - 1 + item.photos.length) % item.photos.length)}><ChevronLeft /></button>
            <button type="button" className="gallery-control gallery-control--right" aria-label="Next photo" onClick={() => setPhotoIndex((index) => (index + 1) % item.photos.length)}><ChevronRight /></button>
            <span className="gallery-count" aria-live="polite">{photoIndex + 1} / {item.photos.length}</span>
          </>}
        </div>
        {item.photos.length > 1 && <div className="detail-thumbnails">{item.photos.map((image, index) => <button type="button" key={image.path} aria-label={`Show photo ${index + 1}`} aria-pressed={index === photoIndex} onClick={() => setPhotoIndex(index)}><img src={image.thumbnailUrl} alt="" /></button>)}</div>}
      </NeuCard>
      <section className="detail-copy">
        <div className="detail-topline"><span className="section-kicker">{item.category.toUpperCase()}</span><NeuBadge tone={item.status === 'available' ? 'success' : item.status === 'hidden' ? 'neutral' : 'warning'}>{item.status === 'available' ? 'Available now' : item.status === 'hidden' ? 'Hidden from browse' : 'Currently lent'}</NeuBadge></div>
        <h1>{item.title}</h1>
        <p className="detail-description">{item.description}</p>
        <div className="detail-facts"><div><span>Condition</span><strong>{item.condition}</strong></div><div><span>Loan period</span><strong>Up to {item.maxLendDays} days</strong></div></div>
        <NeuCard className="detail-owner">
          <NeuAvatar name={item.owner.name} size="lg" src={item.owner.avatarUrl} />
          <div className="detail-owner__info"><span className="section-kicker">SHARED BY</span><strong>{item.owner.name}</strong><small><MapPin size={13} />{location || 'Hostel member'}</small></div>
          <div className="detail-owner__trust"><ShieldCheck size={17} /><strong>{item.owner.trustScore}</strong><small>trust</small></div>
        </NeuCard>
        {item.isOwner ? <div className="detail-owner-actions"><Link to={`/items/${item.id}/edit`} className="neu-button neu-button--primary"><Edit3 size={16} />Edit item</Link><NeuButton onClick={() => { setDeleteError(''); if (window.confirm('Delete this listing and its photos?')) deleteMutation.mutate() }} disabled={deleteMutation.isPending} icon={<Trash2 size={16} />}>{deleteMutation.isPending ? 'Deleting…' : 'Delete'}</NeuButton></div> : <NeuButton variant="primary" className="detail-request" disabled title="Borrow requests are coming in Phase 4">Request to borrow</NeuButton>}
        {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
      </section>
    </div>
  </div>
}

function PackageIcon() {
  return <svg width="72" height="64" viewBox="0 0 58 50" fill="none" aria-hidden="true"><path d="m8 15 20-9 21 9-20 10-21-10Z" stroke="currentColor"/><path d="M8 15v22l21 9V25M49 15v22l-20 9" stroke="currentColor"/></svg>
}
