import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    await prisma.contactMessage.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Contact message deleted' })
  } catch (error) {
    console.error('Admin contact delete error:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}
