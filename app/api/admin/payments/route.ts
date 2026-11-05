import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { recordAdminAction } from '@/lib/admin-audit'
import { sendNotification, NotificationTemplates } from '@/lib/notifications'

// Admin paid the tester by hand (Payoneer or mobile money) and records it here.
export async function POST(request: Request) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let body: { paymentId?: unknown; reason?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Send the payment and how you paid, then try again.' }, { status: 400 })
    }
    const id = typeof body.paymentId === 'string' ? body.paymentId : ''
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (!id) return NextResponse.json({ error: 'Payment not found' }, { status: 400 })
    if (reason.length < 10) {
      return NextResponse.json({ error: 'Write how you paid (at least 10 letters, for example: Payoneer, 12 Nov), then try again.' }, { status: 400 })
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        amount: true,
        application: { select: { testerId: true, status: true, testingPausedAt: true } },
      },
    })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.application.status !== 'COMPLETED' || payment.application.testingPausedAt) {
      return NextResponse.json({ error: 'You can only mark a payment as paid after the tester finished and testing is not paused.' }, { status: 409 })
    }

    const updated = await prisma.payment.updateMany({
      where: { id, transferId: null, status: { in: ['PROCESSING', 'FAILED'] } },
      data: { status: 'COMPLETED', completedAt: new Date(), transferId: `manual:${id}` },
    })
    if (updated.count !== 1) {
      return NextResponse.json({ error: 'This payment was already paid or changed. Refresh the page and look again.' }, { status: 409 })
    }

    await recordAdminAction({
      actorId: currentUser.userId,
      actorEmail: currentUser.email,
      action: 'mark_payout_paid_manually',
      targetType: 'payment',
      targetId: id,
      reason,
    })

    try {
      await sendNotification({
        userId: payment.application.testerId,
        ...NotificationTemplates.paymentReceived(payment.amount),
        url: '/dashboard/payments',
      })
    } catch (error) {
      console.error('Manual payout notification failed:', error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark paid error:', error)
    return NextResponse.json({ error: 'Could not save. Check your internet and try again.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const payments = await prisma.payment.findMany({
      include: {
        application: {
          include: {
            job: {
              select: {
                id: true,
                appName: true,
              },
            },
            tester: {
              select: {
                id: true,
                email: true,
                name: true,
                stripeAccountId: true,
                payoneerEmail: true,
                phoneNumber: true,
                countryCode: true,
              },
            },
          },
        },
        allocationHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            fromApplication: { select: { tester: { select: { name: true, email: true } } } },
            toApplication: { select: { tester: { select: { name: true, email: true } } } },
            actor: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const videoRows = await prisma.submissionVideo.findMany({
      where: {
        taskSubmissionId: { not: null },
        applicationId: { in: payments.map((payment) => payment.applicationId) },
      },
      select: { applicationId: true, developerConfirmedAt: true },
    })
    const videoStats = new Map<string, { uploaded: number; confirmed: number }>()
    for (const row of videoRows) {
      const stats = videoStats.get(row.applicationId) ?? { uploaded: 0, confirmed: 0 }
      stats.uploaded += 1
      if (row.developerConfirmedAt) stats.confirmed += 1
      videoStats.set(row.applicationId, stats)
    }

    const paymentsWithReasons = await Promise.all(payments.map(async (payment) => {
      let failureReason: string | null = null
      if (payment.status === 'FAILED') {
        const stripeAccountId = payment.application?.tester?.stripeAccountId
        if (!stripeAccountId) {
          failureReason = 'Tester has no connected Stripe account'
        } else {
          try {
            const account = await stripe.accounts.retrieve(stripeAccountId)
            const payoutsEnabled = account.payouts_enabled === true
            const hasBlockingRequirements =
              Array.isArray(account.requirements?.currently_due) &&
              account.requirements.currently_due.length > 0

            if (!payoutsEnabled || hasBlockingRequirements) {
              failureReason = `Payouts not enabled (country: ${account.country || 'unknown'})`
            } else {
              failureReason = 'Transfer failed. Check Stripe logs'
            }
          } catch (error) {
            failureReason = 'Transfer failed. Check Stripe logs'
          }
        }
      }
      return {
        ...payment,
        videoStats: videoStats.get(payment.applicationId) ?? { uploaded: 0, confirmed: 0 },
        failureReason,
      }
    }))

    return NextResponse.json({ payments: paymentsWithReasons })
  } catch (error) {
    console.error('Admin payments fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
