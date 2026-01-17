import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createJobSchema } from '@/lib/validators'

// GET - List all jobs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (userId) {
      where.developerId = userId
    }

    const jobs = await prisma.testingJob.findMany({
      where,
      include: {
        developer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ success: true, jobs })
  } catch (error) {
    console.error('Get jobs error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

// POST - Create new job
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    if (currentUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Only developers can create jobs' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate input
    const validatedData = createJobSchema.parse(body)

    // Calculate total budget and platform fee
    const totalBudget = validatedData.paymentPerTester * validatedData.testersNeeded
    const platformFee = totalBudget * 0.15 // 15% platform fee

    // Create job
    const job = await prisma.testingJob.create({
      data: {
        developerId: currentUser.userId,
        appName: validatedData.appName,
        appDescription: validatedData.appDescription,
        packageName: validatedData.packageName,
        googlePlayLink: validatedData.googlePlayLink,
        appCategory: validatedData.appCategory,
        testersNeeded: validatedData.testersNeeded,
        testDuration: validatedData.testDuration,
        minAndroidVersion: validatedData.minAndroidVersion,
        paymentPerTester: validatedData.paymentPerTester,
        totalBudget,
        platformFee,
        status: 'DRAFT', // Start as draft
      },
      include: {
        developer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      job,
      message: 'Job created successfully',
    })
  } catch (error) {
    console.error('Create job error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}