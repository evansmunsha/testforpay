import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { videoId } = await params

    const video = await prisma.submissionVideo.findUnique({
      where: { id: videoId },
      select: {
        blobPathname: true,
        contentType: true,
        deletedAt: true,
        application: {
          select: {
            testerId: true,
            job: { select: { developerId: true } },
          },
        },
      },
    })
    if (
      !video ||
      video.deletedAt ||
      (user.role !== 'ADMIN' &&
        user.userId !== video.application.testerId &&
        user.userId !== video.application.job.developerId)
    ) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const result = await get(video.blobPathname, { access: 'private' })
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: 'Video file not found' }, { status: 404 })
    }
    const shouldDownload = new URL(request.url).searchParams.get('download') === '1'

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': video.contentType,
        'Content-Length': String(result.blob.size),
        'Content-Disposition': shouldDownload
          ? `attachment; filename="mission-recording.${video.contentType === 'video/quicktime' ? 'mov' : 'mp4'}"`
          : 'inline',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Mission video download error:', error)
    return NextResponse.json({ error: 'Could not download video' }, { status: 500 })
  }
}

// The job's developer confirms that a mission recording really shows their app.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'DEVELOPER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { videoId } = await params
    const video = await prisma.submissionVideo.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        deletedAt: true,
        taskSubmissionId: true,
        developerConfirmedAt: true,
        application: { select: { job: { select: { developerId: true } } } },
      },
    })
    if (!video || video.deletedAt || !video.taskSubmissionId || video.application.job.developerId !== user.userId) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const confirmedAt = video.developerConfirmedAt ?? new Date()
    if (!video.developerConfirmedAt) {
      await prisma.submissionVideo.update({
        where: { id: video.id },
        data: { developerConfirmedAt: confirmedAt },
      })
    }
    return NextResponse.json({ success: true, developerConfirmedAt: confirmedAt })
  } catch (error) {
    console.error('Confirm video error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
