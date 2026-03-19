// app/api/jobs/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { toCents } from '@/lib/currency'
import type { Prisma } from '@/generated/prisma/client'

interface CreateJobRequestBody {
  appName?: string
  appDescription?: string
  packageName?: string
  googlePlayLink?: string
  planType?: string
  testersNeeded?: number
  testDuration?: number
  paymentPerTester?: number
}

const JOB_STATUS_FILTERS = ['DRAFT', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const
type JobStatusFilter = typeof JOB_STATUS_FILTERS[number]

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to create job'
}

function isJobStatusFilter(status: string): status is JobStatusFilter {
  return JOB_STATUS_FILTERS.includes(status as JobStatusFilter)
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a developer
    if (currentUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Only developers can create jobs' },
        { status: 403 }
      )
    }

    // SECURITY: Require verified email for critical actions.
    // TEMPORARILY DISABLED FOR MVP - Comment out when adding email verification requirement back
    // const developer = await prisma.user.findUnique({
    //   where: { id: currentUser.userId },
    //   select: { emailVerified: true },
    // })

    // if (!developer?.emailVerified) {
    //   return NextResponse.json(
    //     { error: 'Please verify your email to create jobs' },
    //     { status: 403 }
    //   )
    // }

    const body = await request.json() as CreateJobRequestBody
    const { 
      appName, 
      appDescription, 
      packageName, 
      googlePlayLink, 
      planType,
      testersNeeded,
      testDuration,
      paymentPerTester: customPaymentPerTester
    } = body

    // Validation
    if (!appName || !appDescription || !googlePlayLink) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Minimum requirements
    const MIN_TESTERS = 12
    const MIN_DURATION = 14
    const MIN_PAYMENT_EUR = 5

    // Use values provided by developer (with minimums enforced)
    const finalTestersNeeded = Math.max(MIN_TESTERS, testersNeeded || 20)
    const normalizedDuration = typeof testDuration === 'number' ? Math.trunc(testDuration) : undefined
    const finalTestDuration = Math.max(MIN_DURATION, normalizedDuration || 14)
    const paymentPerTesterEur = Math.max(MIN_PAYMENT_EUR, customPaymentPerTester || 7.5)
    const finalPaymentPerTester = toCents(paymentPerTesterEur)
    const finalTotalBudget = finalPaymentPerTester * finalTestersNeeded

    const platformFeePercent = 0.15
    const platformFee = Math.round(finalTotalBudget * platformFeePercent)

    // Create job in DRAFT status
    const job = await prisma.testingJob.create({
      data: {
        developerId: currentUser.userId,
        appName,
        appDescription,
        packageName: packageName || null,
        googlePlayLink,
        testersNeeded: finalTestersNeeded,
        testDuration: finalTestDuration,
        paymentPerTester: finalPaymentPerTester,
        totalBudget: finalTotalBudget,
        platformFee,
        status: 'DRAFT'
      }
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      requiresPayment: true,
      message: 'Job created. Complete payment in USD before publishing.',
    })

  } catch (error) {
    console.error('Job creation error:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Build where clause based on user role
    const where: Prisma.TestingJobWhereInput = {}

    // Developers see only their own jobs
    // Testers see all ACTIVE jobs (for browsing)
    if (currentUser.role === 'DEVELOPER') {
      where.developerId = currentUser.userId
    } else if (currentUser.role === 'TESTER') {
      // Testers can only see ACTIVE jobs
      where.status = 'ACTIVE'
    }

    // Apply status filter if provided (for developers filtering their own jobs)
    if (status && currentUser.role === 'DEVELOPER' && isJobStatusFilter(status)) {
      where.status = status
    }

    const jobs = await prisma.testingJob.findMany({
      where,
      include: {
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ jobs })

  } catch (error) {
    console.error('Jobs fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
