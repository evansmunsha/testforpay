import { z } from 'zod'

// Auth Schemas
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.enum(['DEVELOPER', 'TESTER']),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Job Schemas
export const createJobSchema = z.object({
  appName: z.string().min(3, 'App name must be at least 3 characters'),
  appDescription: z.string().min(20, 'Description must be at least 20 characters'),
  packageName: z.string().optional(),
  googlePlayLink: z.string().url('Must be a valid URL'),
  appCategory: z.string().optional(),
  testersNeeded: z.number().min(12, 'Minimum 12 testers required').max(500),
  testDuration: z.number().min(0.001, 'Minimum 1 minute required').max(90),
  minAndroidVersion: z.string().optional(),
  paymentPerTester: z.number().min(5, 'Minimum $5 per tester').max(100),
})

// Application Schemas
export const applyJobSchema = z.object({
  jobId: z.string().cuid(),
})

export const verifyOptInSchema = z.object({
  applicationId: z.string().cuid(),
  verificationImage: z.string().url(),
})

// Device Info Schema
export const deviceInfoSchema = z.object({
  deviceModel: z.string().min(2),
  androidVersion: z.string().min(1),
  screenSize: z.string().optional(),
})

// Type exports
export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateJobInput = z.infer<typeof createJobSchema>
export type ApplyJobInput = z.infer<typeof applyJobSchema>
export type DeviceInfoInput = z.infer<typeof deviceInfoSchema>