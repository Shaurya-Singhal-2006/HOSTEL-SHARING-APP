import { useEffect, useState, type FormEvent } from 'react'
import type { CurrentUser } from '../auth/AuthProvider'
import { ApiError } from '../api/client'
import type { CommunityMembership } from '../auth/CommunityProvider'
import { NeuButton, NeuInput } from './ui'

export type ProfileValues = { name: string; floor: string; room: string; phone: string }

function valuesFromUser(user: CurrentUser, community?: CommunityMembership | null): ProfileValues {
  return {
    name: user.name,
    floor: community ? (community.level1Value ?? '') : (user.floor?.toString() ?? ''),
    room: community ? (community.level2Value ?? '') : (user.room ?? ''),
    phone: user.phone ?? '',
  }
}

export default function ProfileEditor({
  user,
  submitLabel,
  onSave,
  community,
}: {
  user: CurrentUser
  submitLabel: string
  onSave: (values: ProfileValues) => Promise<void>
  community?: CommunityMembership | null
}) {
  const [values, setValues] = useState(() => valuesFromUser(user, community))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setValues(valuesFromUser(user, community)), [community, user])

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
    <NeuInput label="Name" value={values.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" required maxLength={80} hint="This is the name neighbours will see." />
    {(community?.level1Label || community?.level2Label) && <div className="profile-form__row">
      {community?.level1Label && <label className="field"><span className="field__label">{community.level1Label}</span>
        {community.level1Options.length ? <select className="neu-select" value={values.floor} onChange={(event) => update('floor', event.target.value)} required><option value="" disabled>Select {community.level1Label.toLowerCase()}</option>{community.level1Options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <NeuInput label="" aria-label={community.level1Label} value={values.floor} onChange={(event) => update('floor', event.target.value)} required maxLength={40} placeholder={`Enter ${community.level1Label.toLowerCase()}`} />}
        <span className="field__message">Helps neighbours find you for pickup.</span>
      </label>}
      {community?.level2Label && <NeuInput label={community.level2Label} value={values.room} onChange={(event) => update('room', event.target.value)} autoComplete="off" required={community.type !== 'office'} maxLength={10} placeholder={`Enter ${community.level2Label.toLowerCase()}`} hint={community.type === 'office' ? 'Optional. Helps colleagues find you.' : 'Helps neighbours find you for pickup.'} />}
    </div>}
    <NeuInput label="Phone number (optional)" type="tel" value={values.phone} onChange={(event) => update('phone', event.target.value)} autoComplete="tel" maxLength={30} placeholder="Add a number if you want" hint="Private. Only shared after a borrow request is accepted." />
    {error && <p className="auth-error" role="alert">{error}</p>}
    <NeuButton variant="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</NeuButton>
  </form>
}
