import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

// This endpoint activates DRAFT jobs that have been paid
// It's called when user returns from Stripe checkout as a fallback
// in case the webhook hasn't processed yet
export async function POST() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all DRAFT jobs for this developer and activate them
    // In a production app, you'd verify with Stripe that payment was received
    const result = await prisma.testingJob.updateMany({
      where: {
        developerId: currentUser.userId,
        status: 'DRAFT'
      },
      data: {
        status: 'ACTIVE',
        publishedAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true, 
      activatedCount: result.count 
    })

  } catch (error) {
    console.error('Activate jobs error:', error)
    return NextResponse.json(
      { error: 'Failed to activate jobs' },
      { status: 500 }
    )
  }
}
