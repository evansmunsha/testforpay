import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/prisma'

type ActivityEvent = {
  id: string
  title: string
  detail: string
  createdAt: Date
  tab: 'jobs' | 'applications' | 'payments' | 'users' | 'fraud'
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const [applications, jobs, submissions, payments, auditEntries] = await Promise.all([
      prisma.application.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          tester: { select: { name: true, email: true } },
          job: { select: { appName: true } },
        },
      }),
      prisma.testingJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          appName: true,
          createdAt: true,
          developer: { select: { name: true, email: true } },
        },
      }),
      prisma.taskSubmission.findMany({
        orderBy: { completedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          completedAt: true,
          tester: { select: { name: true, email: true } },
          task: { select: { dayNumber: true, job: { select: { appName: true } } } },
        },
      }),
      prisma.payment.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          application: {
            select: {
              tester: { select: { name: true, email: true } },
              job: { select: { appName: true } },
            },
          },
        },
      }),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          actorEmail: true,
          action: true,
          targetType: true,
          targetId: true,
          reason: true,
          createdAt: true,
        },
      }),
    ])

    const events: ActivityEvent[] = [
      ...applications.map(application => ({
        id: `application-${application.id}`,
        title: 'Application updated',
        detail: `${application.tester.name || application.tester.email} · ${application.job.appName} · ${application.status.toLowerCase().replaceAll('_', ' ')}`,
        createdAt: application.updatedAt,
        tab: 'applications' as const,
      })),
      ...jobs.map(job => ({
        id: `job-${job.id}`,
        title: 'Job created',
        detail: `${job.appName} · ${job.developer.name || job.developer.email}`,
        createdAt: job.createdAt,
        tab: 'jobs' as const,
      })),
      ...submissions.map(submission => ({
        id: `mission-${submission.id}`,
        title: `Day ${submission.task.dayNumber} mission submitted`,
        detail: `${submission.tester.name || submission.tester.email} · ${submission.task.job.appName}`,
        createdAt: submission.completedAt,
        tab: 'applications' as const,
      })),
      ...payments.map(payment => ({
        id: `payment-${payment.id}`,
        title: `Payout ${payment.status.toLowerCase()}`,
        detail: `${payment.application.tester.name || payment.application.tester.email} · ${payment.application.job.appName}`,
        createdAt: payment.updatedAt,
        tab: 'payments' as const,
      })),
      ...auditEntries.map(entry => ({
        id: `admin-action-${entry.id}`,
        title: `Admin action: ${entry.action.replaceAll('_', ' ')}`,
        detail: `${entry.actorEmail} · ${entry.targetType} ${entry.targetId} · ${entry.reason}`,
        createdAt: entry.createdAt,
        tab: entry.targetType === 'fraud_log' ? 'fraud' as const : 'users' as const,
      })),
    ]

    events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return NextResponse.json({ events: events.slice(0, 15) })
  } catch (error) {
    console.error('Admin activity fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch recent activity' }, { status: 500 })
  }
}