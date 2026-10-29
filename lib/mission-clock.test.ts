import { describe, expect, it } from '@jest/globals'
import {
  extendTestingEndDate,
  getMissionDay,
  getPauseDurationMs,
  getTestingEndForStartDay,
  isTomorrowOrLater,
  parseTestingStartDate,
} from './mission-clock'

const DAY_IN_MS = 24 * 60 * 60 * 1000

describe('calendar-day scheduling', () => {
  it('parses only real YYYY-MM-DD dates as midnight UTC', () => {
    expect(parseTestingStartDate('2026-03-05')).toEqual(new Date('2026-03-05T00:00:00.000Z'))
    expect(parseTestingStartDate('2026-02-30')).toBeNull()
    expect(parseTestingStartDate('05/03/2026')).toBeNull()
  })

  it('requires tomorrow or later in UTC', () => {
    const now = new Date('2026-03-05T23:59:00.000Z')
    expect(isTomorrowOrLater(new Date('2026-03-05T00:00:00.000Z'), now)).toBe(false)
    expect(isTomorrowOrLater(new Date('2026-03-06T00:00:00.000Z'), now)).toBe(true)
  })

  it('gives every tester the same day 1 and day 14', () => {
    const start = new Date('2026-03-10T00:00:00.000Z')
    const end = getTestingEndForStartDay(start, 14)
    expect(end).toEqual(new Date('2026-03-24T00:00:00.000Z'))
    expect(getMissionDay(start, new Date('2026-03-10T00:00:00.000Z'))).toBe(1)
    expect(getMissionDay(start, new Date('2026-03-10T23:59:59.000Z'))).toBe(1)
    expect(getMissionDay(start, new Date('2026-03-23T23:59:59.000Z'))).toBe(14)
    expect(getMissionDay(start, new Date('2026-03-09T23:59:59.000Z'))).toBeNull()
  })
})

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
