import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { eventType, featureName, sessionDuration } = body

    // Validate event type
    const validEventTypes = ['APP_LAUNCH', 'FEATURE_USED', 'FEEDBACK_SUBMITTED', 'SESSION_END']
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    // Get the application
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: true,
        tester: true,
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Verify the current user is the tester
    if (application.testerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Only allow logging usage for TESTING or COMPLETED applications
    if (!['TESTING', 'COMPLETED'].includes(application.status)) {
      return NextResponse.json(
        { error: 'Cannot log usage for this application stage' },
        { status: 400 }
      )
    }

    // Create usage log
    const usageLog = await prisma.appUsageLog.create({
      data: {
        applicationId: id,
        testerId: currentUser.userId,
        eventType,
        featureName: featureName || null,
        sessionDuration: sessionDuration || null,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      usageLog,
      message: 'Usage logged successfully',
    })
  } catch (error) {
    console.error('Log usage error:', error)
    return NextResponse.json(
      { error: 'Failed to log usage' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get the application
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            developer: true,
          },
        },
        tester: true,
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Allow developer to view their job's tester engagement, or tester to view their own
    if (
      currentUser.userId !== application.job.developerId &&
      currentUser.userId !== application.testerId
    ) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Get usage logs
    const usageLogs = await prisma.appUsageLog.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate engagement metrics
    const appLaunches = usageLogs.filter((log) => log.eventType === 'APP_LAUNCH').length
    const featuresUsed = [
      ...new Set(usageLogs
        .filter((log) => log.eventType === 'FEATURE_USED' && log.featureName)
        .map((log) => log.featureName)),
    ].length
    const feedbackSubmitted = usageLogs.filter((log) => log.eventType === 'FEEDBACK_SUBMITTED').length
    const totalSessions = usageLogs.filter((log) => log.eventType === 'SESSION_END').length
    const avgSessionDuration =
      totalSessions > 0
        ? Math.round(
            usageLogs
              .filter((log) => log.eventType === 'SESSION_END' && log.sessionDuration)
              .reduce((sum, log) => sum + (log.sessionDuration || 0), 0) / totalSessions
          )
        : 0

    // Check if tester has been actively testing
    const firstLog = usageLogs[usageLogs.length - 1]
    const lastLog = usageLogs[0]
    const daysSinceFistLog = firstLog
      ? Math.floor((Date.now() - firstLog.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    const metrics = {
      appLaunches,
      featuresUsed,
      feedbackSubmitted,
      totalSessions,
      avgSessionDuration,
      daysSinceFistLog,
      isActivelyTesting: appLaunches > 0,
      firstActivityAt: firstLog?.createdAt || null,
      lastActivityAt: lastLog?.createdAt || null,
      totalLogs: usageLogs.length,
    }

    return NextResponse.json({
      success: true,
      applicationId: id,
      applicationStatus: application.status,
      tester: {
        id: application.tester.id,
        name: application.tester.name,
        email: application.tester.email,
      },
      metrics,
      logs: usageLogs,
    })
  } catch (error) {
    console.error('Get engagement error:', error)
    return NextResponse.json(
      { error: 'Failed to get engagement data' },
      { status: 500 }
    )
  }
}
