import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://testforpay.com'
  
  const pages = [
    { path: '/', priority: '1.0' },
    { path: '/guides/closed-testing-101', priority: '0.9' },
    { path: '/guides/play-console-setup', priority: '0.9' },
    { path: '/guides/tester-guide', priority: '0.9' },
    { path: '/signup', priority: '0.8' },
    { path: '/login', priority: '0.8' },
    { path: '/contact', priority: '0.7' },
    { path: '/privacy', priority: '0.7' },
    { path: '/terms', priority: '0.7' },
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new NextResponse(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}