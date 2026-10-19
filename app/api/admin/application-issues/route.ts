import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { recordAdminAction } from '@/lib/admin-audit'
import { sendNotification } from '@/lib/notifications'
import { z } from 'zod'

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'INCOMPATIBLE']),
  adminNote: z.string().trim().max(2000).optional(),
  reason: z.string().trim().min(10).max(1000),
})

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const reports = await prisma.applicationIssueReport.findMany({
      where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      select: {
        id: true,
        applicationId: true,
        jobId: true,
        testerId: true,
        category: true,
        details: true,
        status: true,
        createdAt: true,
        tester: { select: { name: true, email: true } },
        job: { select: { appName: true, developerId: true, developer: { select: { name: true, email: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Get application issue queue error:', error)
    return NextResponse.json({ error: 'Failed to load application issue reports' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid update' }, { status: 400 })
    }
    const id = parsed.data.id
    const report = await prisma.applicationIssueReport.findUnique({
      where: { id },
      select: {
        id: true,
        applicationId: true,
        testerId: true,
        jobId: true,
        category: true,
        status: true,
        job: { select: { appName: true, developerId: true } },
      },
    })
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "TestingJob" WHERE id = ${report.jobId} FOR UPDATE`
      await tx.$executeRaw`SELECT id FROM "Application" WHERE id = ${report.applicationId} FOR UPDATE`
      await tx.$executeRaw`SELECT id FROM "ApplicationIssueReport" WHERE id = ${id} FOR UPDATE`

      const currentReport = await tx.applicationIssueReport.findUnique({
        where: { id },
        select: { status: true },
      })
      if (!currentReport || !['OPEN', 'UNDER_REVIEW'].includes(currentReport.status)) {
        throw new Error('REPORT_ALREADY_REVIEWED')
      }

      if (parsed.data.status === 'INCOMPATIBLE') {
        const application = await tx.application.findUnique({
          where: { id: report.applicationId },
          select: {
            status: true,
            testingStartDate: true,
            payment: { select: { status: true, transferId: true } },
          },
        })
        if (!application) throw new Error('APPLICATION_NOT_FOUND')
        if (
          ['TESTING', 'COMPLETED'].includes(application.status) ||
          (application.testingStartDate && application.testingStartDate <= new Date())
        ) {
          throw new Error('TESTING_ALREADY_STARTED')
        }
        if (
          application.payment &&
          (application.payment.status !== 'ESCROWED' || application.payment.transferId !== null)
        ) {
          throw new Error('PAYMENT_NOT_REASSIGNABLE')
        }
      }

      const changed = await tx.applicationIssueReport.updateMany({
        where: { id, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
        data: {
          status: parsed.data.status,
          adminNote: parsed.data.adminNote || null,
          resolvedAt: ['RESOLVED', 'INCOMPATIBLE'].includes(parsed.data.status) ? new Date() : null,
        },
      })
      if (changed.count !== 1) throw new Error('REPORT_ALREADY_REVIEWED')

      if (parsed.data.status === 'INCOMPATIBLE') {
        const applicationChanged = await tx.application.updateMany({
          where: {
            id: report.applicationId,
            status: { notIn: ['TESTING', 'COMPLETED'] },
          },
          data: { status: 'INELIGIBLE', cohortSelected: false },
        })
        if (applicationChanged.count !== 1) throw new Error('TESTING_ALREADY_STARTED')
      }
      return tx.applicationIssueReport.findUniqueOrThrow({ where: { id } })
    })

    await recordAdminAction({
      actorId: user.userId,
      actorEmail: user.email,
      action: 'review_application_issue',
      targetType: 'application_issue_report',
      targetId: id,
      reason: parsed.data.reason,
    })

    const notificationResults = await Promise.allSettled([
      sendNotification({
        userId: report.testerId,
        title: 'Testing issue report updated',
        body: parsed.data.status === 'INCOMPATIBLE'
          ? `Your report for "${report.job.appName}" was confirmed. This will not count against your tester record.`
          : `Your report for "${report.job.appName}" has been updated by support.`,
        url: '/dashboard/applications',
        type: 'application_issue_update',
      }),
      sendNotification({
        userId: report.job.developerId,
        title: 'Testing issue reviewed',
        body: parsed.data.status === 'INCOMPATIBLE'
          ? `Support confirmed an availability or compatibility issue for "${report.job.appName}". The tester was removed without penalty, and their escrowed slot can be used for a qualified replacement.`
          : `Support reviewed a testing issue for "${report.job.appName}".`,
        url: `/dashboard/jobs/${report.jobId}`,
        type: 'application_issue_update',
      }),
    ])
    notificationResults.forEach((result) => {
      if (result.status === 'rejected') console.error('Failed to notify issue report parties:', result.reason)
    })

    return NextResponse.json({ success: true, report: updated })
  } catch (error) {
    if (error instanceof Error) {
      const known: Record<string, { status: number; message: string }> = {
        REPORT_ALREADY_REVIEWED: { status: 409, message: 'This report has already been reviewed; refresh the issue queue.' },
        APPLICATION_NOT_FOUND: { status: 404, message: 'Application not found' },
        TESTING_ALREADY_STARTED: { status: 409, message: 'The tester has already started testing; do not reassign their escrowed payment.' },
        PAYMENT_NOT_REASSIGNABLE: { status: 409, message: 'This payment is no longer escrowed and cannot be reassigned.' },
      }
      if (known[error.message]) {
        return NextResponse.json({ error: known[error.message].message }, { status: known[error.message].status })
      }
    }
    console.error('Update application issue report error:', error)
    return NextResponse.json({ error: 'Failed to update application issue report' }, { status: 500 })
  }
}
