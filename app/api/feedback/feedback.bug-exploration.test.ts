/**
 * BUG CONDITION EXPLORATION TEST - Review Authenticity Fix
 * 
 * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code
 * Test failure confirms the security vulnerability exists
 * 
 * DO NOT FIX THE TEST OR THE CODE when this test fails
 * Document the counterexamples and mark the exploration complete
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.7, 1.8, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 * 
 * This test explores the bug condition described in the bugfix spec:
 * The current system allows any authenticated user to submit feedback
 * without verifying job completion, enabling misleading testimonials.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import prisma from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { POST } from './route'

describe('Bug Condition Exploration: Feedback Verification Vulnerabilities', () => {
  let testerAId: string
  let testerBId: string
  let testerId_noApplications: string
  let developerId: string
  let jobId: string
  let completedApplicationId: string
  let testingApplicationId: string
  let testerAToken: string
  let testerBToken: string
  let testerNoAppsToken: string

  beforeAll(async () => {
    // Create test users
    const hashedPassword = await hashPassword('testpassword123')

    const testerA = await prisma.user.create({
      data: {
        email: 'tester-a@bugtest.com',
        password: hashedPassword,
        name: 'Tester A',
        role: 'TESTER',
        emailVerified: true,
      },
    })
    testerAId = testerA.id
    testerAToken = generateToken({
      userId: testerA.id,
      email: testerA.email,
      role: testerA.role,
    })

    const testerB = await prisma.user.create({
      data: {
        email: 'tester-b@bugtest.com',
        password: hashedPassword,
        name: 'Tester B',
        role: 'TESTER',
        emailVerified: true,
      },
    })
    testerBId = testerB.id
    testerBToken = generateToken({
      userId: testerB.id,
      email: testerB.email,
      role: testerB.role,
    })

    const testerNoApps = await prisma.user.create({
      data: {
        email: 'tester-noapps@bugtest.com',
        password: hashedPassword,
        name: 'Tester No Apps',
        role: 'TESTER',
        emailVerified: true,
      },
    })
    testerId_noApplications = testerNoApps.id
    testerNoAppsToken = generateToken({
      userId: testerNoApps.id,
      email: testerNoApps.email,
      role: testerNoApps.role,
    })

    const developer = await prisma.user.create({
      data: {
        email: 'dev@bugtest.com',
        password: hashedPassword,
        name: 'Test Developer',
        role: 'DEVELOPER',
        emailVerified: true,
      },
    })
    developerId = developer.id

    // Create a test job
    const job = await prisma.testingJob.create({
      data: {
        developerId: developerId,
        appName: 'Bug Test App',
        appDescription: 'Testing app for bug exploration',
        googlePlayLink: 'https://play.google.com/store/apps/details?id=com.bugtest',
        testersNeeded: 5,
        testDuration: 14,
        paymentPerTester: 1000,
        totalBudget: 5000,
        platformFee: 500,
        status: 'ACTIVE',
      },
    })
    jobId = job.id

    // Create a COMPLETED application for Tester B
    const completedApp = await prisma.application.create({
      data: {
        jobId: jobId,
        testerId: testerBId,
        status: 'COMPLETED',
        optInVerified: true,
        verifiedAt: new Date(),
        testingStartDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        testingEndDate: new Date(),
      },
    })
    completedApplicationId = completedApp.id

    // Create a TESTING (incomplete) application for Tester A
    const testingApp = await prisma.application.create({
      data: {
        jobId: jobId,
        testerId: testerAId,
        status: 'TESTING',
        optInVerified: true,
        verifiedAt: new Date(),
        testingStartDate: new Date(),
      },
    })
    testingApplicationId = testingApp.id
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.feedback.deleteMany({
      where: {
        OR: [
          { userId: testerAId },
          { userId: testerBId },
          { userId: testerId_noApplications },
        ],
      },
    })
    await prisma.application.deleteMany({ where: { jobId } })
    await prisma.testingJob.delete({ where: { id: jobId } })
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testerAId, testerBId, testerId_noApplications, developerId],
        },
      },
    })
    await prisma.$disconnect()
  })

  /**
   * BUG SCENARIO 1: Tester with zero completed Applications submits feedback with applicationId
   * 
   * Expected Behavior (after fix): System rejects with 403 "You can only submit feedback for completed testing jobs"
   * Current Behavior (unfixed): System accepts without verification (BUG)
   * 
   * This scenario demonstrates that testers can claim job completion without actual completion
   */
  it('SHOULD reject feedback from tester with no completed applications when applicationId provided', async () => {
    const request = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `auth-token=${testerNoAppsToken}`,
      },
      body: JSON.stringify({
        type: 'tester',
        rating: 5,
        title: 'Misleading Testimonial',
        message: 'I tested 10 apps successfully on TestForPay! Great platform!',
        applicationId: completedApplicationId, // Attempting to claim another user's completed app
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    // EXPECTED: Should reject with 403
    // ACTUAL ON UNFIXED CODE: Will accept (200) - this is the BUG
    expect(response.status).toBe(403)
    expect(data.error).toContain('completed')
  })

  /**
   * BUG SCENARIO 2: Tester A attempts to submit feedback with Tester B's applicationId
   * 
   * Expected Behavior (after fix): System rejects with 403 "You can only submit feedback for your own completed applications"
   * Current Behavior (unfixed): No ownership check, potentially accepts (BUG)
   * 
   * This scenario demonstrates application ID spoofing vulnerability
   */
  it('SHOULD reject feedback when tester attempts to use another tester\'s applicationId', async () => {
    const request = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `auth-token=${testerAToken}`,
      },
      body: JSON.stringify({
        type: 'tester',
        rating: 5,
        title: 'Spoofed Application Reference',
        message: 'Attempting to claim credit for Tester B\'s completed application',
        applicationId: completedApplicationId, // This belongs to Tester B, not Tester A
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    // EXPECTED: Should reject with 403 ownership error
    // ACTUAL ON UNFIXED CODE: No ownership check exists - BUG
    expect(response.status).toBe(403)
    expect(data.error).toContain('your own')
  })

  /**
   * BUG SCENARIO 3: Tester attempts to submit feedback for TESTING status application
   * 
   * Expected Behavior (after fix): System rejects with 403 "You can only submit feedback for completed testing jobs"
   * Current Behavior (unfixed): No status check, accepts incomplete applications (BUG)
   * 
   * This scenario demonstrates premature feedback vulnerability
   */
  it('SHOULD reject feedback when application status is not COMPLETED', async () => {
    const request = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `auth-token=${testerAToken}`,
      },
      body: JSON.stringify({
        type: 'tester',
        rating: 5,
        title: 'Premature Feedback',
        message: 'Submitting feedback for an incomplete testing job',
        applicationId: testingApplicationId, // This application is TESTING, not COMPLETED
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    // EXPECTED: Should reject with 403 status error
    // ACTUAL ON UNFIXED CODE: No status verification exists - BUG
    expect(response.status).toBe(403)
    expect(data.error).toContain('completed testing jobs')
  })

  /**
   * BUG SCENARIO 4: Client sends category in request body
   * 
   * Expected Behavior (after fix): System ignores client-provided category, derives server-side
   * Current Behavior (unfixed): No category field exists, but demonstrates client trust vulnerability
   * 
   * This scenario demonstrates that category must be server-derived, not client-provided
   */
  it('SHOULD ignore client-provided category and derive category server-side', async () => {
    const request = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `auth-token=${testerNoAppsToken}`,
      },
      body: JSON.stringify({
        type: 'tester',
        rating: 5,
        title: 'Client Manipulation Attempt',
        message: 'Attempting to manipulate verification status',
        category: 'JOB_COMPLETION', // Client attempting to claim verified status
        verified: true, // Client attempting to claim verified flag
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    // EXPECTED: Should succeed but category should be server-derived (PLATFORM for no applicationId)
    // ACTUAL ON UNFIXED CODE: No category field exists yet - BUG
    expect(response.status).toBe(200)
    if (data.feedback?.category) {
      // After fix is implemented, this check will be meaningful
      expect(data.feedback.category).toBe('PLATFORM')
    }
  })

  /**
   * BUG SCENARIO 5: Non-existent applicationId
   * 
   * Expected Behavior (after fix): System rejects with 404 "Application not found"
   * Current Behavior (unfixed): No validation, accepts invalid references (BUG)
   * 
   * This scenario demonstrates lack of foreign key validation
   */
  it('SHOULD reject feedback with non-existent applicationId', async () => {
    const fakeApplicationId = 'clxxxxxxxxxxxxxxxxx' // Non-existent ID

    const request = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `auth-token=${testerAToken}`,
      },
      body: JSON.stringify({
        type: 'tester',
        rating: 5,
        title: 'Fake Application Reference',
        message: 'Attempting to link to non-existent application',
        applicationId: fakeApplicationId,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    // EXPECTED: Should reject with 404
    // ACTUAL ON UNFIXED CODE: No validation exists - BUG
    expect(response.status).toBe(404)
    expect(data.error).toContain('not found')
  })

  /**
   * VALID SCENARIO: Tester B submits feedback for their COMPLETED application
   * 
   * This scenario should work AFTER the fix is implemented
   * It demonstrates the correct happy path for JOB_COMPLETION feedback
   */
  it('SHOULD accept feedback when tester owns the COMPLETED application', async () => {
    const request = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `auth-token=${testerBToken}`,
      },
      body: JSON.stringify({
        type: 'tester',
        rating: 5,
        title: 'Legitimate Verified Feedback',
        message: 'Completed testing for Bug Test App. Great experience!',
        applicationId: completedApplicationId, // Tester B owns this COMPLETED application
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    // EXPECTED AFTER FIX: Should succeed with category = JOB_COMPLETION
    // This test will pass after the fix is implemented
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // After fix: expect(data.feedback.category).toBe('JOB_COMPLETION')
  })

  /**
   * PRESERVATION SCENARIO: PLATFORM feedback without applicationId
   * 
   * This scenario should continue to work both before and after the fix
   * It demonstrates that PLATFORM feedback should always be accepted
   */
  it('SHOULD accept PLATFORM feedback without applicationId from any authenticated user', async () => {
    const request = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `auth-token=${testerNoAppsToken}`,
      },
      body: JSON.stringify({
        type: 'tester',
        rating: 4,
        title: 'General Platform Feedback',
        message: 'TestForPay is a great concept, looking forward to testing opportunities!',
        // No applicationId - this is PLATFORM feedback
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    // EXPECTED: Should succeed both before and after fix
    // After fix: category should be PLATFORM
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
