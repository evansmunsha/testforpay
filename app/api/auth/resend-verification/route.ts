import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  generateEmailVerificationToken,
  getCurrentUser,
  normalizeEmail,
} from '@/lib/auth'
import { sendEmailVerificationEmail } from '@/lib/email'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      const ip = getClientIp(request)
      const rate = checkRateLimit(`auth:resend-verification:${ip}`, 5, 10 * 60 * 1000)
      if (!rate.allowed) {
        return NextResponse.json(
          { error: 'Too many verification requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': `${rate.retryAfter || 60}` } }
        )
      }
    }

    const currentUser = await getCurrentUser().catch(() => null)
    const body = await request.json().catch(() => ({}))
    const requestedEmail =
      typeof body.email === 'string' && body.email
        ? normalizeEmail(body.email)
        : null

    const user = currentUser
      ? await prisma.user.findUnique({
          where: { id: currentUser.userId },
          select: { id: true, email: true, name: true, emailVerified: true },
        })
      : requestedEmail
        ? await prisma.user.findUnique({
            where: { email: requestedEmail },
            select: { id: true, email: true, name: true, emailVerified: true },
          })
        : null

    if (user && !user.emailVerified) {
      const verificationToken = generateEmailVerificationToken({
        userId: user.id,
        email: user.email,
      })

      await sendEmailVerificationEmail(user.email, {
        name: user.name,
        verificationToken,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists and still needs verification, a new link has been sent.',
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    )
  }
}
