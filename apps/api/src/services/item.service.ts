import type { Item, User } from '@prisma/client'
import { getPublicUrl } from './storage.service.js'

export const ITEM_CATEGORIES = [
  'Tools', 'Electronics', 'Kitchen', 'Cleaning', 'Study', 'Sports', 'Clothing/Laundry', 'Other',
] as const

export type PublicOwner = Pick<User, 'id' | 'name' | 'block' | 'floor' | 'avatarUrl' | 'trustScore'>
export type PublicItem = Omit<Item, 'photos'> & {
  photos: { path: string; url: string; thumbnailUrl: string }[]
  owner: PublicOwner
  isOwner: boolean
}

export function serializeItem(item: Item & { owner: PublicOwner }, viewerId: string): PublicItem {
  const { photos, ...otherItem } = item
  return {
    ...otherItem,
    photos: photos.map((photoPath) => ({
      path: photoPath,
      url: getPublicUrl(photoPath),
      thumbnailUrl: getPublicUrl(photoPath, true),
    })),
    owner: item.owner,
    isOwner: item.ownerId === viewerId,
  }
}

export function sanitizeText(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
}
