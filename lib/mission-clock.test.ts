import { describe, expect, it } from '@jest/globals'
import {
  extendTestingEndDate,
  getMissionDay,
  getPauseDurationMs,
} from './mission-clock'

const DAY_IN_MS = 24 * 60 * 60 * 1000

describe('getMissionDay', () => {
  const startDate = new Date('2026-01-01T12:00:00.000Z')

  it('returns null before the testing start', () => {
    expect(getMissionDay(startDate, new Date(startDate.getTime() - 1))).toBeNull()
  })

  it('starts day 1 at the testing start', () => {
    expect(getMissionDay(startDate, startDate)).toBe(1)
  })

  it('starts a new mission day at each 24-hour boundary', () => {
    expect(getMissionDay(startDate, new Date(startDate.getTime() + DAY_IN_MS - 1))).toBe(1)
    expect(getMissionDay(startDate, new Date(startDate.getTime() + DAY_IN_MS))).toBe(2)
  })

  it('does not count completed pause time toward the mission day', () => {
    const afterOneActiveDayAndTwoPausedDays = new Date(
      startDate.getTime() + 3 * DAY_IN_MS
    )
    expect(getMissionDay(startDate, afterOneActiveDayAndTwoPausedDays, 2 * DAY_IN_MS)).toBe(2)
  })

  it('extends the end date only by the exact paused duration', () => {
    const endDate = new Date(startDate.getTime() + 14 * DAY_IN_MS)
    const pauseDuration = getPauseDurationMs(startDate, new Date(startDate.getTime() + 3 * DAY_IN_MS))
    expect(pauseDuration).toBe(3 * DAY_IN_MS)
    expect(extendTestingEndDate(endDate, pauseDuration!)).toEqual(
      new Date(startDate.getTime() + 17 * DAY_IN_MS)
    )
    expect(endDate).toEqual(new Date(startDate.getTime() + 14 * DAY_IN_MS))
  })

  it('rejects invalid pause durations', () => {
    expect(getPauseDurationMs(new Date('2026-01-02T00:00:00Z'), startDate)).toBeNull()
    expect(extendTestingEndDate(startDate, -1)).toBeNull()
    expect(extendTestingEndDate(new Date(Number.NaN), DAY_IN_MS)).toBeNull()
    expect(getMissionDay(startDate, new Date(), -1)).toBeNull()
  })
})
