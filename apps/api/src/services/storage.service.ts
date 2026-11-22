import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path, { isAbsolute, relative, resolve } from 'node:path'
import express from 'express'
import sharp from 'sharp'
import { env } from '../config/env.js'
import { HttpError } from '../lib/errors.js'
import { prisma } from '../lib/prisma.js'
import { asyncHandler } from '../lib/async-handler.js'

const uploadRoot = resolve(process.cwd(), env.UPLOAD_DIR)
const apiPublicUrl = env.API_PUBLIC_URL.replace(/\/+$/, '')
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function safeImagePath(storedPath: string, thumbnail = false): string {
  const normalized = storedPath.replaceAll('\\', '/')
  const match = /^items\/([0-9a-f-]+)\/([0-9a-f-]+)\.webp$/i.exec(normalized)
  if (!match || !uuidPattern.test(match[1]) || !uuidPattern.test(match[2])) {
    throw new HttpError(400, 'Invalid stored image path.')
  }
  const fileName = thumbnail ? `${match[2]}.thumb.webp` : `${match[2]}.webp`
  const absolutePath = resolve(uploadRoot, 'items', match[1], fileName)
  const pathFromRoot = relative(uploadRoot, absolutePath)
  if (!pathFromRoot || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
    throw new HttpError(400, 'Invalid stored image path.')
  }
  return absolutePath
}

function verifyMagicBytes(buffer: Buffer): boolean {
  const jpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const png = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const webp = buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
  return jpeg || png || webp
}

async function transformImage(buffer: Buffer, width: number, quality: number): Promise<Buffer> {
  return sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width, fit: 'inside', withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toBuffer()
}

export async function saveImage(itemId: string, buffer: Buffer): Promise<string> {
  if (!uuidPattern.test(itemId)) throw new HttpError(400, 'Invalid item identifier.')
  if (!verifyMagicBytes(buffer)) throw new HttpError(400, 'Upload a valid JPEG, PNG, or WebP image.')

  let metadata
  try {
    metadata = await sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 }).metadata()
  } catch {
    throw new HttpError(400, 'The uploaded image could not be read.')
  }
  if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
    throw new HttpError(400, 'Upload a valid JPEG, PNG, or WebP image.')
  }
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > 40_000_000) {
    throw new HttpError(400, 'The image dimensions are too large.')
  }

  const imageId = randomUUID()
  const storedPath = `items/${itemId}/${imageId}.webp`
  const imagePath = safeImagePath(storedPath)
  const thumbnailPath = safeImagePath(storedPath, true)
  await mkdir(path.dirname(imagePath), { recursive: true })
  try {
    const image = await transformImage(buffer, 1200, 82)
    const thumbnail = await transformImage(buffer, 400, 78)
    await writeFile(imagePath, image, { flag: 'wx' })
    try {
      await writeFile(thumbnailPath, thumbnail, { flag: 'wx' })
    } catch (error) {
      await rm(imagePath, { force: true })
      throw error
    }
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, 'The uploaded image could not be processed.')
  }
  return storedPath
}

export async function deleteImage(storedPath: string): Promise<void> {
  await Promise.all([
    rm(safeImagePath(storedPath), { force: true }),
    rm(safeImagePath(storedPath, true), { force: true }),
  ])
}

export async function deleteImages(storedPaths: string[]): Promise<void> {
  await Promise.all(storedPaths.map(deleteImage))
}

export function getPublicUrl(storedPath: string, thumbnail = false): string {
  const safePath = safeImagePath(storedPath, thumbnail)
  const urlPath = relative(uploadRoot, safePath).split(path.sep).map(encodeURIComponent).join('/')
  return `${apiPublicUrl}/uploads/${urlPath}`
}

export const uploadsStatic = express.static(uploadRoot, {
  dotfiles: 'deny',
  index: false,
  fallthrough: true,
  immutable: true,
  maxAge: '365d',
  setHeaders(response) {
    response.setHeader('X-Content-Type-Options', 'nosniff')
  },
})

export const requireItemPhotoMembership: express.RequestHandler = asyncHandler(async (req, _res, next) => {
  const match = /^\/items\/([0-9a-f-]{36})\/([0-9a-f-]{36})(?:\.thumb)?\.webp$/i.exec(req.path)
  if (!match || !req.activeCommunity) throw new HttpError(404, 'Photo not found.')
  const item = await prisma.item.findFirst({ where: { id: match[1], communityId: req.activeCommunity.id, photos: { has: `items/${match[1]}/${match[2]}.webp` }, OR: [{ status: { not: 'hidden' } }, { ownerId: req.currentUser!.id }] }, select: { id: true } })
  if (!item) throw new HttpError(404, 'Photo not found.')
  next()
})
