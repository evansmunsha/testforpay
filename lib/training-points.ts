import type { Prisma } from '@/generated/prisma/client'
import { pointsForAward, type TrainingAwardKind } from '@/lib/training-rules'

export async function submittedAllMissions(
  tx: Prisma.TransactionClient,
  input: { jobId: string; testerId: string; testDuration: number }
): Promise<boolean> {
  const tasks = await tx.dailyTask.findMany({
    where: { jobId: input.jobId, dayNumber: { lte: input.testDuration } },
    select: { id: true },
  })
  if (tasks.length < input.testDuration) return false
  const submitted = await tx.taskSubmission.count({
    where: { testerId: input.testerId, taskId: { in: tasks.map((task) => task.id) } },
  })
  return submitted >= tasks.length
}

export async function awardTrainingPoints(
  tx: Prisma.TransactionClient,
  input: {
    userId: string
    applicationId: string
    kind: TrainingAwardKind
  }
): Promise<{ awarded: boolean; points: number }> {
  const points = pointsForAward(input.kind)
  const created = await tx.trainingAward.createMany({
    data: [
      {
        userId: input.userId,
        applicationId: input.applicationId,
        kind: input.kind,
        points,
      },
    ],
    skipDuplicates: true,
  })

  if (created.count === 0) return { awarded: false, points: 0 }

  await tx.user.update({
    where: { id: input.userId },
    data: { trainingPoints: { increment: points } },
  })
  return { awarded: true, points }
}
