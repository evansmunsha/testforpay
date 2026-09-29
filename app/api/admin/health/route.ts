import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let database: 'healthy' | 'unavailable' = 'unavailable'
  let cronRuns: Array<{
    jobName: string
    status: string
    startedAt: Date
    completedAt: Date | null
    durationMs: number | null
    errorMessage: string | null
  }> = []
  try {
    await prisma.$queryRaw`SELECT 1`
    database = 'healthy'
    cronRuns = await prisma.cronExecution.findMany({
      distinct: ['jobName'],
      orderBy: [{ jobName: 'asc' }, { startedAt: 'desc' }],
      select: {
        jobName: true,
        status: true,
        startedAt: true,
        completedAt: true,
        durationMs: true,
        errorMessage: true,
      },
    })
  } catch (error) {
    console.error('Admin health database or cron history check failed:', error)
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    services: {
      database,
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      stripeWebhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      emailConfigured: Boolean(process.env.RESEND_API_KEY),
      cronAuthConfigured: Boolean(process.env.CRON_SECRET),
    },
    cronRuns,
  })
}