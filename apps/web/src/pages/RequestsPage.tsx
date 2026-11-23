import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCircle2, Circle, Package, RotateCcw, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import { apiRequest } from '../api/client'
import ItemVisual from '../components/ItemVisual'
import { NeuBadge, NeuButton, NeuCard, NeuChip, NeuEmptyState, NeuModal, NeuSkeleton } from '../components/ui'
import { formatCommunityLocation, formatLocation } from '../items/location'
import ReputationButton from '../components/ReputationButton'
import { Link } from 'react-router-dom'
import { useCommunity } from '../auth/CommunityProvider'
import Celebration from '../components/Celebration'

type RequestData = {
  id: string; item: { id: string; title: string; category: string; photos: Array<{ path: string; url: string; thumbnailUrl: string }> }
  fromDate: string; toDate: string; note: string; declineReason: string | null
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'returned'; isOverdue: boolean
  other: { id: string; name: string; floor: number | null; room: string | null; level1Value?: string | null; level2Value?: string | null; phone?: string | null; trustScore?: number }; isBorrower: boolean; myRated:boolean; otherRated:boolean
}
type Role = 'borrower' | 'owner'
const filters = ['All', 'Waiting for reply', 'Accepted', 'Returned', 'Not going ahead'] as const
const flowSteps = [{label:'Asked',icon:CheckCircle2},{label:'Accepted',icon:CheckCircle2},{label:'Picked up',icon:Package},{label:'Returned',icon:RotateCcw}]

function requestMessage(request:RequestData & { location: string }) {
  if(request.status==='pending')return request.isBorrower?`Waiting for ${request.other.name} to say yes.`:'Please choose Say yes or Say no.'
  if(request.status==='accepted')return `Accepted. Pick it up from ${request.location} and return it by ${shortDate(request.toDate)}.`
  if(request.status==='returned')return 'This item has been marked as returned. Thanks for sharing.'
  if(request.status==='declined')return 'This request was declined, so the borrow will not go ahead.'
  if(request.status==='cancelled')return 'This request was cancelled, so the borrow will not go ahead.'
  return ''
}
function shortDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'short'})}
function statusLabel(request:RequestData) { return request.status==='pending'?(request.isBorrower?'Waiting for owner':'Needs your reply'):({accepted:'Accepted',returned:'Returned',declined:'Didn’t go ahead',cancelled:'Cancelled'} as const)[request.status] }

export default function RequestsPage() {
  const [role, setRole] = useState<Role>('borrower')
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const { active } = useCommunity()
  const communityId = active?.id ?? null
  const query = useQuery({ queryKey: ['requests', role, communityId], enabled: Boolean(communityId), queryFn: async () => (await apiRequest<{ requests: RequestData[] }>(`/api/requests/mine?role=${role}`)).requests })
  const requests = (query.data ?? []).filter((request) => filter === 'All' || (filter === 'Not going ahead' ? ['declined', 'cancelled'].includes(request.status) : request.status === (filter==='Waiting for reply'?'pending':filter.toLowerCase())))
  return <div className="requests-page">
    <div className="page-heading"><h1>Borrowing</h1><p>See what’s waiting, accepted, or ready to come home.</p></div>
    <div className="request-tabs"><NeuChip selected={role === 'borrower'} onClick={() => { setRole('borrower'); setFilter('All') }}>I asked to borrow</NeuChip><NeuChip selected={role === 'owner'} onClick={() => { setRole('owner'); setFilter('All') }}>Requests for my items</NeuChip></div>
    <div className="request-filter-row">{filters.map((value) => <NeuChip key={value} selected={filter === value} onClick={() => setFilter(value)}>{value}</NeuChip>)}</div>
    {query.isPending && <div className="request-list">{[0, 1, 2].map((id) => <NeuCard className="request-card" key={id}><NeuSkeleton className="request-card__visual" /><NeuSkeleton /><NeuSkeleton /></NeuCard>)}</div>}
    {query.isError && <NeuCard className="state-panel"><h2>Requests didn’t load</h2><p>{query.error.message}</p><NeuButton variant="primary" onClick={() => { void query.refetch() }}>Try again</NeuButton></NeuCard>}
    {query.isSuccess && requests.length === 0 && <NeuCard className="state-panel"><NeuEmptyState title={query.data?.length?'Nothing in this group yet':'No requests yet'} description={query.data?.length?'No requests match this filter. See all your requests.':role==='borrower'?'Find something useful to borrow.':'Share an item so neighbours can ask to borrow it.'} action={query.data?.length?<NeuButton variant="primary" onClick={()=>setFilter('All')}>See all requests</NeuButton>:<Link to={role==='borrower'?'/':'/items/new'} className="neu-button neu-button--primary">{role==='borrower'?'Find something':'Share an item'}</Link>} /></NeuCard>}
    {requests.length > 0 && <div className="request-list">{requests.map((request) => <RequestCard key={request.id} request={request} />)}</div>}
  </div>
}

function RequestCard({ request }: { request: RequestData }) {
  const client = useQueryClient()
  const [declineOpen, setDeclineOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [celebrate, setCelebrate] = useState(false)
  const [rating,setRating]=useState<boolean|null>(null);const [comment,setComment]=useState('')
  const action = useMutation({
    mutationFn: ({ name, body }: { name: string; body?: unknown }) => apiRequest(`/api/requests/${request.id}/${name}`, { method: 'PATCH', ...(body === undefined ? {} : { body }) }),
    onSuccess: async (_result, variables) => { await Promise.all([client.invalidateQueries({ queryKey: ['requests'] }), client.invalidateQueries({ queryKey: ['items'] }), client.invalidateQueries({ queryKey: ['notifications'] })]); setDeclineOpen(false); if (variables.name === 'accept' || variables.name === 'return') setCelebrate(true) },
  })
  const rate=useMutation({mutationFn:()=>apiRequest('/api/ratings',{method:'POST',body:{requestId:request.id,thumbsUp:rating,comment:comment||undefined}}),onSuccess:async()=>{await client.invalidateQueries({queryKey:['requests']});await client.invalidateQueries({queryKey:['reputation',request.other.id]})}})
  const { active } = useCommunity()
  const location = formatCommunityLocation({ level1Value: request.other.level1Value ?? null, level2Value: request.other.level2Value ?? null }, active) || formatLocation(request.other.floor, request.other.room)
  const requestWithLocation = { ...request, location }
  const statusTone = request.status === 'accepted' || request.status === 'returned' ? 'success' : request.status === 'declined' || request.status === 'cancelled' ? 'neutral' : 'warning'
  const phoneDigits = request.other.phone?.replace(/[^+0-9]/g, '') ?? ''
  return <NeuCard as="article" className="request-card">
    <Celebration active={celebrate} onDone={() => setCelebrate(false)} />
    <div className="request-card__visual"><ItemVisual item={request.item} size="compact" /></div>
    <div className="request-card__body">
      <div className="request-card__top"><NeuBadge tone={statusTone}>{statusLabel(request)}</NeuBadge>{request.isOverdue && <NeuBadge tone="danger">Overdue — past return date</NeuBadge>}</div>
      <h2>{request.item.title}</h2>
      <p className="request-card__dates">{shortDate(request.fromDate)} – {shortDate(request.toDate)}</p>
      <RequestProgress request={request}/>
      <p className="request-explanation">{requestMessage(requestWithLocation)}</p>
      <p className="request-card__other">{request.isBorrower ? 'Owner' : 'Requested by'}: <strong><ReputationButton userId={request.other.id} name={request.other.name}/></strong><span>{location}</span></p>
      {request.note && <p className="request-card__note">“{request.note}”</p>}
      {request.declineReason && <p className="request-card__note">Reason: {request.declineReason}</p>}
      {request.status === 'accepted' && <div className="request-contact"><strong>Contact {request.other.name}</strong><span>{location}</span>{request.other.phone ? <><a href={`tel:${phoneDigits}`}>Call</a><a href={`https://wa.me/${phoneDigits.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a></> : <p>No phone added, meet at their room.</p>}</div>}
      {request.status==='returned'&&<div className="rating-panel"><strong>{request.myRated?'Thanks for sharing your feedback':'Rate this exchange'}</strong>{request.myRated?<p>{!request.otherRated?'Your feedback is in. The other person can rate this exchange too.':'Both sides have shared their feedback.'}</p>:<><div className="rating-vote"><NeuButton aria-pressed={rating===true} onClick={()=>setRating(true)} icon={<ThumbsUp size={16}/>}>Thumbs up</NeuButton><NeuButton aria-pressed={rating===false} onClick={()=>setRating(false)} icon={<ThumbsDown size={16}/>}>Thumbs down</NeuButton></div><textarea className="neu-textarea" rows={2} maxLength={150} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add a short note (optional)"/>{rate.isError&&<p className="form-error" role="alert">{rate.error.message}</p>}<NeuButton variant="primary" disabled={rating===null||rate.isPending} onClick={()=>rate.mutate()}>{rate.isPending?'Saving…':'Submit rating'}</NeuButton></>}</div>}
      {action.isError && <p className="form-error" role="alert">{action.error.message}</p>}
      <div className="request-card__actions">
        {!request.isBorrower && request.status === 'pending' && <><NeuButton variant="primary" onClick={() => action.mutate({ name: 'accept' })} disabled={action.isPending} icon={<Check size={15} />}>Say yes</NeuButton><NeuButton onClick={() => setDeclineOpen(true)} disabled={action.isPending} icon={<X size={15} />}>Say no</NeuButton></>}
        {!request.isBorrower && request.status === 'accepted' && <NeuButton variant="primary" onClick={() => { if (window.confirm('Has the item been returned?')) action.mutate({ name: 'return' }) }} disabled={action.isPending}>Mark as returned</NeuButton>}
        {request.isBorrower && ['pending', 'accepted'].includes(request.status) && <NeuButton onClick={() => { if (window.confirm('Cancel this borrow request?')) action.mutate({ name: 'cancel' }) }} disabled={action.isPending}>Cancel</NeuButton>}
      </div>
    </div>
    <NeuModal open={declineOpen} onClose={() => setDeclineOpen(false)} title="Say no to this request"><form className="request-modal-form" onSubmit={(event) => { event.preventDefault(); action.mutate({ name: 'decline', body: { reason } }) }}><label className="field"><span className="field__label">Reason (optional)</span><textarea className="neu-textarea" maxLength={200} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label>{action.isError && <p className="form-error" role="alert">{action.error.message}</p>}<NeuButton variant="primary" type="submit" disabled={action.isPending}>{action.isPending ? 'Saving…' : 'Say no'}</NeuButton></form></NeuModal>
  </NeuCard>
}

function RequestProgress({request}:{request:RequestData}) {
  const active=request.status==='pending'?0:request.status==='accepted'?1:3
  const complete=request.status==='returned'?3:request.status==='accepted'?0:request.status==='pending'?-1:0
  const stopped=['declined','cancelled'].includes(request.status)
  return <ol className={`request-progress ${stopped?'is-stopped':''}`} aria-label={`Request progress: ${statusLabel(request)}`}>
    {flowSteps.map((step,index)=>{const state=stopped?(index===0?'done':'upcoming'):complete>=index?'done':index===active?'current':'upcoming';const Icon=state==='done'?CheckCircle2:state==='current'?Circle:step.icon;return <li key={step.label} className={`request-progress__step is-${state}`} aria-current={index===active&&!stopped?'step':undefined}><Icon size={17}/><span>{step.label}</span></li>})}
  </ol>
}
