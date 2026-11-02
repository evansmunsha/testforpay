import prisma from '@/lib/prisma'
import type { NavBadges } from '@/lib/nav-badges-format'

export { formatBadgeCount } from '@/lib/nav-badges-format'
export type { NavBadges } from '@/lib/nav-badges-format'

// When nothing has been opened yet, only look back this far so old history does not flood a new badge.
const FIRST_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000

async function seenAt(userId: string, section: string): Promise<Date> {
  const row = await prisma.navSeen.findUnique({ where: { userId_section: { userId, section } }, select: { seenAt: true } })
  return row?.seenAt ?? new Date(Date.now() - FIRST_LOOKBACK_MS)
}

export async function markSectionSeen(userId: string, section: string) {
  await prisma.navSeen.upsert({
    where: { userId_section: { userId, section } },
    update: { seenAt: new Date() },
    create: { userId, section },
  })
}

async function unreadThreadMessages(userId: string, role: string): Promise<number> {
  const since = await seenAt(userId, 'messages')
  const access =
    role === 'ADMIN'
      ? {}
      : role === 'TESTER'
        ? { testerId: userId }
        : { kind: { not: 'ADMIN_MESSAGE' as const }, job: { developerId: userId } }
  return prisma.threadMessage.count({
    where: { authorId: { not: userId }, createdAt: { gt: since }, thread: access },
  })
}

/** Every count is decided here from the caller's own role, so no one receives numbers for things they cannot see. */
export async function computeNavBadges(userId: string, role: string): Promise<NavBadges> {
  const safe = async (task: () => Promise<number>) => {
    try {
      return await task()
    } catch (error) {
      console.error('Nav badge count failed:', error)
      return 0
    }
  }

  if (role === 'ADMIN') {
    const [messages, issues, contacts, testimonials, communityReports] = await Promise.all([
      safe(() => unreadThreadMessages(userId, role)),
      safe(() => prisma.applicationIssueReport.count({ where: { status: 'OPEN' } })),
      safe(async () => prisma.contactMessage.count({ where: { createdAt: { gt: await seenAt(userId, 'contacts') } } })),
      safe(() => prisma.feedback.count({ where: { approved: false } })),
      safe(() => prisma.communityReport.count({ where: { status: 'OPEN' } })),
    ])
    return { messages, community: communityReports, admin: issues + contacts + testimonials }
  }

  if (role === 'DEVELOPER') {
    const [messages, toReview, feedback] = await Promise.all([
      safe(() => unreadThreadMessages(userId, role)),
      safe(() =>
        prisma.application.count({
          where: { job: { developerId: userId }, status: { in: ['PENDING', 'OPTED_IN'] } },
        })
      ),
      safe(async () =>
        prisma.application.count({
          where: { job: { developerId: userId }, feedbackSubmittedAt: { gt: await seenAt(userId, 'feedback') } },
        })
      ),
    ])
    return { messages, jobs: toReview, feedback }
  }

  if (role === 'TESTER') {
    const [messages, actions, feedback] = await Promise.all([
      safe(() => unreadThreadMessages(userId, role)),
      safe(() => prisma.application.count({ where: { testerId: userId, status: 'APPROVED' } })),
      safe(async () =>
        prisma.application.count({
          where: { testerId: userId, developerReplyAt: { gt: await seenAt(userId, 'feedback') } },
        })
      ),
    ])
    return { messages, applications: actions, feedback }
  }

  return {}
}
