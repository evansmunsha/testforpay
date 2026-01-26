import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const questionnaireSchema = z.object({
  recruiterEase: z.enum([
    'very_easy',
    'easy',
    'moderate',
    'difficult',
    'very_difficult',
  ]),
  engagementSummary: z.string().min(50).max(2000),
  feedbackSummary: z.string().min(50).max(2000),
  targetAudience: z.string().min(20).max(1000),
  valueProposition: z.string().min(50).max(1000),
  expectedInstalls: z.enum([
    '0_to_100',
    '100_to_1k',
    '1k_to_10k',
    '10k_to_100k',
    '100k_to_1m',
    '1m_plus',
  ]),
  changesApplied: z.string().min(50).max(2000),
  readinessCriteria: z.string().min(50).max(2000),
})

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

    // Get questionnaire
    let questionnaire = await prisma.productionQuestionnaire.findUnique({
      where: { jobId: id },
    })

    // Create empty questionnaire if not exists
    if (!questionnaire) {
      questionnaire = await prisma.productionQuestionnaire.create({
        data: {
          jobId: id,
          developerId: currentUser.userId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      questionnaire,
    })
  } catch (error) {
    console.error('Get questionnaire error:', error)
    return NextResponse.json(
      { error: 'Failed to get questionnaire' },
      { status: 500 }
    )
  }
}

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

    // Validate input
    const validated = questionnaireSchema.parse(body)

    // Get the job
    const job = await prisma.testingJob.findUnique({
      where: { id },
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

    // Get or create questionnaire
    let questionnaire = await prisma.productionQuestionnaire.findUnique({
      where: { jobId: id },
    })

    if (!questionnaire) {
      questionnaire = await prisma.productionQuestionnaire.create({
        data: {
          jobId: id,
          developerId: currentUser.userId,
          ...validated,
          submitted: true,
          submittedAt: new Date(),
        },
      })
    } else {
      questionnaire = await prisma.productionQuestionnaire.update({
        where: { jobId: id },
        data: {
          ...validated,
          submitted: true,
          submittedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Questionnaire submitted successfully',
      questionnaire,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: (error as any).errors,
        },
        { status: 400 }
      )
    }

    console.error('Submit questionnaire error:', error)
    return NextResponse.json(
      { error: 'Failed to submit questionnaire' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    // Get the job
    const job = await prisma.testingJob.findUnique({
      where: { id },
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

    // Get questionnaire
    let questionnaire = await prisma.productionQuestionnaire.findUnique({
      where: { jobId: id },
    })

    if (!questionnaire) {
      return NextResponse.json(
        { error: 'Questionnaire not found' },
        { status: 404 }
      )
    }

    // Update questionnaire (partial update - save draft)
    questionnaire = await prisma.productionQuestionnaire.update({
      where: { jobId: id },
      data: body,
    })

    return NextResponse.json({
      success: true,
      message: 'Questionnaire saved as draft',
      questionnaire,
    })
  } catch (error) {
    console.error('Update questionnaire error:', error)
    return NextResponse.json(
      { error: 'Failed to update questionnaire' },
      { status: 500 }
    )
  }
}
