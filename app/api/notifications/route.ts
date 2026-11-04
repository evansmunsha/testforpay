import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { computeAdminTabBadges, computeNavBadges, markSectionSeen } from '@/lib/nav-badges'
import { ADMIN_TAB_KEYS, adminSectionName } from '@/lib/nav-badges-format'

const seenSchema = z.object({
  section: z.enum(['messages', 'feedback']).optional(),
  adminTab: z.enum(ADMIN_TAB_KEYS).optional(),
})

// POST { section } or { adminTab } — the caller opened a menu section or admin tab, so its badge should clear.
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    const parsed = seenSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success || (!parsed.data.section && !parsed.data.adminTab)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    if (parsed.data.adminTab) {
      if (currentUser.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      await markSectionSeen(currentUser.userId, adminSectionName(parsed.data.adminTab))
    }
    if (parsed.data.section) await markSectionSeen(currentUser.userId, parsed.data.section)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark section seen error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// Get user notifications
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)

    // ?badges=1 returns the menu badge counts for this user's own role only.
    if (searchParams.get('badges') === '1') {
      const badges = await computeNavBadges(currentUser.userId, currentUser.role)
      if (currentUser.role !== 'ADMIN') {
        // Guide videos this person is allowed to see but has not finished yet.
        const audiences = currentUser.role === 'DEVELOPER' ? ['DEVELOPER', 'ALL'] : ['TESTER', 'ALL']
        const unwatched = await prisma.guideVideo.count({
          where: {
            hidden: false,
            audience: { in: audiences as ('TESTER' | 'DEVELOPER' | 'ALL')[] },
            views: { none: { userId: currentUser.userId } },
          },
        })
        if (unwatched > 0) badges.guides = unwatched
      }
      if (currentUser.role === 'ADMIN' && searchParams.get('adminTabs') === '1') {
        return NextResponse.json(
          { badges, adminTabs: await computeAdminTabBadges(currentUser.userId) },
          { headers: { 'Cache-Control': 'no-store' } }
        )
      }
      return NextResponse.json({ badges }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {
      userId: currentUser.userId,
    }

    if (unreadOnly) {
      where.read = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Migrate legacy contact links at read time so existing notifications do not 404.
    const normalizedNotifications = notifications.map(notification => ({
      ...notification,
      url: notification.url === '/admin/contact'
        ? '/dashboard/admin?tab=contacts'
        : notification.url,
    }))

    const unreadCount = await prisma.notification.count({
      where: {
        userId: currentUser.userId,
        read: false,
      },
    })

    return NextResponse.json({ 
      success: true,
      notifications: normalizedNotifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// Mark notifications as read
export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notificationIds, markAll } = body

    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          userId: currentUser.userId,
          read: false,
        },
        data: { read: true },
      })
    } else if (notificationIds?.length) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: currentUser.userId,
        },
        data: { read: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}
