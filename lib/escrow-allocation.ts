import type { Prisma } from '@/generated/prisma/client'

/** Applications in these states hold no committed tester place, so their escrowed slot can be reused. */
const VACANT_APPLICATION_STATUSES = ['PENDING', 'INELIGIBLE', 'REJECTED', 'WITHDRAWN'] as const

export type EscrowDecision = 'existing' | 'reuse' | 'create' | 'full'

/**
 * Pure rule for assigning a paid tester slot. A job only ever has `testersNeeded` paid slots,
 * so a slot is reused before a new one is created, and nothing is created once all slots are held.
 */
export function decideEscrowAllocation(input: {
  hasExistingPayment: boolean
  vacantSlotCount: number
  occupiedSlotCount: number
  testersNeeded: number
}): EscrowDecision {
  if (input.hasExistingPayment) return 'existing'
  if (input.vacantSlotCount > 0) return 'reuse'
  if (input.occupiedSlotCount < input.testersNeeded) return 'create'
  return 'full'
}

export interface AllocateEscrowSlotInput {
  jobId: string
  applicationId: string
  actorId: string
  testersNeeded: number
  paymentPerTester: number
  platformFee: number
  reason: string
}

/**
 * Gives an approved application a paid slot inside an existing transaction.
 * Callers must already hold the job row lock (SELECT ... FOR UPDATE) so slots cannot be over-allocated.
 */
export async function allocateEscrowSlot(
  tx: Prisma.TransactionClient,
  input: AllocateEscrowSlotInput
): Promise<EscrowDecision> {
  const existing = await tx.payment.findUnique({
    where: { applicationId: input.applicationId },
    select: { status: true, transferId: true },
  })
  if (existing) {
    if (existing.status !== 'ESCROWED' || existing.transferId) throw new Error('PAYMENT_NOT_ESCROWED')
    return 'existing'
  }

  const vacantSlots = await tx.payment.findMany({
    where: {
      jobId: input.jobId,
      status: 'ESCROWED',
      transferId: null,
      application: {
        status: { in: [...VACANT_APPLICATION_STATUSES] },
        cohortSelected: false,
      },
    },
    select: { id: true, applicationId: true },
    orderBy: { createdAt: 'asc' },
  })
  const heldCount = await tx.payment.count({
    where: { jobId: input.jobId, status: { not: 'REFUNDED' } },
  })

  const decision = decideEscrowAllocation({
    hasExistingPayment: false,
    vacantSlotCount: vacantSlots.length,
    occupiedSlotCount: heldCount - vacantSlots.length,
    testersNeeded: input.testersNeeded,
  })
  if (decision === 'full') throw new Error('NO_FREE_ESCROW_SLOT')

  if (decision === 'reuse') {
    const slot = vacantSlots[0]
    const moved = await tx.payment.updateMany({
      where: {
        id: slot.id,
        applicationId: slot.applicationId,
        jobId: input.jobId,
        status: 'ESCROWED',
        transferId: null,
      },
      data: { applicationId: input.applicationId },
    })
    if (moved.count !== 1) throw new Error('ESCROW_SLOT_CHANGED')
    await tx.paymentAllocationHistory.create({
      data: {
        paymentId: slot.id,
        jobId: input.jobId,
        fromApplicationId: slot.applicationId,
        toApplicationId: input.applicationId,
        actorId: input.actorId,
        reason: input.reason,
      },
    })
    return 'reuse'
  }

  await tx.payment.create({
    data: {
      applicationId: input.applicationId,
      jobId: input.jobId,
      amount: input.paymentPerTester,
      platformFee: input.platformFee,
      totalAmount: input.paymentPerTester + input.platformFee,
      status: 'ESCROWED',
      escrowedAt: new Date(),
    },
  })
  return 'create'
}

export function platformFeePerTester(totalPlatformFee: number, testersNeeded: number): number {
  return Math.round(totalPlatformFee / testersNeeded)
}
