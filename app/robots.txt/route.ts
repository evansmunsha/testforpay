import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://testforpay.com'
  const body = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
Host: ${baseUrl}`

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
