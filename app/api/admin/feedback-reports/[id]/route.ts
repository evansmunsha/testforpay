import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { resolved } = body

    if (typeof resolved !== 'boolean') {
      return NextResponse.json(
        { error: 'Resolved must be boolean' },
        { status: 400 }
      )
    }

    const updated = await prisma.feedbackReport.update({
      where: { id },
      data: { resolvedAt: resolved ? new Date() : null },
    })

    return NextResponse.json({ success: true, report: updated })
  } catch (error) {
    console.error('Update feedback report error:', error)
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    )
  }
}
