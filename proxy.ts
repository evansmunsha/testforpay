import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/jwt'

/**
 * Middleware: Fast, lightweight auth gate using JWT verification only.
 * This runs in Edge runtime and DOES NOT access the database.
 *
 * Edge runtime cannot use Prisma, so this middleware:
 * - Rejects requests with missing/invalid JWTs early (before hitting any API)
 * - Redirects authenticated users away from login/signup pages
 * - Delegates authoritative checks (idle timeout, suspension, role) to getCurrentUser()
 *   which runs in Node runtime and can access Prisma.
 *
 * This is a harmless defensive layer: if getCurrentUser() is also called by the
 * API route (e.g., /api/auth/session), both checks run but only one can access
 * the DB, so the Node-side check is authoritative.
 */
export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value

  // Check if user is authenticated
  const isAuthenticated = token && verifyToken(token)

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (request.nextUrl.pathname.startsWith('/login') || 
      request.nextUrl.pathname.startsWith('/signup')) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
}
