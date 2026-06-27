import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getCurrentUser } from '@/lib/auth'

const resend = new Resend(process.env.RESEND_API_KEY)

function looksLikeSpam(subject: unknown, message: unknown, name: unknown, email: unknown) {
  const text = [subject, message, name, email]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()

  if (!text.trim()) return false

  const suspiciousTerms = [
    'seo',
    'search engine',
    'search engines',
    'rank higher',
    'backlinks',
    'traffic',
    'lead generation',
    'marketing',
    'digital marketing',
    'social media',
    'optimize your website',
    'attract more users',
    'more users',
    'website',
  ]

  const legitimateTerms = [
    'help',
    'question',
    'issue',
    'bug',
    'refund',
    'payment',
    'job',
    'tester',
    'developer',
    'stripe',
    'verification',
    'account',
    'app',
    'google play',
    'dashboard',
    'support',
  ]

  const hasSuspiciousTerm = suspiciousTerms.some((term) => text.includes(term))
  const hasLegitimateTerm = legitimateTerms.some((term) => text.includes(term))
  const isGenericSalesPitch =
    text.includes('help') &&
    text.includes('more users') &&
    text.includes('website') &&
    (text.includes('seo') || text.includes('search engines'))

  return (hasSuspiciousTerm && !hasLegitimateTerm) || isGenericSalesPitch
}

export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      const ip = getClientIp(request)
      const rate = checkRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)
      if (!rate.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': `${rate.retryAfter || 60}` } }
        )
      }
    }

    const body = await request.json()
    const { name, email, subject, message, company, website } = body || {}

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    if (company || website) {
      return NextResponse.json({ error: 'Your message was flagged as spam.' }, { status: 400 })
    }

    if (looksLikeSpam(subject, message, name, email)) {
      return NextResponse.json({ error: 'Your message was flagged as spam.' }, { status: 400 })
    }

    const safeHtml = `<p><strong>From:</strong> ${name} (${email})</p><p><strong>Subject:</strong> ${subject}</p><div>${String(message).replace(/\n/g, '<br/>')}</div>`

    const currentUser = await getCurrentUser()

    // Save to database (if available)
    try {
      // Lazy-load prisma to avoid adding a hard dependency when running edge handlers
      const prisma = await import('@/lib/prisma').then((m) => m.default)
      await prisma.contactMessage.create({
        data: {
          name,
          email,
          subject,
          message,
          ipAddress: getClientIp(request) || undefined,
          userId: currentUser?.userId || undefined,
        },
      })

      // Create an in-app admin notification for any admin users (optional)
      try {
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
        for (const a of admins) {
          await prisma.notification.create({
            data: {
              userId: a.id,
              title: `New contact message from ${name}`,
              body: `${subject}`,
              url: '/admin/contact',
              type: 'contact_message',
            },
          })
        }
      } catch (notifErr) {
        console.error('Failed to create admin notifications:', notifErr)
      }
    } catch (dbErr) {
      // If DB is not configured or migration not run, log and continue — email will still be sent
      console.error('Contact DB save skipped/failed:', dbErr)
    }

    // Send email via Resend
    await resend.emails.send({
      from: 'TestForPay <testforpays@gmail.com>',
      to: 'testforpays@gmail.com',
      subject: `[Contact] ${subject}`,
      html: safeHtml,
      headers: {
        'Reply-To': email,
      },
    })

    // Optional: POST to an admin webhook (e.g., Slack/Integromat) if ADMIN_WEBHOOK_URL is set
    if (process.env.ADMIN_WEBHOOK_URL) {
      try {
        await fetch(process.env.ADMIN_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `New contact message from ${name} <${email}>: ${subject}`,
            metadata: { name, email, subject, message: message.slice(0, 500) },
          }),
        })
      } catch (webErr) {
        console.error('Failed to POST admin webhook:', webErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact send error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
