# Bugfix Requirements Document

## Introduction

The current review/testimonial system allows any authenticated user to submit feedback that appears as verified social proof, regardless of whether they have actually completed a testing job. This creates misleading evidence of platform success and undermines trust in the testimonial system. Specifically, testers can submit reviews claiming testing experience without ever having participated in or completed a developer's testing job.

This bug affects the integrity of social proof displayed on the homepage, /hire-testers page, /testers page, and admin dashboard, where all approved "tester" feedback appears as legitimate testimonials implying verified testing experience.

The fix establishes two distinct feedback flows:
1. **PLATFORM feedback**: Generic feedback about TestForPay, available to all authenticated users
2. **JOB_COMPLETION feedback**: Contextual feedback tied to a specific completed Application, requiring server-side verification

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a tester with zero completed testing jobs submits feedback via POST /api/feedback THEN the system accepts the feedback without verifying job completion

1.2 WHEN a tester submits feedback THEN the system does not check if the feedback relates to a specific Application with status COMPLETED from the Prisma ApplicationStatus enum

1.3 WHEN a tester submits feedback THEN the Feedback model does not capture or link to any Application record via applicationId foreign key to prove completion

1.4 WHEN admin approves feedback via /api/admin/feedback/[id] THEN the system does not verify or display whether the feedback is linked to a specific completed Application

1.5 WHEN the Testimonials component displays approved feedback on public pages THEN the system presents all "tester" type feedback as equal evidence of testing experience, regardless of actual Application completion status

1.6 WHEN public pages display approved testimonials THEN there is no distinction between platform-only feedback ("TestForPay is good") and job-completion feedback tied to a verified Application

1.7 WHEN a client submits feedback THEN the backend does not verify ownership (Application.testerId === currentUser.userId) or status (Application.status === COMPLETED) before accepting applicationId

1.8 WHEN a tester attempts to submit feedback with an applicationId THEN the system does not prevent spoofing another tester's Application or incomplete/cancelled Applications

### Expected Behavior (Correct)

**Submission Flow and Category Derivation**

2.1 WHEN a user submits feedback via POST /api/feedback without an applicationId THEN the system SHALL classify it as PLATFORM category and accept it from any authenticated user without job completion requirements

2.2 WHEN a user submits feedback via POST /api/feedback with an applicationId THEN the system SHALL derive the category as JOB_COMPLETION and MUST verify ownership and completion status server-side

2.3 WHEN the backend receives feedback with applicationId THEN the system SHALL verify Application.testerId === currentUser.userId before accepting the submission

2.4 WHEN the backend receives feedback with applicationId THEN the system SHALL verify Application.status === COMPLETED (from ApplicationStatus enum) before accepting the submission

2.5 WHEN a tester attempts to submit feedback with an applicationId they do not own THEN the system SHALL reject the submission with error "You can only submit feedback for your own completed applications"

2.6 WHEN a tester attempts to submit feedback with an applicationId where Application.status is not COMPLETED THEN the system SHALL reject the submission with error "You can only submit feedback for completed testing jobs"

2.7 WHEN the client submits feedback THEN the system SHALL NOT accept client-provided "verified" flag or "category" selection - category MUST be derived server-side based on presence and validation of applicationId

**Data Model and Relationships**

2.8 WHEN the Feedback model is updated THEN it SHALL include an optional applicationId foreign key field linking to the Application table

2.9 WHEN the Feedback model is updated THEN it SHALL include a category field with enum values PLATFORM and JOB_COMPLETION

2.10 WHEN JOB_COMPLETION feedback is stored THEN the system SHALL link it to the SPECIFIC Application being reviewed via the applicationId foreign key

2.11 WHEN PLATFORM feedback is stored THEN the applicationId field SHALL be null

**Admin Interface Requirements**

2.12 WHEN admin views feedback via GET /api/admin/feedback THEN the system SHALL display the feedback category (PLATFORM or JOB_COMPLETION)

2.13 WHEN admin views JOB_COMPLETION feedback THEN the system SHALL display the linked Application details including Application.id, Application.status, and related TestingJob information as verification proof

2.14 WHEN admin views PLATFORM feedback THEN the system SHALL indicate no job verification is required or available

**Public Display Requirements**

2.15 WHEN the Testimonials component displays approved JOB_COMPLETION feedback THEN the system SHALL display a verification indicator (e.g., "✓ Verified test completion") ONLY when Application.status === COMPLETED is database-proven

2.16 WHEN the Testimonials component displays approved PLATFORM feedback THEN the system SHALL display a neutral label (e.g., "Early TestForPay feedback")

2.17 WHEN the Testimonials component renders feedback THEN the system SHALL preserve original user text exactly as submitted without transformation, translation, or AI rewriting

**Migration Requirements**

2.18 WHEN existing Feedback records are migrated THEN the system SHALL set category to PLATFORM for all records where applicationId is null

2.19 WHEN existing Feedback records are migrated THEN the system SHALL NOT fabricate Application relationships or applicationId values

2.20 WHEN existing Feedback records are migrated THEN the system SHALL NOT mark any feedback as verified without database-backed Application.status === COMPLETED proof

### Unchanged Behavior (Regression Prevention)

**Authentication and Access Control**

3.1 WHEN a developer submits PLATFORM feedback THEN the system SHALL CONTINUE TO accept the feedback without requiring completed testing jobs (developers are not testers)

3.2 WHEN a tester with zero completed Applications submits PLATFORM feedback THEN the system SHALL CONTINUE TO accept the feedback without job completion verification

3.3 WHEN any authenticated user submits PLATFORM feedback THEN the system SHALL CONTINUE TO accept it via POST /api/feedback

**Approval Workflow**

3.4 WHEN admin approves or rejects feedback via PATCH /api/admin/feedback/[id] THEN the system SHALL CONTINUE TO update the approved status and approvedAt timestamp

3.5 WHEN feedback is approved THEN the system SHALL CONTINUE TO make it visible via GET /api/feedback for public display

**Query and Display**

3.6 WHEN GET /api/feedback is called with query parameters limit and type THEN the system SHALL CONTINUE TO return approved feedback filtered by the specified parameters

3.7 WHEN the Testimonials component receives no testimonials or encounters loading errors THEN the system SHALL CONTINUE TO return null and hide the testimonials section

3.8 WHEN the Testimonials component displays approved feedback THEN the system SHALL CONTINUE TO show rating stars, title, message, displayName, companyName, and user type

**Security and Rate Limiting**

3.9 WHEN feedback submissions are rate-limited in production THEN the system SHALL CONTINUE TO enforce rate limits using the existing checkRateLimit mechanism with key format `feedback:${currentUser.userId}:${ip}`

3.10 WHEN feedback schema validation fails via Zod THEN the system SHALL CONTINUE TO return a 400 error with "Invalid feedback data"

3.11 WHEN an unauthenticated user attempts to submit feedback THEN the system SHALL CONTINUE TO return 401 error "Not authenticated"

**Existing Data Preservation**

3.12 WHEN existing approved PLATFORM feedback is displayed THEN the system SHALL CONTINUE TO show all existing approved feedback without requiring retroactive Application linking

3.13 WHEN existing feedback text is stored or displayed THEN the system SHALL CONTINUE TO preserve the original content exactly as submitted by the user

## Security Constraints

### Server-Side Verification Requirements

The backend implementation MUST enforce these security rules to prevent spoofing and unauthorized verification:

1. **Ownership Verification**: Before accepting feedback with applicationId, verify `Application.testerId === currentUser.userId` from database
2. **Status Verification**: Before accepting feedback with applicationId, verify `Application.status === ApplicationStatus.COMPLETED` from Prisma enum
3. **Category Derivation**: Derive feedback category server-side based on presence and validation of applicationId - never trust client input
4. **No Manual Category Selection**: Frontend MUST NOT allow users to manually select JOB_COMPLETION category
5. **Contextual Submission**: JOB_COMPLETION feedback should be submitted from Application detail page context after completion
6. **Foreign Key Integrity**: Use Prisma foreign key relationship to ensure applicationId references valid Application records

### Required Regression Test Scenarios

Implementation MUST prove these 8 security and functional scenarios work correctly:

**Test 1: PLATFORM Feedback Without Completion**
- Given: Tester with zero completed Applications
- When: Tester submits feedback without applicationId via POST /api/feedback
- Then: System accepts feedback and classifies as PLATFORM category

**Test 2: JOB_COMPLETION Requires Completion**
- Given: Tester with zero completed Applications
- When: Tester attempts to submit feedback with applicationId
- Then: System rejects with "You can only submit feedback for completed testing jobs"

**Test 3: Ownership Check Prevents Spoofing**
- Given: Tester A and Tester B both exist, Tester B has completed Application
- When: Tester A attempts to submit feedback with Tester B's applicationId
- Then: System rejects with "You can only submit feedback for your own completed applications"

**Test 4: Status Check Prevents Incomplete Applications**
- Given: Tester has Application with status TESTING (not COMPLETED)
- When: Tester attempts to submit feedback with this applicationId
- Then: System rejects with "You can only submit feedback for completed testing jobs"

**Test 5: Verified Submission Success**
- Given: Tester has Application with status COMPLETED owned by them
- When: Tester submits feedback with this valid applicationId
- Then: System accepts feedback, classifies as JOB_COMPLETION, links to Application

**Test 6: Migration Preserves Existing Feedback**
- Given: Existing Feedback records without applicationId
- When: Migration runs
- Then: All existing records classified as PLATFORM, no fabricated relationships, all text preserved

**Test 7: Public Display Shows Verification Proof**
- Given: Approved JOB_COMPLETION feedback linked to Application with status COMPLETED
- When: Testimonials component fetches and displays feedback
- Then: Shows "✓ Verified test completion" indicator only for database-proven completions

**Test 8: Client Cannot Bypass Verification**
- Given: Malicious client attempts to send {"category": "JOB_COMPLETION", "verified": true}
- When: Backend processes request
- Then: System ignores client flags, derives category from applicationId validation only

## Implementation Constraints

### Data Model Requirements

The implementation MUST reference these actual Prisma schema elements:

- **ApplicationStatus Enum Values**: PENDING, APPROVED, OPTED_IN, VERIFIED, TESTING, COMPLETED, REJECTED
- **Completed Status**: Use `ApplicationStatus.COMPLETED` specifically for verification
- **Foreign Key**: Feedback.applicationId → Application.id (optional, nullable)
- **Feedback Category Enum**: PLATFORM, JOB_COMPLETION

### Scope Limitations

The implementation MUST remain narrowly focused:

- **Fix**: Misleading verification and establish trustworthy feedback distinction
- **Do NOT add**: Translation features, AI content rewriting, or review platform expansion
- **Do NOT modify**: Original user feedback text in any way
- **Do NOT create**: New general review system beyond fixing verification bug

### Pre-Implementation Checklist

Before coding, developers MUST:

1. ✓ Inspect actual Prisma Application model and ApplicationStatus enum
2. ✓ Verify TestingJob and Application relationships in schema
3. ✓ Understand the complete Application lifecycle from PENDING to COMPLETED
4. ✓ Review existing POST /api/feedback endpoint implementation
5. ✓ Review existing GET /api/feedback endpoint and filtering logic
6. ✓ Review Testimonials component rendering logic
7. ✓ Plan database migration for adding applicationId and category fields
8. ✓ Plan data migration strategy for classifying existing feedback as PLATFORM
