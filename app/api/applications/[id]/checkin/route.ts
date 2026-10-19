import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'
import { getMissionDay } from '@/lib/mission-clock'

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
        job: { select: { id: true, appName: true, developerId: true, testDuration: true } },
        tester: { select: { id: true, name: true } },
        issueReports: {
          where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
          select: { id: true },
        },
      },
    })

    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (application.testerId !== currentUser.userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    if (!['TESTING', 'COMPLETED'].includes(application.status)) {
      return NextResponse.json({ error: 'Check-ins can only be submitted during the testing period' }, { status: 400 })
    }
    if (application.issueReports.length > 0) {
      return NextResponse.json({ error: 'Check-ins are paused while your testing issue report is under review' }, { status: 409 })
    }
    if (application.testingPausedAt) {
      return NextResponse.json({ error: 'Check-ins are unavailable while testing is paused' }, { status: 409 })
    }

    if (!application.testingStartDate) {
      return NextResponse.json({ error: 'Testing has not started for this application' }, { status: 400 })
    }

    const preliminaryDayNumber = getMissionDay(
      application.testingStartDate,
      new Date(),
      application.testingPausedDurationMs
    )
    if (preliminaryDayNumber === null || preliminaryDayNumber > application.job.testDuration) {
      return NextResponse.json({ error: 'Testing has not started for this application' }, { status: 400 })
    }

    let dayNumber: number
    let checkIn
    try {
      const created = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Application" WHERE id = ${id} FOR UPDATE`
        const fresh = await tx.application.findUnique({
          where: { id },
          select: {
            testerId: true,
            status: true,
            testingStartDate: true,
            testingPausedAt: true,
            testingPausedDurationMs: true,
            job: { select: { testDuration: true } },
            issueReports: {
              where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
              select: { id: true },
            },
          },
        })
        if (!fresh || fresh.testerId !== currentUser.userId || !['TESTING', 'COMPLETED'].includes(fresh.status)) {
          throw new Error('CHECKIN_NOT_ACTIVE')
        }
        if (fresh.testingPausedAt) throw new Error('CHECKIN_PAUSED')
        if (fresh.issueReports.length > 0) throw new Error('CHECKIN_ISSUE_REVIEW')
        if (!fresh.testingStartDate) throw new Error('CHECKIN_NOT_STARTED')
        const activeDay = getMissionDay(
          fresh.testingStartDate,
          new Date(),
          fresh.testingPausedDurationMs
        )
        if (activeDay === null || activeDay > fresh.job.testDuration) {
          throw new Error('CHECKIN_NOT_ACTIVE')
        }
        const existing = await tx.dailyCheckIn.findUnique({
          where: { applicationId_dayNumber: { applicationId: id, dayNumber: activeDay } },
          select: { id: true },
        })
        if (existing) throw new Error('CHECKIN_EXISTS')

        return {
          dayNumber: activeDay,
          checkIn: await tx.dailyCheckIn.create({
            data: {
              applicationId: id,
              testerId: currentUser.userId,
              dayNumber: activeDay,
              message: message.trim(),
              usedApp,
              issuesFound,
              issueDetails: issueDetails?.trim() || null,
            },
          }),
        }
      })
      dayNumber = created.dayNumber
      checkIn = created.checkIn
    } catch (stateError) {
      if (stateError instanceof Error) {
        const errors: Record<string, { status: number; message: string }> = {
          CHECKIN_NOT_ACTIVE: { status: 409, message: 'This application is not in an active check-in period' },
          CHECKIN_PAUSED: { status: 409, message: 'Check-ins are unavailable while testing is paused' },
          CHECKIN_ISSUE_REVIEW: { status: 409, message: 'Check-ins are paused while your testing issue report is under review' },
          CHECKIN_NOT_STARTED: { status: 409, message: 'Testing has not started for this application' },
          CHECKIN_EXISTS: { status: 409, message: 'You already submitted a check-in for this testing day' },
        }
        if (errors[stateError.message]) {
          return NextResponse.json(
            { error: errors[stateError.message].message },
            { status: errors[stateError.message].status }
          )
        }
      }
      throw stateError
    }

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
      include: { tester: { select: { id: true, name: true } } },
      orderBy: { dayNumber: 'asc' },
    })

    return NextResponse.json({ success: true, checkIns })
  } catch (error) {
    console.error('Fetch check-ins error:', error)
    return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 })
  }
}
