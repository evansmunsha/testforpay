// App Constants

export const APP_NAME = 'TestForPay'
export const APP_DESCRIPTION = 'Meet Google Play testing requirements in 24 hours'

// Platform Configuration
export const PLATFORM_FEE_PERCENTAGE = 0.15 // 15%
export const MIN_TESTERS_REQUIRED = 10
export const MIN_TEST_DURATION_DAYS = 14
export const MAX_TEST_DURATION_DAYS = 30
export const MIN_PAYMENT_PER_TESTER = 5
export const MAX_PAYMENT_PER_TESTER = 50

// Job Status
export const JOB_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const

// Application Status
export const APPLICATION_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  OPTED_IN: 'OPTED_IN',
  VERIFIED: 'VERIFIED',
  TESTING: 'TESTING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  ESCROWED: 'ESCROWED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const

// User Roles
export const USER_ROLES = {
  DEVELOPER: 'DEVELOPER',
  TESTER: 'TESTER',
  ADMIN: 'ADMIN',
} as const

// App Categories
export const APP_CATEGORIES = [
  'productivity',
  'social',
  'entertainment',
  'games',
  'education',
  'health',
  'finance',
  'shopping',
  'other',
] as const

// Android Versions
export const ANDROID_VERSIONS = [
  '14',
  '13',
  '12',
  '11',
  '10',
  '9',
] as const

// Pricing Tiers
export const PRICING_TIERS = {
  STARTER: {
    name: 'Starter',
    price: 150,
    testers: 20,
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 250,
    testers: 35,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: null, // Custom pricing
    testers: 50,
  },
} as const