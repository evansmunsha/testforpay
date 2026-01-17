// app/api/tester/stats/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active tests (currently testing)
    const activeTests = await prisma.application.count({
      where: {
        testerId: currentUser.userId,
        status: 'TESTING'
      }
    })

    // Get completed tests
    const completedTests = await prisma.application.count({
      where: {
        testerId: currentUser.userId,
        status: 'COMPLETED'
      }
    })

    // Get pending applications
    const pendingApplications = await prisma.application.count({
      where: {
        testerId: currentUser.userId,
        status: 'PENDING'
      }
    })

    // Get total earned (sum of all completed payments to this tester)
    const payments = await prisma.payment.aggregate({
      where: {
        application: {
          testerId: currentUser.userId
        },
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    })

    return NextResponse.json({
      activeTests,
      completedTests,
      pendingApplications,
      totalEarned: payments._sum.amount || 0
    })

  } catch (error) {
    console.error('Tester stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}