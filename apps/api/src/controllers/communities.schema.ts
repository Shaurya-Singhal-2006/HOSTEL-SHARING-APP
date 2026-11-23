import { CommunityJoinMode, CommunityType } from '@prisma/client'
import { z } from 'zod'
import { sanitizeText } from '../services/item.service.js'

const text = (min: number, max: number) => z.string().transform(sanitizeText).pipe(z.string().min(min).max(max))
export const communityIdSchema = z.string().uuid()
export const createCommunitySchema = z.object({
  name: text(2, 80), type: z.nativeEnum(CommunityType), description: z.string().max(500).optional().transform((value) => value ? sanitizeText(value) : null),
  labels: z.object({ level1: z.string().max(30).optional(), level2: z.string().max(30).optional() }).optional(),
  level1Options: z.array(z.string().trim().min(1).max(40)).max(50).optional(),
  joinMode: z.nativeEnum(CommunityJoinMode).default('open_with_code'), icon: z.string().max(40).optional(), accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
}).strict()
export const joinCommunitySchema = z.object({ inviteCode: z.string().trim().min(1).max(32), level1: z.string().trim().max(40).optional(), level2: z.string().trim().max(10).optional(), acceptGuidelines: z.literal(true) }).strict()
export const communityProfileSchema = z.object({ level1: z.string().trim().max(40).nullable().optional(), level2: z.string().trim().max(10).nullable().optional() }).strict().refine((value) => Object.keys(value).length > 0)
export const updateCommunitySchema = z.object({ name: text(2, 80).optional(), description: z.string().max(500).nullable().optional().transform((value) => typeof value === 'string' ? sanitizeText(value) : value), joinMode: z.nativeEnum(CommunityJoinMode).optional(), level1Label: z.string().trim().min(1).max(30).optional(), level2Label: z.string().trim().min(1).max(30).optional(), level1Options: z.array(z.string().trim().min(1).max(40)).max(50).optional(), icon: z.string().max(40).nullable().optional(), accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional() }).strict()
