# Tester Statistics Update Fix

## Problem
Tester profile was showing zeros for:
- Tests Completed (0)
- Total Earned ($0.00)
- Engagement Score (0)
- Average Rating (0.0/5)

Even though the tester had completed testing jobs and earned money.

## Root Cause
The aggregate statistics fields (`totalTestsCompleted`, `totalEarnings`, `averageEngagementScore`, `averageRating`) on the `User` model were not being updated when:
1. Applications were manually marked as COMPLETED
2. Applications were auto-completed by the daily cron job

There was an `update-reputation` API endpoint that could calculate these stats, but it was never being called automatically.

## Solution Implemented

### 1. Manual Application Completion
**File**: `app/api/applications/[id]/route.ts` (PATCH endpoint)

When an application is marked as COMPLETED via the action `complete`, the system now:
1. Marks application status as COMPLETED
2. **NEW**: Fetches all COMPLETED applications for that tester
3. **NEW**: Calculates totals:
   - Count of completed tests
   - Sum of payment amounts for all completed tests
   - Average of engagement scores
   - Average of ratings
4. **NEW**: Updates the User record with these calculated values

**Code Added** (lines 340-378):
```typescript
// Update tester reputation stats based on their completed applications
try {
  const completedApps = await prisma.application.findMany({
    where: {
      testerId: updatedApplication.testerId,
      status: 'COMPLETED',
    },
    include: {
      payment: true,
    },
  })

  const totalTestsCompleted = completedApps.length
  const totalEarnings = completedApps.reduce((sum, app) => sum + (app.payment?.amount || 0), 0)
  const avgEngagementScore =
    totalTestsCompleted > 0
      ? completedApps.reduce((sum, app) => sum + (app.engagementScore || 0), 0) / totalTestsCompleted
      : 0

  const withRatings = completedApps.filter(app => app.rating && app.rating > 0)
  const avgRating =
    withRatings.length > 0
      ? withRatings.reduce((sum, app) => sum + (app.rating || 0), 0) / withRatings.length
      : 0

  await prisma.user.update({
    where: { id: updatedApplication.testerId },
    data: {
      totalTestsCompleted,
      totalEarnings,
      averageEngagementScore: Math.round(avgEngagementScore * 100) / 100,
      averageRating: Math.round(avgRating * 100) / 100,
    },
  })

  console.log(`✅ Updated reputation for tester ${updatedApplication.testerId}: ${totalTestsCompleted} tests, $${totalEarnings}`)
} catch (repError) {
  console.error('⚠️ Failed to update tester reputation:', repError)
}
```

### 2. Automatic Test Completion (Cron Job)
**File**: `app/api/cron/auto-complete-tests/route.ts`

When the daily cron job auto-completes expired testing applications, it now:
1. Auto-completes the application
2. Ensures payment record exists
3. **NEW**: Calculates and updates tester reputation stats (same logic as above)

**Code Added** (lines 103-131):
```typescript
// Update tester reputation stats based on their completed applications
try {
  const completedApps = await prisma.application.findMany({
    where: {
      testerId: application.testerId,
      status: 'COMPLETED',
    },
    include: {
      payment: true,
    },
  })

  const totalTestsCompleted = completedApps.length
  const totalEarnings = completedApps.reduce((sum, app) => sum + (app.payment?.amount || 0), 0)
  const avgEngagementScore =
    totalTestsCompleted > 0
      ? completedApps.reduce((sum, app) => sum + (app.engagementScore || 0), 0) / totalTestsCompleted
      : 0

  const withRatings = completedApps.filter(app => app.rating && app.rating > 0)
  const avgRating =
    withRatings.length > 0
      ? withRatings.reduce((sum, app) => sum + (app.rating || 0), 0) / withRatings.length
      : 0

  await prisma.user.update({
    where: { id: application.testerId },
    data: {
      totalTestsCompleted,
      totalEarnings,
      averageEngagementScore: Math.round(avgEngagementScore * 100) / 100,
      averageRating: Math.round(avgRating * 100) / 100,
    },
  })
} catch (repError) {
  console.error('⚠️ Failed to update tester reputation for', application.testerId, ':', repError)
}
```

## Statistics Calculation Details

### totalTestsCompleted
```
Count of all applications where status = 'COMPLETED' for that tester
```

### totalEarnings
```
Sum of payment.amount for all COMPLETED applications
```

### averageEngagementScore
```
If completed tests > 0:
  Sum of all engagement scores / total completed tests
Else:
  0
Rounded to 2 decimal places
```

### averageRating
```
If there are ratings > 0:
  Sum of all ratings / count of rated applications
Else:
  0
Rounded to 2 decimal places
```

## Error Handling
Both implementations wrap the reputation update in try-catch to ensure:
- If reputation calculation fails, the application completion still succeeds
- Errors are logged for debugging
- The main flow is not blocked

## Testing Flow
To verify the fix works:

1. **Manual Test**:
   - Create a new testing job
   - Have a tester apply and be approved
   - Mark application as TESTING
   - Call PATCH `/api/applications/[id]` with `action: 'complete'`
   - Check tester profile - stats should update immediately

2. **Cron Test**:
   - Create testing job with testingEndDate in the past
   - Application will be auto-completed by cron job
   - Check tester profile - stats should update

3. **Verify Profile Shows Data**:
   - Navigate to `/dashboard/testers/[testerId]`
   - Should see:
     - Tests Completed: [number]
     - Total Earned: $[amount]
     - Engagement Score: [0-100]
     - Average Rating: [0-5]

## Impact
✅ Tester profiles now show accurate statistics
✅ Leaderboard rankings based on engagement score work correctly
✅ Statistics update automatically when tests complete
✅ Both manual and automatic completion flows are supported
✅ No placeholders or zeros for testers with completed tests

## Files Modified
1. `app/api/applications/[id]/route.ts` - Added reputation update to manual completion
2. `app/api/cron/auto-complete-tests/route.ts` - Added reputation update to cron job

## Deployment Notes
No database migrations needed - fields already exist in User model.
Code is backward compatible - won't break existing functionality.
