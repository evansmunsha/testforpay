import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  verifyPassword,
  generateToken,
  setAuthCookie,
  normalizeEmail,
} from '@/lib/auth'
import { loginSchema } from '@/lib/validators'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // SECURITY: Rate limit auth attempts in production to reduce brute-force risk.
    if (process.env.NODE_ENV === 'production') {
      const ip = getClientIp(request)
      const rate = checkRateLimit(`auth:login:${ip}`, 10, 10 * 60 * 1000)
      if (!rate.allowed) {
        return NextResponse.json(
          { error: 'Too many login attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': `${rate.retryAfter || 60}` } }
        )
      }
    }

    const body = await request.json()
    
    // Validate input
    const validatedData = loginSchema.parse(body)
    const normalizedEmail = normalizeEmail(validatedData.email)
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(
      validatedData.password,
      user.password
    )
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Check if user is suspended
    if (user.suspended) {
      return NextResponse.json(
        { 
          error: 'Account suspended',
          reason: user.suspendReason || 'Violation of Terms of Service',
          message: 'Your account has been suspended. Contact support@testforpay.com for assistance.'
        },
        { status: 403 }
      )
    }
    
    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
    
    // Set cookie
    await setAuthCookie(token)

    // Record last login time and increment login count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
        lastIpAddress: getClientIp(request) || undefined,
      },
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
