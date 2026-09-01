// app/api/stats/public/route.ts
// Public endpoint — no auth required. Returns platform stats for landing page social proof.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [testerCount, completedTests, activeJobs, todaySignups] = await Promise.all([
      prisma.user.count({ where: { role: 'TESTER', emailVerified: true } }),
      prisma.application.count({ where: { status: 'COMPLETED' } }),
      prisma.testingJob.count({ where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } } }),
      prisma.user.count({
        where: {
          role: 'TESTER',
          createdAt: { gte: todayStart },
        },
      }),
    ])

    return NextResponse.json(
      { testerCount, completedTests, activeJobs, todaySignups },
      {
        headers: {
          // Cache for 5 minutes — fresh enough for "today" counts, cheap on DB
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    )
  } catch {
    return NextResponse.json(
      { testerCount: 50, completedTests: 0, activeJobs: 0, todaySignups: 0 },
      { status: 200 }
    )
  }
}
