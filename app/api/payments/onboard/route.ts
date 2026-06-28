import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createConnectedAccount, createAccountLink } from '@/lib/stripe'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
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
        { error: 'Only testers can set up payouts' },
        { status: 403 }
      )
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // SECURITY: Require verified email for payout onboarding.
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email to set up payouts' },
        { status: 403 }
      )
    }

    let accountId = user.stripeAccountId

    // Create Stripe account if doesn't exist
    if (!accountId) {
      const account = await createConnectedAccount(
        user.email,
        user.id
      )
      
      accountId = account.id

      // Save to database
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeAccountId: accountId },
      })
    }

    // Create account link for onboarding
    const accountLink = await createAccountLink(accountId)

    return NextResponse.json({
      success: true,
      url: accountLink.url,
    })
  } catch (error) {
    console.error('Stripe onboarding error:', error)

    // Surface Stripe-specific error messages to help diagnose issues
    if (error instanceof Error) {
      const stripeError = error as Error & { type?: string; code?: string; statusCode?: number }
      console.error('Stripe error details:', {
        message: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        statusCode: stripeError.statusCode,
      })
      return NextResponse.json(
        { error: stripeError.message || 'Failed to create onboarding link' },
        { status: stripeError.statusCode ?? 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create onboarding link' },
      { status: 500 }
    )
  }
}
