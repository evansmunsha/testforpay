// app/api/jobs/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover'
})

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a developer
    if (currentUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Only developers can create jobs' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      appName, 
      appDescription, 
      packageName, 
      googlePlayLink, 
      planType,
      testersNeeded,
      testDuration,
      paymentPerTester: customPaymentPerTester
    } = body

    // Validation
    if (!appName || !appDescription || !googlePlayLink) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Minimum requirements
    const MIN_TESTERS = 12
    const MIN_DURATION = 14
    const MIN_PAYMENT = 5

    // Use values provided by developer (with minimums enforced)
    let finalTestersNeeded = Math.max(MIN_TESTERS, testersNeeded || 20)
    const normalizedDuration = typeof testDuration === 'number' ? Math.trunc(testDuration) : undefined
    let finalTestDuration = Math.max(MIN_DURATION, normalizedDuration || 14)
    let finalPaymentPerTester = Math.max(MIN_PAYMENT, customPaymentPerTester || 7.5)
    let finalTotalBudget = finalPaymentPerTester * finalTestersNeeded

    const platformFeePercent = 0.15 
    const platformFee = finalTotalBudget * platformFeePercent

    // Create job in DRAFT status
    const job = await prisma.testingJob.create({
      data: {
        developerId: currentUser.userId,
        appName,
        appDescription,
        packageName: packageName || null,
        googlePlayLink,
        testersNeeded: finalTestersNeeded,
        testDuration: finalTestDuration,
        paymentPerTester: finalPaymentPerTester,
        totalBudget: finalTotalBudget,
        platformFee,
        status: 'DRAFT'
      }
    })

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `TestForPay - ${planType || 'Custom'} Plan`,
              description: `${finalTestersNeeded} verified testers for ${appName}`,
            },
            unit_amount: Math.round((finalTotalBudget + platformFee) * 100), // Total cost in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/jobs?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/jobs/new`,
      client_reference_id: job.id,
      metadata: {
        jobId: job.id,
        userId: currentUser.userId,
        planType
      }
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      requiresPayment: true,
      paymentUrl: checkoutSession.url
    })

  } catch (error: any) {
    console.error('Job creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create job' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Build where clause based on user role
    const where: any = {}

    // Developers see only their own jobs
    // Testers see all ACTIVE jobs (for browsing)
    if (currentUser.role === 'DEVELOPER') {
      where.developerId = currentUser.userId
    } else if (currentUser.role === 'TESTER') {
      // Testers can only see ACTIVE jobs
      where.status = 'ACTIVE'
    }

    // Apply status filter if provided (for developers filtering their own jobs)
    if (status && currentUser.role === 'DEVELOPER') {
      where.status = status
    }

    const jobs = await prisma.testingJob.findMany({
      where,
      include: {
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ jobs })

  } catch (error) {
    console.error('Jobs fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
