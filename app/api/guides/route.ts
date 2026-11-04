import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { del, get, head } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const GUIDE_MAX_BYTES = 300 * 1024 * 1024
const GUIDE_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const GUIDE_PATH = /^guides\/[\w-]+\.(mp4|mov|webm)$/

const audienceSchema = z.enum(['TESTER', 'DEVELOPER', 'ALL'])

const createSchema = z.object({
  action: z.literal('create'),
  title: z.string().trim().min(3, 'Write a title (at least 3 letters)').max(120),
  description: z.string().trim().max(500).default(''),
  audience: audienceSchema,
  pathname: z.string().regex(GUIDE_PATH, 'Invalid video file'),
})

const updateSchema = z.object({
  action: z.literal('update'),
  id: z.string().min(1),
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  audience: audienceSchema.optional(),
  hidden: z.boolean().optional(),
})

const moveSchema = z.object({
  action: z.literal('move'),
  id: z.string().min(1),
  direction: z.enum(['up', 'down']),
})

const deleteSchema = z.object({
  action: z.literal('delete'),
  id: z.string().min(1),
})

function audiencesFor(role: string): string[] | null {
  if (role === 'TESTER') return ['TESTER', 'ALL']
  if (role === 'DEVELOPER') return ['DEVELOPER', 'ALL']
  return null
}

// List guide videos, or stream one when ?stream=<id> is given.
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const allowed = audiencesFor(user.role)
    const streamId = url.searchParams.get('stream')

    if (streamId) {
      const video = await prisma.guideVideo.findUnique({ where: { id: streamId } })
      if (!video || (user.role !== 'ADMIN' && (video.hidden || !allowed?.includes(video.audience)))) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 })
      }
      const result = await get(video.blobPathname, { access: 'private' })
      if (!result || result.statusCode !== 200) {
        return NextResponse.json({ error: 'Video file not found' }, { status: 404 })
      }
      return new NextResponse(result.stream, {
        headers: {
          'Content-Type': video.contentType,
          'Content-Length': String(result.blob.size),
          'Content-Disposition': 'inline',
          'Cache-Control': 'private, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }

    const videos = await prisma.guideVideo.findMany({
      where: user.role === 'ADMIN' ? {} : { hidden: false, audience: { in: (allowed ?? []) as ('TESTER' | 'DEVELOPER' | 'ALL')[] } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true, title: true, description: true, audience: true,
        hidden: true, sortOrder: true, sizeBytes: true, createdAt: true,
      },
    })
    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Guide videos fetch error:', error)
    return NextResponse.json({ error: 'Could not load the videos' }, { status: 500 })
  }
}

// Admin only: upload token, create, update, move and delete.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    if (body && typeof body.type === 'string' && body.type.startsWith('blob.')) {
      const uploadBody = body as HandleUploadBody
      if (uploadBody.type !== 'blob.generate-client-token') {
        return NextResponse.json({ response: 'ok' })
      }
      const result = await handleUpload({
        request,
        body: uploadBody,
        onBeforeGenerateToken: async (pathname) => {
          if (!GUIDE_PATH.test(pathname)) throw new Error('Invalid video path')
          return {
            allowedContentTypes: GUIDE_TYPES,
            maximumSizeInBytes: GUIDE_MAX_BYTES,
            validUntil: Date.now() + 15 * 60 * 1000,
            addRandomSuffix: false,
          }
        },
        // The video is saved in the database by the "create" action below, so no callback is needed.
        onUploadCompleted: async () => undefined,
      })
      return NextResponse.json(result)
    }

    if (body?.action === 'create') {
      const parsed = createSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
      }
      const blob = await head(parsed.data.pathname).catch(() => null)
      if (!blob || !GUIDE_TYPES.includes(blob.contentType) || blob.size > GUIDE_MAX_BYTES) {
        if (blob) await del(parsed.data.pathname).catch(() => undefined)
        return NextResponse.json({ error: 'The video file was not found or is not allowed. Upload it again.' }, { status: 400 })
      }
      const last = await prisma.guideVideo.aggregate({ _max: { sortOrder: true } })
      const video = await prisma.guideVideo.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          audience: parsed.data.audience,
          blobPathname: blob.pathname,
          contentType: blob.contentType,
          sizeBytes: blob.size,
          sortOrder: (last._max.sortOrder ?? 0) + 1,
        },
        select: { id: true },
      })
      return NextResponse.json({ success: true, id: video.id })
    }

    if (body?.action === 'update') {
      const parsed = updateSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
      }
      const { action: _action, id, ...data } = parsed.data
      void _action
      await prisma.guideVideo.update({ where: { id }, data })
      return NextResponse.json({ success: true })
    }

    if (body?.action === 'move') {
      const parsed = moveSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
      const all = await prisma.guideVideo.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      })
      const index = all.findIndex((video) => video.id === parsed.data.id)
      const target = parsed.data.direction === 'up' ? index - 1 : index + 1
      if (index === -1 || target < 0 || target >= all.length) return NextResponse.json({ success: true })
      const ids = all.map((video) => video.id)
      ;[ids[index], ids[target]] = [ids[target], ids[index]]
      await prisma.$transaction(
        ids.map((id, position) => prisma.guideVideo.update({ where: { id }, data: { sortOrder: position + 1 } }))
      )
      return NextResponse.json({ success: true })
    }

    if (body?.action === 'delete') {
      const parsed = deleteSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
      const video = await prisma.guideVideo.findUnique({ where: { id: parsed.data.id }, select: { blobPathname: true } })
      if (!video) return NextResponse.json({ success: true })
      await prisma.guideVideo.delete({ where: { id: parsed.data.id } })
      await del(video.blobPathname).catch((error) => console.error('Could not delete guide file:', error))
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown request' }, { status: 400 })
  } catch (error) {
    console.error('Guide videos error:', error)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
