import prisma from '@/lib/prisma'
import { adminSectionName, type AdminTabBadges, type AdminTabKey } from '@/lib/nav-badges-format'
import type { NavBadges } from '@/lib/nav-badges-format'

export { formatBadgeCount } from '@/lib/nav-badges-format'
export type { NavBadges, AdminTabBadges } from '@/lib/nav-badges-format'

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

const STUCK_PAYOUT_MS = 48 * 60 * 60 * 1000

async function seenAtOrNull(userId: string, section: string): Promise<Date | null> {
  const row = await prisma.navSeen.findUnique({ where: { userId_section: { userId, section } }, select: { seenAt: true } })
  return row?.seenAt ?? null
}

/**
 * Red numbers for the admin tabs. Each one counts only items that are still unhandled
 * and arrived after the admin last opened that tab. Call this for admins only.
 */
export async function computeAdminTabBadges(userId: string): Promise<AdminTabBadges> {
  const safe = async (task: () => Promise<number>) => {
    try {
      return await task()
    } catch (error) {
      console.error('Admin tab badge count failed:', error)
      return 0
    }
  }
  const now = Date.now()
  // Unhandled items count in full until the tab is opened; messages are never "handled", so they look back a limited time.
  const after = async (tab: AdminTabKey, field: string) => {
    const seen = await seenAtOrNull(userId, adminSectionName(tab))
    return seen ? { [field]: { gt: seen } } : {}
  }

  const [contacts, applications, payments, reports, issues, community, testimonials, fraud] = await Promise.all([
    safe(async () => prisma.contactMessage.count({ where: { createdAt: { gt: await seenAt(userId, 'contacts') } } })),
    safe(async () =>
      prisma.application.count({ where: { status: 'PENDING', ...(await after('applications', 'createdAt')) } })
    ),
    safe(async () => {
      const seen = await seenAtOrNull(userId, adminSectionName('payments'))
      const failed = await prisma.payment.count({ where: { status: 'FAILED', ...(seen ? { updatedAt: { gt: seen } } : {}) } })
      const stuck = await prisma.payment.count({
        where: {
          status: 'PROCESSING',
          updatedAt: { lt: new Date(now - STUCK_PAYOUT_MS), ...(seen ? { gt: new Date(seen.getTime() - STUCK_PAYOUT_MS) } : {}) },
        },
      })
      return failed + stuck
    }),
    safe(async () => prisma.feedbackReport.count({ where: { resolvedAt: null, ...(await after('reports', 'createdAt')) } })),
    safe(async () => prisma.applicationIssueReport.count({ where: { status: 'OPEN', ...(await after('application-issues', 'createdAt')) } })),
    safe(async () => prisma.communityReport.count({ where: { status: 'OPEN', ...(await after('community', 'createdAt')) } })),
    safe(async () => prisma.feedback.count({ where: { approved: false, ...(await after('testimonials', 'createdAt')) } })),
    safe(async () => prisma.fraudLog.count({ where: { resolved: false, ...(await after('fraud', 'createdAt')) } })),
  ])

  const result: AdminTabBadges = {
    contacts,
    applications,
    payments,
    reports,
    'application-issues': issues,
    community,
    testimonials,
    fraud,
  }
  return result
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
    const [messages, tabs] = await Promise.all([
      safe(() => unreadThreadMessages(userId, role)),
      computeAdminTabBadges(userId),
    ])
    const admin = Object.values(tabs).reduce((sum, count) => sum + (count ?? 0), 0)
    return { messages, community: tabs.community ?? 0, admin }
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
