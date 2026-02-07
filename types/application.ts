import type { Cents } from './money'

export type ApplicationStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'OPTED_IN' 
  | 'VERIFIED' 
  | 'TESTING' 
  | 'COMPLETED' 
  | 'REJECTED'

export interface Application {
  id: string
  jobId: string
  testerId: string
  status: ApplicationStatus
  optInVerified: boolean
  verificationImage: string | null
  verifiedAt: string | null
  testingStartDate: string | null
  testingEndDate: string | null
  feedback: string | null
  rating: number | null
  createdAt: string
  updatedAt: string
}

export interface ApplicationWithDetails extends Application {
  job: {
    appName: string
    appDescription: string
    googlePlayLink: string
    /** Payment per tester in integer cents (EUR). */
    paymentPerTester: Cents
    testDuration: number
  }
  tester: {
    name: string | null
    email: string
  }
  payment: {
    /** Amount in integer cents (EUR). */
    amount: Cents
    status: string
  } | null
}
