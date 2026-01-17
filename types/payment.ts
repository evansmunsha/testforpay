export type PaymentStatus = 
  | 'PENDING' 
  | 'ESCROWED' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'REFUNDED'

export interface Payment {
  id: string
  applicationId: string
  jobId: string
  amount: number
  platformFee: number
  totalAmount: number
  status: PaymentStatus
  paymentIntentId: string | null
  transferId: string | null
  escrowedAt: string | null
  completedAt: string | null
  failedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PaymentWithDetails extends Payment {
  application: {
    job: {
      appName: string
    }
    tester: {
      name: string | null
      email: string
    }
  }
}