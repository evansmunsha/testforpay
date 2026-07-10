import { NextResponse } from 'next/server'
import { getCurrentUser, touchUserActivity } from '@/lib/auth'

export async function POST() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    await touchUserActivity(currentUser.userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Heartbeat error:', error instanceof Error ? error.message : error)

    // Return 503 Service Unavailable for database/infra errors so clients
    // can distinguish infra issues (retry) from auth failures (don't retry).
    return NextResponse.json(
      { error: 'Service temporarily unavailable', reason: 'database' },
      { status: 503 }
    )
  }
}
