import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (currentUser.role === 'DEVELOPER') {
      // For developers, show all payments related to their jobs
      const transactions = await prisma.payment.findMany({
        where: {
          job: { developerId: currentUser.userId }
        },
        include: {
          job: true,
          application: {
            include: {
              tester: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })

      const totalCount = await prisma.payment.count({
        where: {
          job: { developerId: currentUser.userId }
        },
      })

      const completedSum = await prisma.payment.aggregate({
        where: {
          job: { developerId: currentUser.userId },
          status: 'COMPLETED',
        },
        _sum: { totalAmount: true },
      })

      const pendingSum = await prisma.payment.aggregate({
        where: {
          job: { developerId: currentUser.userId },
          status: { in: ['PENDING', 'ESCROWED', 'PROCESSING'] },
        },
        _sum: { totalAmount: true },
      })

      return NextResponse.json({
        transactions,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
        summary: {
          totalSpent: completedSum._sum.totalAmount || 0,
          pending: pendingSum._sum.totalAmount || 0,
        },
      })
    } 
    
    if (currentUser.role === 'TESTER') {
      // For testers, show payments related to their applications
      const transactions = await prisma.payment.findMany({
        where: {
          application: { testerId: currentUser.userId }
        },
        include: {
          job: true,
          application: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      })
      const totalCount = await prisma.payment.count({
        where: {
          application: { testerId: currentUser.userId }
        },
      })

      const completedSum = await prisma.payment.aggregate({
        where: {
          application: { testerId: currentUser.userId },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      })

      const pendingSum = await prisma.payment.aggregate({
        where: {
          application: { testerId: currentUser.userId },
          status: { in: ['PENDING', 'ESCROWED', 'PROCESSING'] },
        },
        _sum: { amount: true },
      })

      return NextResponse.json({
        transactions,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
        summary: {
          totalEarned: completedSum._sum.amount || 0,
          pending: pendingSum._sum.amount || 0,
        },
      })
    }

    return NextResponse.json({ transactions: [] })

  } catch (error) {
    console.error('Transactions fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
