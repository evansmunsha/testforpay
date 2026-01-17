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
  paymentPerTester: number
  totalBudget: number
  platformFee: number
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
  paymentPerTester: number
}

export interface JobWithApplications extends Job {
  applications: any[]
  _count: {
    applications: number
  }
}