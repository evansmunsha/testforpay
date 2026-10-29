import { BlobNotFoundError, del } from '@vercel/blob'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { finishCronExecution, startCronExecution } from '@/lib/cron-monitor'
import { shouldDeleteVideo, VIDEO_RETENTION_DAYS } from '@/lib/video-rules'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  let cronExecution: Awaited<ReturnType<typeof startCronExecution>> | null = null
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (process.env.NODE_ENV === 'production' && !cronSecret) {
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
    }
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    cronExecution = await startCronExecution('delete-mission-videos')
    const now = new Date()
    const eligibleBefore = new Date(now.getTime() - VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const candidates = await prisma.submissionVideo.findMany({
      where: {
        deletedAt: null,
        application: {
          status: 'COMPLETED',
          testingEndDate: { not: null, lte: eligibleBefore },
          testingPausedAt: null,
          job: { status: 'COMPLETED' },
          issueReports: { none: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } },
        },
      },
      take: 200,
      select: {
        id: true,
        blobPathname: true,
        deletedAt: true,
        application: {
          select: {
            status: true,
            testingEndDate: true,
            testingPausedAt: true,
            job: { select: { status: true } },
            issueReports: {
              where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
              select: { id: true },
            },
          },
        },
      },
    })

    let deleted = 0
    let failed = 0
    for (const video of candidates) {
      if (!shouldDeleteVideo({
        deletedAt: video.deletedAt,
        jobStatus: video.application.job.status,
        applicationStatus: video.application.status,
        testingEndDate: video.application.testingEndDate,
        testingPausedAt: video.application.testingPausedAt,
        hasOpenIssue: video.application.issueReports.length > 0,
      }, now)) {
        continue
      }

      try {
        try {
          await del(video.blobPathname)
        } catch (error) {
          if (!(error instanceof BlobNotFoundError)) throw error
        }
        await prisma.submissionVideo.updateMany({
          where: { id: video.id, deletedAt: null },
          data: { deletedAt: now },
        })
        deleted++
      } catch (error) {
        failed++
        console.error(`Could not delete mission video ${video.id}:`, error)
      }
    }

    await finishCronExecution(
      cronExecution,
      failed > 0 ? 'FAILED' : 'SUCCEEDED',
      failed > 0 ? `${failed} mission video deletion(s) failed` : undefined,
    )
    return NextResponse.json({ success: failed === 0, checked: candidates.length, deleted, failed })
  } catch (error) {
    console.error('Mission video cleanup cron error:', error)
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
