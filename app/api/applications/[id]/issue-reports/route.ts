import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'

const isUploadedImageUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' &&
      (url.hostname === 'utfs.io' || url.hostname.endsWith('.ufs.sh') || url.hostname.endsWith('.uploadthing.com'))
  } catch {
    return false
  }
}

const reportSchema = z.object({
  category: z.enum(['INSTALL_UNAVAILABLE', 'COUNTRY_RESTRICTION', 'DEVICE_INCOMPATIBLE', 'OTHER']),
  details: z.string().trim().min(10).max(2000),
  attachmentUrls: z.array(z.string().max(500).refine(isUploadedImageUrl, 'Attachments must be images uploaded through TestForPay')).max(3).optional(),
})

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const application = await prisma.application.findUnique({
      where: { id },
      select: { testerId: true, job: { select: { developerId: true } } },
    })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (
      user.role !== 'ADMIN' &&
      user.userId !== application.testerId &&
      user.userId !== application.job.developerId
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const reports = await prisma.applicationIssueReport.findMany({
      where: { applicationId: id },
      select: {
        id: true,
        category: true,
        details: true,
        attachmentUrls: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Get application issue reports error:', error)
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'TESTER') return NextResponse.json({ error: 'Only testers can report application issues' }, { status: 403 })
    const parsed = reportSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid report' }, { status: 400 })
    }
    const { id } = await params
    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        testerId: true,
        jobId: true,
        status: true,
        job: { select: { developerId: true, appName: true } },
        tester: { select: { name: true } },
      },
    })
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (application.testerId !== user.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (['REJECTED', 'INELIGIBLE', 'COMPLETED'].includes(application.status)) {
      return NextResponse.json({ error: 'This application can no longer receive testing issue reports' }, { status: 409 })
    }
    const existingOpen = await prisma.applicationIssueReport.findFirst({
      where: {
        applicationId: id,
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
      },
      select: { id: true },
    })
    if (existingOpen) return NextResponse.json({ error: 'An unresolved report already exists for this application' }, { status: 409 })

    const report = await prisma.applicationIssueReport.create({
      data: {
        applicationId: application.id,
        jobId: application.jobId,
        testerId: user.userId,
        category: parsed.data.category,
        details: parsed.data.details,
        attachmentUrls: parsed.data.attachmentUrls ?? [],
      },
      select: { id: true, category: true, details: true, attachmentUrls: true, status: true, createdAt: true },
    })

    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    })
    const notifications = await Promise.allSettled([
      sendNotification({
        userId: application.job.developerId,
        title: 'Private testing issue reported',
        body: `${application.tester.name || 'A tester'} reported a problem installing or using "${application.job.appName}". The report is available in the admin issue queue.`,
        url: '/dashboard/admin',
        type: 'application_issue',
      }),
      ...adminUsers.map((admin) => sendNotification({
        userId: admin.id,
        title: 'Application issue needs review',
        body: `A tester reported ${parsed.data.category.toLowerCase().replaceAll('_', ' ')} for "${application.job.appName}".`,
        url: '/dashboard/admin',
        type: 'application_issue',
      })),
    ])
    notifications.forEach((result) => {
      if (result.status === 'rejected') console.error('Failed to notify about application issue:', result.reason)
    })

    return NextResponse.json({ success: true, report }, { status: 201 })
  } catch (error) {
    console.error('Create application issue report error:', error)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
