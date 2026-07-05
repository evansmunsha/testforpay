import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'

// PATCH — developer acknowledges a check-in with optional note
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; checkinId: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id, checkinId } = await params
    const body = await request.json()
    const { devNote } = body

    if (devNote && devNote.trim().length > 300) {
      return NextResponse.json({ error: 'Note must be 300 characters or less' }, { status: 400 })
    }

    const checkIn = await prisma.dailyCheckIn.findUnique({
      where: { id: checkinId },
      include: {
        application: {
          include: {
            job: { select: { id: true, appName: true, developerId: true } },
          },
        },
      },
    })

    if (!checkIn) return NextResponse.json({ error: 'Check-in not found' }, { status: 404 })
    if (checkIn.applicationId !== id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (checkIn.application.job.developerId !== currentUser.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const updated = await prisma.dailyCheckIn.update({
      where: { id: checkinId },
      data: {
        devAcknowledged: true,
        devAcknowledgedAt: new Date(),
        devNote: devNote?.trim() || null,
      },
    })

    // Notify tester that developer acknowledged
    try {
      await sendNotification({
        userId: checkIn.testerId,
        title: `Developer acknowledged your day ${checkIn.dayNumber} check-in`,
        body: devNote?.trim()
          ? `${checkIn.application.job.appName}: "${devNote.trim().substring(0, 80)}"`
          : `Your day ${checkIn.dayNumber} update for ${checkIn.application.job.appName} was noted.`,
        url: `/dashboard/applications/${id}`,
        type: 'checkin_acknowledged',
      })
    } catch (e) {
      console.error('Failed to notify tester:', e)
    }

    return NextResponse.json({ success: true, checkIn: updated })
  } catch (error) {
    console.error('Acknowledge check-in error:', error)
    return NextResponse.json({ error: 'Failed to acknowledge check-in' }, { status: 500 })
  }
}
