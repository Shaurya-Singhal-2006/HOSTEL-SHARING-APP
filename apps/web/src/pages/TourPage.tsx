import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, HeartHandshake, PackagePlus, Search, SkipForward } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../api/client'
import { ME_QUERY_KEY, type CurrentUser, useAuth } from '../auth/AuthProvider'
import { NeuButton, NeuCard } from '../components/ui'

const steps = [
  { title: 'List what you own', description: 'Add a photo or use the item icon. Neighbours can find it when they need it.', icon: PackagePlus, action: 'You can add an item any time' },
  { title: 'Borrow what you need', description: 'Check what is available nearby and ask the owner for a few days.', icon: Search, action: 'Agree on pickup and return together' },
  { title: 'Ask the hostel if nobody has it', description: 'Post on Wanted. Someone down the hall may have exactly what you need.', icon: HeartHandshake, action: 'You can respond when you can help' },
]

export default function TourPage() {
  const { user } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const replay = new URLSearchParams(location.search).get('replay') === '1'
  if (!user) return null
  if (user.onboardingTourCompleted && !replay) return <main className="tour-screen"><p>You’ve already seen the tour.</p><Link className="neu-button" to="/">Go to LendLoop</Link></main>

  async function finish() {
    setBusy(true); setError('')
    try {
      const result = await apiRequest<{ user: CurrentUser }>('/api/me', { method: 'PATCH', body: { onboardingTourCompleted: true } })
      queryClient.setQueryData(ME_QUERY_KEY, result.user)
      navigate('/', { replace: true })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save your progress. Try again.') }
    finally { setBusy(false) }
  }

  const current = steps[step]
  const Icon = current.icon
  return <main className="tour-screen">
    <header className="tour-header"><Link className="brand" to="/" aria-label="LendLoop"><span className="brand__glyph"><span/><span/></span><span>Lend<span className="brand__accent">Loop</span></span></Link><button type="button" className="tour-skip" onClick={() => void finish()} disabled={busy}><SkipForward size={16}/>Skip tour</button></header>
    <section className="tour-content" aria-label="Getting started tour">
      <div className="tour-progress" role="group" aria-label={`Step ${step + 1} of 3`}>{steps.map((item,index)=><span key={item.title} className={index===step?'is-current':index<step?'is-done':''}><i>{index+1}</i><span>{item.title}</span></span>)}</div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} className="tour-motion" initial={reduceMotion?false:{opacity:0,x:28}} animate={{opacity:1,x:0}} exit={reduceMotion?undefined:{opacity:0,x:-22}} transition={{duration:reduceMotion?0:.22,ease:'easeOut'}} drag={reduceMotion?false:'x'} dragConstraints={{left:0,right:0}} dragElastic={.16} onDragEnd={(_,info)=>{if(info.offset.x < -70) setStep(value=>Math.min(2,value+1));if(info.offset.x > 70) setStep(value=>Math.max(0,value-1))}}>
          <NeuCard className="tour-card"><span className="tour-icon"><Icon size={34} strokeWidth={1.6}/></span><p className="tour-step-label">STEP {step+1} OF 3</p><h1>{current.title}</h1><p className="tour-copy">{current.description}</p><p className="tour-hint">{current.action}</p><div className="tour-card__actions">{step>0&&<NeuButton onClick={()=>setStep(value=>Math.max(0,value-1))} icon={<ArrowLeft size={15}/>}>Back</NeuButton>}{step<2?<NeuButton variant="primary" onClick={()=>setStep(value=>Math.min(2,value+1))} icon={<ArrowRight size={15}/>}>Next</NeuButton>:<NeuButton variant="primary" disabled={busy} onClick={()=>void finish()}>{busy?'Saving…':'Let’s go'}</NeuButton>}</div>{error&&<p role="alert" className="form-error">{error}</p>}<p className="tour-swipe-hint">Swipe to move between steps, or use the buttons.</p></NeuCard>
        </motion.div>
      </AnimatePresence>
    </section>
  </main>
}
