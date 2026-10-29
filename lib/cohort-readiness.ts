import { passesDeclaredJobScreening } from './tester-eligibility'

export type CohortBlocker =
  | 'COUNTRIES_REQUIRED'
  | 'ACTIVE_TESTERS_RUNNING'
  | 'COMPLETED_TESTER_PRESENT'
  | 'OPEN_ISSUES'
  | 'PAYMENT_NOT_ESCROWED'
  | 'SCREENING_FAILED'
  | 'NOT_ENOUGH_VERIFIED'

export interface ReadinessApplication {
  id: string
  status: string
  cohortSelected: boolean
  optInVerified: boolean
  testingPausedAt: Date | null
  openIssueCount: number
  payment: { status: string; transferId: string | null } | null
  tester: { countryCode: string | null; androidVersion: string | null | undefined }
}

export interface CohortReadinessInput {
  testersNeeded: number
  supportedCountries: string[]
  minAndroidVersion: string | null
  applications: ReadinessApplication[]
  activeTestingCount: number
  completedSelectedCount: number
}

export interface CohortReadiness {
  canStart: boolean
  verifiedCount: number
  startingIds: string[]
  pausedIds: string[]
  blockers: CohortBlocker[]
}

/**
 * Decides whether a job's tester group can start together.
 * Only testers who are verified (or paused from an earlier start) and individually valid are counted.
 * Approving, opening the Play Store link, uploading proof, or verifying never starts anyone.
 */
export function evaluateCohortReadiness(input: CohortReadinessInput): CohortReadiness {
  const blockers = new Set<CohortBlocker>()
  if (input.supportedCountries.length === 0) blockers.add('COUNTRIES_REQUIRED')
  if (input.activeTestingCount > 0) blockers.add('ACTIVE_TESTERS_RUNNING')
  if (input.completedSelectedCount > 0) blockers.add('COMPLETED_TESTER_PRESENT')

  const candidates = input.applications.filter((application) =>
    application.cohortSelected &&
    (
      (['VERIFIED', 'SCHEDULED'].includes(application.status) && application.optInVerified) ||
      (application.status === 'TESTING' && application.testingPausedAt !== null)
    )
  )

  const valid = candidates.filter((application) => {
    if (application.openIssueCount > 0) {
      blockers.add('OPEN_ISSUES')
      return false
    }
    if (application.payment?.status !== 'ESCROWED' || application.payment.transferId !== null) {
      blockers.add('PAYMENT_NOT_ESCROWED')
      return false
    }
    if (!passesDeclaredJobScreening({
      testerCountryCode: application.tester.countryCode,
      testerAndroidVersion: application.tester.androidVersion,
      supportedCountries: input.supportedCountries,
      minimumAndroidVersion: input.minAndroidVersion,
    })) {
      blockers.add('SCREENING_FAILED')
      return false
    }
    return true
  })

  // Paused testers keep their place first so their saved remaining time is not lost.
  const ordered = [
    ...valid.filter((application) => application.status === 'TESTING'),
    ...valid.filter((application) => application.status !== 'TESTING'),
  ]
  if (ordered.length < input.testersNeeded) blockers.add('NOT_ENOUGH_VERIFIED')

  const starting = ordered.slice(0, input.testersNeeded)
  return {
    canStart: blockers.size === 0 && starting.length === input.testersNeeded,
    verifiedCount: valid.length,
    startingIds: starting.map((application) => application.id),
    pausedIds: starting.filter((application) => application.status === 'TESTING').map((application) => application.id),
    blockers: [...blockers],
  }
}

export const COHORT_BLOCKER_MESSAGES: Record<CohortBlocker, string> = {
  COUNTRIES_REQUIRED: 'Declare the countries your app is available in before starting.',
  ACTIVE_TESTERS_RUNNING: 'Some testers are already testing. Pause them before starting a new group.',
  COMPLETED_TESTER_PRESENT: 'A tester from this group already finished. Contact support to reconcile before starting again.',
  OPEN_ISSUES: 'A tester has an unresolved install problem report. It must be resolved first.',
  PAYMENT_NOT_ESCROWED: 'A tester does not have an intact escrowed payment. Contact support.',
  SCREENING_FAILED: 'A tester no longer matches your country or Android requirements.',
  NOT_ENOUGH_VERIFIED: 'Not enough verified testers yet. Keep approving and verifying applicants.',
}
