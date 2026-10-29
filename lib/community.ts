import type { Prisma } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import {
  COMMUNITY_LIMITS,
  isStatFresh,
  windowStart,
  type CommunityViewer,
} from '@/lib/community-rules'

export const MEMBER_COUNT_KEY = 'members'
export const FEED_PAGE_SIZE = 20

export function communityPostPath(postId: string) {
  return `/dashboard/community/${postId}`
}

/** Mute state is read fresh from the database on every write. */
export async function loadMute(userId: string) {
  return prisma.communityMute.findUnique({ where: { userId }, select: { mutedUntil: true } })
}

export async function loadBlockedIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.communityBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true } })
  return new Set(rows.map((row) => row.blockedId))
}

/** Member count is cached in CommunityStat so busy pages do not count every user each time. */
export async function getMemberCount(now: Date = new Date()): Promise<number> {
  const cached = await prisma.communityStat.findUnique({ where: { key: MEMBER_COUNT_KEY } })
  if (cached && isStatFresh(cached.updatedAt, now)) return cached.value

  const value = await prisma.user.count({ where: { suspended: false } })
  await prisma.communityStat.upsert({
    where: { key: MEMBER_COUNT_KEY },
    create: { key: MEMBER_COUNT_KEY, value, updatedAt: now },
    update: { value, updatedAt: now },
  })
  return value
}

type LimitName = 'posts' | 'comments' | 'reports'

/** Counts everything the person created in the window, including deleted items, so delete-and-repost spam is limited too. */
export async function countRecent(userId: string, what: LimitName, now: Date = new Date()): Promise<number> {
  const since = windowStart(COMMUNITY_LIMITS[what], now)
  if (what === 'posts') return prisma.communityPost.count({ where: { authorId: userId, createdAt: { gte: since } } })
  if (what === 'comments') return prisma.communityComment.count({ where: { authorId: userId, createdAt: { gte: since } } })
  return prisma.communityReport.count({ where: { reporterId: userId, createdAt: { gte: since } } })
}

export const postSelect = {
  id: true,
  kind: true,
  title: true,
  body: true,
  pinned: true,
  status: true,
  likeCount: true,
  commentCount: true,
  createdAt: true,
  authorId: true,
  author: { select: { name: true, role: true } },
  job: { select: { id: true, appName: true, status: true } },
} satisfies Prisma.CommunityPostSelect

export type PostRow = Prisma.CommunityPostGetPayload<{ select: typeof postSelect }>

/** Public shape of a person. Never includes email or any contact detail. */
export function displayAuthor(author: { name: string | null; role: string }) {
  if (author.role === 'ADMIN') return { name: 'TestForPay Admin', role: 'ADMIN' }
  return { name: author.name?.trim() || 'Member', role: author.role }
}

export function serializePost(post: PostRow, viewer: CommunityViewer, likedIds: ReadonlySet<string>) {
  return {
    id: post.id,
    kind: post.kind,
    title: post.title,
    body: post.body,
    pinned: post.pinned,
    status: post.status,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    createdAt: post.createdAt,
    author: displayAuthor(post.author),
    mine: post.authorId === viewer.userId,
    liked: likedIds.has(post.id),
    job: post.job && post.job.status === 'ACTIVE' ? { id: post.job.id, appName: post.job.appName } : null,
  }
}

export async function likedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set()
  const rows = await prisma.communityLike.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  })
  return new Set(rows.map((row) => row.postId))
}
