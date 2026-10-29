import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { del, head, type PutBlobResult } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { findCurrentMission } from '@/lib/video-access'
import { isAllowedVideoPath, validateVideoMeta, VIDEO_ALLOWED_TYPES, VIDEO_MAX_BYTES, VIDEO_MAX_SECONDS } from '@/lib/video-rules'
import { getVideoDurationSeconds } from '@/lib/video-probe'
import prisma from '@/lib/prisma'

function readTaskId(clientPayload: string | null | undefined): string | null {
  if (!clientPayload) return null
  try {
    const payload = JSON.parse(clientPayload) as { taskId?: unknown }
    return typeof payload.taskId === 'string' && payload.taskId.length > 0 ? payload.taskId : null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as HandleUploadBody
    if (body.type !== 'blob.generate-client-token' && body.type !== 'blob.upload-completed') {
      return NextResponse.json({ error: 'Unexpected upload request' }, { status: 400 })
    }

    if (body.type === 'blob.generate-client-token') {
      const user = await getCurrentUser()
      if (!user || user.role !== 'TESTER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { pathname, clientPayload } = body.payload
      const taskId = readTaskId(clientPayload)
      if (!taskId || !isAllowedVideoPath(pathname, user.userId, taskId)) {
        return NextResponse.json({ error: 'Invalid mission video path' }, { status: 400 })
      }

      const access = await findCurrentMission(taskId, user.userId)
      if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

      const result = await handleUpload({
        request,
        body,
        onBeforeGenerateToken: async (requestedPath, payload) => {
          const requestedTaskId = readTaskId(payload)
          if (
            requestedTaskId !== taskId ||
            !isAllowedVideoPath(requestedPath, user.userId, taskId)
          ) {
            throw new Error('Invalid mission video path')
          }

          return {
            allowedContentTypes: [...VIDEO_ALLOWED_TYPES],
            maximumSizeInBytes: VIDEO_MAX_BYTES,
            validUntil: Date.now() + 5 * 60 * 1000,
            addRandomSuffix: false,
            tokenPayload: JSON.stringify({
              testerId: user.userId,
              taskId,
              applicationId: access.application.id,
            }),
          }
        },
        onUploadCompleted: handleUploadCompleted,
      })

      return NextResponse.json(result)
    }

    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => {
        throw new Error('Upload completion cannot generate a token')
      },
      onUploadCompleted: handleUploadCompleted,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Mission video upload token error:', error)
    return NextResponse.json({ error: 'Could not handle video upload' }, { status: 500 })
  }
}

async function handleUploadCompleted({ blob, tokenPayload }: {
  blob: PutBlobResult
  tokenPayload?: string | null
}) {
  const payload = JSON.parse(tokenPayload || '{}') as {
    testerId?: unknown
    taskId?: unknown
    applicationId?: unknown
  }
  if (
    typeof payload.testerId !== 'string' ||
    typeof payload.taskId !== 'string' ||
    typeof payload.applicationId !== 'string' ||
    !isAllowedVideoPath(blob.pathname, payload.testerId, payload.taskId)
  ) {
    await del(blob.pathname).catch((error) => console.error('Could not remove invalid mission video:', error))
    throw new Error('Uploaded video did not match its signed upload token')
  }

  const access = await findCurrentMission(payload.taskId, payload.testerId)
  if (!access.ok || access.application.id !== payload.applicationId) {
    await del(blob.pathname).catch((error) => console.error('Could not remove ineligible mission video:', error))
    throw new Error('Tester is no longer eligible to upload for this mission')
  }

  try {
    const actualBlob = await head(blob.pathname)
    if (actualBlob.url !== blob.url || actualBlob.pathname !== blob.pathname) {
      throw new Error('Uploaded video metadata did not match')
    }
    const fileValidation = validateVideoMeta({
      contentType: actualBlob.contentType,
      sizeBytes: actualBlob.size,
      durationSeconds: 1,
    })
    if (!fileValidation.ok) throw new Error(fileValidation.error)

    const durationSeconds = await getVideoDurationSeconds(blob.pathname)
    const validation = validateVideoMeta({
      contentType: actualBlob.contentType,
      sizeBytes: actualBlob.size,
      durationSeconds,
    })
    if (!validation.ok) throw new Error(validation.error)

    await prisma.submissionVideo.upsert({
      where: { blobPathname: actualBlob.pathname },
      create: {
        applicationId: payload.applicationId,
        blobUrl: actualBlob.url,
        blobPathname: actualBlob.pathname,
        contentType: actualBlob.contentType,
        sizeBytes: actualBlob.size,
        durationSeconds: Math.ceil(durationSeconds),
      },
      update: {},
    })
  } catch (error) {
    await del(blob.pathname).catch((deleteError) => console.error('Could not remove rejected mission video:', deleteError))
    throw error
  }
}
