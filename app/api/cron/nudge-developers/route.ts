import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendDeveloperNudgeEmail } from '@/lib/email'
import { finishCronExecution, startCronExecution } from '@/lib/cron-monitor'

// Runs daily — finds developers who signed up 48h ago and haven't posted a job yet,
// and sends them a gentle nudge email.
export async function GET(request: Request) {
  let cronExecution: Awaited<ReturnType<typeof startCronExecution>> | null = null
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    cronExecution = await startCronExecution('nudge-developers')

    const now = new Date()
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000)

    // Developers who:
    // - Signed up between 48h and 72h ago (so we only email them once)
    // - Have zero jobs posted
    const developersToNudge = await prisma.user.findMany({
      where: {
        role: 'DEVELOPER',
        suspended: false,
        createdAt: {
          gte: seventyTwoHoursAgo,
          lte: fortyEightHoursAgo,
        },
        developedJobs: { none: {} },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    let sent = 0
    for (const dev of developersToNudge) {
      try {
        await sendDeveloperNudgeEmail(dev.email, { name: dev.name })
        sent++
      } catch (err) {
        console.error(`Failed to send nudge email to ${dev.email}:`, err)
      }
    }

    const failed = developersToNudge.length - sent
    await finishCronExecution(
      cronExecution,
      failed > 0 ? 'FAILED' : 'SUCCEEDED',
      failed > 0 ? `${failed} developer nudge email(s) failed` : undefined,
    )

    console.info(`Developer nudge cron: found ${developersToNudge.length} developers, sent ${sent} emails`)

    return NextResponse.json({
      success: true,
      found: developersToNudge.length,
      sent,
    })
  } catch (error) {
    console.error('Developer nudge cron error:', error)
    if (cronExecution) {
      await finishCronExecution(
        cronExecution,
        'FAILED',
        error instanceof Error ? error.message : 'Unknown error',
      )
    }
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
