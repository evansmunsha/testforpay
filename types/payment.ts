import type { Cents } from './money'

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
  /** Amount in integer cents (EUR). */
  amount: Cents
  /** Platform fee in integer cents (EUR). */
  platformFee: Cents
  /** Total amount in integer cents (EUR). */
  totalAmount: Cents
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
