import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ImagePlus, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiUpload, ApiError, apiRequest, communityAssetUrl } from '../api/client'
import { NeuButton, NeuCard, NeuInput, NeuSkeleton } from '../components/ui'
import ItemVisual from '../components/ItemVisual'
import type { ItemRecord } from '../items/types'
import { ITEM_CATEGORIES } from '../items/types'
import { useCommunity } from '../auth/CommunityProvider'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ItemFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { active } = useCommunity()
  const itemQuery = useQuery({
    queryKey: ['item', id, active?.id ?? null],
    queryFn: async () => (await apiRequest<{ item: ItemRecord }>(`/api/items/${id}`)).item,
    enabled: Boolean(id && active?.id),
  })
  const item = itemQuery.data
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>(ITEM_CATEGORIES[0])
  const [condition, setCondition] = useState<'New' | 'Good' | 'Used'>('Good')
  const [maxLendDays, setMaxLendDays] = useState('3')
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([])
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const uploadMutation = useMutation({
    mutationFn: async (body: FormData) => apiUpload<{ item: ItemRecord }>(`/api/items${isEdit ? `/${id}` : ''}`, body, isEdit ? 'PATCH' : 'POST', setProgress),
    onSuccess: async ({ item: savedItem }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['items'] }),
        queryClient.invalidateQueries({ queryKey: ['item', savedItem.id] }),
      ])
      navigate(`/items/${savedItem.id}`, { replace: true })
    },
    onError: (caught) => {
      const apiError = caught instanceof ApiError ? caught : null
      const fieldErrors = apiError?.details ? Object.values(apiError.details).flat().join(' ') : ''
      setError(fieldErrors || apiError?.message || 'Could not save this listing. Try again.')
    },
    onSettled: () => setProgress(null),
  })

  useEffect(() => {
    if (!item) return
    setTitle(item.title)
    setDescription(item.description)
    setCategory(item.category)
    setCondition(item.condition)
    setMaxLendDays(String(item.maxLendDays))
  }, [item])

  const keptPhotos = useMemo(() => (item?.photos ?? []).filter((photo) => !removedPhotos.includes(photo.path)), [item, removedPhotos])
  const newPhotoPreviews = useObjectUrls(newPhotos)
  const photoCount = keptPhotos.length + newPhotos.length

  function addPhotos(fileList: FileList | null) {
    if (!fileList?.length) return
    const incoming = Array.from(fileList)
    if (incoming.some((file) => !ACCEPTED_TYPES.includes(file.type))) {
      setError('Choose JPEG, PNG, or WebP images only.')
      return
    }
    if (incoming.some((file) => file.size > MAX_FILE_BYTES)) {
      setError('Each photo must be 5 MB or smaller.')
      return
    }
    if (photoCount + incoming.length > 3) {
      setError('Choose no more than 3 photos in total.')
      return
    }
    setError('')
    setNewPhotos((photos) => [...photos, ...incoming])
  }

  function removeNewPhoto(index: number) {
    setNewPhotos((photos) => photos.filter((_, photoIndex) => photoIndex !== index))
  }

  function toggleExistingPhoto(path: string) {
    setRemovedPhotos((photos) => photos.includes(path) ? photos.filter((value) => value !== path) : [...photos, path])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (photoCount > 3) {
      setError('Choose no more than 3 photos.')
      return
    }
    const days = Number(maxLendDays)
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setError('Loan period must be from 1 to 365 days.')
      return
    }
    const body = new FormData()
    body.append('title', title)
    body.append('description', description)
    body.append('category', category)
    body.append('condition', condition)
    body.append('max_lend_days', String(days))
    if (isEdit) body.append('remove_photos', JSON.stringify(removedPhotos))
    for (const photo of newPhotos) body.append('photos', photo, photo.name)
    setProgress(0)
    uploadMutation.mutate(body)
  }

  if (isEdit && itemQuery.isPending) return <div className="detail-loading"><NeuSkeleton /><NeuSkeleton className="detail-loading__photo" /><NeuSkeleton /></div>
  if (isEdit && (itemQuery.isError || !item || !item.isOwner)) return <NeuCard className="state-panel"><h1>We couldn’t open this listing</h1><p>{itemQuery.error?.message ?? 'You can only edit your own items.'}</p><Link to="/my-items" className="neu-button neu-button--primary"><ArrowLeft size={16} />My items</Link></NeuCard>

  return <div className="form-page">
    <Link to={isEdit ? `/items/${id}` : '/'} className="back-link"><ArrowLeft size={16} />{isEdit ? 'Back to item' : 'Back to home'}</Link>
    <div className="page-heading"><p className="section-kicker">SHARE WITH YOUR HOSTEL</p><h1>{isEdit ? 'Edit your listing' : 'Add something useful'}</h1><p>{isEdit ? 'Keep the details and photos up to date.' : 'A good photo and a little detail help neighbours borrow with confidence.'}</p></div>
    <NeuCard className="item-form-card">
      <form className="item-form" onSubmit={(event) => { void submit(event) }}>
        <NeuInput label="Item name" value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={100} placeholder="e.g. Electric kettle" hint="Use the name a neighbour would search for." />
        <label className="field"><span className="field__label">Description</span><textarea className="neu-textarea" value={description} onChange={(event) => setDescription(event.target.value)} required minLength={5} maxLength={2000} rows={5} placeholder="What should someone know before borrowing it?" /><span className="field__message">Mention anything they’ll need for pickup or use.</span></label>
        <div className="item-form__row">
          <label className="field"><span className="field__label">Category</span><select className="neu-select" value={category} onChange={(event) => setCategory(event.target.value)}>{ITEM_CATEGORIES.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          <label className="field"><span className="field__label">Condition</span><select className="neu-select" value={condition} onChange={(event) => setCondition(event.target.value as typeof condition)}>{['New', 'Good', 'Used'].map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
        </div>
        <NeuInput label="How long can someone borrow it? (days)" type="number" min={1} max={365} value={maxLendDays} onChange={(event) => setMaxLendDays(event.target.value)} required hint="You can always arrange a different return date together." />
        <div className="photo-field">
          <div className="photo-field__heading"><div><h2>Add a photo (optional)</h2><p>JPEG, PNG or WebP · up to 5 MB each · up to 3 photos</p></div><span>{photoCount}/3</span></div>
          <div className="item-live-preview"><span>Live preview</span><ItemVisual item={{ title, category, photos: [] }} size="compact" /><strong>{title || 'Your item'}</strong></div>
          <div className="photo-previews">
            {keptPhotos.map((photo) => <div className="photo-preview" key={photo.path}><img src={communityAssetUrl(photo.thumbnailUrl)} alt="Current item" /><button type="button" className="photo-preview__remove" aria-label="Remove existing photo" onClick={() => toggleExistingPhoto(photo.path)}><X size={15} /></button></div>)}
            {newPhotoPreviews.map((src, index) => <div className="photo-preview" key={`${newPhotos[index]?.name}-${index}`}><img src={src} alt={`New photo ${index + 1} preview`} /><button type="button" className="photo-preview__remove" aria-label={`Remove selected photo ${index + 1}`} onClick={() => removeNewPhoto(index)}><X size={15} /></button></div>)}
            {photoCount < 3 && <label className="photo-picker"><ImagePlus size={20} /><span>Add photo</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addPhotos(event.target.files); event.currentTarget.value = '' }} /></label>}
          </div>
        </div>
        {progress !== null && <div className="upload-progress" role="status"><span>Uploading photos… {progress}%</span><progress value={progress} max="100" /></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="item-form__actions"><Link to={isEdit ? `/items/${id}` : '/'} className="neu-button">Cancel</Link><NeuButton variant="primary" type="submit" disabled={uploadMutation.isPending}>{uploadMutation.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add item to the shelf'}</NeuButton></div>
      </form>
    </NeuCard>
  </div>
}

function useObjectUrls(files: File[]): string[] {
  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    const next = files.map((file) => URL.createObjectURL(file))
    setUrls(next)
    return () => next.forEach((url) => URL.revokeObjectURL(url))
  }, [files])
  return urls
}
