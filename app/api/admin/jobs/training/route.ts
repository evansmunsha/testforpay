import { NextResponse, after } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { TASK_TEMPLATES, type TaskTemplateKey } from '@/lib/constants'
import { normalizeCountryCodes } from '@/lib/tester-eligibility'
import { AFRICAN_COUNTRY_CODES, isAfricanCountry } from '@/lib/training-rules'
import { recordAdminAction } from '@/lib/admin-audit'
import { communityPostPath, createJobPost, notifyUsers } from '@/lib/community'

const createTrainingJobSchema = z.object({
  appName: z.string().trim().min(3).max(120),
  appDescription: z.string().trim().min(40).max(5000),
  googlePlayLink: z.string().trim().url(),
  packageName: z.string().trim().max(255).optional(),
  appCategory: z.string().trim().max(120).optional(),
  minAndroidVersion: z.string().trim().max(20).optional(),
  supportedCountries: z.array(z.string()).min(1),
  testersNeeded: z.number().int().min(1).max(500),
  testDuration: z.number().int().min(1).max(30),
  taskTemplate: z.string().trim().optional(),
  customTasks: z.array(z.string().trim().min(1)).optional(),
  reason: z.string().trim().min(10).max(1000),
})

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createTrainingJobSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid training job data' }, { status: 400 })
    }

    let playHost = ''
    try {
      const url = new URL(parsed.data.googlePlayLink)
      playHost = url.protocol === 'https:' ? url.hostname : ''
    } catch {
      playHost = ''
    }
    if (playHost !== 'play.google.com') {
      return NextResponse.json(
        { error: 'The link must be a Google Play link starting with https://play.google.com/ (for example the opt-in link for your closed test).' },
        { status: 400 }
      )
    }

    const supportedCountries = normalizeCountryCodes(parsed.data.supportedCountries)
    if (!supportedCountries) {
      return NextResponse.json(
        { error: 'Declare at least one supported country using two-letter ISO codes' },
        { status: 400 }
      )
    }

    if (supportedCountries.some((code) => !isAfricanCountry(code))) {
      return NextResponse.json(
        { error: 'Training jobs are only for African countries' },
        { status: 400 }
      )
    }

    const now = new Date()
    const durationDays = parsed.data.testDuration
    let tasks: string[]
    if (Array.isArray(parsed.data.customTasks) && parsed.data.customTasks.length >= durationDays) {
      tasks = parsed.data.customTasks.slice(0, durationDays)
    } else if (parsed.data.taskTemplate && parsed.data.taskTemplate in TASK_TEMPLATES) {
      tasks = [...TASK_TEMPLATES[parsed.data.taskTemplate as TaskTemplateKey]].slice(0, durationDays)
    } else {
      tasks = [...TASK_TEMPLATES.generic].slice(0, durationDays)
    }

    const job = await prisma.$transaction(async (tx) => {
      const created = await tx.testingJob.create({
        data: {
          developerId: currentUser.userId,
          appName: parsed.data.appName,
          appDescription: parsed.data.appDescription,
          packageName: parsed.data.packageName || null,
          googlePlayLink: parsed.data.googlePlayLink,
          appCategory: parsed.data.appCategory || null,
          minAndroidVersion: parsed.data.minAndroidVersion || null,
          supportedCountries,
          testersNeeded: parsed.data.testersNeeded,
          testDuration: parsed.data.testDuration,
          paymentPerTester: 0,
          totalBudget: 0,
          platformFee: 0,
          status: 'ACTIVE',
          publishedAt: now,
          planType: 'TRAINING',
          isTraining: true,
        },
      })

      await tx.dailyTask.createMany({
        data: tasks.map((taskText, index) => ({
          jobId: created.id,
          dayNumber: index + 1,
          taskText,
        })),
      })

      return created
    })

    try {
      const jobPost = await createJobPost(job)
      if (jobPost) {
        const testers = await prisma.user.findMany({
          where: { role: 'TESTER', suspended: false, countryCode: { in: [...AFRICAN_COUNTRY_CODES] } },
          select: { id: true },
        })
        after(() =>
          notifyUsers(testers.map((tester) => tester.id), {
            title: '🎯 New training job available',
            body: `${job.appName} training is live. Request to join and earn training points.`,
            url: communityPostPath(jobPost.id),
            type: 'community_training_job',
          }).catch((notifyError) => console.error('Training job notification failed:', notifyError))
        )
      }
    } catch (postError) {
      console.error('Failed to create training community post:', postError)
    }

    await recordAdminAction({
      actorId: currentUser.userId,
      actorEmail: currentUser.email,
      action: 'publish_training_job',
      targetType: 'job',
      targetId: job.id,
      reason: parsed.data.reason,
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Training job published and visible to testers.',
    })
  } catch (error) {
    console.error('Create training job error:', error)
    return NextResponse.json({ error: 'Failed to create training job' }, { status: 500 })
  }
}
