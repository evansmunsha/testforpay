import Stripe from 'stripe'
import { sendNotification } from './notifications'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

// Create payment intent for job creation
export async function createJobPaymentIntent(
  amount: number,
  jobId: string,
  developerId: string
) {
  // Amount is stored in EUR cents internally and should be charged in EUR.
  const paymentIntent = await stripe.paymentIntents.create({
    // Amount is stored/handled in cents (EUR cents).
    amount: amount,
    currency: 'eur',
    metadata: {
      jobId,
      developerId,
      type: 'job_payment',
      amountEurCents: amount.toString(),
    },
    automatic_payment_methods: {
      enabled: true,
    },
  })

  return paymentIntent
}

// Create Stripe Connect account for tester
export async function createConnectedAccount(email: string, testerId: string, country: string = 'US') {
  const account = await stripe.accounts.create({
    type: 'express',
    country,
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      testerId,
    },
  })

  return account
}

// Create account link for tester onboarding
export async function createAccountLink(accountId: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is not set')
  }

  // Strip trailing slash to avoid double slashes
  const baseUrl = appUrl.replace(/\/$/, '')

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/dashboard/settings?setup=refresh`,
    return_url: `${baseUrl}/dashboard/settings?setup=complete`,
    type: 'account_onboarding',
  })

  return accountLink
}

// Transfer payment to tester
export async function transferToTester({
  amount,
  currency = 'eur',
  destinationAccountId,
  metadata = {},
  transferGroup,
  adminUserId,
}: {
  amount: number
  currency?: string
  destinationAccountId: string
  metadata?: Record<string, string | number | boolean | null | undefined>
  transferGroup?: string
  adminUserId?: string // Pass admin userId for notification
}) {
  const serializedMetadata = Object.fromEntries(
    Object.entries(metadata).flatMap(([key, value]) =>
      value == null ? [] : [[key, String(value)]]
    )
  )

  // Fetch account details before transfer
  const account = await stripe.accounts.retrieve(destinationAccountId)
  console.log('Stripe account capabilities:', account.capabilities)
  console.log('Stripe account requirements:', account.requirements)

  // Check if transfers capability is active
  if (account.capabilities?.transfers !== 'active') {
    // Send admin notification
    if (adminUserId) {
      await sendNotification({
        userId: adminUserId,
        title: 'Payout Failed: Stripe Capability',
        body: `Payout to account ${destinationAccountId} failed. Reason: transfers capability not active. Requirements: ${JSON.stringify(account.requirements)}`,
        url: '/dashboard/admin?tab=payments',
        type: 'payout_failed',
      })
    }
    throw new Error(
      `Stripe account ${destinationAccountId} does not have active transfers capability. Requirements: ${JSON.stringify(account.requirements)}`
    )
  }

  // Proceed with transfer
  return await stripe.transfers.create({
    amount,
    currency,
    destination: destinationAccountId,
    metadata: serializedMetadata,
    transfer_group: transferGroup,
  })
}

// Get account balance
export async function getAccountBalance(stripeAccountId: string) {
  const balance = await stripe.balance.retrieve({
    stripeAccount: stripeAccountId,
  })

  return balance
}

// Refund payment intent (for job cancellation)
export async function refundPaymentIntent(paymentIntentId: string, amount?: number) {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    // Amount is stored/handled in cents.
    ...(amount && { amount }), // Partial refund if amount specified
  })

  return refund
}
