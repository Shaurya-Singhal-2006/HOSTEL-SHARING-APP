import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { apiRequest } from '../api/client'
import { NeuBadge, NeuModal, NeuSkeleton } from './ui'

type Reputation = { name:string;floor:number|null;thumbsUp:number;thumbsDown:number;trustScore:number;totalCompletedLends:number;totalBorrows:number;badges:string[];recentComments:Array<{comment:string|null;createdAt:string;thumbsUp:boolean;commenter:{name:string;floor:number|null;room:string|null}}> }
export default function ReputationButton({userId,name}:{userId:string;name:string}){
  const [open,setOpen]=useState(false)
  const query=useQuery({queryKey:['reputation',userId],queryFn:async()=> (await apiRequest<{reputation:Reputation}>(`/api/ratings/users/${userId}/reputation`)).reputation})
  return <><span className="reputation-inline"><button type="button" className="reputation-link" onClick={e=>{e.stopPropagation();setOpen(true)}}>{name}</button>{query.data&&<><span className="reputation-inline__score">Trust {query.data.trustScore}</span>{query.data.badges.map(b=><NeuBadge key={b} tone={b==='Reliable'||b==='Top lender'?'success':'neutral'}>{b}</NeuBadge>)}</>}</span><NeuModal open={open} onClose={()=>setOpen(false)} title={`${name} · reputation`}>
    {query.isPending&&<div className="reputation-modal"><NeuSkeleton/><NeuSkeleton/></div>}
    {query.isError&&<p className="form-error" role="alert">Reputation could not load. Please try again.</p>}
    {query.data&&<div className="reputation-modal"><div className="reputation-score"><strong>{query.data.trustScore}</strong><span>trust score</span></div><div className="reputation-counts"><span><ThumbsUp size={15}/>{query.data.thumbsUp} up</span><span><ThumbsDown size={15}/>{query.data.thumbsDown} down</span><span>{query.data.totalCompletedLends} lends</span><span>{query.data.totalBorrows} borrows</span></div><div className="reputation-badges">{query.data.badges.length?query.data.badges.map(b=><NeuBadge key={b} tone={b==='Reliable'||b==='Top lender'?'success':'neutral'}>{b}</NeuBadge>):<NeuBadge>Community member</NeuBadge>}</div><h4>Recent notes</h4>{query.data.recentComments.length?query.data.recentComments.map((item,i)=><div className="reputation-comment" key={`${item.createdAt}-${i}`}><strong>{item.commenter.name}</strong><span>{item.comment}</span></div>):<p className="reputation-muted">No comments yet.</p>}</div>}
  </NeuModal></>
}
