// app/api/developer/stats/route.ts
import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get active jobs count
    const activeJobs = await prisma.job.count({
      where: {
        developerId: userId,
        status: 'ACTIVE'
      }
    })

    // Get total testers (approved applications across all jobs)
    const totalTesters = await prisma.application.count({
      where: {
        job: {
          developerId: userId
        },
        status: {
          in: ['APPROVED', 'OPTED_IN', 'TESTING', 'COMPLETED']
        }
      }
    })

    // Get pending reviews (applications waiting for approval)
    const pendingReviews = await prisma.application.count({
      where: {
        job: {
          developerId: userId
        },
        status: 'PENDING'
      }
    })

    // Get total spent (sum of all completed payments)
    const payments = await prisma.payment.aggregate({
      where: {
        developerId: userId,
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    })

    return NextResponse.json({
      activeJobs,
      totalTesters,
      pendingReviews,
      totalSpent: payments._sum.amount || 0
    })

  } catch (error) {
    console.error('Developer stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}