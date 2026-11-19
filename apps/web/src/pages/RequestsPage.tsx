import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { apiRequest } from '../api/client'
import ItemVisual from '../components/ItemVisual'
import { NeuBadge, NeuButton, NeuCard, NeuChip, NeuEmptyState, NeuModal, NeuSkeleton } from '../components/ui'
import { formatLocation } from '../items/location'

type RequestData = {
  id: string; item: { id: string; title: string; category: string; photos: Array<{ path: string; url: string; thumbnailUrl: string }> }
  fromDate: string; toDate: string; note: string; declineReason: string | null
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'returned'; isOverdue: boolean
  other: { id: string; name: string; floor: number | null; room: string | null; phone?: string | null }; isBorrower: boolean
}
type Role = 'borrower' | 'owner'
const filters = ['All', 'Pending', 'Accepted', 'Returned', 'Declined/Cancelled'] as const

export default function RequestsPage() {
  const [role, setRole] = useState<Role>('borrower')
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const query = useQuery({ queryKey: ['requests', role], queryFn: async () => (await apiRequest<{ requests: RequestData[] }>(`/api/requests/mine?role=${role}`)).requests })
  const requests = (query.data ?? []).filter((request) => filter === 'All' || (filter === 'Declined/Cancelled' ? ['declined', 'cancelled'].includes(request.status) : request.status === filter.toLowerCase()))
  return <div className="requests-page">
    <div className="page-heading"><p className="section-kicker">THE BORROWING LOOP</p><h1>Requests</h1><p>Keep track of what you asked for and what neighbours need.</p></div>
    <div className="request-tabs"><NeuChip selected={role === 'borrower'} onClick={() => { setRole('borrower'); setFilter('All') }}>I asked</NeuChip><NeuChip selected={role === 'owner'} onClick={() => { setRole('owner'); setFilter('All') }}>People asked me</NeuChip></div>
    <div className="request-filter-row">{filters.map((value) => <NeuChip key={value} selected={filter === value} onClick={() => setFilter(value)}>{value}</NeuChip>)}</div>
    {query.isPending && <div className="request-list">{[0, 1, 2].map((id) => <NeuCard className="request-card" key={id}><NeuSkeleton className="request-card__visual" /><NeuSkeleton /><NeuSkeleton /></NeuCard>)}</div>}
    {query.isError && <NeuCard className="state-panel"><h2>Requests didn’t load</h2><p>{query.error.message}</p><NeuButton variant="primary" onClick={() => { void query.refetch() }}>Try again</NeuButton></NeuCard>}
    {query.isSuccess && requests.length === 0 && <NeuCard className="state-panel"><NeuEmptyState title="No requests yet" description="Requests for items you ask to borrow or share will appear here." /></NeuCard>}
    {requests.length > 0 && <div className="request-list">{requests.map((request) => <RequestCard key={request.id} request={request} />)}</div>}
  </div>
}

function RequestCard({ request }: { request: RequestData }) {
  const client = useQueryClient()
  const [declineOpen, setDeclineOpen] = useState(false)
  const [reason, setReason] = useState('')
  const action = useMutation({
    mutationFn: ({ name, body }: { name: string; body?: unknown }) => apiRequest(`/api/requests/${request.id}/${name}`, { method: 'PATCH', ...(body === undefined ? {} : { body }) }),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['requests'] }), client.invalidateQueries({ queryKey: ['items'] }), client.invalidateQueries({ queryKey: ['notifications'] })]); setDeclineOpen(false) },
  })
  const location = formatLocation(request.other.floor, request.other.room)
  const statusTone = request.status === 'accepted' || request.status === 'returned' ? 'success' : request.status === 'declined' || request.status === 'cancelled' ? 'neutral' : 'warning'
  const phoneDigits = request.other.phone?.replace(/[^+0-9]/g, '') ?? ''
  return <NeuCard as="article" className="request-card">
    <div className="request-card__visual"><ItemVisual item={request.item} size="compact" /></div>
    <div className="request-card__body">
      <div className="request-card__top"><NeuBadge tone={statusTone}>{request.status}</NeuBadge>{request.isOverdue && <NeuBadge tone="danger">Overdue</NeuBadge>}</div>
      <h2>{request.item.title}</h2>
      <p className="request-card__dates">{request.fromDate} – {request.toDate}</p>
      <p className="request-card__other">{request.isBorrower ? 'Owner' : 'Requested by'}: <strong>{request.other.name}</strong><span>{location}</span></p>
      {request.note && <p className="request-card__note">“{request.note}”</p>}
      {request.declineReason && <p className="request-card__note">Reason: {request.declineReason}</p>}
      {request.status === 'accepted' && <div className="request-contact"><strong>Contact {request.other.name}</strong><span>{location}</span>{request.other.phone ? <><a href={`tel:${phoneDigits}`}>Call</a><a href={`https://wa.me/${phoneDigits.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a></> : <p>No phone added, meet at their room.</p>}</div>}
      {action.isError && <p className="form-error" role="alert">{action.error.message}</p>}
      <div className="request-card__actions">
        {!request.isBorrower && request.status === 'pending' && <><NeuButton variant="primary" onClick={() => action.mutate({ name: 'accept' })} disabled={action.isPending} icon={<Check size={15} />}>Accept</NeuButton><NeuButton onClick={() => setDeclineOpen(true)} disabled={action.isPending} icon={<X size={15} />}>Decline</NeuButton></>}
        {!request.isBorrower && request.status === 'accepted' && <NeuButton variant="primary" onClick={() => { if (window.confirm('Mark this item as returned?')) action.mutate({ name: 'return' }) }} disabled={action.isPending}>Mark returned</NeuButton>}
        {request.isBorrower && ['pending', 'accepted'].includes(request.status) && <NeuButton onClick={() => { if (window.confirm('Cancel this borrow request?')) action.mutate({ name: 'cancel' }) }} disabled={action.isPending}>Cancel request</NeuButton>}
      </div>
    </div>
    <NeuModal open={declineOpen} onClose={() => setDeclineOpen(false)} title="Decline request"><form className="request-modal-form" onSubmit={(event) => { event.preventDefault(); action.mutate({ name: 'decline', body: { reason } }) }}><label className="field"><span className="field__label">Reason (optional)</span><textarea className="neu-textarea" maxLength={200} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label>{action.isError && <p className="form-error" role="alert">{action.error.message}</p>}<NeuButton variant="primary" type="submit" disabled={action.isPending}>{action.isPending ? 'Declining…' : 'Decline request'}</NeuButton></form></NeuModal>
  </NeuCard>
}
