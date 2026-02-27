import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'
import { normalizeEmail } from '@/lib/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const RESET_TOKEN_TTL_MINUTES = 30

// Step 1: Verify email exists and return masked email
export async function POST(request: Request) {
  try {
    // SECURITY: Rate limit reset attempts in production to reduce abuse.
    if (process.env.NODE_ENV === 'production') {
      const ip = getClientIp(request)
      const rate = checkRateLimit(`auth:forgot:${ip}`, 5, 10 * 60 * 1000)
      if (!rate.allowed) {
        return NextResponse.json(
          { error: 'Too many reset attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': `${rate.retryAfter || 60}` } }
        )
      }
    }

    const body = await request.json()
    const { email, step, newPassword, resetToken } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = normalizeEmail(email)

    // Step 1: Just verify email exists and return masked version
    if (step === 'verify') {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true },
      })

      if (user) {
        const token = crypto.randomBytes(12).toString('hex')
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000)

        // Store only the hashed token so raw tokens never live in the DB
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: tokenHash,
            passwordResetExpiresAt: expiresAt,
          },
        })

        // Email the raw token to the user
        await sendPasswordResetEmail(user.email, { resetToken: token })
      }

      // Always return a generic success message to avoid email enumeration.
      return NextResponse.json({
        success: true,
        message: 'If an account exists for this email, a reset code has been sent.',
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

      if (!resetToken) {
        return NextResponse.json(
          { error: 'Reset code is required' },
          { status: 400 }
        )
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        )
      }

      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
      const now = new Date()

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid or expired reset code' },
          { status: 400 }
        )
      }

      const tokenMatch = await prisma.user.findFirst({
        where: {
          id: user.id,
          passwordResetToken: tokenHash,
          passwordResetExpiresAt: {
            gt: now,
          },
        },
        select: { id: true },
      })

      if (!tokenMatch) {
        return NextResponse.json(
          { error: 'Invalid or expired reset code' },
          { status: 400 }
        )
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        },
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
