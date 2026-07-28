// app/api/jobs/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { toCents } from '@/lib/currency'
import type { Prisma } from '@/generated/prisma/client'

type PlanType = 'STARTER' | 'GROWTH' | 'PRO'

interface PlanConfig {
  label: string
  testers: number
  paymentPerTesterEur: number
  platformFeeEur: number
  totalEur: number
  duration: number
}

const PLANS: Record<PlanType, PlanConfig> = {
  STARTER: {
    label: 'Starter',
    testers: 12,
    paymentPerTesterEur: 2.30,
    platformFeeEur: 0.40,
    totalEur: 28,
    duration: 14,
  },
  GROWTH: {
    label: 'Growth',
    testers: 15,
    paymentPerTesterEur: 2.75,
    platformFeeEur: 6.75,
    totalEur: 48,
    duration: 14,
  },
  PRO: {
    label: 'Pro',
    testers: 25,
    paymentPerTesterEur: 2.75,
    platformFeeEur: 9.25,
    totalEur: 78,
    duration: 14,
  },
}

function normalizePlanType(plan: string): PlanType | null {
  const upper = plan?.toUpperCase()
  if (upper === 'STARTER') return 'STARTER'
  if (upper === 'GROWTH') return 'GROWTH'
  if (upper === 'PRO' || upper === 'PROFESSIONAL') return 'PRO'
  return null
}

interface CreateJobRequestBody {
  appName?: string
  appDescription?: string
  packageName?: string
  googlePlayLink?: string
  planType?: string
  testersNeeded?: number
  testDuration?: number
  paymentPerTester?: number
  appCategory?: string
  minAndroidVersion?: string
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

    if (currentUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Only developers can create jobs' },
        { status: 403 }
      )
    }

    const body = await request.json() as CreateJobRequestBody
    const { 
      appName, 
      appDescription, 
      packageName, 
      googlePlayLink, 
      planType: rawPlanType,
      appCategory,
      minAndroidVersion,
    } = body

    // Validation
    if (!appName || !appDescription || !googlePlayLink) {
      return NextResponse.json(
        { error: 'Missing required fields: appName, appDescription, and googlePlayLink are required' },
        { status: 400 }
      )
    }

    // Validate and resolve plan
    const planType = normalizePlanType(rawPlanType || '')
    if (!planType) {
      return NextResponse.json(
        { error: 'Invalid plan type. Choose Starter, Growth, or Pro.' },
        { status: 400 }
      )
    }

    const plan = PLANS[planType]

    // Validate Google Play link format (basic check)
    if (!googlePlayLink.includes('play.google.com/apps/testing/')) {
      return NextResponse.json(
        { error: 'Invalid Google Play closed test link. It should look like: https://play.google.com/apps/testing/com.example.app' },
        { status: 400 }
      )
    }

    // Convert EUR amounts to cents for storage
    const paymentPerTesterCents = toCents(plan.paymentPerTesterEur)
    const totalBudgetCents = toCents(plan.paymentPerTesterEur * plan.testers)
    const platformFeeCents = toCents(plan.platformFeeEur)
    const totalCostCents = toCents(plan.totalEur)

    // Create job in DRAFT status
    const job = await prisma.testingJob.create({
      data: {
        developerId: currentUser.userId,
        appName: appName.trim(),
        appDescription: appDescription.trim(),
        packageName: packageName?.trim() || null,
        googlePlayLink: googlePlayLink.trim(),
        appCategory: appCategory?.trim() || null,
        minAndroidVersion: minAndroidVersion?.trim() || null,
        testersNeeded: plan.testers,
        testDuration: plan.duration,
        paymentPerTester: paymentPerTesterCents,
        totalBudget: totalBudgetCents,
        platformFee: platformFeeCents,
        status: 'DRAFT',
        planType: planType,
      }
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      planType: planType,
      totalCostEur: plan.totalEur,
      totalCostCents: totalCostCents,
      requiresPayment: true,
      message: `Job created with ${plan.label || planType} plan. Complete payment of ${plan.totalEur} EUR before publishing.`,
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