import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const submitFeedbackSchema = z.object({
  type: z.enum(['developer', 'tester']),
  rating: z.number().min(1).max(5),
  title: z.string().min(5).max(100),
  message: z.string().min(10).max(1000),
  displayName: z.string().optional(),
  companyName: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validated = submitFeedbackSchema.parse(body)

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        userId: currentUser.userId,
        type: validated.type,
        rating: validated.rating,
        title: validated.title,
        message: validated.message,
        displayName: validated.displayName,
        companyName: validated.companyName,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback! We appreciate it.',
      feedback,
    })
  } catch (error) {
    console.error('Submit feedback error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid feedback data' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}

// Get approved feedback for landing page
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const type = url.searchParams.get('type') // 'developer' or 'tester' or null for all
    const limit = parseInt(url.searchParams.get('limit') || '6')

    const where: any = {
      approved: true,
    }

    if (type && ['developer', 'tester'].includes(type)) {
      where.type = type
    }

    const feedback = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        rating: true,
        title: true,
        message: true,
        displayName: true,
        companyName: true,
        type: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      feedback,
      count: feedback.length,
    })
  } catch (error) {
    console.error('Get feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}
