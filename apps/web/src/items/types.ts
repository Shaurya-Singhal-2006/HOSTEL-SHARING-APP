export type ItemPhoto = { path: string; url: string; thumbnailUrl: string }
export type ItemOwner = {
  id: string
  name: string
  floor: number | null
  room: string | null
  avatarUrl: string | null
  trustScore: number
}
export type ItemRecord = {
  id: string
  communityId: string
  ownerId: string
  title: string
  description: string
  category: string
  condition: 'New' | 'Good' | 'Used'
  photos: ItemPhoto[]
  status: 'available' | 'lent' | 'hidden'
  maxLendDays: number
  createdAt: string
  owner: ItemOwner
  isOwner: boolean
}
export type ItemListResponse = {
  items: ItemRecord[]
  pagination: { page: number; pageSize: number; total: number; hasMore: boolean }
}
export const ITEM_CATEGORIES = ['Tools', 'Electronics', 'Kitchen', 'Cleaning', 'Study', 'Sports', 'Clothing/Laundry', 'Other'] as const
