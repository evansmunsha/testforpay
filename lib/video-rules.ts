export const VIDEO_MAX_BYTES = 100 * 1024 * 1024
export const VIDEO_MAX_SECONDS = 120
export const VIDEO_RETENTION_DAYS = 14
export const VIDEO_ALLOWED_TYPES = ['video/mp4', 'video/quicktime'] as const

const DAY_MS = 24 * 60 * 60 * 1000

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
