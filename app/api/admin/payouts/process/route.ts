import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { processCompletedTests } from '@/lib/payouts'
import { recordAdminAction } from '@/lib/admin-audit'

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { reason?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'A reason is required to process payouts' }, { status: 400 })
    }
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (reason.length < 10) {
      return NextResponse.json({ error: 'Provide a reason of at least 10 characters' }, { status: 400 })
    }

    const results = await processCompletedTests()
    await recordAdminAction({ actorId: currentUser.userId, actorEmail: currentUser.email, action: 'process_payouts', targetType: 'payout_batch', targetId: 'manual', reason })

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
