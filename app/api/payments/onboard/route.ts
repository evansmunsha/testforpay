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
    return NextResponse.json(
      { error: 'Failed to create onboarding link' },
      { status: 500 }
    )
  }
}