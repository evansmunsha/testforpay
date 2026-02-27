import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET!
const EMAIL_VERIFICATION_SECRET =
  process.env.EMAIL_VERIFICATION_SECRET || JWT_SECRET
const SALT_ROUNDS = 10

export interface TokenPayload {
  userId: string
  email: string
  role: string
}

interface EmailVerificationTokenPayload {
  userId: string
  email: string
  type: 'email-verification'
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Generate JWT token
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d',
  })
}

// Verify JWT token
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export function generateEmailVerificationToken(
  payload: Omit<EmailVerificationTokenPayload, 'type'>
): string {
  return jwt.sign(
    {
      ...payload,
      type: 'email-verification',
    },
    EMAIL_VERIFICATION_SECRET,
    {
      expiresIn: '24h',
    }
  )
}

export function verifyEmailVerificationToken(
  token: string
): EmailVerificationTokenPayload | null {
  try {
    const payload = jwt.verify(
      token,
      EMAIL_VERIFICATION_SECRET
    ) as EmailVerificationTokenPayload

    if (payload.type !== 'email-verification') {
      return null
    }

    return payload
  } catch {
    return null
  }
}

// Set auth cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

// Get auth cookie
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get('auth-token')?.value
}

// Remove auth cookie
export async function removeAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}

// Get current user from token
export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = await getAuthCookie()
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  // SECURITY: Invalidate tokens if the user was suspended or role changed.
  // This prevents stale JWTs from retaining access after admin actions.
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true, suspended: true },
  })

  if (!user || user.suspended || user.role !== payload.role) {
    return null
  }

  return {
    userId: payload.userId,
    email: payload.email,
    role: user.role,
  }
}
