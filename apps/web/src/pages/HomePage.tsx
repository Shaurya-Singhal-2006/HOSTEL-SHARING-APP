import { useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ArrowRight, HeartHandshake, PackagePlus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client'
import ItemCard from '../components/ItemCard'
import { NeuButton, NeuCard, NeuChip, NeuEmptyState, NeuSkeleton, NeuToggle } from '../components/ui'
import type { ItemListResponse } from '../items/types'
import { ITEM_CATEGORIES } from '../items/types'
import { useQuery } from '@tanstack/react-query'
import type { ItemRecord } from '../items/types'
import { useCommunity } from '../auth/CommunityProvider'

export default function HomePage() {
  const { active } = useCommunity()
  const communityId = active?.id ?? null
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [category, setCategory] = useState('All items')
  const [available, setAvailable] = useState(false)
  const [floor, setFloor] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const filters = useMemo(() => ({ debouncedSearch, category, available, floor }), [debouncedSearch, category, available, floor])
  const itemsQuery = useInfiniteQuery({
    queryKey: ['items', 'browse', filters, communityId],
    enabled: Boolean(communityId),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam) })
      if (filters.debouncedSearch) params.set('search', filters.debouncedSearch)
      if (filters.category !== 'All items') params.set('category', filters.category)
      if (filters.available) params.set('available', 'true')
      if (filters.floor) params.set('floor', filters.floor)
      return apiRequest<ItemListResponse>(`/api/items?${params.toString()}`)
    },
    getNextPageParam: (lastPage) => lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
  })
  const items = itemsQuery.data?.pages.flatMap((page) => page.items) ?? []
  const popularQuery = useQuery({ queryKey: ['items', 'popular', communityId], enabled: Boolean(communityId), queryFn: () => apiRequest<{items:Array<ItemRecord & {requestCount:number}>}>('/api/items/popular') })
  const hasBrowseFilter=Boolean(debouncedSearch||category!=='All items'||available||floor)

  return <>
    <section className="home-quick-actions" aria-label="Quick actions">
      <a href="#browse-controls" className="quick-action"><span><Search size={21}/></span><strong>Find something</strong><small>See what’s on the shelf</small><ArrowRight size={15}/></a>
      <Link to="/items/new" className="quick-action"><span><PackagePlus size={21}/></span><strong>List something</strong><small>Share an item with neighbours</small><ArrowRight size={15}/></Link>
      <Link to="/wanted" className="quick-action"><span><HeartHandshake size={21}/></span><strong>Ask the hostel</strong><small>Post what you’re looking for</small><ArrowRight size={15}/></Link>
    </section>
    <section className="home-hero">
      <div><p className="page-overline">YOUR HOSTEL, A LITTLE CLOSER</p><h1>Borrow a little.<br /><span>Share a lot.</span></h1><p>Find the useful things already living just down the hall.</p></div>
      <div className="home-hero__art" aria-hidden="true"><span /><span /><span><Search size={24} /></span></div>
    </section>

    <details className="how-it-works"><summary>New here? Here’s how sharing works</summary><div><span><strong>1. List it</strong> Add an item you’re happy to share.</span><span><strong>2. Borrow it</strong> Ask a neighbour and agree on pickup.</span><span><strong>3. Return it</strong> Bring it back on the agreed date.</span></div></details>

    <section id="browse-controls" className="browse-controls" aria-label="Find something to borrow">
      <label className="browse-search"><Search size={20} /><span className="sr-only">Search items</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tools, kitchen, electronics…" maxLength={100} /></label>
      <div className="browse-controls__filters">
        <NeuToggle checked={available} onChange={setAvailable} label="Available now" />
        <label className="filter-select"><span className="sr-only">Filter by floor</span><select className="neu-select" value={floor} onChange={(event) => setFloor(event.target.value)}><option value="">All floors</option>{[0, 1, 2, 3, 4, 5].map((value) => <option value={value} key={value}>{value === 0 ? 'Basement' : `Floor ${value}`}</option>)}</select></label>
      </div>
    </section>

    <section className="popular-section" aria-labelledby="popular-heading"><div className="section-heading"><div><h2 id="popular-heading">Popular this week</h2><p>Items neighbours have asked for most.</p></div></div>
      {popularQuery.isPending&&<div className="listing-grid">{[0,1,2].map((v)=><NeuCard className="listing-card listing-card--loading" key={v}><NeuSkeleton className="listing-card__skeleton-photo"/><NeuSkeleton/></NeuCard>)}</div>}
      {popularQuery.isError&&<div className="quiet-status" role="status">Popular items couldn’t load. <button type="button" className="text-link" onClick={()=>void popularQuery.refetch()}>Try again</button></div>}
      {popularQuery.data?.items.length===0&&<NeuEmptyState title="No popular picks yet" description="As neighbours borrow, their most requested items will show up here." action={<a href="#browse-controls" className="text-link">Browse items <ArrowRight size={15}/></a>}/>}
      {!!popularQuery.data?.items.length&&<div className="listing-grid">{popularQuery.data.items.map(item=><div className="popular-item" key={item.id}><ItemCard item={item}/><span>{item.requestCount} {item.requestCount===1?'request':'requests'} this week</span></div>)}</div>}
    </section>

    <section className="home-listings" aria-labelledby="listings-heading">
      <div className="section-heading"><div><p className="section-kicker">SHARED AROUND THE HOSTEL</p><h2 id="listings-heading">On the shelf</h2></div><Link to="/my-items" className="text-link">My items <ArrowRight size={15} /></Link></div>
      <div className="category-row" aria-label="Filter by category">
        {['All items', ...ITEM_CATEGORIES].map((value) => <NeuChip key={value} selected={category === value} onClick={() => setCategory(value)}>{value}</NeuChip>)}
      </div>

      {itemsQuery.isPending && <div className="listing-grid" aria-label="Loading listings">{Array.from({ length: 6 }, (_, index) => <LoadingCard key={index} />)}</div>}
      {itemsQuery.isError && <NeuCard className="state-panel"><h2>We couldn’t load listings</h2><p>{itemsQuery.error.message}</p><NeuButton variant="primary" onClick={() => { void itemsQuery.refetch() }}>Try again</NeuButton></NeuCard>}
      {itemsQuery.isSuccess && items.length === 0 && <NeuCard className="state-panel"><NeuEmptyState title={hasBrowseFilter?'No items matched that search':'Nothing here yet'} description={hasBrowseFilter?'Try changing the search or filters.':'Share something useful so your neighbours can borrow it.'} action={hasBrowseFilter?<NeuButton variant="primary" onClick={()=>{setSearch('');setCategory('All items');setAvailable(false);setFloor('')}}>Clear filters</NeuButton>:<Link to="/items/new" className="neu-button neu-button--primary"><PackagePlus size={17} />List an item</Link>} /></NeuCard>}
      {items.length > 0 && <div className="listing-grid">{items.map((item) => <ItemCard item={item} key={item.id} />)}</div>}
      {itemsQuery.hasNextPage && <div className="load-more"><NeuButton onClick={() => { void itemsQuery.fetchNextPage() }} disabled={itemsQuery.isFetchingNextPage}>{itemsQuery.isFetchingNextPage ? 'Loading…' : 'Load more items'}</NeuButton></div>}
      {itemsQuery.isFetching && !itemsQuery.isPending && <p className="quiet-status" role="status">Updating listings…</p>}
    </section>
  </>
}

function LoadingCard() {
  return <NeuCard as="article" className="listing-card listing-card--loading"><NeuSkeleton className="listing-card__skeleton-photo" /><div><NeuSkeleton /><NeuSkeleton /><NeuSkeleton /></div></NeuCard>
}
