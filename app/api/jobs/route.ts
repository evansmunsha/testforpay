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
      title, 
      description, 
      packageName, 
      playStoreUrl, 
      planType,
      testersNeeded,
      testDuration 
    } = body

    // Validation
    if (!title || !description || !playStoreUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Determine pricing based on plan
    const planPricing: Record<string, { price: number, testers: number }> = {
      STARTER: { price: 150, testers: 20 },
      PROFESSIONAL: { price: 250, testers: 35 },
      ENTERPRISE: { price: 0, testers: 50 }
    }

    if (planType === 'ENTERPRISE') {
      return NextResponse.json(
        { error: 'Please contact sales for enterprise pricing', contactSales: true },
        { status: 400 }
      )
    }

    const plan = planPricing[planType]
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      )
    }

    // Calculate amounts
    const paymentPerTester = plan.price / plan.testers
    const platformFeePercent = 0.15 // 15% platform fee
    const totalBudget = plan.price
    const platformFee = totalBudget * platformFeePercent

    // Create job in DRAFT status
    const job = await prisma.testingJob.create({
      data: {
        developerId: currentUser.userId,
        appName: title,
        appDescription: description,
        packageName: packageName || null,
        googlePlayLink: playStoreUrl,
        testersNeeded: testersNeeded || plan.testers,
        testDuration: testDuration || 14,
        paymentPerTester,
        totalBudget,
        platformFee,
        status: 'DRAFT' // Will be ACTIVE after payment
      }
    })

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `TestForPay - ${planType} Plan`,
              description: `${plan.testers} verified testers for ${title}`,
            },
            unit_amount: plan.price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/jobs?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/jobs/new`,
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

    // Build where clause
    const where: any = {
      developerId: currentUser.userId
    }

    if (status) {
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

    return NextResponse.json(jobs)

  } catch (error) {
    console.error('Jobs fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}