import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification, NotificationTemplates } from '@/lib/notifications'
import { sendApplicationReceivedEmail } from '@/lib/email'
import { checkApplicationFraud } from '@/lib/fraud-detection'

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

    if (job.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This job is not accepting applications' },
        { status: 400 }
      )
    }

    // Check if job is full
    if (job._count.applications >= job.testersNeeded) {
      return NextResponse.json(
        { error: 'This job has reached maximum testers' },
        { status: 400 }
      )
    }

    // Check if user already applied
    const existingApplication = await prisma.application.findUnique({
      where: {
        jobId_testerId: {
          jobId,
          testerId: currentUser.userId,
        },
      },
    })

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this job' },
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
    const application = await prisma.application.create({
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

    // Create payment record
    await prisma.payment.create({
      data: {
        applicationId: application.id,
        jobId,
        amount: job.paymentPerTester,
        platformFee: job.paymentPerTester * 0.15,
        totalAmount: job.paymentPerTester * 1.15,
        status: 'PENDING',
      },
    })

    // Send notification email to developer
    try {
      const tester = await prisma.user.findUnique({
        where: { id: currentUser.userId },
      })

      await sendApplicationReceivedEmail(
        job.developer.email,
        {
          developerName: job.developer.name || 'Developer',
          appName: job.appName,
          testerEmail: tester?.email || 'Unknown',
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
    console.error('Create application error:', error)
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    )
  }
}