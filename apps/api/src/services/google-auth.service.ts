import { OAuth2Client } from 'google-auth-library'
import { env } from '../config/env.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'

const redirectUri = new URL('/api/auth/google/callback', env.API_ORIGIN).toString()
export const googleOAuthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri)

export type GoogleIdentity = {
  googleId: string
  email: string
  name: string
  avatarUrl: string | null
}

function safeAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'lh3.googleusercontent.com' ? url.toString() : null
  } catch {
    return null
  }
}

export async function findOrCreateGoogleUser(identity: GoogleIdentity) {
  const avatarUrl = safeAvatarUrl(identity.avatarUrl)
  const byGoogleId = await prisma.user.findUnique({ where: { googleId: identity.googleId } })
  if (byGoogleId) {
    return prisma.user.update({ where: { id: byGoogleId.id }, data: { avatarUrl } })
  }

  const byEmail = await prisma.user.findUnique({ where: { email: identity.email } })
  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== identity.googleId) {
      throw new HttpError(409, 'This email is already linked to another Google account.')
    }
    return prisma.user.update({ where: { id: byEmail.id }, data: { googleId: identity.googleId, avatarUrl } })
  }

  const community = await prisma.community.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!community) throw new HttpError(503, 'No community is set up yet. Please try again later.')
  return prisma.user.create({
    data: {
      communityId: community.id,
      googleId: identity.googleId,
      email: identity.email,
      name: identity.name || identity.email.split('@')[0] || 'New member',
      avatarUrl,
      joinedHostel: false,
    },
  })
}

export function toCurrentUser(user: {
  id: string
  communityId: string
  name: string
  email: string
  avatarUrl: string | null
  joinedHostel: boolean
  floor: number | null
  room: string | null
  phone: string | null
  trustScore: number
    onboardingTourCompleted: boolean
}) {
  const profileComplete = Boolean(user.name.trim() && user.floor !== null && /^[A-Z][0-9]{1,3}$/.test(user.room?.trim().toUpperCase() ?? ''))
  return {
    id: user.id,
    communityId: user.communityId,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    joinedHostel: user.joinedHostel,
    floor: user.floor,
    room: user.room,
    phone: user.phone,
    trustScore: user.trustScore,
    onboardingTourCompleted: user.onboardingTourCompleted,
    profileComplete,
  }
}
