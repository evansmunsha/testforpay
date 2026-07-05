import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'

// POST — tester submits a daily check-in
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { message, usedApp = true, issuesFound = false, issueDetails } = body

    if (!message || message.trim().length < 10) {
      return NextResponse.json({ error: 'Check-in message must be at least 10 characters' }, { status: 400 })
    }
    if (message.trim().length > 1000) {
      return NextResponse.json({ error: 'Message must be 1000 characters or less' }, { status: 400 })
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: { select: { id: true, appName: true, developerId: true } },
        tester: { select: { id: true, name: true } },
      },
    })

    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (application.testerId !== currentUser.userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    if (!['TESTING', 'COMPLETED'].includes(application.status)) {
      return NextResponse.json({ error: 'Check-ins can only be submitted during the testing period' }, { status: 400 })
    }

    // Calculate which day of the testing period this is
    const startDate = application.testingStartDate || application.verifiedAt || application.createdAt
    const dayNumber = Math.max(1, Math.ceil((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))

    // Check if already submitted today (same day number)
    const existing = await prisma.dailyCheckIn.findUnique({
      where: { applicationId_dayNumber: { applicationId: id, dayNumber } },
    })
    if (existing) {
      return NextResponse.json({ error: `You already submitted a check-in for day ${dayNumber}` }, { status: 409 })
    }

    const checkIn = await prisma.dailyCheckIn.create({
      data: {
        applicationId: id,
        testerId: currentUser.userId,
        dayNumber,
        message: message.trim(),
        usedApp,
        issuesFound,
        issueDetails: issueDetails?.trim() || null,
      },
    })

    // Notify developer
    try {
      await sendNotification({
        userId: application.job.developerId,
        title: `Day ${dayNumber} check-in from ${application.tester.name || 'a tester'}`,
        body: `${application.job.appName}: ${message.trim().substring(0, 100)}${message.length > 100 ? '...' : ''}`,
        url: `/dashboard/jobs/${application.jobId}`,
        type: 'daily_checkin',
      })
    } catch (e) {
      console.error('Failed to notify developer about check-in:', e)
    }

    return NextResponse.json({ success: true, checkIn })
  } catch (error) {
    console.error('Daily check-in error:', error)
    return NextResponse.json({ error: 'Failed to submit check-in' }, { status: 500 })
  }
}

// GET — fetch all check-ins for an application (dev or tester can view)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params

    const application = await prisma.application.findUnique({
      where: { id },
      include: { job: { select: { developerId: true } } },
    })

    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    const isOwner = application.testerId === currentUser.userId || application.job.developerId === currentUser.userId
    if (!isOwner && currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const checkIns = await prisma.dailyCheckIn.findMany({
      where: { applicationId: id },
      include: { tester: { select: { id: true, name: true, email: true } } },
      orderBy: { dayNumber: 'asc' },
    })

    return NextResponse.json({ success: true, checkIns })
  } catch (error) {
    console.error('Fetch check-ins error:', error)
    return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 })
  }
}
