import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, HeartHandshake, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { NeuButton, NeuCard } from '../components/ui'

const faq = [
  { question: 'Is my phone number public?', answer: 'No. Your phone number stays private. It is shared with the other person only after a borrow request is accepted, or with the author of a wanted post that is still open (and the selected helper after it is fulfilled).' },
  { question: 'What if someone doesn’t return my item?', answer: 'Contact them through the accepted request and agree on a return plan. If you still need help, send us a note below so the hostel team can follow up.' },
  { question: 'How is trust score calculated?', answer: 'Trust score is positive ratings minus negative ratings, and it never drops below zero. You can also read recent comments and see completed lends on a member’s reputation card.' },
]

export default function HelpPage() {
  const [message,setMessage]=useState('')
  const feedback=useMutation({mutationFn:()=>apiRequest('/api/feedback',{method:'POST',body:{message}}),onSuccess:()=>setMessage('')})
  return <main className="help-page">
    <Link to="/profile" className="back-link"><ArrowLeft size={16}/>Back to profile</Link>
    <header className="help-heading"><p className="section-kicker">A LITTLE HELP</p><h1>How can we help?</h1><p>Sharing works best when everyone knows what to expect.</p></header>
    <section className="help-faq" aria-label="Frequently asked questions">{faq.map(({question,answer},i)=><details className="help-answer" key={question} open={i===0}><summary><span>{i===0?<LockKeyhole size={18}/>:i===1?<HeartHandshake size={18}/>:<ShieldCheck size={18}/>}</span>{question}</summary><p>{answer}</p></details>)}</section>
    <NeuCard className="help-feedback"><div><h2>Tell us what’s not working</h2><p>We’ll read your note and use it to make LendLoop better. Please don’t include private details.</p></div><form onSubmit={event=>{event.preventDefault();feedback.mutate()}}><label className="field"><span className="field__label">Your message</span><textarea className="neu-textarea" rows={5} minLength={10} maxLength={1000} required value={message} onChange={event=>setMessage(event.target.value)} placeholder="What happened, and what did you expect?"/><span className="field__message">10–1,000 characters</span></label>{feedback.isError&&<p className="form-error" role="alert">{feedback.error.message}</p>}{feedback.isSuccess&&<p className="form-success" role="status">Thanks. Your note has been sent.</p>}<NeuButton variant="primary" type="submit" disabled={feedback.isPending}>{feedback.isPending?'Sending…':'Send note'}</NeuButton></form></NeuCard>
  </main>
}
