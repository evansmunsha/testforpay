import { describe, expect, it } from '@jest/globals'
import { evaluateCohortReadiness, type ReadinessApplication } from './cohort-readiness'

function application(id: string, overrides: Partial<ReadinessApplication> = {}): ReadinessApplication {
  return {
    id,
    status: 'VERIFIED',
    cohortSelected: true,
    optInVerified: true,
    testingPausedAt: null,
    openIssueCount: 0,
    payment: { status: 'ESCROWED', transferId: null },
    tester: { countryCode: 'MA', androidVersion: '13' },
    ...overrides,
  }
}

const baseInput = {
  testersNeeded: 2,
  supportedCountries: ['MA', 'US'],
  minAndroidVersion: '10',
  activeTestingCount: 0,
  completedSelectedCount: 0,
}

describe('evaluateCohortReadiness', () => {
  it('can start when the required number of testers are verified and escrowed', () => {
    const result = evaluateCohortReadiness({ ...baseInput, applications: [application('a'), application('b')] })
    expect(result.canStart).toBe(true)
    expect(result.startingIds).toEqual(['a', 'b'])
    expect(result.blockers).toEqual([])
  })

  it('cannot start with fewer verified testers than required', () => {
    const result = evaluateCohortReadiness({ ...baseInput, applications: [application('a')] })
    expect(result.canStart).toBe(false)
    expect(result.verifiedCount).toBe(1)
    expect(result.blockers).toContain('NOT_ENOUGH_VERIFIED')
  })

  it('does not count approved or opted-in testers whose proof is unverified', () => {
    const result = evaluateCohortReadiness({
      ...baseInput,
      applications: [application('a'), application('b', { status: 'OPTED_IN', optInVerified: false })],
    })
    expect(result.canStart).toBe(false)
    expect(result.verifiedCount).toBe(1)
  })

  it('blocks when a tester has an unresolved issue report', () => {
    const result = evaluateCohortReadiness({
      ...baseInput,
      applications: [application('a'), application('b', { openIssueCount: 1 }), application('c')],
    })
    expect(result.blockers).toContain('OPEN_ISSUES')
    expect(result.canStart).toBe(false)
  })

  it('blocks when escrow is missing, transferred, or not escrowed', () => {
    for (const payment of [null, { status: 'PROCESSING', transferId: null }, { status: 'ESCROWED', transferId: 'tr_1' }]) {
      const result = evaluateCohortReadiness({
        ...baseInput,
        applications: [application('a'), application('b', { payment })],
      })
      expect(result.canStart).toBe(false)
      expect(result.blockers).toContain('PAYMENT_NOT_ESCROWED')
    }
  })

  it('blocks when a tester fails country screening', () => {
    const result = evaluateCohortReadiness({
      ...baseInput,
      applications: [application('a'), application('b', { tester: { countryCode: 'BR', androidVersion: '13' } })],
    })
    expect(result.canStart).toBe(false)
    expect(result.blockers).toContain('SCREENING_FAILED')
  })

  it('blocks when testers are already actively testing or no countries are declared', () => {
    const apps = [application('a'), application('b')]
    expect(evaluateCohortReadiness({ ...baseInput, activeTestingCount: 1, applications: apps }).blockers)
      .toContain('ACTIVE_TESTERS_RUNNING')
    expect(evaluateCohortReadiness({ ...baseInput, supportedCountries: [], applications: apps }).blockers)
      .toContain('COUNTRIES_REQUIRED')
  })

  it('keeps paused testers first and reports them for explicit resume', () => {
    const result = evaluateCohortReadiness({
      ...baseInput,
      applications: [
        application('new'),
        application('paused', { status: 'TESTING', testingPausedAt: new Date('2026-10-18T10:00:00Z') }),
        application('extra'),
      ],
    })
    expect(result.canStart).toBe(true)
    expect(result.startingIds).toEqual(['paused', 'new'])
    expect(result.pausedIds).toEqual(['paused'])
  })

  it('treats testers from an older future-dated schedule as ready to start now', () => {
    const result = evaluateCohortReadiness({
      ...baseInput,
      applications: [application('a', { status: 'SCHEDULED' }), application('b')],
    })
    expect(result.canStart).toBe(true)
  })

  it('ignores applicants who were not selected into the group', () => {
    const result = evaluateCohortReadiness({
      ...baseInput,
      applications: [application('a'), application('b', { cohortSelected: false })],
    })
    expect(result.verifiedCount).toBe(1)
    expect(result.canStart).toBe(false)
  })
})
