import { describe, expect, it, jest } from '@jest/globals'
import { allocateEscrowSlot, decideEscrowAllocation, platformFeePerTester } from './escrow-allocation'

describe('decideEscrowAllocation', () => {
  const base = { hasExistingPayment: false, vacantSlotCount: 0, occupiedSlotCount: 0, testersNeeded: 12 }

  it('keeps an existing payment instead of creating another', () => {
    expect(decideEscrowAllocation({ ...base, hasExistingPayment: true, vacantSlotCount: 1 })).toBe('existing')
  })

  it('reuses a vacant slot before creating a new one', () => {
    expect(decideEscrowAllocation({ ...base, vacantSlotCount: 1, occupiedSlotCount: 11 })).toBe('reuse')
  })

  it('creates a slot while fewer than the required number are held', () => {
    expect(decideEscrowAllocation({ ...base, occupiedSlotCount: 11 })).toBe('create')
  })

  it('refuses to create more paid slots than testers needed', () => {
    expect(decideEscrowAllocation({ ...base, occupiedSlotCount: 12 })).toBe('full')
  })
})

describe('platformFeePerTester', () => {
  it('splits the job fee across the tester slots', () => {
    expect(platformFeePerTester(1800, 12)).toBe(150)
  })
})

function fakeTx(options: {
  existing?: { status: string; transferId: string | null } | null
  vacant?: Array<{ id: string; applicationId: string }>
  heldCount?: number
  moved?: number
}) {
  return {
    payment: {
      findUnique: jest.fn(async () => options.existing ?? null),
      findMany: jest.fn(async () => options.vacant ?? []),
      count: jest.fn(async () => options.heldCount ?? 0),
      updateMany: jest.fn(async () => ({ count: options.moved ?? 1 })),
      create: jest.fn(async () => ({})),
    },
    paymentAllocationHistory: { create: jest.fn(async () => ({})) },
  }
}

const input = {
  jobId: 'job1',
  applicationId: 'app2',
  actorId: 'dev1',
  testersNeeded: 2,
  paymentPerTester: 500,
  platformFee: 75,
  reason: 'Approved replacement tester',
}

describe('allocateEscrowSlot', () => {
  it('creates an escrowed payment when a free slot exists', async () => {
    const tx = fakeTx({ heldCount: 1 })
    await expect(allocateEscrowSlot(tx as never, input)).resolves.toBe('create')
    expect(tx.payment.create).toHaveBeenCalledTimes(1)
    expect(tx.paymentAllocationHistory.create).not.toHaveBeenCalled()
  })

  it('moves a vacant escrowed payment and records history without creating a second payment', async () => {
    const tx = fakeTx({ vacant: [{ id: 'pay1', applicationId: 'app1' }], heldCount: 2 })
    await expect(allocateEscrowSlot(tx as never, input)).resolves.toBe('reuse')
    expect(tx.payment.create).not.toHaveBeenCalled()
    expect(tx.paymentAllocationHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ paymentId: 'pay1', fromApplicationId: 'app1', toApplicationId: 'app2' }),
    })
  })

  it('fails when every paid slot is already held', async () => {
    const tx = fakeTx({ heldCount: 2 })
    await expect(allocateEscrowSlot(tx as never, input)).rejects.toThrow('NO_FREE_ESCROW_SLOT')
    expect(tx.payment.create).not.toHaveBeenCalled()
  })

  it('fails if the vacant slot changed concurrently', async () => {
    const tx = fakeTx({ vacant: [{ id: 'pay1', applicationId: 'app1' }], heldCount: 1, moved: 0 })
    await expect(allocateEscrowSlot(tx as never, input)).rejects.toThrow('ESCROW_SLOT_CHANGED')
    expect(tx.paymentAllocationHistory.create).not.toHaveBeenCalled()
  })

  it('does not touch a payment that was already transferred or is not escrowed', async () => {
    const tx = fakeTx({ existing: { status: 'PROCESSING', transferId: null } })
    await expect(allocateEscrowSlot(tx as never, input)).rejects.toThrow('PAYMENT_NOT_ESCROWED')
    expect(tx.payment.create).not.toHaveBeenCalled()
  })

  it('returns existing when the application already has an escrowed payment', async () => {
    const tx = fakeTx({ existing: { status: 'ESCROWED', transferId: null } })
    await expect(allocateEscrowSlot(tx as never, input)).resolves.toBe('existing')
    expect(tx.payment.create).not.toHaveBeenCalled()
  })
})
