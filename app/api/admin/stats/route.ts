import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get all stats
    const [
      totalUsers,
      totalDevelopers,
      totalTesters,
      totalJobs,
      activeJobs,
      completedJobs,
      totalApplications,
      payments
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'DEVELOPER' } }),
      prisma.user.count({ where: { role: 'TESTER' } }),
      prisma.testingJob.count(),
      prisma.testingJob.count({ where: { status: 'ACTIVE' } }),
      prisma.testingJob.count({ where: { status: 'COMPLETED' } }),
      prisma.application.count(),
      prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        select: { platformFee: true, status: true }
      })
    ])

    const totalRevenue = payments.reduce((sum, p) => sum + p.platformFee, 0)
    const pendingPayments = await prisma.payment.count({
      where: { status: { in: ['PENDING', 'PROCESSING'] } }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalDevelopers,
        totalTesters,
        totalJobs,
        activeJobs,
        completedJobs,
        totalApplications,
        totalRevenue,
        pendingPayments,
      }
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}