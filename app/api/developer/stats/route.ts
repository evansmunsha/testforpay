// app/api/developer/stats/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active jobs count
    const activeJobs = await prisma.testingJob.count({
      where: {
        developerId: currentUser.userId,
        status: 'ACTIVE'
      }
    })

    // Get total testers (approved applications across all jobs)
    const totalTesters = await prisma.application.count({
      where: {
        job: {
          developerId: currentUser.userId
        },
        status: {
          in: ['APPROVED', 'OPTED_IN', 'VERIFIED', 'TESTING', 'COMPLETED']
        }
      }
    })

    // Get pending reviews (applications waiting for approval)
    const pendingReviews = await prisma.application.count({
      where: {
        job: {
          developerId: currentUser.userId
        },
        status: 'PENDING'
      }
    })

    // Get total spent (sum of all completed payments)
    const payments = await prisma.payment.aggregate({
      where: {
        job: {
          developerId: currentUser.userId
        },
        status: 'COMPLETED'
      },
      _sum: {
        totalAmount: true
      }
    })

    return NextResponse.json({
      activeJobs,
      totalTesters,
      pendingReviews,
      totalSpent: payments._sum.totalAmount || 0
    })

  } catch (error) {
    console.error('Developer stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}