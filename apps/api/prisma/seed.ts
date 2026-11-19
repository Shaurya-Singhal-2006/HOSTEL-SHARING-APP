import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.community.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: { name: 'LendLoop Hostel' },
    create: { id: '00000000-0000-4000-8000-000000000001', name: 'LendLoop Hostel' },
  })
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error)
    await prisma.$disconnect()
    process.exitCode = 1
  })
