import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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

    // Get the job
    const job = await prisma.testingJob.findUnique({
      where: { id },
      include: {
        developer: true,
        applications: {
          include: {
            tester: {
              select: {
                id: true,
                name: true,
                email: true,
                averageRating: true,
              },
            },
            usageLogs: true,
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Verify the current user is the developer
    if (job.developerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Calculate testing report metrics
    const totalTestersRecruited = job.applications.length
    const approvedTesters = job.applications.filter((app) => app.status !== 'REJECTED').length
    const activeTesters = job.applications.filter((app) => app.status === 'TESTING').length
    const completedTesters = job.applications.filter((app) => app.status === 'COMPLETED').length

    // Engagement metrics across all testers
    const allUsageLogs = job.applications.flatMap((app) => app.usageLogs)
    const totalAppLaunches = allUsageLogs.filter((log) => log.eventType === 'APP_LAUNCH').length
    const uniqueFeaturesUsed = [
      ...new Set(
        allUsageLogs
          .filter((log) => log.eventType === 'FEATURE_USED' && log.featureName)
          .map((log) => log.featureName)
      ),
    ]
    const totalFeedbackSubmitted = allUsageLogs.filter((log) => log.eventType === 'FEEDBACK_SUBMITTED').length
    const totalSessions = allUsageLogs.filter((log) => log.eventType === 'SESSION_END').length
    const avgSessionDuration =
      totalSessions > 0
        ? Math.round(
            allUsageLogs
              .filter((log) => log.eventType === 'SESSION_END' && log.sessionDuration)
              .reduce((sum, log) => sum + (log.sessionDuration || 0), 0) / totalSessions
          )
        : 0

    // Feedback analysis
    const testedWithFeedback = job.applications.filter((app) => app.feedback && app.rating).length
    const avgRating =
      testedWithFeedback > 0
        ? (job.applications
            .filter((app) => app.rating)
            .reduce((sum, app) => sum + (app.rating || 0), 0) / testedWithFeedback)
            .toFixed(1)
        : 'N/A'

    // Feedback by category (extract from feedback text)
    const feedbackThemes: Record<string, number> = {}
    const keywords = {
      'Crashes/Bugs': ['crash', 'bug', 'error', 'fail', 'broken'],
      'UI/UX': ['ui', 'ux', 'interface', 'design', 'layout', 'button', 'menu'],
      'Performance': ['slow', 'lag', 'performance', 'battery', 'memory'],
      'Features': ['feature', 'feature request', 'add', 'missing'],
      'Positive': ['love', 'great', 'excellent', 'awesome', 'good', 'like'],
    }

    job.applications.forEach((app) => {
      if (app.feedback) {
        const feedbackLower = app.feedback.toLowerCase()
        Object.entries(keywords).forEach(([theme, words]) => {
          if (words.some((word) => feedbackLower.includes(word))) {
            feedbackThemes[theme] = (feedbackThemes[theme] || 0) + 1
          }
        })
      }
    })

    // Compliance check
    const testingStartDate = job.publishedAt || job.createdAt
    const now = new Date()
    const daysActive = Math.floor((now.getTime() - testingStartDate.getTime()) / (1000 * 60 * 60 * 24))
    const meetsMinDuration = daysActive >= 14

    // Tester details
    const testerDetails = job.applications.map((app) => ({
      testerId: app.tester.id,
      testerName: app.tester.name,
      testerEmail: app.tester.email,
      testerRating: app.tester.averageRating,
      status: app.status,
      feedbackProvided: app.feedback ? true : false,
      appRating: app.rating,
      appLaunches: app.usageLogs.filter((log) => log.eventType === 'APP_LAUNCH').length,
      featuresUsed: [
        ...new Set(
          app.usageLogs
            .filter((log) => log.eventType === 'FEATURE_USED' && log.featureName)
            .map((log) => log.featureName)
        ),
      ],
      sessions: app.usageLogs.filter((log) => log.eventType === 'SESSION_END').length,
      optedIn: app.optInVerified,
      testingStarted: app.testingStartDate,
      testingEnded: app.testingEndDate,
    }))

    const report = {
      jobId: job.id,
      appName: job.appName,
      developer: {
        id: job.developer.id,
        name: job.developer.name,
        email: job.developer.email,
      },
      testingPeriod: {
        startDate: job.publishedAt || job.createdAt,
        expectedDuration: job.testDuration,
        daysActive,
        meetsMinDuration,
      },
      recruitment: {
        totalTestersRecruited,
        approvedTesters,
        activeTesters,
        completedTesters,
        rejectedTesters: job.applications.filter((app) => app.status === 'REJECTED').length,
      },
      engagement: {
        totalAppLaunches,
        uniqueFeaturesUsed: uniqueFeaturesUsed.length,
        featuresUsedList: uniqueFeaturesUsed,
        totalFeedbackSubmitted,
        totalSessions,
        avgSessionDuration,
        avgAppLaunchesPerTester: totalTestersRecruited > 0 ? (totalAppLaunches / totalTestersRecruited).toFixed(1) : 0,
        testingCoverage: `${(approvedTesters > 0 ? ((activeTesters + completedTesters) / approvedTesters * 100) : 0).toFixed(0)}%`,
      },
      feedback: {
        testedWithFeedback,
        avgRating,
        feedbackThemes,
      },
      testerDetails,
      complianceCheck: {
        meetsMinDuration,
        minTestersMet: approvedTesters >= job.testersNeeded,
        feedbackCollected: totalFeedbackSubmitted > 0,
        status: meetsMinDuration && approvedTesters >= job.testersNeeded ? 'READY_FOR_PRODUCTION' : 'IN_PROGRESS',
      },
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      report,
    })
  } catch (error) {
    console.error('Generate report error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
