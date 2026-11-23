import { useState } from 'react'
import { ArrowUpRight, Check, ChevronRight, Plus, Search, Sparkles, ThumbsUp } from 'lucide-react'
import {
  NeuAvatar, NeuBadge, NeuBottomNav, NeuButton, NeuCard, NeuChip, NeuEmptyState,
  NeuInput, NeuModal, NeuSkeleton, NeuToggle,
} from '../components/ui'
import ThemeToggle from '../components/ThemeToggle'

export default function DesignPage() {
  const [available, setAvailable] = useState(true)
  const [category, setCategory] = useState('All items')
  const [modalOpen, setModalOpen] = useState(false)

  return <div className="design-shell">
    <aside className="design-sidebar">
      <a className="brand" href="#top" aria-label="LendLoop home"><span className="brand__glyph"><span /><span /></span><span>Lend<span className="brand__accent">Loop</span></span></a>
      <p className="sidebar-copy">The little things we share<br />make this place home.</p>
      <NeuBottomNav active="Home" />
      <div className="sidebar-person"><NeuAvatar name="Aarav Mehta" size="sm" /><span><strong>Aarav Mehta</strong><small>Floor 3 · Room C16</small></span><ChevronRight size={16} /></div>
    </aside>

    <main id="top" className="design-main">
      <header className="topbar"><span className="community-label"><span className="community-indicator" />LendLoop Hostel</span><div className="topbar__profile"><ThemeToggle compact /><span>Good afternoon, Aarav</span><NeuAvatar name="Aarav Mehta" /></div></header>

      <section className="welcome-row">
        <div><p className="page-overline">YOUR HOSTEL, A LITTLE CLOSER</p><h1>Borrow a little.<br /><span>Share a lot.</span></h1><p className="welcome-copy">Find the useful things already living just down the hall.</p></div>
        <div className="welcome-art" aria-hidden="true"><span className="orbit orbit--one" /><span className="orbit orbit--two" /><span className="orbit orbit--three" /><span className="art-core"><Sparkles size={25} strokeWidth={1.5} /></span><span className="art-dot art-dot--one" /><span className="art-dot art-dot--two" /></div>
      </section>

      <section className="search-strip" aria-label="Find an item">
        <label className="search-box"><Search size={19} /><span className="sr-only">Search items</span><input placeholder="What are you looking for?" /></label>
        <NeuButton variant="primary" icon={<Search size={17} />}>Find something</NeuButton>
      </section>

      <div className="preview-layout">
        <div className="preview-main-column">
          <section className="specimen-section">
            <div className="section-heading"><div><p className="section-kicker">01 / COMPONENT LIBRARY</p><h2>Surfaces & actions</h2></div><span className="section-count">01—04</span></div>
            <div className="surface-grid">
              <NeuCard className="component-card component-card--buttons"><div className="component-title"><div><span className="component-index">01</span><h3>Buttons</h3></div><span className="component-note">tap to feel</span></div>
                <div className="button-demo"><NeuButton variant="primary" icon={<ArrowUpRight size={17} />}>Primary action</NeuButton><NeuButton>Secondary</NeuButton><NeuButton disabled>Unavailable</NeuButton></div>
              </NeuCard>
              <NeuCard className="component-card"><div className="component-title"><div><span className="component-index">02</span><h3>Inputs</h3></div><span className="component-note">clear labels</span></div>
                <NeuInput label="Search your hostel" placeholder="Try “drill” or “umbrella”" /><div className="input-row"><NeuInput label="Email address" type="email" placeholder="you@example.com" hint="Your Google account email" /><NeuInput label="Room number" defaultValue="C-312" error="Check the room format" /></div>
              </NeuCard>
            </div>
          </section>

          <section className="specimen-section">
            <div className="section-heading"><div><p className="section-kicker">02 / EVERYDAY STATES</p><h2>Small signals, clearly shown</h2></div><span className="section-count">05—08</span></div>
            <NeuCard className="component-card state-card"><div className="component-title"><div><span className="component-index">03</span><h3>Chips & availability</h3></div></div>
              <div className="chips-row">{['All items', 'Study', 'Kitchen', 'Tools', 'Care'].map(item => <NeuChip key={item} selected={category === item} onClick={() => setCategory(item)}>{item}</NeuChip>)}</div>
              <div className="state-controls"><NeuToggle checked={available} onChange={setAvailable} label="Available now" /><span className="state-divider" /><div className="badge-group"><NeuBadge tone="success">Available</NeuBadge><NeuBadge tone="warning">On loan</NeuBadge><NeuBadge tone="danger">Unavailable</NeuBadge></div></div>
            </NeuCard>
          </section>

          <section className="specimen-section">
            <div className="section-heading"><div><p className="section-kicker">03 / PEOPLE & FEEDBACK</p><h2>Trust, at a glance</h2></div><span className="section-count">09—10</span></div>
            <NeuCard className="component-card trust-card"><div className="person-sample"><NeuAvatar name="Mira Kapoor" size="lg" /><div><h3>Mira Kapoor</h3><p>Floor 2 · Room B16</p><div className="trust-line"><span className="trust-icon"><ThumbsUp size={13} /></span><span>Good neighbour</span><span className="trust-score">+8</span></div></div></div><div className="trust-quote"><span className="quote-mark">“</span><p>Picked up right on time. Really appreciated it!</p><small>RETURNED · 2 DAYS AGO</small></div></NeuCard>
          </section>
        </div>

        <aside className="preview-rail">
          <section className="rail-section"><div className="rail-heading"><h2>On the shelf</h2><a href="#components">Browse all <ArrowUpRight size={14} /></a></div>
            <NeuCard className="item-preview"><div className="item-visual" aria-label="Illustrated outline of a cordless drill"><div className="drill-shape"><span className="drill-bit" /><span className="drill-body" /><span className="drill-handle" /><span className="drill-grip" /></div><span className="visual-caption">TOOLS · 01</span></div><div className="item-copy"><div className="item-topline"><NeuBadge tone="success">Available</NeuBadge><button className="icon-button favorite-button" aria-label="Save cordless drill"><span>♡</span></button></div><h3>Cordless drill</h3><p>Great for quick fixes around the room.</p><div className="item-owner"><NeuAvatar name="Rohan Das" size="sm" /><span>Rohan <small>· Floor 3</small></span><span className="item-distance">2 floors away</span></div><NeuButton variant="primary" className="full-button">Ask to borrow <ArrowUpRight size={16} /></NeuButton></div></NeuCard>
          </section>
          <section className="rail-section"><div className="rail-heading"><h2>More components</h2></div>
              <NeuCard className="component-card mini-components"><div className="component-title"><div><span className="component-index">11</span><h3>Loading</h3></div></div><div className="skeleton-row"><NeuSkeleton className="skeleton-thumb" /><div className="skeleton-lines"><NeuSkeleton /><NeuSkeleton className="short" /></div></div><p className="helper-caption">A calm pause while the shelf loads.</p><div className="mini-rule" /><div className="component-title"><div><span className="component-index">12</span><h3>Empty state</h3></div></div><NeuEmptyState title="Nothing here yet" description="Open the dialog preview to see an example." action={<NeuButton variant="primary" icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Preview dialog</NeuButton>} /></NeuCard>
          </section>
          <NeuCard className="modal-demo"><div><p className="section-kicker">13 / FOCUSED MOMENT</p><h3>Dialog</h3><p>For a decision that needs a little focus.</p></div><NeuButton className="modal-trigger" onClick={() => setModalOpen(true)}>Preview dialog <ArrowUpRight size={15} /></NeuButton></NeuCard>
        </aside>
      </div>

      <footer className="page-footer"><span><Check size={14} />Made for the things we pass around.</span><span>DESIGN SYSTEM · PHASE 01</span></footer>
    </main>
    <NeuModal open={modalOpen} onClose={() => setModalOpen(false)} title="A small confirmation">
      <p className="modal-copy">This dialog keeps the same quiet surface while giving one decision your full attention.</p><div className="modal-actions"><NeuButton onClick={() => setModalOpen(false)}>Go back</NeuButton><NeuButton variant="primary" onClick={() => setModalOpen(false)}>Sounds good</NeuButton></div>
    </NeuModal>
    <div className="mobile-nav-wrap"><NeuBottomNav active="Home" /></div>
  </div>
}
