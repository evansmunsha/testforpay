import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const paymentsWithReasons = payments.map((payment) => {
      let failureReason: string | null = null
      if (payment.status === 'FAILED') {
        if (!payment.application?.tester?.stripeAccountId) {
          failureReason = 'Tester has no connected Stripe account'
        } else {
          failureReason = 'Transfer failed. Check Stripe logs'
        }
      }
      return {
        ...payment,
        failureReason,
      }
    })

    return NextResponse.json({ payments: paymentsWithReasons })
  } catch (error) {
    console.error('Admin payments fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
