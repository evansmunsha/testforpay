import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { password, confirmText } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to delete account' },
        { status: 400 }
      )
    }

    if (confirmText !== 'DELETE') {
      return NextResponse.json(
        { error: 'Please type DELETE to confirm' },
        { status: 400 }
      )
    }

    // Get the user with password
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { password: true, role: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Password is incorrect' },
        { status: 400 }
      )
    }

    // Check if user has active jobs (for developers)
    if (user.role === 'DEVELOPER') {
      const activeJobs = await prisma.testingJob.count({
        where: {
          developerId: currentUser.userId,
          status: { in: ['ACTIVE', 'DRAFT'] },
        },
      })

      if (activeJobs > 0) {
        return NextResponse.json(
          { error: 'Cannot delete account with active jobs. Please complete or cancel them first.' },
          { status: 400 }
        )
      }
    }

    // Check if user has ongoing testing (for testers)
    if (user.role === 'TESTER') {
      const ongoingTests = await prisma.application.count({
        where: {
          testerId: currentUser.userId,
          status: { in: ['APPROVED', 'TESTING', 'OPTED_IN'] },
        },
      })

      if (ongoingTests > 0) {
        return NextResponse.json(
          { error: 'Cannot delete account while you have ongoing tests. Please complete them first.' },
          { status: 400 }
        )
      }
    }

    // Delete user's applications first (foreign key constraint)
    await prisma.application.deleteMany({
      where: { testerId: currentUser.userId },
    })

    // Delete user's jobs if developer (foreign key constraint)
    if (user.role === 'DEVELOPER') {
      await prisma.testingJob.deleteMany({
        where: { developerId: currentUser.userId },
      })
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: currentUser.userId },
    })

    // Clear the session cookie
    const cookieStore = await cookies()
    cookieStore.delete('session')

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
