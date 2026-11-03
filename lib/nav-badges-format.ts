export type NavBadges = Partial<Record<'jobs' | 'applications' | 'messages' | 'feedback' | 'community' | 'admin', number>>

export const ADMIN_TAB_KEYS = [
  'contacts',
  'applications',
  'payments',
  'reports',
  'application-issues',
  'community',
  'testimonials',
  'fraud',
] as const

export type AdminTabKey = (typeof ADMIN_TAB_KEYS)[number]
export type AdminTabBadges = Partial<Record<AdminTabKey, number>>

/** Name used to remember when an admin last opened a tab. Messages keeps its older name. */
export function adminSectionName(tab: AdminTabKey): string {
  return tab === 'contacts' ? 'contacts' : `admin:${tab}`
}

/** Menu badge text: hidden for zero, capped at 99+. */
export function formatBadgeCount(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null
  return count > 99 ? '99+' : String(Math.floor(count))
}
