import type { Application } from './application'
import type { Cents } from './money'

export type JobStatus = 'DRAFT' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Job {
  id: string
  appName: string
  appDescription: string
  packageName: string | null
  googlePlayLink: string
  appCategory: string | null
  testersNeeded: number
  testDuration: number
  minAndroidVersion: string | null
  /** Payment per tester in integer cents (EUR). */
  paymentPerTester: Cents
  /** Total tester budget in integer cents (EUR). */
  totalBudget: Cents
  /** Platform fee in integer cents (EUR). */
  platformFee: Cents
  status: JobStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  developerId: string
}

export interface CreateJobInput {
  appName: string
  appDescription: string
  packageName?: string
  googlePlayLink: string
  appCategory?: string
  testersNeeded: number
  testDuration: number
  minAndroidVersion?: string
  /** Payment per tester in euros (will be converted to cents server-side). */
  paymentPerTester: number
}

export interface JobWithApplications extends Job {
  applications: Application[]
  _count: {
    applications: number
  }
}
