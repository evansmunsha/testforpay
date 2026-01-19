import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ transactions })
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
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json({ transactions })
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
