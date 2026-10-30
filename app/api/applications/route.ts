import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification, NotificationTemplates } from '@/lib/notifications'
import { sendApplicationReceivedEmail } from '@/lib/email'
import { checkApplicationFraud } from '@/lib/fraud-detection'
import { passesDeclaredJobScreening } from '@/lib/tester-eligibility'
import { isAfricanCountry } from '@/lib/training-rules'

// GET - List user's applications
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {
      testerId: currentUser.userId,
    }

    if (status) {
      where.status = status
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        job: {
          include: {
            developer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ success: true, applications })
  } catch (error) {
    console.error('Get applications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}

// POST - Apply to a job
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    if (currentUser.role !== 'TESTER') {
      return NextResponse.json(
        { error: 'Only testers can apply to jobs' },
        { status: 403 }
      )
    }

    // SECURITY: Require verified email for critical actions.
    // TEMPORARILY DISABLED FOR MVP - Comment out when adding email verification requirement back
    // const tester = await prisma.user.findUnique({
    //   where: { id: currentUser.userId },
    //   select: { emailVerified: true },
    // })

    // if (!tester?.emailVerified) {
    //   return NextResponse.json(
    //     { error: 'Please verify your email to apply' },
    //     { status: 403 }
    //   )
    // }

    // Get IP and User-Agent for fraud detection
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      request.headers.get('x-real-ip') || 
                      null
    const userAgent = request.headers.get('user-agent') || null

    const body = await request.json()
    const { jobId } = body

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Check if job exists and is active
    const job = await prisma.testingJob.findUnique({
      where: { id: jobId },
      include: {
        developer: true,
        _count: {
          select: {
            applications: true,
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

    const canRecruitForPausedCohort = job.status === 'IN_PROGRESS' &&
      await prisma.application.count({
        where: {
          jobId,
          status: 'TESTING',
          testingPausedAt: { not: null },
          cohortSelected: true,
        },
      }) > 0
    if (job.status !== 'ACTIVE' && !canRecruitForPausedCohort) {
      return NextResponse.json(
        { error: 'This job is not accepting applications' },
        { status: 400 }
      )
    }

    if (job.scheduledStartAt && job.scheduledStartAt > new Date()) {
      return NextResponse.json(
        { error: 'Recruitment has closed because testing has been scheduled' },
        { status: 409 }
      )
    }
    if (job.supportedCountries.length === 0) {
      return NextResponse.json(
        { error: 'This job has not declared supported countries and cannot accept screened applications yet' },
        { status: 409 }
      )
    }
    const tester = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { countryCode: true, deviceInfo: { select: { androidVersion: true } } },
    })
    if (!tester?.countryCode || !tester.deviceInfo?.androidVersion) {
      return NextResponse.json(
        { error: 'Add your country and Android device details in Settings before applying' },
        { status: 400 }
      )
    }
    if (job.isTraining && !isAfricanCountry(tester.countryCode)) {
      return NextResponse.json(
        { error: 'Training is only available to testers in African countries.' },
        { status: 403 }
      )
    }
    if (!passesDeclaredJobScreening({
      testerCountryCode: tester.countryCode,
      testerAndroidVersion: tester.deviceInfo.androidVersion,
      supportedCountries: job.supportedCountries,
      minimumAndroidVersion: job.minAndroidVersion,
    })) {
      return NextResponse.json(
        { error: 'Your declared country or Android version does not meet this job’s stated requirements. Google Play availability may still vary by account or device.' },
        { status: 400 }
      )
    }

    // Run fraud detection
    const fraudCheck = await checkApplicationFraud(currentUser.userId, jobId, ipAddress)
    
    // Block highly suspicious applications
    if (fraudCheck.score >= 70) {
      return NextResponse.json(
        { error: 'Unable to process application. Please contact support.' },
        { status: 403 }
      )
    }

    // Create application with fraud tracking data
    // SECURITY: Guard against race conditions so we never exceed testersNeeded.
    const application = await prisma.$transaction(async (tx) => {
      // Lock job row to serialize capacity checks.
      await tx.$executeRaw`SELECT id FROM "TestingJob" WHERE id = ${jobId} FOR UPDATE`

      const latestJob = await tx.testingJob.findUnique({
        where: { id: jobId },
        select: {
          status: true,
          testersNeeded: true,
          scheduledStartAt: true,
          applications: {
            where: { status: 'TESTING', testingPausedAt: { not: null }, cohortSelected: true },
            select: { id: true },
          },
        },
      })

      const jobAcceptsApplications = latestJob &&
        (latestJob.status === 'ACTIVE' || (latestJob.status === 'IN_PROGRESS' && latestJob.applications.length > 0))
      if (
        !latestJob ||
        !jobAcceptsApplications ||
        (latestJob.scheduledStartAt && latestJob.scheduledStartAt > new Date())
      ) {
        throw new Error('JOB_NOT_ACTIVE')
      }

      const existingApplication = await tx.application.findUnique({
        where: {
          jobId_testerId: {
            jobId,
            testerId: currentUser.userId,
          },
        },
        include: {
          payment: { select: { id: true } },
        },
      })

      if (existingApplication) {
        if (existingApplication.status !== 'WITHDRAWN' || existingApplication.cohortSelected) {
          throw new Error('ALREADY_APPLIED')
        }

        return tx.application.update({
          where: { id: existingApplication.id },
          data: {
            status: 'PENDING',
            contactReleasedAt: null,
            optInVerified: false,
            verificationImage: null,
            verificationImage2: null,
            verifiedAt: null,
            screeningPassedAt: null,
            ipAddress,
            userAgent,
          },
          include: {
            job: {
              include: {
                developer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        })
      }

      const currentCount = await tx.application.count({
        where: {
          jobId,
          status: { notIn: ['REJECTED', 'INELIGIBLE', 'WITHDRAWN'] },
        },
      })

      if (currentCount >= latestJob.testersNeeded * 3) {
        throw new Error('JOB_FULL')
      }

      return tx.application.create({
        data: {
          jobId,
          testerId: currentUser.userId,
          status: 'PENDING',
          ipAddress,
          userAgent,
        },
        include: {
          job: {
            include: {
              developer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    })

    // Payment record will be created when developer approves the application
    // This ensures funds are only escrowed for applications the developer accepts

    // Send notification email to developer
    try {
      await sendApplicationReceivedEmail(
        job.developer.email,
        {
          developerName: job.developer.name || 'Developer',
          appName: job.appName,
          dashboardLink: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/jobs/${job.id}`,
        }
      )
    } catch (emailError) {
      console.error('Failed to send application notification email:', emailError)
    }

    // Send push notification to developer
    try {
      const tester = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: { name: true },
      })

      await sendNotification({
        userId: job.developerId,
        title: 'New Application',
        body: `${tester?.name || 'A tester'} applied to test "${job.appName}". Review their application.`,
        url: `/dashboard/jobs/${job.id}`,
        type: 'new_application',
      })
    } catch (notifyError) {
      console.error('Failed to send application notification:', notifyError)
    }

    return NextResponse.json({
      success: true,
      application,
      message: 'Application submitted successfully',
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'JOB_FULL') {
        return NextResponse.json(
          { error: 'This job has reached maximum testers' },
          { status: 400 }
        )
      }
      if (error.message === 'ALREADY_APPLIED') {
        return NextResponse.json(
          { error: 'You have already applied to this job' },
          { status: 400 }
        )
      }
      if (error.message === 'JOB_NOT_ACTIVE') {
        return NextResponse.json(
          { error: 'This job is not accepting applications' },
          { status: 400 }
        )
      }
    }
    console.error('Create application error:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}
