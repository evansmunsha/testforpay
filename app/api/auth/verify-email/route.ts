import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyEmailVerificationToken } from '@/lib/auth'
import { getClientIp } from '@/lib/rate-limit'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    const payload = verifyEmailVerificationToken(token)
    if (!payload) {
      // If the request is a browser navigation, redirect back to the
      // friendly page so users see a human message. Otherwise return JSON.
      const accept = request.headers.get('accept') || ''
      const isNavigation = request.headers.get('sec-fetch-mode') === 'navigate' || accept.includes('text/html')

      if (isNavigation) {
        const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?status=error`
        console.info('Email verification failed (invalid token)', { ip: getClientIp(request) })
        return NextResponse.redirect(redirectUrl)
      }

      return NextResponse.json(
        { error: 'Invalid or expired verification link' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    })

    if (!user || user.email !== payload.email) {
      const accept = request.headers.get('accept') || ''
      const isNavigation = request.headers.get('sec-fetch-mode') === 'navigate' || accept.includes('text/html')
      if (isNavigation) {
        const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?status=error`
        console.info('Email verification failed (user mismatch)', { ip: getClientIp(request), payload })
        return NextResponse.redirect(redirectUrl)
      }

      return NextResponse.json(
        { error: 'Verification link is no longer valid' },
        { status: 400 }
      )
    }

    let updated = false
    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      })
      updated = true
    }

    // Log attempt
    console.info('Email verification success', {
      userId: user.id,
      email: user.email,
      updated,
      ip: getClientIp(request),
    })

    const accept = request.headers.get('accept') || ''
    const isNavigation = request.headers.get('sec-fetch-mode') === 'navigate' || accept.includes('text/html')

    if (isNavigation) {
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?status=success&email=${encodeURIComponent(
        user.email
      )}`
      return NextResponse.redirect(redirectUrl)
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    })
  } catch (error) {
    console.error('Verify email error:', error)
    const accept = request.headers.get('accept') || ''
    const isNavigation = request.headers.get('sec-fetch-mode') === 'navigate' || accept.includes('text/html')
    if (isNavigation) {
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?status=error`
      return NextResponse.redirect(redirectUrl)
    }

    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}
