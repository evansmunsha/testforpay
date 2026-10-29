export const COMMUNITY_LIMITS = {
  titleMax: 120,
  postMax: 2000,
  commentMax: 1000,
  reportReasonMin: 5,
  reportReasonMax: 500,
  modReasonMin: 10,
  posts: { max: 5, windowMs: 60 * 60 * 1000 },
  comments: { max: 20, windowMs: 60 * 60 * 1000 },
  reports: { max: 10, windowMs: 24 * 60 * 60 * 1000 },
  memberCountTtlMs: 10 * 60 * 1000,
} as const

export type CommunityViewer = { userId: string; role: string; suspended?: boolean }
export type CommunityMuteState = { mutedUntil: Date | null } | null
export type CommunityPostKindName = 'POST' | 'ANNOUNCEMENT' | 'JOB'
export type CommunityStatusName = 'VISIBLE' | 'HIDDEN' | 'DELETED'

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
// 10 or more digits, allowing spaces, dots, dashes and brackets between them.
const PHONE_PATTERN = /\+?\d(?:[\s().-]?\d){9,}/

/** Private contact details are not allowed, so people cannot be pulled off the platform or scammed. */
export function containsContactDetails(text: string): boolean {
  return EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text)
}

type Validated = { ok: true; value: string } | { ok: false; error: string }

function validateText(raw: unknown, label: string, max: number, min = 1): Validated {
  if (typeof raw !== 'string') return { ok: false, error: `${label} is required` }
  const value = raw.trim()
  if (value.length < min) return { ok: false, error: `${label} is required` }
  if (value.length > max) return { ok: false, error: `${label} must be ${max} characters or fewer` }
  if (containsContactDetails(value)) {
    return { ok: false, error: 'Please do not share email addresses or phone numbers in the community.' }
  }
  return { ok: true, value }
}

export function validatePostBody(raw: unknown): Validated {
  return validateText(raw, 'Post', COMMUNITY_LIMITS.postMax)
}

export function validateCommentBody(raw: unknown): Validated {
  return validateText(raw, 'Comment', COMMUNITY_LIMITS.commentMax)
}

export function validateTitle(raw: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === '') return { ok: true, value: null }
  const result = validateText(raw, 'Title', COMMUNITY_LIMITS.titleMax)
  return result.ok ? { ok: true, value: result.value } : result
}

export function validateReportReason(raw: unknown): Validated {
  return validateText(raw, 'Reason', COMMUNITY_LIMITS.reportReasonMax, COMMUNITY_LIMITS.reportReasonMin)
}

/** Admin moderation always needs a written reason, which goes in the log. */
export function validateModerationReason(raw: unknown): Validated {
  if (typeof raw !== 'string' || raw.trim().length < COMMUNITY_LIMITS.modReasonMin) {
    return { ok: false, error: `A reason of at least ${COMMUNITY_LIMITS.modReasonMin} characters is required` }
  }
  return { ok: true, value: raw.trim().slice(0, 1000) }
}

export function isAdmin(viewer: CommunityViewer): boolean {
  return viewer.role === 'ADMIN'
}

export function isMuted(mute: CommunityMuteState, now: Date = new Date()): boolean {
  if (!mute) return false
  return mute.mutedUntil === null || mute.mutedUntil.getTime() > now.getTime()
}

/** Anyone signed in and not suspended may read. */
export function canReadCommunity(viewer: CommunityViewer | null): boolean {
  return !!viewer && !viewer.suspended
}

export function canWrite(viewer: CommunityViewer | null, mute: CommunityMuteState, now: Date = new Date()): boolean {
  if (!viewer || viewer.suspended) return false
  return isAdmin(viewer) || !isMuted(mute, now)
}

/** Only admins publish announcements. Job posts are made by the platform itself, never by hand. */
export function canCreatePostKind(viewer: CommunityViewer, kind: CommunityPostKindName): boolean {
  if (kind === 'POST') return true
  if (kind === 'ANNOUNCEMENT') return isAdmin(viewer)
  return false
}

export function canPin(viewer: CommunityViewer): boolean {
  return isAdmin(viewer)
}

export function canModerate(viewer: CommunityViewer): boolean {
  return isAdmin(viewer)
}

/** Authors may delete their own content; admins may delete anything. */
export function canDeleteContent(viewer: CommunityViewer, authorId: string): boolean {
  return isAdmin(viewer) || viewer.userId === authorId
}

/** Hidden content is seen only by its author and admins. Deleted content is seen by nobody. */
export function canSeeContent(viewer: CommunityViewer, content: { status: CommunityStatusName; authorId: string }): boolean {
  if (content.status === 'DELETED') return false
  if (content.status === 'VISIBLE') return true
  return isAdmin(viewer) || viewer.userId === content.authorId
}

export function canReportContent(viewer: CommunityViewer, content: { status: CommunityStatusName; authorId: string }): boolean {
  return content.authorId !== viewer.userId && content.status === 'VISIBLE'
}

/** Nobody blocks admins: reports and rules still have to reach them. */
export function canBlockUser(viewer: CommunityViewer, targetId: string, targetRole: string): boolean {
  return viewer.userId !== targetId && targetRole !== 'ADMIN'
}

export function isRateLimited(recentCount: number, limit: { max: number }): boolean {
  return recentCount >= limit.max
}

export function windowStart(limit: { windowMs: number }, now: Date = new Date()): Date {
  return new Date(now.getTime() - limit.windowMs)
}

export function filterBlocked<T extends { authorId: string }>(items: T[], blockedIds: ReadonlySet<string>): T[] {
  if (blockedIds.size === 0) return items
  return items.filter((item) => !blockedIds.has(item.authorId))
}

export function isStatFresh(updatedAt: Date | null, now: Date = new Date(), ttlMs: number = COMMUNITY_LIMITS.memberCountTtlMs): boolean {
  return !!updatedAt && now.getTime() - updatedAt.getTime() < ttlMs
}
