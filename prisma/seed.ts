import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from '../lib/auth'
import 'dotenv/config'


const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

const prisma = new PrismaClient({ adapter });

async function main() {
  // Create test users
  const developerPassword = await hashPassword('password123')
  const testerPassword = await hashPassword('password123')

  const developer = await prisma.user.create({
    data: {
      email: 'developer@test.com',
      password: developerPassword,
      name: 'John Developer',
      role: 'DEVELOPER',
      emailVerified: true,
    },
  })

  const tester = await prisma.user.create({
    data: {
      email: 'tester@test.com',
      password: testerPassword,
      name: 'Jane Tester',
      role: 'TESTER',
      emailVerified: true,
      deviceInfo: {
        create: {
          deviceModel: 'Samsung Galaxy S23',
          androidVersion: '14',
          screenSize: '6.1 inches',
        },
      },
    },
  })

  // Create test job
  await prisma.testingJob.create({
    data: {
      developerId: developer.id,
      appName: 'Test App',
      appDescription: 'This is a test app for testing purposes',
      googlePlayLink: 'https://play.google.com/store/apps/test',
      testersNeeded: 20,
      testDuration: 14,
      paymentPerTester: 10,
      totalBudget: 200,
      platformFee: 30,
      status: 'ACTIVE',
      publishedAt: new Date(),
    },
  })

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })