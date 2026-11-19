import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, Edit3, MapPin, ShieldCheck, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { NeuAvatar, NeuBadge, NeuButton, NeuCard, NeuInput, NeuModal, NeuSkeleton } from '../components/ui'
import type { ItemRecord } from '../items/types'
import ItemVisual from '../components/ItemVisual'
import { formatLocation } from '../items/location'

export default function ItemDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [photoIndex, setPhotoIndex] = useState(0)
  const [deleteError, setDeleteError] = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
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
  const location = formatLocation(item.owner.floor, item.owner.room)

  return <div className="detail-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span>{item.isOwner?<Link to="/my-items">My items</Link>:<Link to="/">On the shelf</Link>}<span aria-hidden="true">/</span><span aria-current="page">{item.title}</span></nav>
    <Link to={item.isOwner ? '/my-items' : '/'} className="back-link"><ArrowLeft size={16} />Back to listings</Link>
    <div className="detail-layout">
      <NeuCard className="detail-gallery">
        <div className="detail-gallery__stage">
          {photo ? <ItemVisual item={{ ...item, photos: [photo] }} size="detail" /> : <ItemVisual item={item} size="detail" />}
          {item.photos.length > 1 && <>
            <button type="button" className="gallery-control gallery-control--left" aria-label="Previous photo" onClick={() => setPhotoIndex((index) => (index - 1 + item.photos.length) % item.photos.length)}><ChevronLeft /></button>
            <button type="button" className="gallery-control gallery-control--right" aria-label="Next photo" onClick={() => setPhotoIndex((index) => (index + 1) % item.photos.length)}><ChevronRight /></button>
            <span className="gallery-count" aria-live="polite">{photoIndex + 1} / {item.photos.length}</span>
          </>}
        </div>
        {item.photos.length > 1 && <div className="detail-thumbnails">{item.photos.map((image, index) => <button type="button" key={image.path} aria-label={`Show photo ${index + 1}`} aria-pressed={index === photoIndex} onClick={() => setPhotoIndex(index)}><ItemVisual item={{ ...item, photos: [image] }} size="compact" /></button>)}</div>}
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
        {item.isOwner ? <div className="detail-owner-actions"><Link to={`/items/${item.id}/edit`} className="neu-button neu-button--primary"><Edit3 size={16} />Edit item</Link><NeuButton onClick={() => { setDeleteError(''); if (window.confirm('Delete this listing and its photos?')) deleteMutation.mutate() }} disabled={deleteMutation.isPending} icon={<Trash2 size={16} />}>{deleteMutation.isPending ? 'Deleting…' : 'Delete'}</NeuButton></div> : item.status === 'available' ? <NeuButton variant="primary" className="detail-request" onClick={() => setRequestOpen(true)}>Borrow this</NeuButton> : <p className="detail-unavailable">{item.status === 'lent' ? 'Lent out right now' : 'This item is not available right now.'}</p>}
        <RequestBorrowModal item={item} open={requestOpen} onClose={() => setRequestOpen(false)} />
        {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
      </section>
    </div>
  </div>
}

function RequestBorrowModal({ item, open, onClose }: { item: ItemRecord; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [fromDate, setFromDate] = useState(todayString)
  const [toDate, setToDate] = useState(todayString)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const maxDate = new Date(`${fromDate}T12:00:00`)
  maxDate.setDate(maxDate.getDate() + item.maxLendDays - 1)
  const maxToDate = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`
  const mutation = useMutation({
    mutationFn: () => apiRequest('/api/requests', { method: 'POST', body: { itemId: item.id, fromDate, toDate, note } }),
    onSuccess: async () => {
      setSuccess(true)
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['requests'] }), queryClient.invalidateQueries({ queryKey: ['notifications'] })])
    },
    onError: (caught) => setError(caught instanceof Error ? caught.message : 'Could not send your request.'),
  })
  return <NeuModal open={open} onClose={() => { onClose(); setSuccess(false); setError('') }} title={success ? 'Request sent' : `Borrow ${item.title}`}>
    {success ? <div className="request-modal-success"><p>Your request is with the owner. We’ll let you know when they respond.</p><NeuButton variant="primary" onClick={() => { onClose(); setSuccess(false) }}>Done</NeuButton></div> : <form className="request-modal-form" onSubmit={(event) => { event.preventDefault(); setError(''); if (toDate < fromDate) { setError('The end date must be on or after the start date.'); return } mutation.mutate() }}>
      <div className="item-form__row"><NeuInput label="From" type="date" value={fromDate} min={todayString} onChange={(event) => { setFromDate(event.target.value); if (toDate < event.target.value) setToDate(event.target.value) }} required /><NeuInput label="To" type="date" value={toDate} min={fromDate} max={maxToDate} onChange={(event) => setToDate(event.target.value)} required /></div>
      <label className="field"><span className="field__label">Note (optional)</span><textarea className="neu-textarea" rows={3} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a short note for the owner" /></label>
      <p className="request-modal-hint">Choose the days you need it. Up to {item.maxLendDays} days. Your phone number stays private until the owner accepts.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <NeuButton variant="primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Sending…' : 'Ask to borrow'}</NeuButton>
    </form>}
  </NeuModal>
}
