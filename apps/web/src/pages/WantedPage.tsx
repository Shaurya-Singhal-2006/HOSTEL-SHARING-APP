import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { apiRequest } from '../api/client'
import ItemVisual from '../components/ItemVisual'
import { NeuBadge, NeuButton, NeuCard, NeuChip, NeuEmptyState, NeuInput, NeuModal, NeuSkeleton } from '../components/ui'
import { formatLocation } from '../items/location'
import { ITEM_CATEGORIES } from '../items/types'
import ReputationButton from '../components/ReputationButton'
import { useCommunity } from '../auth/CommunityProvider'
import QuickAddMenu from '../components/QuickAddMenu'
import Celebration from '../components/Celebration'

type Author = { id: string; name: string; floor: number | null; room: string | null; level1Value?: string | null; level2Value?: string | null; trustScore: number }
type WantedPost = { id: string; title: string; category: string; note: string; neededBy: string | null; status: 'open'|'fulfilled'|'closed'; isExpired: boolean; createdAt: string; author: Author; responseCount: number; hasResponded: boolean; isAuthor: boolean }
type Response = { id: string; message: string; createdAt: string; responder: Author & { phone?: string | null } }
type Detail = WantedPost & { responses: Response[]; myResponse: { id: string; message: string } | null }
type Feed = { posts: WantedPost[]; pagination: { hasMore: boolean; page: number } }
const categories = ['All', ...ITEM_CATEGORIES]
const wantedStatusLabel = (post:WantedPost) => post.isExpired?'Expired':post.status==='fulfilled'?'Found':post.status==='closed'?'Closed':'Open'

export default function WantedPage() {
  const { id } = useParams()
  return id ? <WantedDetail id={id} /> : <WantedFeed />
}

function WantedFeed() {
  const location = useLocation()
  const { active } = useCommunity()
  const communityId = active?.id ?? null
  const navigate = useNavigate()
  const client = useQueryClient()
  const [tab, setTab] = useState<'board'|'mine'>('board')
  const [category, setCategory] = useState('All')
  const [level1, setLevel1] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [allPosts, setAllPosts] = useState<WantedPost[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  useEffect(() => {
    if (location.state?.openCreate) {
      setCreateOpen(true)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.key, location.pathname, location.state, navigate])
  const queryString = new URLSearchParams({ page: String(page), ...(category !== 'All' ? { category } : {}), ...(level1 ? { level1 } : {}), ...(search ? { search } : {}), ...(tab === 'mine' ? { mine: 'true' } : {}) }).toString()
  const query = useQuery({ queryKey: ['wanted', tab, category, level1, search, page, communityId], enabled: Boolean(communityId), queryFn: () => apiRequest<Feed>(`/api/wanted?${queryString}`) })
  useEffect(()=>{if(query.data)setAllPosts(current=>page===1?query.data!.posts:[...current,...query.data!.posts])},[query.data,page])
  const posts = allPosts
  return <div className="wanted-page">
    <div className="page-heading wanted-heading"><div className="wanted-heading__copy"><p className="section-kicker">THE {active?.name ?? 'COMMUNITY'} WANTED BOARD</p><h1>Need something?</h1><p>Ask your community. Someone nearby may already have it.</p></div><NeuButton className="wanted-ask" variant="primary" onClick={() => setCreateOpen(true)} icon={<Plus size={16} />}>Ask for something</NeuButton></div>
    <div className="wanted-controls"><div className="wanted-search"><Search size={18}/><input aria-label="Search wanted posts" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search the board" /></div><details className="home-filter-details wanted-filter-details"><summary><SlidersHorizontal size={16}/>Filters{category!=='All'||level1?<span>On</span>:null}</summary><div className="wanted-filter-options">{active?.level1Label && active.level1Options.length > 0 && <label className="wanted-floor"><span>{active.level1Label}</span><select value={level1} onChange={e=>{setLevel1(e.target.value);setPage(1)}}><option value="">All {active.level1Label.toLowerCase()} values</option>{active.level1Options.map(value=><option key={value} value={value}>{value}</option>)}</select></label>}<div className="wanted-categories" aria-label="Filter by category">{categories.map(value=><NeuChip key={value} selected={category===value} onClick={()=>{setCategory(value);setPage(1)}}>{value}</NeuChip>)}</div></div></details></div>
    <div className="wanted-tabs"><NeuChip selected={tab==='board'} onClick={()=>{setTab('board');setPage(1)}}>Open board</NeuChip><NeuChip selected={tab==='mine'} onClick={()=>{setTab('mine');setPage(1)}}>My posts</NeuChip></div>
    {query.isPending && <div className="wanted-grid">{[1,2,3].map(i=><NeuCard className="wanted-card" key={i}><NeuSkeleton/><NeuSkeleton/><NeuSkeleton/></NeuCard>)}</div>}
    {query.isError && <NeuCard className="state-panel"><h2>The wanted board didn’t load</h2><p>{query.error.message}</p><NeuButton onClick={()=>void query.refetch()}>Try again</NeuButton></NeuCard>}
    {query.isSuccess && !posts.length && <NeuCard className="state-panel wanted-empty-panel"><NeuEmptyState title={tab==='mine'?"You haven't asked for anything yet":'The board is quiet'} description={tab==='mine'?'Ask for something and it will show up here.':'Nobody has asked for anything yet. Need something? Ask your community, someone nearby may already have it.'} action={tab==='mine'?<NeuButton variant="primary" icon={<Plus size={16}/>} onClick={()=>setCreateOpen(true)}>Ask for something</NeuButton>:<div className="wanted-empty-actions"><NeuButton variant="primary" icon={<Plus size={16}/>} onClick={()=>setCreateOpen(true)}>Ask for something</NeuButton><Link to="/items/new" className="neu-button">I have something to lend</Link></div>}/></NeuCard>}
    {!!posts.length && <div className="wanted-grid">{posts.map(post=><WantedCard key={post.id} post={post}/>)}</div>}
    {query.data?.pagination.hasMore && <div className="wanted-paging"><NeuButton onClick={()=>setPage(page+1)}>Load more</NeuButton></div>}
    <CreateWantedModal open={createOpen} onClose={()=>setCreateOpen(false)} onCreated={()=>{setTab('mine');setPage(1);void client.invalidateQueries({queryKey:['wanted']})}}/>
    <QuickAddMenu />
  </div>
}

function WantedCard({post}:{post:WantedPost}) {
  return <WantedCardInner post={post}/>
}

function WantedCardInner({post}:{post:WantedPost}) {
  const { active } = useCommunity()
  const location = formatLocation(post.author, active)
  return <NeuCard as="article" className="wanted-card"><Link className="wanted-card__main" to={`/wanted/${post.id}`}><ItemVisual item={{title:post.title,category:post.category,photos:[]}} size="compact"/><span className="wanted-card__text"><span className="wanted-card__meta">{post.category}{location ? ` · ${location}` : ''}</span><strong>{post.title}</strong>{post.note&&<span className="wanted-card__note">{post.note}</span>}<span className="wanted-card__meta">{post.responseCount} {post.responseCount===1?'response':'responses'}{post.neededBy?` · Needed by ${post.neededBy}`:''}</span></span></Link><div className="wanted-card__author"><ReputationButton userId={post.author.id} name={post.author.name}/></div><span className="wanted-card__foot"><NeuBadge tone={post.isExpired?'danger':post.status==='open'?'success':'neutral'}>{wantedStatusLabel(post)}</NeuBadge>{post.hasResponded&&<span className="wanted-you-responded">You responded</span>}{!post.isAuthor&&post.status==='open'&&!post.isExpired&&!post.hasResponded&&<Link className="neu-button neu-button--quiet" to={`/wanted/${post.id}`}>I can help</Link>}<Link className="wanted-open" to={`/wanted/${post.id}`}>View post</Link></span></NeuCard>
}

function CreateWantedModal({open,onClose,onCreated}:{open:boolean;onClose:()=>void;onCreated:()=>void}) {
  const [title,setTitle]=useState('');const [category,setCategory]=useState('Other');const [note,setNote]=useState('');const [neededBy,setNeededBy]=useState('')
  const navigate=useNavigate();const client=useQueryClient()
  const {active}=useCommunity();const communityId=active?.id??null
  const suggestion=useQuery({queryKey:['wanted-suggestions',title,communityId],enabled:title.trim().length>=2&&Boolean(communityId),queryFn:()=>apiRequest<{items:Array<{id:string;title:string;category:string;owner:{floor:number|null;room:string|null;level1Value?:string|null;level2Value?:string|null}}> }>(`/api/items?available=true&page=1&search=${encodeURIComponent(title.trim())}`)})
  const create=useMutation({mutationFn:()=>apiRequest<{post:WantedPost}>('/api/wanted',{method:'POST',body:{title,category,note:note||undefined,neededBy:neededBy||undefined}}),onSuccess:async({post})=>{onCreated();onClose();setTitle('');setNote('');await client.invalidateQueries({queryKey:['wanted']});navigate(`/wanted/${post.id}`)}})
  return <NeuModal open={open} onClose={onClose} title="Post a request"><form className="wanted-form" onSubmit={e=>{e.preventDefault();create.mutate()}}>
    <NeuInput label="What do you need?" value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} required autoComplete="off" placeholder="e.g. A drill for a shelf" hint="A short name helps neighbours spot it."/>
    {suggestion.data?.items.length ? <div className="wanted-suggestions"><strong>Someone already listed this</strong>{suggestion.data.items.slice(0,3).map(item=><Link key={item.id} to={`/items/${item.id}`} onClick={onClose}>{item.title} · {formatLocation(item.owner,active)||item.category} <span>View item →</span></Link>)}</div>:null}
    <label className="field"><span className="field__label">Category</span><select className="neu-select" value={category} onChange={e=>setCategory(e.target.value)}>{ITEM_CATEGORIES.map(item=><option key={item}>{item}</option>)}</select><span className="field__message">Choose the closest match.</span></label>
    <label className="field"><span className="field__label">Note (optional)</span><textarea className="neu-textarea" rows={3} maxLength={300} value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a little detail"/></label>
    <NeuInput label="Needed by (optional)" type="date" value={neededBy} min={new Date().toISOString().slice(0,10)} onChange={e=>setNeededBy(e.target.value)}/>
    {create.isError&&<p className="form-error" role="alert">{create.error.message}</p>}<NeuButton type="submit" variant="primary" disabled={create.isPending}>{create.isPending?'Posting…':'Post request'}</NeuButton>
  </form></NeuModal>
}

function WantedDetail({id}:{id:string}) {
  const client=useQueryClient();const [message,setMessage]=useState('');const [selected,setSelected]=useState('');const navigate=useNavigate()
  const [celebrate,setCelebrate]=useState(false)
  const {active}=useCommunity();const communityId=active?.id??null
  const query=useQuery({queryKey:['wanted-detail',id,communityId],enabled:Boolean(communityId),queryFn:async()=> (await apiRequest<{post:Detail}>(`/api/wanted/${id}`)).post})
  const refresh=async()=>{await Promise.all([client.invalidateQueries({queryKey:['wanted-detail',id]}),client.invalidateQueries({queryKey:['wanted']}),client.invalidateQueries({queryKey:['notifications']})])}
  const respond=useMutation({mutationFn:()=>apiRequest(`/api/wanted/${id}/respond`,{method:'POST',body:{message}}),onSuccess:refresh})
  const action=useMutation({mutationFn:({name,body}:{name:string;body?:unknown})=>apiRequest(`/api/wanted/${id}/${name}`,{method:name==='delete'?'DELETE':'PATCH',...(body===undefined?{}:{body})}),onSuccess:async(_result,variables)=>{await refresh();if(variables.name==='delete')navigate('/wanted');if(variables.name==='fulfill')setCelebrate(true)}})
  const post=query.data
  if(query.isPending)return <NeuCard className="state-panel"><NeuSkeleton/><NeuSkeleton/><NeuSkeleton/></NeuCard>
  if(query.isError||!post)return <NeuCard className="state-panel"><h2>Wanted post unavailable</h2><p>{query.error?.message??'Try again later.'}</p><Link to="/wanted" className="neu-button">Back to Wanted</Link></NeuCard>
  const phone=(value:string)=>value.replace(/[^+0-9]/g,'')
  const authorLocation = formatLocation(post.author, active)
  return <div className="wanted-detail"><Celebration active={celebrate} onDone={()=>setCelebrate(false)}/><nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><Link to="/wanted">Wanted</Link><span aria-hidden="true">/</span><span aria-current="page">{post.title}</span></nav><Link to="/wanted" className="back-link"><ArrowLeft size={16}/>Back to wanted</Link><NeuCard className="wanted-detail__card"><div className="wanted-detail__head"><ItemVisual item={{title:post.title,category:post.category,photos:[]}} size="detail"/><div><NeuBadge tone={post.isExpired?'danger':post.status==='open'?'success':'neutral'}>{wantedStatusLabel(post)}</NeuBadge><p className="section-kicker">{post.category}</p><h1>{post.title}</h1><p>Posted by <ReputationButton userId={post.author.id} name={post.author.name}/>{authorLocation ? ` · ${authorLocation}` : ''}</p>{post.neededBy&&<p>Needed by {post.neededBy}</p>}</div></div>{post.note&&<p className="wanted-detail__note">{post.note}</p>}
    <div className="wanted-detail__responses"><h2>{post.isAuthor?'Responses':`${post.responseCount} ${post.responseCount===1?'person':'people'} can help`}</h2>{post.isAuthor&&post.responses.length===0&&<p>No one has responded yet. We’ll let you know when someone can help.</p>}{post.isAuthor&&post.responses.map(response=><article className="wanted-response" key={response.id}><div><strong><ReputationButton userId={response.responder.id} name={response.responder.name}/></strong>{formatLocation(response.responder,active)&&<span>{formatLocation(response.responder,active)}</span>}{response.message&&<p>{response.message}</p>}</div>{response.responder.phone&&<div className="wanted-response__contact"><a href={`tel:${phone(response.responder.phone)}`}>Call</a><a href={`https://wa.me/${phone(response.responder.phone).replace(/\D/g,'')}`} target="_blank" rel="noreferrer">WhatsApp</a></div>}{post.status==='open'&&<label className="helper-select"><input type="radio" name="helper" checked={selected===response.id} onChange={()=>setSelected(response.id)}/> Select helper</label>}</article>)}{!post.isAuthor&&post.myResponse&&<NeuBadge tone="success"><Check size={13}/>You responded</NeuBadge>}{!post.isAuthor&&!post.myResponse&&post.status==='open'&&!post.isExpired&&<form className="wanted-form" onSubmit={e=>{e.preventDefault();respond.mutate()}}><label className="field"><span className="field__label">A short message (optional)</span><textarea className="neu-textarea" maxLength={200} rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder="I have one you can borrow"/></label>{respond.isError&&<p role="alert" className="form-error">{respond.error.message}</p>}<NeuButton type="submit" variant="primary" disabled={respond.isPending}>{respond.isPending?'Sending…':'I can help'}</NeuButton></form>}{!post.isAuthor&&!post.myResponse&&post.status!=='open'&&!post.isExpired&&<p>This post is no longer accepting responses.</p>}{!post.isAuthor&&post.isExpired&&!post.myResponse&&<p>This post has expired and is no longer accepting responses.</p>}</div>
    {post.isAuthor&&<div className="wanted-detail__actions">{post.status==='open'&&<><NeuButton variant="primary" icon={<Check size={15}/>} disabled={action.isPending} onClick={()=>action.mutate({name:'fulfill',body:{responseId:selected||undefined}})}>Mark as found</NeuButton><NeuButton disabled={action.isPending} onClick={()=>action.mutate({name:'close'})}>Close post</NeuButton></>}<NeuButton disabled={action.isPending} onClick={()=>{if(window.confirm('Delete this wanted post?'))action.mutate({name:'delete'})}}>Delete</NeuButton></div>}{(action.isError||respond.isError)&&<p className="form-error" role="alert">{(action.error??respond.error)?.message}</p>}
  </NeuCard></div>
}
