import 'dotenv/config'
import { createHash, randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const validCode = new RegExp(`^[${alphabet}]{8}$`)

function codeFromSeed(seed: string): string {
  const bytes = createHash('sha256').update(seed).digest()
  return Array.from(bytes.subarray(0, 8), (byte) => alphabet[byte & 31]).join('')
}

function randomCode(): string {
  return Array.from(randomBytes(8), (byte) => alphabet[byte & 31]).join('')
}

async function main() {
  const legacyCode = process.env.HOSTEL_INVITE_CODE?.trim()
  const useLegacyCode = Boolean(legacyCode && !legacyCode.toLowerCase().startsWith('change-this-'))
  let inviteCode = useLegacyCode
    ? validCode.test(legacyCode!.toUpperCase()) ? legacyCode!.toUpperCase() : codeFromSeed(legacyCode!)
    : randomCode()

  const seedCommunity = await prisma.community.findFirst({ where: { name: 'My Community', inviteCode: 'LENDLEND' } })
  if (!seedCommunity) {
    console.log('No pending legacy community invite code to seed.')
    return
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const collision = await prisma.community.findUnique({ where: { inviteCode } })
    if (!collision || collision.id === seedCommunity.id) break
    inviteCode = randomCode()
  }

  await prisma.community.update({ where: { id: seedCommunity.id }, data: { inviteCode } })
  console.log(useLegacyCode ? 'Seeded the legacy invite code for My Community.' : 'Generated a new invite code for My Community.')
}

main().catch((error: unknown) => {
  console.error('Legacy community invite-code seeding failed:', error)
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
