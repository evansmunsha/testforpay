import { NextResponse } from 'next/server'
import { processCompletedTests } from '@/lib/payouts'

// This endpoint should be called by a cron service (e.g., Vercel Cron)
// Vercel Cron: Add to vercel.json crons configuration
// Or use external service like cron-job.org

export async function GET(request: Request) {
  try {
    // Verify the request is from a valid cron service
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // If CRON_SECRET is set, require it for authentication
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('Cron auth failed - invalid or missing token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting automated payout processing...')
    
    const results = await processCompletedTests()
    
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`Payout processing complete: ${successCount} success, ${failCount} failed`)

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${results.length} applications`,
      successCount,
      failCount,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Cron payout processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process payouts', message: error.message },
      { status: 500 }
    )
  }
}

// Also support POST for webhook-style calls
export async function POST(request: Request) {
  return GET(request)
}
