/**
 * BUG CONDITION EXPLORATION TEST - Review Authenticity Fix
 * 
 * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code
 * Test failure confirms the security vulnerability exists
 * 
 * Run with: npx tsx scripts/test-bug-exploration.ts
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.7, 1.8, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
 */

import prisma from '../lib/prisma'
import { hashPassword, generateToken } from '../lib/auth'

interface TestResult {
  scenario: string
  passed: boolean
  expected: string
  actual: string
  bugConfirmed?: boolean
}

const results: TestResult[] = []

async function testFeedbackBugConditions() {
  console.log('\n🔍 BUG CONDITION EXPLORATION TEST')
  console.log('=' .repeat(60))
  console.log('Testing feedback submission vulnerabilities on UNFIXED code')
  console.log('These tests should FAIL, confirming the bug exists\n')

  let testerAId: string = ''
  let testerBId: string = ''
  let testerId_noApplications: string = ''
  let developerId: string = ''
  let jobId: string = ''
  let completedApplicationId: string = ''
  let testingApplicationId: string = ''
  let testerAToken: string = ''
  let testerBToken: string = ''
  let testerNoAppsToken: string = ''


  try {
    // Setup test data
    console.log('📝 Setting up test data...')
    
    const hashedPassword = await hashPassword('testpassword123')

    const testerA = await prisma.user.create({
      data: {
        email: `tester-a-${Date.now()}@bugtest.com`,
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
        email: `tester-b-${Date.now()}@bugtest.com`,
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
        email: `tester-noapps-${Date.now()}@bugtest.com`,
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
        email: `dev-${Date.now()}@bugtest.com`,
        password: hashedPassword,
        name: 'Test Developer',
        role: 'DEVELOPER',
        emailVerified: true,
      },
    })
    developerId = developer.id

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

    console.log('✅ Test data created\n')

    // Test Scenario 1: Tester with no completed apps can submit feedback claiming verification
    console.log('🧪 Test 1: Unverified tester submits feedback with applicationId')
    try {
      const feedbackData = {
        userId: testerId_noApplications,
        type: 'tester',
        rating: 5,
        title: 'Misleading Testimonial',
        message: 'I tested 10 apps successfully! Great platform!',
        // BUG: Current code doesn't verify this tester has completed applications
      }

      const feedback = await prisma.feedback.create({ data: feedbackData as any })
      
      results.push({
        scenario: 'Test 1: Tester with zero completed apps submits feedback',
        passed: false,
        expected: 'Should reject without verified Application',
        actual: 'Accepted feedback without verification check',
        bugConfirmed: true,
      })
      
      await prisma.feedback.delete({ where: { id: feedback.id } })
    } catch (error) {
      results.push({
        scenario: 'Test 1: Tester with zero completed apps submits feedback',
        passed: true,
        expected: 'Should reject without verified Application',
        actual: 'Rejected (unexpected - fix may already exist)',
      })
    }

    // Test Scenario 2: Current schema doesn't have applicationId field
    console.log('🧪 Test 2: Check if Feedback model has applicationId field')
    const feedbackFields = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Feedback' 
      AND column_name = 'applicationId'
    ` as any[]
    
    if (feedbackFields.length === 0) {
      results.push({
        scenario: 'Test 2: Feedback model has applicationId foreign key',
        passed: false,
        expected: 'Should have applicationId field to link to Application',
        actual: 'applicationId field does NOT exist in schema',
        bugConfirmed: true,
      })
    } else {
      results.push({
        scenario: 'Test 2: Feedback model has applicationId foreign key',
        passed: true,
        expected: 'Should have applicationId field to link to Application',
        actual: 'applicationId field exists (fix may be implemented)',
      })
    }

    // Test Scenario 3: Current schema doesn't have category field
    console.log('🧪 Test 3: Check if Feedback model has category field')
    const categoryFields = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Feedback' 
      AND column_name = 'category'
    ` as any[]
    
    if (categoryFields.length === 0) {
      results.push({
        scenario: 'Test 3: Feedback model has category field (PLATFORM vs JOB_COMPLETION)',
        passed: false,
        expected: 'Should have category field to distinguish feedback types',
        actual: 'category field does NOT exist in schema',
        bugConfirmed: true,
      })
    } else {
      results.push({
        scenario: 'Test 3: Feedback model has category field (PLATFORM vs JOB_COMPLETION)',
        passed: true,
        expected: 'Should have category field to distinguish feedback types',
        actual: 'category field exists (fix may be implemented)',
      })
    }

    // Test Scenario 4: API route doesn't verify Application ownership or completion
    console.log('🧪 Test 4: Check if API validates Application ownership and status')
    // Read the route file to check for verification logic
    const fs = await import('fs/promises')
    const routeContent = await fs.readFile('app/api/feedback/route.ts', 'utf-8')
    
    const hasOwnershipCheck = routeContent.includes('testerId') && routeContent.includes('userId')
    const hasStatusCheck = routeContent.includes('COMPLETED') || routeContent.includes('status')
    const hasApplicationQuery = routeContent.includes('application.findUnique') || routeContent.includes('application.findFirst')
    
    if (!hasOwnershipCheck || !hasStatusCheck || !hasApplicationQuery) {
      results.push({
        scenario: 'Test 4: API validates Application ownership and COMPLETED status',
        passed: false,
        expected: 'Should verify Application.testerId === userId AND status === COMPLETED',
        actual: `Missing verification: ownership=${hasOwnershipCheck}, status=${hasStatusCheck}, query=${hasApplicationQuery}`,
        bugConfirmed: true,
      })
    } else {
      results.push({
        scenario: 'Test 4: API validates Application ownership and COMPLETED status',
        passed: true,
        expected: 'Should verify Application.testerId === userId AND status === COMPLETED',
        actual: 'Verification logic found in code (fix may be implemented)',
      })
    }

    // Test Scenario 5: Verify current feedback can be submitted without any job completion
    console.log('🧪 Test 5: Submit feedback without any Application verification')
    try {
      const platformFeedback = await prisma.feedback.create({
        data: {
          userId: testerId_noApplications,
          type: 'tester',
          rating: 5,
          title: 'Platform Feedback',
          message: 'TestForPay is great! I completed many testing jobs!',
          // BUG: This tester has ZERO completed applications but can still submit testimonial
        },
      })
      
      // Check if this feedback would be displayed as verified testimonial
      const approvedFeedback = await prisma.feedback.findFirst({
        where: { id: platformFeedback.id },
        select: {
          id: true,
          type: true,
          rating: true,
          title: true,
          message: true,
          userId: true,
        },
      })
      
      results.push({
        scenario: 'Test 5: Submit feedback claiming testing experience without verification',
        passed: false,
        expected: 'Should distinguish PLATFORM feedback from verified JOB_COMPLETION feedback',
        actual: 'Feedback accepted and stored equally - no distinction between verified and unverified',
        bugConfirmed: true,
      })
      
      await prisma.feedback.delete({ where: { id: platformFeedback.id } })
    } catch (error) {
      results.push({
        scenario: 'Test 5: Submit feedback claiming testing experience without verification',
        passed: true,
        expected: 'Should distinguish PLATFORM feedback from verified JOB_COMPLETION feedback',
        actual: 'Feedback submission failed (unexpected)',
      })
    }

  } catch (error) {
    console.error('❌ Test execution error:', error)
    throw error
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test data...')
    try {
      if (jobId) {
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
      }
    } catch (cleanupError) {
      console.error('⚠️  Cleanup error:', cleanupError)
    }
    
    await prisma.$disconnect()
  }

  // Print results
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST RESULTS')
  console.log('='.repeat(60))
  
  let bugsConfirmed = 0
  let testsExpectedToFail = 0
  
  results.forEach((result, index) => {
    const icon = result.bugConfirmed ? '🐛' : (result.passed ? '✅' : '❌')
    console.log(`\n${icon} ${result.scenario}`)
    console.log(`   Expected: ${result.expected}`)
    console.log(`   Actual:   ${result.actual}`)
    
    if (result.bugConfirmed) {
      bugsConfirmed++
      console.log(`   ⚠️  BUG CONFIRMED - Security vulnerability exists`)
    }
    
    if (!result.passed) testsExpectedToFail++
  })
  
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`🐛 Bugs confirmed: ${bugsConfirmed}/${results.length}`)
  console.log(`❌ Tests failed (expected): ${testsExpectedToFail}/${results.length}`)
  
  if (bugsConfirmed > 0) {
    console.log('\n✅ Bug condition exploration SUCCESSFUL')
    console.log('   The security vulnerabilities have been confirmed.')
    console.log('   These failures prove the bug exists in the current code.')
    console.log('\n   Next step: Implement the fix as described in design.md')
  } else {
    console.log('\n⚠️  No bugs found - fix may already be implemented')
    console.log('   or the root cause analysis may need revision.')
  }
  
  console.log('\n' + '='.repeat(60))
  
  return bugsConfirmed
}

// Run the test
testFeedbackBugConditions()
  .then((bugsConfirmed) => {
    process.exit(bugsConfirmed > 0 ? 0 : 1) // Exit 0 if bugs confirmed (test succeeded), 1 if not
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
