import type { Prisma } from '@/generated/prisma/client'
import { pointsForAward, type TrainingAwardKind } from '@/lib/training-rules'

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
