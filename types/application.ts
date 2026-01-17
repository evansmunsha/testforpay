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
    paymentPerTester: number
    testDuration: number
  }
  tester: {
    name: string | null
    email: string
  }
  payment: {
    amount: number
    status: string
  } | null
}