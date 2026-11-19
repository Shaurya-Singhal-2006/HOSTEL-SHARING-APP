import { useEffect, useState, type FormEvent } from 'react'
import type { CurrentUser } from '../auth/AuthProvider'
import { ApiError } from '../api/client'
import { NeuButton, NeuInput } from './ui'

export type ProfileValues = { name: string; block: string; floor: string; room: string; phone: string }

function valuesFromUser(user: CurrentUser): ProfileValues {
  return {
    name: user.name,
    block: user.block ?? '',
    floor: user.floor?.toString() ?? '',
    room: user.room ?? '',
    phone: user.phone ?? '',
  }
}

export default function ProfileEditor({
  user,
  submitLabel,
  onSave,
}: {
  user: CurrentUser
  submitLabel: string
  onSave: (values: ProfileValues) => Promise<void>
}) {
  const [values, setValues] = useState(() => valuesFromUser(user))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setValues(valuesFromUser(user)), [user])

  function update(field: keyof ProfileValues, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSave(values)
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null
      const fieldErrors = apiError?.details ? Object.values(apiError.details).flat().join(' ') : ''
      setError(fieldErrors || apiError?.message || 'Could not save your profile. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return <form className="profile-form" onSubmit={submit}>
    <NeuInput label="Name" value={values.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" required maxLength={80} />
    <div className="profile-form__row">
      <label className="field"><span className="field__label">Block</span>
        <select className="neu-select" value={values.block} onChange={(event) => update('block', event.target.value)} required>
          <option value="" disabled>Select block</option>
          {['A', 'B', 'C', 'D', 'E'].map((block) => <option key={block} value={block}>Block {block}</option>)}
        </select>
      </label>
      <label className="field"><span className="field__label">Floor</span>
        <select className="neu-select" value={values.floor} onChange={(event) => update('floor', event.target.value)} required>
          <option value="" disabled>Select floor</option>
          {[1, 2, 3, 4, 5].map((floor) => <option key={floor} value={floor}>Floor {floor}</option>)}
        </select>
      </label>
    </div>
    <NeuInput label="Room number" value={values.room} onChange={(event) => update('room', event.target.value)} autoComplete="off" required maxLength={30} placeholder="e.g. 312" />
    <NeuInput label="Phone number (optional)" type="tel" value={values.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" maxLength={30} placeholder="Add a number if you want" hint="Private. Only shared after a borrow request is accepted." />
    {error && <p className="auth-error" role="alert">{error}</p>}
    <NeuButton variant="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</NeuButton>
  </form>
}
