import prisma from '@/lib/prisma'
import { canAccessGroup, canJoinGroup, isAlwaysMember, type GroupJobContext, type GroupViewer } from '@/lib/group-permissions'

export const GROUP_RATE_LIMIT = { maxMessages: 10, windowMs: 60_000 }

export function groupPath(jobId: string) {
  return `/dashboard/group/${jobId}`
}

/** Loads everything the permission rules need, fresh from the database on every request. */
export async function loadGroupAccess(jobId: string, viewer: GroupViewer) {
  const job = await prisma.testingJob.findUnique({
    where: { id: jobId },
    select: { id: true, appName: true, developerId: true },
  })
  if (!job) return null

  const [application, membership] =
    viewer.role === 'TESTER'
      ? await Promise.all([
          prisma.application.findFirst({
            where: { jobId, testerId: viewer.userId },
            orderBy: { createdAt: 'desc' },
            select: { status: true },
          }),
          prisma.jobGroupMember.findUnique({
            where: { jobId_userId: { jobId, userId: viewer.userId } },
            select: { id: true },
          }),
        ])
      : [null, null]

  const context: GroupJobContext = {
    developerId: job.developerId,
    viewerApplication: application,
    viewerHasJoined: !!membership,
  }
  return {
    job,
    context,
    isAlwaysMember: isAlwaysMember(viewer, context),
    canJoin: canJoinGroup(viewer, context),
    canAccess: canAccessGroup(viewer, context),
  }
}

export async function isGroupRateLimited(authorId: string) {
  const since = new Date(Date.now() - GROUP_RATE_LIMIT.windowMs)
  const recent = await prisma.jobGroupMessage.count({ where: { authorId, createdAt: { gte: since } } })
  return recent >= GROUP_RATE_LIMIT.maxMessages
}
