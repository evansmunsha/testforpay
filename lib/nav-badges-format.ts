export type NavBadges = Partial<Record<'jobs' | 'applications' | 'messages' | 'feedback' | 'community' | 'admin', number>>

/** Menu badge text: hidden for zero, capped at 99+. */
export function formatBadgeCount(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null
  return count > 99 ? '99+' : String(Math.floor(count))
}
