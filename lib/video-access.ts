import prisma from '@/lib/prisma'
import { getMissionDay } from '@/lib/mission-clock'

export async function findCurrentMission(taskId: string, testerId: string) {
  const task = await prisma.dailyTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      dayNumber: true,
      job: {
        select: {
          testDuration: true,
          applications: {
            where: {
              testerId,
              status: 'TESTING',
              issueReports: { none: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } },
            },
            select: {
              id: true,
              testingStartDate: true,
              testingPausedAt: true,
              testingPausedDurationMs: true,
            },
          },
        },
      },
    },
  })

  if (!task) return { ok: false as const, status: 404, error: 'Mission not found' }
  const application = task.job.applications[0]
  if (!application) return { ok: false as const, status: 403, error: 'You are not assigned to this mission' }
  const existingSubmission = await prisma.taskSubmission.findUnique({
    where: { taskId_testerId: { taskId, testerId } },
    select: { id: true },
  })
  if (existingSubmission) {
    return { ok: false as const, status: 409, error: 'This mission has already been submitted' }
  }
  if (application.testingPausedAt) {
    return { ok: false as const, status: 409, error: 'Testing is paused for this application' }
  }
  if (!application.testingStartDate) {
    return { ok: false as const, status: 409, error: 'Testing has not started for this application' }
  }

  const missionDay = getMissionDay(
    application.testingStartDate,
    new Date(),
    application.testingPausedDurationMs
  )
  if (missionDay !== task.dayNumber || missionDay > task.job.testDuration) {
    return { ok: false as const, status: 400, error: 'Only today’s mission can have a video' }
  }

  return { ok: true as const, task, application }
}
