import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  _request: Request,
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

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': video.contentType,
        'Content-Length': String(result.blob.size),
        'Content-Disposition': `attachment; filename="mission-recording.${video.contentType === 'video/quicktime' ? 'mov' : 'mp4'}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Mission video download error:', error)
    return NextResponse.json({ error: 'Could not download video' }, { status: 500 })
  }
}
