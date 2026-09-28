import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { Prisma } from '@/generated/prisma/client'

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(10, parseInt(url.searchParams.get('limit') || '20', 10)))
    const search = url.searchParams.get('search') || ''
    const role = url.searchParams.get('role') || ''
    const status = url.searchParams.get('status') || ''
    const emailVerified = url.searchParams.get('emailVerified') || ''
    const sortBy = url.searchParams.get('sortBy') || 'createdAt'
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'

    // Build where clause
    const where: Prisma.UserWhereInput = {}

    // Search filter
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Role filter
    if (role && ['ADMIN', 'DEVELOPER', 'TESTER'].includes(role)) {
      where.role = role as any
    }

    // Status filter
    if (status === 'suspended') {
      where.suspended = true
    } else if (status === 'active') {
      where.suspended = false
    }

    // Email verification filter
    if (emailVerified === 'true') {
      where.emailVerified = true
    } else if (emailVerified === 'false') {
      where.emailVerified = false
    }

    // Build orderBy
    let orderBy: any = { createdAt: 'desc' }
    if (sortBy === 'loginCount') {
      orderBy = { loginCount: sortOrder }
    } else if (sortBy === 'lastLoginAt') {
      orderBy = { lastLoginAt: sortOrder }
    } else if (sortBy === 'email') {
      orderBy = { email: sortOrder }
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder }
    }

    // Get total count
    const total = await prisma.user.count({ where })

    // Get paginated users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        stripeAccountId: true,
        suspended: true,
        suspendReason: true,
        suspendedAt: true,
        lastLoginAt: true,
        loginCount: true,
        emailVerified: true,
        _count: {
          select: {
            developedJobs: true,
            applications: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Admin users fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
