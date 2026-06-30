import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalUsers,
      totalDevelopers,
      totalTesters,
      totalJobs,
      activeJobs,
      completedJobs,
      cancelledJobs,
      totalApplications,
      completedApplications,
      stuckInVerification,
      droppedOutApplications,
      completedPayments,
      pendingPayments,
      failedPayments,
      thisMonthPayments,
      lastMonthPayments,
      totalContactMessages,
      activeUsersLast24h,
      activeUsersLast7d,
      activeUsersLast30d,
      newUsersLast7d,
      newUsersLast30d,
      verifiedEmailCount,
      testersWithStripe,
      jobsWithZeroApplications,
      newJobsLast7d,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'DEVELOPER' } }),
      prisma.user.count({ where: { role: 'TESTER' } }),
      prisma.testingJob.count(),
      prisma.testingJob.count({ where: { status: 'ACTIVE' } }),
      prisma.testingJob.count({ where: { status: 'COMPLETED' } }),
      prisma.testingJob.count({ where: { status: 'CANCELLED' } }),
      prisma.application.count(),
      prisma.application.count({ where: { status: 'COMPLETED' } }),
      // Testers approved but stuck — haven't uploaded verification after 48h
      prisma.application.count({
        where: {
          status: 'APPROVED',
          updatedAt: { lte: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
        },
      }),
      // Started testing but never completed (dropped out)
      prisma.application.count({ where: { status: 'TESTING' } }),
      // Revenue from completed payments
      prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        select: { platformFee: true, amount: true },
      }),
      prisma.payment.count({ where: { status: { in: ['PENDING', 'ESCROWED', 'PROCESSING'] } } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      // This month revenue
      prisma.payment.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: thisMonthStart } },
        select: { platformFee: true },
      }),
      // Last month revenue
      prisma.payment.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: lastMonth, lt: thisMonthStart } },
        select: { platformFee: true },
      }),
      prisma.contactMessage.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: last24h } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: last7d } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: last30d } } }),
      prisma.user.count({ where: { createdAt: { gte: last7d } } }),
      prisma.user.count({ where: { createdAt: { gte: last30d } } }),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.user.count({ where: { role: 'TESTER', stripeAccountId: { not: null } } }),
      // Active jobs with zero applications — need attention
      prisma.testingJob.count({
        where: {
          status: 'ACTIVE',
          applications: { none: {} },
        },
      }),
      prisma.testingJob.count({ where: { createdAt: { gte: last7d } } }),
    ])

    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.platformFee, 0)
    const totalPaidOut = completedPayments.reduce((sum, p) => sum + p.amount, 0)
    const revenueThisMonth = thisMonthPayments.reduce((sum, p) => sum + p.platformFee, 0)
    const revenueLastMonth = lastMonthPayments.reduce((sum, p) => sum + p.platformFee, 0)
    const revenueGrowth =
      revenueLastMonth === 0
        ? revenueThisMonth > 0 ? 100 : 0
        : Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)

    // Job completion rate
    const jobCompletionRate =
      totalJobs === 0 ? 0 : Math.round((completedJobs / totalJobs) * 100)

    // Application completion rate
    const appCompletionRate =
      totalApplications === 0 ? 0 : Math.round((completedApplications / totalApplications) * 100)

    return NextResponse.json({
      success: true,
      stats: {
        // Core counts
        totalUsers,
        totalDevelopers,
        totalTesters,
        totalJobs,
        activeJobs,
        completedJobs,
        cancelledJobs,
        totalApplications,
        totalContactMessages,
        totalRevenue,
        totalPaidOut,
        pendingPayments,
        failedPayments,

        // Revenue trend
        revenue: {
          allTime: totalRevenue,
          thisMonth: revenueThisMonth,
          lastMonth: revenueLastMonth,
          growthPercent: revenueGrowth,
        },

        // Platform performance
        performance: {
          jobCompletionRate,
          appCompletionRate,
          jobsWithZeroApplications,
          newJobsLast7d,
        },

        // Attention items — things that need admin action
        attention: {
          jobsWithZeroApplications,
          testersStuckInVerification: stuckInVerification,
          activeTesters: droppedOutApplications,
          failedPayments,
        },

        // Activity
        activity: {
          activeUsersLast24h,
          activeUsersLast7d,
          activeUsersLast30d,
          newUsersLast7d,
          newUsersLast30d,
        },

        // Platform health
        health: {
          verifiedEmailCount,
          unverifiedEmailCount: totalUsers - verifiedEmailCount,
          testersWithStripe,
          testersWithoutStripe: totalTesters - testersWithStripe,
        },
      },
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
