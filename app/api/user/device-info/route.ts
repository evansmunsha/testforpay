// app/api/user/device-info/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { deviceInfoSchema } from '@/lib/validators'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deviceInfo = await prisma.deviceInfo.findUnique({
      where: { userId: currentUser.userId }
    })

    return NextResponse.json(deviceInfo || null)

  } catch (error) {
    console.error('Device info fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch device info' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a tester
    if (currentUser.role !== 'TESTER') {
      return NextResponse.json(
        { error: 'Only testers can add device info' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate with Zod schema
    const validationResult = deviceInfoSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error },
        { status: 400 }
      )
    }

    const { deviceModel, androidVersion, screenSize } = validationResult.data

    // Upsert device info
    const deviceInfo = await prisma.deviceInfo.upsert({
      where: { userId: currentUser.userId },
      update: {
        deviceModel,
        androidVersion,
        screenSize: screenSize || null
      },
      create: {
        userId: currentUser.userId,
        deviceModel,
        androidVersion,
        screenSize: screenSize || null
      }
    })

    return NextResponse.json({
      success: true,
      deviceInfo
    })

  } catch (error) {
    console.error('Device info save error:', error)
    return NextResponse.json(
      { error: 'Failed to save device info' },
      { status: 500 }
    )
  }
}