import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useState } from 'react'
import { Home, Plus, UserRound, ClipboardList, HeartHandshake, X } from 'lucide-react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

type Classed = { className?: string }

export function NeuCard({ children, className = '', as: Tag = 'section' }: Classed & { children: ReactNode; as?: 'section' | 'article' | 'div' }) {
  return <Tag className={`neu-card ${className}`}>{children}</Tag>
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet'; icon?: ReactNode }
export function NeuButton({ children, variant = 'quiet', icon, className = '', ...props }: ButtonProps) {
  return <button className={`neu-button neu-button--${variant} ${className}`} {...props}>{icon}{children}</button>
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }
export function NeuInput({ label, hint, error, id, className = '', ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`
  return <div className="field">
    <label className="field__label" htmlFor={inputId}>{label}</label>
    <input id={inputId} className={`neu-input ${error ? 'neu-input--error' : ''} ${className}`} aria-invalid={Boolean(error)} aria-describedby={hint || error ? messageId : undefined} {...props} />
    {(hint || error) && <span className={`field__message ${error ? 'field__message--error' : ''}`} id={messageId}>{error ?? hint}</span>}
  </div>
}

export function NeuToggle({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" className="toggle-row" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} disabled={disabled}>
    <span className="toggle-row__label">{label}</span><span className={`neu-toggle ${checked ? 'is-on' : ''}`} aria-hidden="true"><span /></span>
  </button>
}

export function NeuChip({ children, selected = false, onClick, className = '' }: Classed & { children: ReactNode; selected?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={`neu-chip ${selected ? 'is-selected' : ''} ${className}`}>{children}</button>
}

export function NeuModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])
  return <AnimatePresence>
    {open && <motion.div className="modal-backdrop" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <motion.section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title" initial={reduceMotion ? false : { y: 14, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8, scale: .98 }} transition={{ duration: .18 }}>
        <div className="modal-panel__header"><h3 id="modal-title">{title}</h3><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
        {children}
      </motion.section>
    </motion.div>}
  </AnimatePresence>
}

export function NeuBottomNav({ active = 'Home' }: { active?: string }) {
  const links = [
    { name: 'Home', icon: Home, href: '#home' },
    { name: 'Wanted', icon: HeartHandshake, href: '#wanted' },
    { name: 'Add item', icon: Plus, href: '#add' },
    { name: 'Requests', icon: ClipboardList, href: '#requests' },
    { name: 'Profile', icon: UserRound, href: '#profile' },
  ]
  return <nav className="app-nav" aria-label="Main navigation">
    {links.map(({ name, icon: Icon, href }) => <a key={name} href={href} className={`app-nav__link ${active === name ? 'is-active' : ''}`} aria-current={active === name ? 'page' : undefined}>
      <Icon size={19} strokeWidth={1.8} /><span>{name}</span>
    </a>)}
  </nav>
}

export function NeuAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('')
  return <span className={`neu-avatar neu-avatar--${size}`} aria-label={name} role="img">{initials}</span>
}

export function NeuBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return <span className={`neu-badge neu-badge--${tone}`}><span className="neu-badge__dot" aria-hidden="true" />{children}</span>
}

export function NeuSkeleton({ className = '', label = 'Loading' }: Classed & { label?: string }) {
  return <span className={`neu-skeleton ${className}`} role="status"><span className="sr-only">{label}</span></span>
}

export function NeuEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-state__mark" aria-hidden="true"><HeartHandshake size={22} /></span><h3>{title}</h3><p>{description}</p>{action}</div>
}

export function useDemoDialog() {
  const [open, setOpen] = useState(false)
  return { open, setOpen }
}
