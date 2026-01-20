import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PATCH - Update user (suspend/unsuspend)
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
    const { action, reason } = body

    // Get user
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent admins from suspending themselves
    if (id === currentUser.userId) {
      return NextResponse.json(
        { error: 'Cannot modify your own account' },
        { status: 400 }
      )
    }

    // Prevent suspending other admins
    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot suspend admin accounts' },
        { status: 400 }
      )
    }

    if (action === 'suspend') {
      if (user.suspended) {
        return NextResponse.json(
          { error: 'User is already suspended' },
          { status: 400 }
        )
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          suspended: true,
          suspendedAt: new Date(),
          suspendReason: reason || 'Violation of Terms of Service',
        },
      })

      return NextResponse.json({
        success: true,
        message: 'User suspended successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          suspended: updatedUser.suspended,
          suspendReason: updatedUser.suspendReason,
        },
      })
    }

    if (action === 'unsuspend') {
      if (!user.suspended) {
        return NextResponse.json(
          { error: 'User is not suspended' },
          { status: 400 }
        )
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          suspended: false,
          suspendedAt: null,
          suspendReason: null,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'User unsuspended successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          suspended: updatedUser.suspended,
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "suspend" or "unsuspend"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE - Permanently delete user account
export async function DELETE(
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        developedJobs: {
          where: {
            status: {
              in: ['ACTIVE', 'IN_PROGRESS'],
            },
          },
        },
        applications: {
          where: {
            status: {
              in: ['APPROVED', 'TESTING'],
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent self-deletion
    if (id === currentUser.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Prevent deleting other admins
    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete admin accounts' },
        { status: 400 }
      )
    }

    // Check for active commitments
    if (user.developedJobs.length > 0 || user.applications.length > 0) {
      return NextResponse.json(
        { 
          error: 'User has active jobs or testing commitments. Suspend them first and wait for completion.',
          activeJobs: user.developedJobs.length,
          activeApplications: user.applications.length,
        },
        { status: 400 }
      )
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'User account permanently deleted',
    })
  } catch (error) {
    console.error('Admin delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
