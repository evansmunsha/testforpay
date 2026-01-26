import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const approved = url.searchParams.get('approved') // 'true', 'false', or null for all
    const type = url.searchParams.get('type')

    const where: any = {}

    if (approved === 'true') {
      where.approved = true
    } else if (approved === 'false') {
      where.approved = false
    }

    if (type && ['developer', 'tester'].includes(type)) {
      where.type = type
    }

    const feedback = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      feedback,
      total: feedback.length,
    })
  } catch (error) {
    console.error('Admin get feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}
