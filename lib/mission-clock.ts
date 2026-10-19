const DAY_IN_MS = 24 * 60 * 60 * 1000

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
