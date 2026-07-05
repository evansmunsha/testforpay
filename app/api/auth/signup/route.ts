import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  hashPassword,
  generateToken,
  setAuthCookie,
  generateEmailVerificationToken,
  normalizeEmail,
} from '@/lib/auth'
import { signupSchema } from '@/lib/validators'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sendEmailVerificationEmail, sendDeveloperWelcomeEmail, sendTesterWelcomeEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    // SECURITY: Rate limit signups in production to reduce abuse.
    if (process.env.NODE_ENV === 'production') {
      const ip = getClientIp(request)
      const rate = checkRateLimit(`auth:signup:${ip}`, 5, 10 * 60 * 1000)
      if (!rate.allowed) {
        return NextResponse.json(
          { error: 'Too many signup attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': `${rate.retryAfter || 60}` } }
        )
      }
    }

    const body = await request.json()
    
    // Get IP for fraud tracking
    const signupIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     request.headers.get('x-real-ip') || 
                     null
    
    // Validate input
    const validatedData = signupSchema.parse(body)
    const normalizedEmail = normalizeEmail(validatedData.email)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }
    
    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)
    
    // Create user with fraud tracking
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: validatedData.name,
        role: validatedData.role,
        signupIp,
        lastIpAddress: signupIp,
      },
    })
    
    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    let verificationEmailSent = false
    try {
      const verificationToken = generateEmailVerificationToken({
        userId: user.id,
        email: user.email,
      })

      await sendEmailVerificationEmail(user.email, {
        name: user.name,
        verificationToken,
      })
      verificationEmailSent = true
      // Persist the lastVerificationSentAt timestamp to avoid immediate duplicates
      try {
        await prisma.user.update({ where: { id: user.id }, data: { lastVerificationSentAt: new Date() } })
      } catch (uErr) {
        console.error('Failed to update lastVerificationSentAt on signup:', uErr)
      }
      console.info('Signup verification email sent', {
        userId: user.id,
        email: user.email,
        ip: signupIp,
      })
    } catch (emailError) {
      console.error('Signup verification email error:', emailError)
    }
    
    // Set cookie
    await setAuthCookie(token)

    // Send role-specific welcome email (fire and forget — don't block signup)
    try {
      if (user.role === 'DEVELOPER') {
        await sendDeveloperWelcomeEmail(user.email, { name: user.name })
      } else if (user.role === 'TESTER') {
        await sendTesterWelcomeEmail(user.email, { name: user.name })
      }
    } catch (welcomeEmailError) {
      console.error('Welcome email error:', welcomeEmailError)
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      requiresEmailVerification: true,
      verificationEmailSent,
    })
  } catch (error) {
    console.error('Signup error:', error)
    
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
