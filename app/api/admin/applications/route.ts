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

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(200, Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? '100', 10) || 100))

    const [total, applications] = await Promise.all([
      prisma.application.count(),
      prisma.application.findMany({
      include: {
        job: {
          select: {
            id: true,
            appName: true,
            developerId: true,
            developer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        tester: {
          select: {
            id: true,
            email: true,
            name: true,
            countryCode: true,
            deviceInfo: {
              select: {
                deviceModel: true,
                androidVersion: true,
                screenSize: true,
              },
            },
          },
        },
        payment: { select: { id: true, status: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    ])

    return NextResponse.json({
      applications,
      pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    })
  } catch (error) {
    console.error('Admin applications fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
