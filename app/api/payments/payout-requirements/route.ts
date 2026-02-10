import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    if (currentUser.role !== 'TESTER') {
      return NextResponse.json(
        { error: 'Only testers can view payout requirements' },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { stripeAccountId: true },
    })

    if (!user?.stripeAccountId) {
      return NextResponse.json({
        hasStripeAccount: false,
        requiredCurrency: 'EUR',
        country: null,
        defaultCurrency: null,
        supportedPayoutCurrencies: [],
        payoutsEnabled: false,
        hasBlockingRequirements: false,
      })
    }

    const account = await stripe.accounts.retrieve(user.stripeAccountId, {
      expand: ['external_accounts'],
    })
    const payoutsEnabled = account.payouts_enabled === true
    const hasBlockingRequirements =
      Array.isArray(account.requirements?.currently_due) &&
      account.requirements.currently_due.length > 0
    const externalAccounts = account.external_accounts?.data ?? []
    const supportedPayoutCurrencies = new Set<string>()
    if (account.default_currency) {
      supportedPayoutCurrencies.add(account.default_currency.toUpperCase())
    }
    for (const external of externalAccounts) {
      if (!('currency' in external)) continue
      if (external.currency) {
        supportedPayoutCurrencies.add(external.currency.toUpperCase())
      }
    }

    return NextResponse.json({
      hasStripeAccount: true,
      requiredCurrency: 'EUR',
      country: account.country ?? null,
      defaultCurrency: account.default_currency?.toUpperCase() ?? null,
      supportedPayoutCurrencies: Array.from(supportedPayoutCurrencies),
      payoutsEnabled,
      hasBlockingRequirements,
    })
  } catch (error) {
    console.error('Payout requirements fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payout requirements' },
      { status: 500 }
    )
  }
}
