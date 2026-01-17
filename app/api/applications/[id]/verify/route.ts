import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { verificationImageUrl } = body

    if (!verificationImageUrl) {
      return NextResponse.json(
        { error: 'Verification image URL is required' },
        { status: 400 }
      )
    }

    // Get the application
    const application = await prisma.application.findUnique({
      where: { id },
      include: { job: true },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Check if user is the tester
    if (application.testerId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Update application with verification image
    const updatedApplication = await prisma.application.update({
      where: { id },
      data: {
        status: 'OPTED_IN',
        verificationImage: verificationImageUrl,
      },
    })

    return NextResponse.json({
      success: true,
      application: updatedApplication,
      message: 'Verification image uploaded successfully',
    })
  } catch (error) {
    console.error('Upload verification error:', error)
    return NextResponse.json(
      { error: 'Failed to upload verification' },
      { status: 500 }
    )
  }
}