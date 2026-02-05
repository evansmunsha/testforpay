import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { stripe } from '@/lib/stripe'

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

    const paymentsWithReasons = await Promise.all(payments.map(async (payment) => {
      let failureReason: string | null = null
      if (payment.status === 'FAILED') {
        const stripeAccountId = payment.application?.tester?.stripeAccountId
        if (!stripeAccountId) {
          failureReason = 'Tester has no connected Stripe account'
        } else {
          try {
            const account = await stripe.accounts.retrieve(stripeAccountId, {
              expand: ['external_accounts'],
            })
            const externalAccounts = account.external_accounts?.data ?? []
            const hasEurExternalAccount = externalAccounts.some((external) => {
              if (!('currency' in external)) return false
              return external.currency?.toLowerCase() === 'eur'
            })
            const defaultCurrency = account.default_currency?.toLowerCase()
            if (!hasEurExternalAccount && defaultCurrency !== 'eur') {
              failureReason = `EUR payout not configured (country: ${account.country || 'unknown'})`
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
