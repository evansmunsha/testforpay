export const VIDEO_MAX_BYTES = 100 * 1024 * 1024
export const VIDEO_MAX_SECONDS = 120
export const VIDEO_RETENTION_DAYS = 14
export const VIDEO_ALLOWED_TYPES = ['video/mp4', 'video/quicktime'] as const
// Unattached uploads get time to be submitted; files with no database row get a short grace for the upload callback.
export const STAGED_VIDEO_GRACE_HOURS = 48
export const ORPHAN_BLOB_GRACE_HOURS = 24
export const VIDEO_BLOB_PREFIX = 'mission-videos/'

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

/** A staged upload was never attached to a submission and is older than the grace period. */
export function isAbandonedStagedVideo(
  video: { taskSubmissionId: string | null; deletedAt: Date | null; createdAt: Date },
  now: Date,
): boolean {
  if (video.taskSubmissionId || video.deletedAt) return false
  return now.getTime() - video.createdAt.getTime() >= STAGED_VIDEO_GRACE_HOURS * HOUR_MS
}

/** A stored file that no database row knows about, past the grace period. Only our own prefix is ever touched. */
export function isOrphanBlob(
  blob: { pathname: string; uploadedAt: Date },
  knownPathnames: ReadonlySet<string>,
  now: Date,
): boolean {
  if (!blob.pathname.startsWith(VIDEO_BLOB_PREFIX) || blob.pathname.includes('..')) return false
  if (knownPathnames.has(blob.pathname)) return false
  return now.getTime() - blob.uploadedAt.getTime() >= ORPHAN_BLOB_GRACE_HOURS * HOUR_MS
}

export function validateVideoMeta(meta: { contentType: unknown; sizeBytes: unknown; durationSeconds: unknown }):
  | { ok: true }
  | { ok: false; error: string } {
  if (!VIDEO_ALLOWED_TYPES.includes(meta.contentType as (typeof VIDEO_ALLOWED_TYPES)[number])) {
    return { ok: false, error: 'Only mp4 and mov videos are allowed' }
  }
  const size = meta.sizeBytes
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return { ok: false, error: 'Invalid video size' }
  if (size > VIDEO_MAX_BYTES) return { ok: false, error: 'Video must be 100 MB or smaller' }
  const seconds = meta.durationSeconds
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return { ok: false, error: 'Invalid video length' }
  if (seconds > VIDEO_MAX_SECONDS) return { ok: false, error: 'Video must be 2 minutes or shorter' }
  return { ok: true }
}

/** Folder a tester may upload into. The server rejects any other path. */
export function videoPathPrefix(testerId: string, taskId: string) {
  return `mission-videos/${testerId}/${taskId}/`
}

export function isAllowedVideoPath(pathname: string, testerId: string, taskId: string) {
  return pathname.startsWith(videoPathPrefix(testerId, taskId)) && !pathname.includes('..')
}

/** The exact moment the file will be removed: 14 days after testing ended. Null while the end is unknown. */
export function getVideoDeleteAfter(testingEndDate: Date | null): Date | null {
  if (!testingEndDate) return null
  return new Date(testingEndDate.getTime() + VIDEO_RETENTION_DAYS * DAY_MS)
}

export interface VideoDeletionContext {
  deletedAt: Date | null
  jobStatus: string
  applicationStatus: string
  testingEndDate: Date | null
  testingPausedAt: Date | null
  hasOpenIssue: boolean
}

/**
 * A video is deleted only when its testing is finished, nothing is paused or in dispute,
 * and 14 days have passed. Anything else is kept, so the job is never cut short by a mistake.
 */
export function shouldDeleteVideo(ctx: VideoDeletionContext, now: Date): boolean {
  if (ctx.deletedAt) return false
  if (ctx.jobStatus !== 'COMPLETED') return false
  if (ctx.applicationStatus !== 'COMPLETED') return false
  if (ctx.testingPausedAt || ctx.hasOpenIssue) return false
  const deleteAfter = getVideoDeleteAfter(ctx.testingEndDate)
  return !!deleteAfter && deleteAfter.getTime() <= now.getTime()
}
