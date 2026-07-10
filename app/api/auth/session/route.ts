import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Get full user data from database
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        stripeAccountId: true,
        muteDeveloperReplies: true,
      },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('Session error:', error instanceof Error ? error.message : error)
    
    // Return 503 Service Unavailable for database/infra errors so clients
    // can distinguish infra issues (retry) from auth failures (don't retry).
    return NextResponse.json(
      { error: 'Service temporarily unavailable', reason: 'database' },
      { status: 503 }
    )
  }
}
