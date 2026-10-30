export type TrainingAwardKind = 'OPTED_IN' | 'VERIFIED' | 'COMPLETED'

export const TRAINING_POINTS: Record<TrainingAwardKind, number> = {
  OPTED_IN: 10,
  VERIFIED: 20,
  COMPLETED: 70,
}

export const TRAINING_LEVELS = [
  { name: 'Rookie', min: 0 },
  { name: 'Tester', min: 100 },
  { name: 'Pro', min: 300 },
  { name: 'Expert', min: 600 },
] as const

export function pointsForAward(kind: TrainingAwardKind): number {
  return TRAINING_POINTS[kind]
}

export function trainingLevel(points: number) {
  const safe = Math.max(0, Math.floor(points || 0))
  let index = 0
  TRAINING_LEVELS.forEach((level, i) => {
    if (safe >= level.min) index = i
  })
  const current = TRAINING_LEVELS[index]
  const next = TRAINING_LEVELS[index + 1] ?? null
  return {
    name: current.name,
    points: safe,
    nextLevel: next ? next.name : null,
    pointsToNext: next ? next.min - safe : 0,
  }
}

// Training is offered only to testers in Africa (ISO 3166-1 alpha-2 codes).
export const AFRICAN_COUNTRY_CODES = [
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG',
  'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML',
  'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD',
  'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW',
] as const

export function isAfricanCountry(code: string | null | undefined): boolean {
  if (!code) return false
  return (AFRICAN_COUNTRY_CODES as readonly string[]).includes(code.trim().toUpperCase())
}

// Training jobs never move money: no payment record, no escrow, no transfer.
export function jobHandlesMoney(job: { isTraining: boolean }): boolean {
  return !job.isTraining
}
