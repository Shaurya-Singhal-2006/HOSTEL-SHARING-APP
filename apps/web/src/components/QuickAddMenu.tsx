import { useState } from 'react'
import { HeartHandshake, Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function QuickAddMenu() {
  const [open, setOpen] = useState(false)
  return <div className="quick-add-menu">
    {open && <div className="quick-add-menu__panel" aria-label="Create something">
      <Link to="/items/new" onClick={() => setOpen(false)}><Plus size={17} />Share an item</Link>
      <Link to="/wanted" state={{ openCreate: true }} onClick={() => setOpen(false)}><HeartHandshake size={17} />Ask for something</Link>
    </div>}
    <button type="button" className="quick-add-menu__trigger" aria-expanded={open} aria-label={open ? 'Close create menu' : 'Create something'} onClick={() => setOpen((value) => !value)}>
      {open ? <X size={21} /> : <Plus size={21} />}<span>{open ? 'Close' : 'Add'}</span>
    </button>
  </div>
}
