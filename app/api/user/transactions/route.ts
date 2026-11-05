import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'

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

// A tester asks the admin to pay them now. The admin gets a notification.
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'TESTER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { paymentId?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Something went wrong. Refresh the page and try again.' }, { status: 400 })
    }
    const paymentId = typeof body.paymentId === 'string' ? body.paymentId : ''
    if (!paymentId) return NextResponse.json({ error: 'Payment not found' }, { status: 400 })

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        job: { select: { appName: true } },
        application: { select: { testerId: true, status: true, testingPausedAt: true } },
      },
    })
    if (!payment || payment.application.testerId !== currentUser.userId) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    if (payment.application.status !== 'COMPLETED' || payment.application.testingPausedAt || !['PROCESSING', 'FAILED'].includes(payment.status)) {
      return NextResponse.json({ error: 'You can ask for payment only after your testing is finished.' }, { status: 409 })
    }

    const tester = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { name: true, email: true, payoneerEmail: true, phoneNumber: true },
    })
    if (!tester?.payoneerEmail && !tester?.phoneNumber) {
      return NextResponse.json({ error: 'First add your Payoneer email or mobile money number in Settings, so we know where to send your money.' }, { status: 400 })
    }

    const url = `/dashboard/admin?payment=${payment.id}`
    const already = await prisma.notification.findFirst({
      where: { type: 'payout_request', url, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      select: { id: true },
    })
    if (already) {
      return NextResponse.json({ success: true, alreadyRequested: true })
    }

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
    for (const admin of admins) {
      try {
        await sendNotification({
          userId: admin.id,
          title: 'Payout request',
          body: `${tester.name || tester.email} asked to be paid for ${payment.job.appName}.`,
          url,
          type: 'payout_request',
        })
      } catch (error) {
        console.error('Payout request notification failed:', error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payout request error:', error)
    return NextResponse.json({ error: 'Could not send your request. Check your internet and try again.' }, { status: 500 })
  }
}
