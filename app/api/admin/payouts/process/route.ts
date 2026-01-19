import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { processCompletedTests } from '@/lib/payouts'

export async function POST() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = await processCompletedTests()

    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      details: results 
    })
  } catch (error) {
    console.error('Payout processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process payouts' },
      { status: 500 }
    )
  }
}
