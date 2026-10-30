import { BlobNotFoundError, del, list } from '@vercel/blob'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { finishCronExecution, startCronExecution } from '@/lib/cron-monitor'
import {
  isAbandonedStagedVideo,
  isOrphanBlob,
  ORPHAN_BLOB_GRACE_HOURS,
  shouldDeleteVideo,
  STAGED_VIDEO_GRACE_HOURS,
  VIDEO_BLOB_PREFIX,
  VIDEO_RETENTION_DAYS,
} from '@/lib/video-rules'

export const runtime = 'nodejs'

// Caps the file scan so one run stays fast; the next night continues from the start, so old leftovers still get found.
const ORPHAN_SCAN_MAX_PAGES = 5

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

    // Cleanup 1: uploads that were never attached to a submission. The row is removed so the same path can be uploaded again.
    let abandonedStaged = 0
    const stagedCutoff = new Date(now.getTime() - STAGED_VIDEO_GRACE_HOURS * 60 * 60 * 1000)
    const stagedCandidates = await prisma.submissionVideo.findMany({
      where: { taskSubmissionId: null, deletedAt: null, createdAt: { lte: stagedCutoff } },
      take: 200,
      select: { id: true, blobPathname: true, taskSubmissionId: true, deletedAt: true, createdAt: true },
    })
    for (const staged of stagedCandidates) {
      if (!isAbandonedStagedVideo(staged, now)) continue
      try {
        try {
          await del(staged.blobPathname)
        } catch (error) {
          if (!(error instanceof BlobNotFoundError)) throw error
        }
        await prisma.submissionVideo.deleteMany({ where: { id: staged.id, taskSubmissionId: null } })
        abandonedStaged++
      } catch (error) {
        failed++
        console.error(`Could not remove abandoned staged video ${staged.id}:`, error)
      }
    }

    // Cleanup 2: stored files with no database row at all (for example the upload callback never arrived).
    let orphanBlobs = 0
    let cursor: string | undefined
    for (let page = 0; page < ORPHAN_SCAN_MAX_PAGES; page++) {
      const listing = await list({ prefix: VIDEO_BLOB_PREFIX, limit: 1000, cursor })
      const rows = await prisma.submissionVideo.findMany({
        where: { blobPathname: { in: listing.blobs.map((blob) => blob.pathname) }, deletedAt: null },
        select: { blobPathname: true },
      })
      const known = new Set(rows.map((row) => row.blobPathname))
      for (const blob of listing.blobs) {
        if (!isOrphanBlob({ pathname: blob.pathname, uploadedAt: new Date(blob.uploadedAt) }, known, now)) continue
        try {
          await del(blob.pathname)
          orphanBlobs++
        } catch (error) {
          failed++
          console.error(`Could not remove orphan mission video file ${blob.pathname}:`, error)
        }
      }
      if (!listing.hasMore) break
      cursor = listing.cursor
    }

    await finishCronExecution(
      cronExecution,
      failed > 0 ? 'FAILED' : 'SUCCEEDED',
      failed > 0 ? `${failed} mission video deletion(s) failed` : undefined,
    )
    return NextResponse.json({ success: failed === 0, checked: candidates.length, deleted, failed, abandonedStaged, orphanBlobs })
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
