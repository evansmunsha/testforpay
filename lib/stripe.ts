import Stripe from 'stripe'

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
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    metadata: {
      jobId,
      developerId,
      type: 'job_payment',
    },
    automatic_payment_methods: {
      enabled: true,
    },
  })

  return paymentIntent
}

// Create Stripe Connect account for tester
export async function createConnectedAccount(email: string, testerId: string) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email,
    capabilities: {
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
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?setup=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?setup=complete`,
    type: 'account_onboarding',
  })

  return accountLink
}

// Transfer payment to tester
export async function transferToTester(
  amount: number,
  stripeAccountId: string,
  applicationId: string
) {
  const transfer = await stripe.transfers.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    destination: stripeAccountId,
    metadata: {
      applicationId,
      type: 'tester_payout',
    },
  })

  return transfer
}

// Get account balance
export async function getAccountBalance(stripeAccountId: string) {
  const balance = await stripe.balance.retrieve({
    stripeAccount: stripeAccountId,
  })

  return balance
}