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
    const resolved = url.searchParams.get('resolved') // 'true' | 'false' | null

    const where: any = {}
    if (resolved === 'true') {
      where.resolvedAt = { not: null }
    } else if (resolved === 'false') {
      where.resolvedAt = null
    }

    const reports = await prisma.feedbackReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        application: {
          select: {
            id: true,
            developerReply: true,
            job: {
              select: {
                id: true,
                appName: true,
                developer: {
                  select: { id: true, email: true, name: true },
                },
              },
            },
          },
        },
        reporter: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      reports,
      total: reports.length,
    })
  } catch (error) {
    console.error('Admin feedback reports error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
