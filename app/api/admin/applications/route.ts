import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const applications = await prisma.application.findMany({
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
        payment: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ applications })
  } catch (error) {
    console.error('Admin applications fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
