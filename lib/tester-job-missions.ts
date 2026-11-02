import prisma from '@/lib/prisma'
import { getMissionDay } from '@/lib/mission-clock'

// Everything a tester needs for one job: the current mission, their own past reports and videos.
export async function getTesterJobMissions(jobId: string, testerId: string) {
  const application = await prisma.application.findFirst({
    where: { jobId, testerId },
    select: {
      status: true,
      testingStartDate: true,
      testingEndDate: true,
      testingPausedAt: true,
      testingPausedDurationMs: true,
      issueReports: {
        where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
        select: { id: true },
      },
      job: {
        select: {
          appName: true,
          testDuration: true,
          isTraining: true,
          dailyTasks: { orderBy: { dayNumber: 'asc' }, select: { id: true, dayNumber: true, taskText: true } },
        },
      },
    },
  })
  if (!application) return null

  const submissions = await prisma.taskSubmission.findMany({
    where: { testerId, task: { jobId } },
    orderBy: { task: { dayNumber: 'desc' } },
    select: {
      id: true,
      taskId: true,
      content: true,
      screenshotUrl: true,
      completedAt: true,
      task: { select: { dayNumber: true, taskText: true } },
      video: { select: { id: true, deletedAt: true } },
    },
  })

  const { job } = application
  const reports = submissions.map((s) => ({
    id: s.id,
    dayNumber: s.task.dayNumber,
    taskText: s.task.taskText,
    content: s.content,
    screenshotUrl: s.screenshotUrl,
    completedAt: s.completedAt,
    video: s.video ? { id: s.video.id, deletedAt: s.video.deletedAt } : null,
  }))

  let missionNote: string | null = null
  let mission: {
    task: { id: string; taskText: string }
    dayNumber: number
    currentDay: number
    isCatchUp: boolean
    isCompleted: boolean
    submission: { content: string; video: { id: string; deletedAt: Date | null } | null } | null
    videoDeleteAfter: Date | null
  } | null = null

  if (application.status !== 'TESTING') {
    missionNote =
      application.status === 'COMPLETED'
        ? 'Testing is finished. Your reports are below.'
        : 'Daily missions start once testing begins for this job. You will get a notification.'
  } else if (application.testingPausedAt) {
    missionNote = 'Testing is paused for this job. Missions will continue when it resumes.'
  } else if (application.issueReports.length > 0) {
    missionNote = 'You have an open issue report. Missions are on hold until it is resolved.'
  } else if (!application.testingStartDate) {
    missionNote = 'Testing has not started yet.'
  } else {
    const currentDay = getMissionDay(
      application.testingStartDate,
      new Date(),
      application.testingPausedDurationMs
    )
    if (currentDay === null || currentDay > job.testDuration) {
      missionNote = 'The testing period is not active right now.'
    } else {
      let task = job.dailyTasks.find((t) => t.dayNumber === currentDay)
      if (job.isTraining) {
        const doneIds = new Set(submissions.map((s) => s.taskId))
        const firstMissed = job.dailyTasks.find((t) => t.dayNumber <= currentDay && !doneIds.has(t.id))
        if (firstMissed) task = firstMissed
      }
      if (!task) {
        missionNote = 'No mission is set for today.'
      } else {
        const submission = submissions.find((s) => s.taskId === task!.id) ?? null
        mission = {
          task: { id: task.id, taskText: task.taskText },
          dayNumber: task.dayNumber,
          currentDay,
          isCatchUp: task.dayNumber < currentDay,
          isCompleted: !!submission,
          submission: submission ? { content: submission.content, video: submission.video } : null,
          videoDeleteAfter:
            submission?.video && application.testingEndDate
              ? new Date(application.testingEndDate.getTime() + 14 * 24 * 60 * 60 * 1000)
              : null,
        }
      }
    }
  }

  return {
    role: 'TESTER' as const,
    jobName: job.appName,
    totalDays: job.testDuration,
    applicationStatus: application.status,
    mission,
    missionNote,
    reports,
  }
}
