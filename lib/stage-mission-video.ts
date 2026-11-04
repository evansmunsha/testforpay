import { del, head } from '@vercel/blob'
import prisma from '@/lib/prisma'
import { validateVideoMeta } from '@/lib/video-rules'
import { getVideoDurationSeconds } from '@/lib/video-probe'

/**
 * Makes sure an uploaded mission video has a database record.
 * Normally Vercel Blob's upload callback creates it; this covers the case where that callback never arrived.
 * Returns the record id, or null when the file is missing or not a valid video.
 */
export async function ensureStagedMissionVideo(input: {
  applicationId: string
  pathname: string
}): Promise<{ id: string } | null> {
  const existing = await prisma.submissionVideo.findFirst({
    where: {
      applicationId: input.applicationId,
      blobPathname: input.pathname,
      taskSubmissionId: null,
      deletedAt: null,
    },
    select: { id: true },
  })
  if (existing) return existing

  // A record that is already used or deleted must not be recreated.
  const used = await prisma.submissionVideo.findUnique({
    where: { blobPathname: input.pathname },
    select: { id: true },
  })
  if (used) return null

  try {
    const blob = await head(input.pathname)
    const fileValidation = validateVideoMeta({
      contentType: blob.contentType,
      sizeBytes: blob.size,
      durationSeconds: 1,
    })
    if (!fileValidation.ok) throw new Error(fileValidation.error)

    const durationSeconds = await getVideoDurationSeconds(input.pathname)
    const validation = validateVideoMeta({
      contentType: blob.contentType,
      sizeBytes: blob.size,
      durationSeconds,
    })
    if (!validation.ok) throw new Error(validation.error)

    return await prisma.submissionVideo.create({
      data: {
        applicationId: input.applicationId,
        blobUrl: blob.url,
        blobPathname: blob.pathname,
        contentType: blob.contentType,
        sizeBytes: blob.size,
        durationSeconds: Math.ceil(durationSeconds),
      },
      select: { id: true },
    })
  } catch (error) {
    console.error('Could not stage mission video:', error)
    if (error instanceof Error && !/not\s*found|does not exist/i.test(error.message)) {
      await del(input.pathname).catch(() => undefined)
    }
    return null
  }
}
