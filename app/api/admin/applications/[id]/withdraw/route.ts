import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'

const withdrawSchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = withdrawSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'A reason of 3 to 500 characters is required' }, { status: 400 })
  }

  const { id } = await params
  try {
    const withdrawn = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT id FROM "Application" WHERE id = ${id} FOR UPDATE`

      const application = await tx.application.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          cohortSelected: true,
          contactReleasedAt: true,
          testingStartDate: true,
          payment: { select: { id: true, status: true, transferId: true } },
          tester: { select: { id: true } },
          job: {
            select: {
              id: true,
              appName: true,
              developerId: true,
            },
          },
        },
      })

      if (!application) throw new Error('APPLICATION_NOT_FOUND')
      if (!['PENDING', 'APPROVED', 'OPTED_IN', 'VERIFIED', 'SCHEDULED'].includes(application.status)) {
        throw new Error('APPLICATION_NOT_WITHDRAWABLE')
      }
      if (application.testingStartDate) throw new Error('APPLICATION_ALREADY_STARTED')
      // An escrowed payment stays on record so its paid slot can be reused; anything else needs manual review.
      if (application.payment && (application.payment.status !== 'ESCROWED' || application.payment.transferId)) {
        throw new Error('APPLICATION_HAS_PAYMENT')
      }

      await tx.application.update({
        where: { id },
        data: { status: 'WITHDRAWN', cohortSelected: false, contactReleasedAt: null },
      })

      await tx.$executeRaw`
        INSERT INTO "AdminAuditLog" ("id", "actorId", "actorEmail", "action", "targetType", "targetId", "reason")
        VALUES (${randomUUID()}, ${currentUser.userId}, ${currentUser.email}, ${'withdraw_application'}, ${'application'}, ${id}, ${parsed.data.reason})
      `

      return application
    })

    for (const userId of [withdrawn.tester.id, withdrawn.job.developerId]) {
      try {
        await sendNotification({
          userId,
          title: 'Application withdrawn',
              body: `The application for "${withdrawn.job.appName}" was withdrawn by TestForPay support. The applicant count has been updated.`,
          url: userId === withdrawn.tester.id
            ? '/dashboard/applications'
            : `/dashboard/jobs/${withdrawn.job.id}`,
          type: 'application_withdrawn',
        })
      } catch (notifyError) {
        console.error(`Failed to notify user ${userId} about withdrawn application ${id}:`, notifyError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Application withdrawn. The applicant count is updated, and the tester can apply again while the job is accepting applications.',
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'APPLICATION_NOT_FOUND') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      if (error.message === 'APPLICATION_NOT_WITHDRAWABLE') {
        return NextResponse.json({ error: 'Only pending or approved applications can be withdrawn' }, { status: 409 })
      }
      if (error.message === 'APPLICATION_ALREADY_STARTED') {
        return NextResponse.json({ error: 'Testing has already started for this tester; use pause or the issue workflow instead' }, { status: 409 })
      }
      if (error.message === 'APPLICATION_HAS_PAYMENT') {
        return NextResponse.json({ error: 'This tester has a payment that is not simply held in escrow; contact support before changing it' }, { status: 409 })
      }
    }
    console.error('Admin application withdrawal error:', error)
    return NextResponse.json({ error: 'Failed to withdraw application' }, { status: 500 })
  }
}
