import { NextResponse, after } from 'next/server'
import type { Prisma } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import {
  COMMUNITY_LIMITS,
  canCreatePostKind,
  canReadCommunity,
  canWrite,
  isAdmin,
  isRateLimited,
  validatePostBody,
  validateTitle,
} from '@/lib/community-rules'
import {
  FEED_PAGE_SIZE,
  countRecent,
  displayAuthor,
  communityPostPath,
  everyoneToNotify,
  notifyUsers,
  getMemberCount,
  likedPostIds,
  loadBlockedIds,
  loadMute,
  postSelect,
  serializePost,
} from '@/lib/community'

const TABS = ['feed', 'announcements', 'jobs', 'mine'] as const
type Tab = (typeof TABS)[number]

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const viewer = { userId: user.userId, role: user.role }
    if (!canReadCommunity(viewer)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const tabParam = searchParams.get('tab') ?? 'feed'
    const tab: Tab = (TABS as readonly string[]).includes(tabParam) ? (tabParam as Tab) : 'feed'
    const cursor = searchParams.get('cursor')

    const blocked = await loadBlockedIds(user.userId)
    const visibility: Prisma.CommunityPostWhereInput = isAdmin(viewer)
      ? { status: { in: ['VISIBLE', 'HIDDEN'] } }
      : { OR: [{ status: 'VISIBLE' }, { status: 'HIDDEN', authorId: user.userId }] }

    const and: Prisma.CommunityPostWhereInput[] = [visibility]
    if (blocked.size > 0) and.push({ authorId: { notIn: [...blocked] } })
    if (tab === 'announcements') and.push({ kind: 'ANNOUNCEMENT' })
    if (tab === 'jobs') and.push({ kind: 'JOB', job: { is: { status: 'ACTIVE' } } })
    if (tab === 'mine') and.push({ authorId: user.userId, kind: 'POST' })

    const rows = await prisma.communityPost.findMany({
      where: { AND: and },
      select: postSelect,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: FEED_PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > FEED_PAGE_SIZE
    const page = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows
    const liked = await likedPostIds(user.userId, page.map((post) => post.id))
    const memberCount = cursor ? undefined : await getMemberCount()

    return NextResponse.json({
      posts: page.map((post) => serializePost(post, viewer, liked)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
      memberCount,
      canWrite: canWrite(viewer, await loadMute(user.userId)),
      isAdmin: isAdmin(viewer),
    })
  } catch (error) {
    console.error('Community feed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const viewer = { userId: user.userId, role: user.role }

    if (!canWrite(viewer, await loadMute(user.userId))) {
      return NextResponse.json({ error: 'You cannot post right now' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const kind = body.kind === 'ANNOUNCEMENT' ? 'ANNOUNCEMENT' : body.kind === undefined || body.kind === 'POST' ? 'POST' : null
    if (!kind) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    if (!canCreatePostKind(viewer, kind)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const text = validatePostBody(body.body)
    if (!text.ok) return NextResponse.json({ error: text.error }, { status: 400 })
    const title = validateTitle(body.title)
    if (!title.ok) return NextResponse.json({ error: title.error }, { status: 400 })

    if (!isAdmin(viewer) && isRateLimited(await countRecent(user.userId, 'posts'), COMMUNITY_LIMITS.posts)) {
      return NextResponse.json({ error: 'You are posting too fast. Please try again later.' }, { status: 429 })
    }

    const created = await prisma.communityPost.create({
      data: { authorId: user.userId, kind, title: title.value, body: text.value },
      select: postSelect,
    })

    const post = created
    after(async () => {
      try {
        const ids = await everyoneToNotify(user.userId)
        const isAnnouncement = kind === 'ANNOUNCEMENT'
        const who = displayAuthor(post.author).name
        await notifyUsers(ids, {
          title: isAnnouncement ? '📣 New announcement' : 'New post in Community',
          body: isAnnouncement && post.title ? post.title : `${who}: ${text.value.slice(0, 100)}`,
          url: communityPostPath(post.id),
          type: isAnnouncement ? 'community_announcement' : 'community_post',
        })
      } catch (notifyError) {
        console.error('Community post notification failed:', notifyError)
      }
    })

    return NextResponse.json({ success: true, post: serializePost(created, viewer, new Set()) }, { status: 201 })
  } catch (error) {
    console.error('Community create post error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
