import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user's payments
    const payments = await prisma.payment.findMany({
      where: {
        application: {
          testerId: currentUser.userId,
        },
      },
      include: {
        application: {
          include: {
            job: true,
          },
        },
      },
    })

    // Calculate balances
    const totalEarned = payments
      .filter(p => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0)

    const pending = payments
      .filter(p => p.status === 'PENDING' || p.status === 'ESCROWED')
      .reduce((sum, p) => sum + p.amount, 0)

    const processing = payments
      .filter(p => p.status === 'PROCESSING')
      .reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      success: true,
      balance: {
        totalEarned,
        pending,
        processing,
        available: totalEarned,
      },
      payments,
    })
  } catch (error) {
    console.error('Get balance error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    )
  }
}