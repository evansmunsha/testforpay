export type ThreadKindName = 'ISSUE_REPORT' | 'MISSION_SUBMISSION' | 'ADMIN_MESSAGE'
export type ThreadRole = 'DEVELOPER' | 'TESTER' | 'ADMIN'

export interface ThreadViewer {
  userId: string
  // Plain string because the auth layer returns one; unknown roles are denied by the rules below.
  role: ThreadRole | string
}

export interface ThreadAccessContext {
  kind: ThreadKindName
  testerId: string
  // Developer who owns the job; null for private tester-to-admin messages.
  developerId: string | null
  testerMutesDeveloperReplies?: boolean
}

export const MAX_THREAD_MESSAGE_LENGTH = 2000
export const MIN_THREAD_MESSAGE_LENGTH = 2

export function canReadThread(viewer: ThreadViewer, thread: ThreadAccessContext): boolean {
  if (viewer.role === 'ADMIN') return true
  if (viewer.role === 'TESTER') return viewer.userId === thread.testerId
  if (viewer.role === 'DEVELOPER') {
    // Private tester-to-admin messages never reach a developer.
    return thread.kind !== 'ADMIN_MESSAGE' && thread.developerId !== null && viewer.userId === thread.developerId
  }
  return false
}

export function canReplyToThread(viewer: ThreadViewer, thread: ThreadAccessContext): boolean {
  if (!canReadThread(viewer, thread)) return false
  if (viewer.role === 'DEVELOPER' && thread.testerMutesDeveloperReplies) return false
  return true
}

/** Who should be notified when `author` posts: everyone with access except the author. */
export function getThreadRecipientIds(
  author: ThreadViewer,
  thread: ThreadAccessContext,
  adminIds: string[]
): string[] {
  const recipients = new Set<string>()
  recipients.add(thread.testerId)
  if (thread.kind !== 'ADMIN_MESSAGE' && thread.developerId) recipients.add(thread.developerId)
  // Admins are told about tester posts; admin replies only reach the people in the thread.
  if (author.role === 'TESTER' || author.role === 'DEVELOPER') adminIds.forEach((id) => recipients.add(id))
  recipients.delete(author.userId)
  return [...recipients]
}

export function validateThreadMessage(body: unknown): { ok: true; body: string } | { ok: false; error: string } {
  if (typeof body !== 'string') return { ok: false, error: 'Write a message first' }
  const trimmed = body.trim()
  if (trimmed.length < MIN_THREAD_MESSAGE_LENGTH) return { ok: false, error: 'Message is too short' }
  if (trimmed.length > MAX_THREAD_MESSAGE_LENGTH) {
    return { ok: false, error: `Message must be ${MAX_THREAD_MESSAGE_LENGTH} characters or less` }
  }
  return { ok: true, body: trimmed }
}
