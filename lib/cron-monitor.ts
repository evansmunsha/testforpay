import { randomUUID } from 'node:crypto'
import prisma from '@/lib/prisma'

export async function startCronExecution(jobName: string) {
  const id = randomUUID()
  const startedAt = new Date()

  try {
    await prisma.$executeRaw`
      INSERT INTO "CronExecution" ("id", "jobName", "status", "startedAt")
      VALUES (${id}, ${jobName}, 'RUNNING', ${startedAt})
    `
    return { id, startedAt }
  } catch (error) {
    console.error(`Could not record start for cron job ${jobName}:`, error)
    return { id: null, startedAt }
  }
}

export async function finishCronExecution(
  execution: { id: string | null; startedAt: Date },
  status: 'SUCCEEDED' | 'FAILED',
  errorMessage?: string,
) {
  if (!execution.id) return

  try {
    const completedAt = new Date()
    await prisma.$executeRaw`
      UPDATE "CronExecution"
      SET "status" = ${status},
          "completedAt" = ${completedAt},
          "durationMs" = ${completedAt.getTime() - execution.startedAt.getTime()},
          "errorMessage" = ${errorMessage?.slice(0, 1000) ?? null}
      WHERE "id" = ${execution.id}
    `
  } catch (error) {
    console.error(`Could not record completion for cron execution ${execution.id}:`, error)
  }
}