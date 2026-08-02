// App Constants

export const APP_NAME = 'TestForPay'
export const APP_DESCRIPTION = 'Get 12 real testers in 24 hours. Publish your Android app in 14 days.'

// Platform Configuration
// NOTE: Platform fee is now a fixed amount per plan, not a percentage.
// See PLAN_CONFIG below for actual fees.
export const PLATFORM_FEE_PERCENTAGE = 0 // deprecated — kept for compatibility only
export const MIN_TESTERS_REQUIRED = 12
export const TEST_DURATION_DAYS = 14 // locked to 14 days
export const MIN_PAYMENT_PER_TESTER = 2 // €2.00 (Starter pays €2.30)
export const MAX_PAYMENT_PER_TESTER = 5 // €5.00 cap

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

// Plan Configuration — single source of truth for pricing
export const PLAN_CONFIG = {
  STARTER: {
    name: 'Starter',
    priceEurCents: 2800, // €28.00
    testers: 12,
    paymentPerTesterEurCents: 230, // €2.30
    platformFeeEurCents: 40, // €0.40
    durationDays: 14,
  },
  GROWTH: {
    name: 'Growth',
    priceEurCents: 4800, // €48.00
    testers: 15,
    paymentPerTesterEurCents: 275, // €2.75
    platformFeeEurCents: 675, // €6.75
    durationDays: 14,
  },
  PRO: {
    name: 'Pro',
    priceEurCents: 7800, // €78.00
    testers: 25,
    paymentPerTesterEurCents: 275, // €2.75
    platformFeeEurCents: 925, // €9.25
    durationDays: 14,
  },
} as const

// Deprecated — kept only if old code imports it. Use PLAN_CONFIG instead.
export const PRICING_TIERS = PLAN_CONFIG

// Daily Mission Task Templates
export const TASK_TEMPLATES = {
  generic: [
    'Day 1: Complete onboarding. Any confusing steps?',
    'Day 2: Do the core action 3 times.',
    'Day 3: Test offline mode if available.',
    'Day 4: Try a premium/paid feature.',
    'Day 5: Change a setting. Does it save after restart?',
    'Day 6: Use the app for 10 minutes straight. Any crashes?',
    'Day 7: Share/export something from the app.',
    'Day 8: Try search/filter features.',
    'Day 9: Add/upload content. Any errors?',
    'Day 10: Test on slow internet.',
    'Day 11: Use the app first thing in the morning.',
    'Day 12: Test notification/settings area.',
    'Day 13: Stress test — do the main action 10 times fast.',
    'Day 14: Final review — what was broken or confusing?',
  ],
  invoice: [
    'Day 1: Create your first invoice. Save it.',
    'Day 2: Add a client and create 2 more invoices.',
    'Day 3: Export an invoice as PDF. Check formatting.',
    'Day 4: Turn off WiFi, create invoice, turn WiFi back on. Did it save?',
    'Day 5: Add a business logo. Does it show on PDF?',
    'Day 6: Create invoice with 5 items + discount. Check math.',
    'Day 7: Test watermark on/off feature.',
    'Day 8: Create 3 invoices quickly. Fast or slow?',
    'Day 9: Edit an existing invoice. Change the total.',
    'Day 10: Delete an invoice. Confirm it\'s gone.',
    'Day 11: Create invoice, close app, reopen. Still there?',
    'Day 12: Change currency symbol. Does it update?',
    'Day 13: Create biggest invoice (10+ items). Any lag?',
    'Day 14: Create one perfect invoice and export PDF.',
  ],
} as const

export type TaskTemplateKey = keyof typeof TASK_TEMPLATES