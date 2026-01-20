import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Step 1: Verify email exists and return masked email
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, step, newPassword } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      )
    }

    // Step 1: Just verify email exists and return masked version
    if (step === 'verify') {
      // Mask email: show first 2 chars and last 2 chars before @
      const [localPart, domain] = user.email.split('@')
      const maskedLocal = localPart.length > 4 
        ? `${localPart.slice(0, 2)}${'*'.repeat(localPart.length - 4)}${localPart.slice(-2)}`
        : `${localPart[0]}${'*'.repeat(localPart.length - 1)}`
      const maskedEmail = `${maskedLocal}@${domain}`
      
      return NextResponse.json({
        success: true,
        maskedEmail,
        hint: user.name ? `Account name: ${user.name.split(' ')[0]}` : null,
      })
    }

    // Step 2: Reset password
    if (step === 'reset') {
      if (!newPassword) {
        return NextResponse.json(
          { error: 'New password is required' },
          { status: 400 }
        )
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        )
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      })

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully',
      })
    }

    return NextResponse.json(
      { error: 'Invalid step' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
