import { NextResponse } from 'next/server'
import { processCompletedTests, reconcileProcessingTransfers } from '@/lib/payouts'
import { finishCronExecution, startCronExecution } from '@/lib/cron-monitor'

// This endpoint should be called by a cron service (e.g., Vercel Cron)
// Vercel Cron: Add to vercel.json crons configuration
// Or use external service like cron-job.org

export async function GET(request: Request) {
  let cronExecution: Awaited<ReturnType<typeof startCronExecution>> | null = null
  try {
    // Verify the request is from a valid cron service
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.NODE_ENV === 'production'
    
    // SECURITY: In production, require a cron secret unconditionally.
    // This prevents public triggering if the env var is missing or misconfigured.
    if (isProduction && !cronSecret) {
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
    }
    if (isProduction) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.log('Cron auth failed - invalid or missing token')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Preserve current non-production behavior (only enforce when set)
      console.log('Cron auth failed - invalid or missing token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    cronExecution = await startCronExecution('process-payouts')

    console.log('Starting automated payout processing...')
    
    const results = await processCompletedTests()
    const reconciliation = await reconcileProcessingTransfers()
    
    const successCount = results.filter(r => r.status === 'success').length
    const failCount = results.filter(r => r.status === 'failed').length

    await finishCronExecution(
      cronExecution,
      failCount > 0 ? 'FAILED' : 'SUCCEEDED',
      failCount > 0 ? `${failCount} payout(s) failed` : undefined,
    )

    console.log(`Payout processing complete: ${successCount} success, ${failCount} failed`)

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${results.length} applications`,
      successCount,
      failCount,
      reconciliation,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Cron payout processing error:', error)
    if (cronExecution) {
      await finishCronExecution(cronExecution, 'FAILED', error.message || 'Unknown error')
    }
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
