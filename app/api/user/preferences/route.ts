import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: {
        id: true,
        muteDeveloperReplies: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      preferences: {
        muteDeveloperReplies: user.muteDeveloperReplies,
      },
    })
  } catch (error) {
    console.error('Preferences fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { muteDeveloperReplies } = body

    if (typeof muteDeveloperReplies !== 'boolean') {
      return NextResponse.json(
        { error: 'muteDeveloperReplies must be boolean' },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: currentUser.userId },
      data: { muteDeveloperReplies },
      select: {
        id: true,
        muteDeveloperReplies: true,
      },
    })

    return NextResponse.json({
      success: true,
      preferences: updated,
    })
  } catch (error) {
    console.error('Preferences update error:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
