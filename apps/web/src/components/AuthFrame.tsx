import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { NeuCard } from './ui'

export default function AuthFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="auth-screen">
    <div className="auth-glow auth-glow--one" aria-hidden="true" />
    <div className="auth-glow auth-glow--two" aria-hidden="true" />
    <div className="auth-wrap">
      <Link className="auth-brand" to="/design" aria-label="LendLoop design preview">
        <span className="brand-mark" aria-hidden="true"><span /><span /></span>
        <span>Lend<span>Loop</span></span>
      </Link>
      <NeuCard className="auth-card">
        <h1>{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
      </NeuCard>
      <p className="auth-footnote">Borrow a little. Share a lot.</p>
    </div>
  </main>
}
