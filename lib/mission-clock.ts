const DAY_IN_MS = 24 * 60 * 60 * 1000

// Every calendar-day boundary (mission days, start dates, end dates) uses this one timezone.
export const TESTING_DAY_TIMEZONE = 'UTC'

export function startOfTestingDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

/** Parses "YYYY-MM-DD" into midnight UTC of that day, or null if it is not a real date. */
export function parseTestingStartDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null
  return date
}

export function isTomorrowOrLater(startDay: Date, now = new Date()): boolean {
  return startDay.getTime() >= startOfTestingDay(now).getTime() + DAY_IN_MS
}

/** Exclusive end: midnight at the start of the day after the last testing day. */
export function getTestingEndForStartDay(startDay: Date, testDurationDays: number): Date {
  return new Date(startDay.getTime() + testDurationDays * DAY_IN_MS)
}

export function getPauseDurationMs(pausedAt: Date, resumedAt: Date): number | null {
  const durationMs = resumedAt.getTime() - pausedAt.getTime()
  return durationMs >= 0 ? durationMs : null
}

export function extendTestingEndDate(endDate: Date, pauseDurationMs: number): Date | null {
  if (
    !Number.isFinite(endDate.getTime()) ||
    !Number.isFinite(pauseDurationMs) ||
    pauseDurationMs < 0
  ) return null
  return new Date(endDate.getTime() + pauseDurationMs)
}

export function getMissionDay(
  startDate: Date,
  now = new Date(),
  pausedDurationMs = 0
): number | null {
  if (
    !Number.isFinite(startDate.getTime()) ||
    !Number.isFinite(now.getTime()) ||
    !Number.isFinite(pausedDurationMs) ||
    pausedDurationMs < 0
  ) return null

  const elapsedMs = now.getTime() - startDate.getTime() - pausedDurationMs

  if (elapsedMs < 0) {
    return null
  }

  return Math.floor(elapsedMs / DAY_IN_MS) + 1
}
