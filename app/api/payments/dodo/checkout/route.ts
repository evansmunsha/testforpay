import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createDodoCheckoutSession, isDodoConfigured } from '@/lib/dodo'

export const runtime = 'nodejs'

// POST { jobId } — starts a Dodo checkout for the developer's own unpaid job.
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    if (currentUser.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Only developers can pay for jobs' }, { status: 403 })
    }

    const developer = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { email: true, name: true, emailVerified: true },
    })
    if (!developer?.emailVerified) {
      return NextResponse.json({ error: 'Verify your email first, then try again.' }, { status: 403 })
    }

    if (!isDodoConfigured()) {
      return NextResponse.json({ error: 'Card payment is not ready yet. Please contact support.' }, { status: 503 })
    }

    const body = await request.json().catch(() => null)
    const jobId = typeof body?.jobId === 'string' ? body.jobId : ''
    if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })

    const job = await prisma.testingJob.findUnique({
      where: { id: jobId },
      select: { id: true, developerId: true, status: true, totalBudget: true, platformFee: true, isTraining: true },
    })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    if (job.developerId !== currentUser.userId) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    if (job.status !== 'DRAFT' || job.isTraining) {
      return NextResponse.json({ error: 'This job is already paid or does not need payment.' }, { status: 409 })
    }

    // The amount is always worked out here, never taken from the browser.
    const amountCents = Math.round(job.totalBudget + job.platformFee)
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return NextResponse.json({ error: 'The job price is not valid.' }, { status: 400 })
    }

    const transaction = await prisma.paymentTransaction.create({
      data: {
        provider: 'DODO',
        reference: `job_${job.id}_${Date.now()}`,
        jobId: job.id,
        developerId: currentUser.userId,
        amount: (amountCents / 100).toFixed(2),
        currency: 'EUR',
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const session = await createDodoCheckoutSession({
      amountCents,
      returnUrl: `${appUrl}/dashboard/jobs/${job.id}?payment=returned`,
      customerEmail: developer.email,
      customerName: developer.name,
      metadata: { jobId: job.id, developerId: currentUser.userId, reference: transaction.reference },
    })

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { providerReference: session.sessionId || null, checkoutUrl: session.checkoutUrl },
    })

    return NextResponse.json({ success: true, checkoutUrl: session.checkoutUrl })
  } catch (error) {
    console.error('Dodo checkout error:', error)
    return NextResponse.json({ error: 'The payment page could not open. Please try again.' }, { status: 500 })
  }
}
