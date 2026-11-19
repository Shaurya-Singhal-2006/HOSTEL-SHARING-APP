import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

if (process.env.NODE_ENV === 'production') {
  throw new Error('The demo seed is disabled in production.')
}

const prisma = new PrismaClient()
const communityId = '00000000-0000-4000-8000-000000000001'
const users = [
  { id: '20000000-0000-4000-8000-000000000001', name: 'Maya Iyer', email: 'maya.demo@example.test', floor: 2, room: 'B16', trustScore: 8 },
  { id: '20000000-0000-4000-8000-000000000002', name: 'Kabir Rao', email: 'kabir.demo@example.test', floor: 0, room: 'D3', trustScore: 5 },
  { id: '20000000-0000-4000-8000-000000000003', name: 'Zoya Khan', email: 'zoya.demo@example.test', floor: 1, room: 'A7', trustScore: 12 },
] as const

const samples = [
  ['Cordless drill machine', 'A compact drill with a full battery and a small set of bits.', 'Tools', 'Good', 2],
  ['Steam iron', 'Lightweight iron with a working spray function.', 'Clothing/Laundry', 'Good', 3],
  ['Extension board', 'Four sockets and a 2 metre cable. Please return it coiled.', 'Electronics', 'Used', 2],
  ['Electric kettle', '1.5 litre kettle, clean and ready to use.', 'Kitchen', 'Good', 2],
  ['Hair dryer', 'Foldable travel dryer with two heat settings.', 'Electronics', 'Good', 2],
  ['Screwdriver set', 'A small precision set for quick repairs.', 'Tools', 'New', 1],
  ['Desk lamp', 'LED lamp with adjustable brightness and USB power.', 'Study', 'Good', 7],
  ['Badminton racquets', 'Pair of racquets with a few shuttlecocks.', 'Sports', 'Used', 1],
  ['Floor mop', 'Microfibre mop with a spare clean pad.', 'Cleaning', 'Good', 2],
  ['Non-stick pan', 'Medium pan, suitable for induction cooktops.', 'Kitchen', 'Good', 2],
  ['Scientific calculator', 'Casio calculator for coursework and exams.', 'Study', 'Good', 5],
  ['Yoga mat', 'Comfortable mat, cleaned after each use.', 'Sports', 'Good', 3],
  ['Laundry basket', 'Foldable mesh hamper that fits under a bed.', 'Clothing/Laundry', 'Used', 2],
  ['USB-C charger', '65W charger with a 1.5 metre cable.', 'Electronics', 'New', 2],
  ['Measuring tape', 'Five metre tape for room and furniture measurements.', 'Tools', 'Good', 1],
] as const

async function main() {
  await prisma.community.upsert({ where: { id: communityId }, update: {}, create: { id: communityId, name: 'LendLoop Hostel' } })
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name, communityId, joinedHostel: true, floor: user.floor, room: user.room, trustScore: user.trustScore },
      create: { ...user, communityId, joinedHostel: true },
    })
  }
  for (const [index, [title, description, category, condition, maxLendDays]] of samples.entries()) {
    const id = `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
    const owner = users[index % users.length]
    await prisma.item.upsert({
      where: { id },
      update: { title, description, category, condition, maxLendDays, ownerId: owner.id, communityId, photos: [], status: 'available' },
      create: { id, title, description, category, condition, maxLendDays, ownerId: owner.id, communityId, photos: [] },
    })
  }
  console.log(`Seeded ${users.length} demo users and ${samples.length} demo listings.`)
}

main().catch((error: unknown) => {
  console.error('Demo seeding failed:', error)
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
