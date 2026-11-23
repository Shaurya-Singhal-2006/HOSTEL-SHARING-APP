import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, Flag, KeyRound, Layers3, LockKeyhole, RotateCcw, ShieldCheck, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { NeuButton, NeuCard } from '../components/ui'

const faq = [
  { question: 'Who can use LendLoop?', icon: UsersRound, answer: <>Anyone with a Google account can sign in. To see listings, join a community with its invite code. <Link to="/start">Go to join setup</Link>.</> },
  { question: 'How do I create a community for my apartment?', icon: Layers3, answer: <>Community creation is not available in the current setup screen yet. Ask a community admin to create it, then join with their invite code. <Link to="/start">Open join setup</Link>.</> },
  { question: 'How do I invite neighbours?', icon: KeyRound, answer: <>An admin can share the community invite code or its join link. Neighbours sign in, open the link, enter the code, and accept the community guidelines.</> },
  { question: 'Can I be in more than one community?', icon: Layers3, answer: <>Yes. Use the community selector in the top bar to switch between communities you have joined. Each one has its own listings and requests.</> },
  { question: 'Is my phone number public?', icon: LockKeyhole, answer: <>No. Your number is private. It is shared only after a borrow request is accepted, or with people who respond to your open Wanted post. Your email is not shown on public listings.</> },
  { question: 'What if someone doesn’t return my item?', icon: RotateCcw, answer: <>Open <Link to="/requests">Requests</Link> and contact the borrower to agree on a return plan. If the problem continues, contact your community admin.</> },
  { question: 'How is the trust score calculated?', icon: ShieldCheck, answer: <>It is positive ratings minus negative ratings, and cannot go below zero. You can see your score and exchange history on <Link to="/profile">your profile</Link>.</> },
  { question: 'How do I report a problem?', icon: Flag, answer: <>For a LendLoop app problem, send us a note below. Member and item report controls are not available in the current screens yet; contact your community admin for help with a member concern.</> },
]

export default function HelpPage() {
  const [message, setMessage] = useState('')
  const feedback = useMutation({ mutationFn: () => apiRequest('/api/feedback', { method: 'POST', body: { message } }), onSuccess: () => setMessage('') })
  return <main className="help-page">
    <Link to="/profile" className="back-link"><ArrowLeft size={16} />Back to profile</Link>
    <header className="help-heading"><p className="section-kicker">A LITTLE HELP</p><h1>How can we help?</h1><p>Quick answers for sharing with your community.</p></header>
    <section className="help-faq" aria-label="Frequently asked questions">{faq.map(({ question, answer, icon: Icon }, index) => <details className="help-answer" key={question} open={index === 0}><summary><span><Icon size={18} /></span>{question}</summary><p>{answer}</p></details>)}</section>
    <NeuCard className="help-feedback"><div><h2>Tell us what’s not working</h2><p>We’ll read your note and use it to improve LendLoop. Please leave out private details.</p></div><form onSubmit={event => { event.preventDefault(); feedback.mutate() }}><label className="field"><span className="field__label">Your message</span><textarea className="neu-textarea" rows={5} minLength={10} maxLength={1000} required value={message} onChange={event => setMessage(event.target.value)} placeholder="What happened, and what did you expect?" /><span className="field__message">10–1,000 characters</span></label>{feedback.isError && <p className="form-error" role="alert">{feedback.error.message}</p>}{feedback.isSuccess && <p className="form-success" role="status">Thanks. Your note has been sent.</p>}<NeuButton variant="primary" type="submit" disabled={feedback.isPending}>{feedback.isPending ? 'Sending…' : 'Send note'}</NeuButton></form></NeuCard>
  </main>
}
