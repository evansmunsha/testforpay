import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST - Create or update device info
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
        { error: 'Only testers can add device info' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { deviceModel, androidVersion, screenSize } = body

    // Check if device info already exists
    const existingDeviceInfo = await prisma.deviceInfo.findUnique({
      where: { userId: currentUser.userId },
    })

    let deviceInfo

    if (existingDeviceInfo) {
      // Update existing
      deviceInfo = await prisma.deviceInfo.update({
        where: { userId: currentUser.userId },
        data: {
          deviceModel,
          androidVersion,
          screenSize,
        },
      })
    } else {
      // Create new
      deviceInfo = await prisma.deviceInfo.create({
        data: {
          userId: currentUser.userId,
          deviceModel,
          androidVersion,
          screenSize,
        },
      })
    }

    return NextResponse.json({
      success: true,
      deviceInfo,
    })
  } catch (error) {
    console.error('Device info error:', error)
    return NextResponse.json(
      { error: 'Failed to save device info' },
      { status: 500 }
    )
  }
}