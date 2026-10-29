export type GroupViewer = { userId: string; role: string }

export type GroupJobContext = {
  developerId: string
  // The viewer's own application on this job, if any.
  viewerApplication: { status: string } | null
  viewerHasJoined: boolean
}

const VERIFIED_STATUSES = ['VERIFIED', 'SCHEDULED', 'TESTING', 'COMPLETED']

/** A tester qualifies only while their application on this job is verified or later. */
export function isVerifiedForGroup(status: string | null | undefined): boolean {
  return !!status && VERIFIED_STATUSES.includes(status)
}

/** Developer of the job and admins are always members. */
export function isAlwaysMember(viewer: GroupViewer, ctx: GroupJobContext): boolean {
  return viewer.role === 'ADMIN' || (viewer.role === 'DEVELOPER' && viewer.userId === ctx.developerId)
}

/** Whether the Join button should work. */
export function canJoinGroup(viewer: GroupViewer, ctx: GroupJobContext): boolean {
  return viewer.role === 'TESTER' && isVerifiedForGroup(ctx.viewerApplication?.status)
}

/** Joined testers lose access if they stop being verified (for example when withdrawn). */
export function canAccessGroup(viewer: GroupViewer, ctx: GroupJobContext): boolean {
  if (isAlwaysMember(viewer, ctx)) return true
  return canJoinGroup(viewer, ctx) && ctx.viewerHasJoined
}
