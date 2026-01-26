# Engagement Scoring System Implementation

## Overview

The engagement scoring system automatically calculates a **0-100 engagement score** for each tester based on their testing activities, helping developers quickly identify high-quality, thorough testers.

## Scoring Methodology

### Total Score: 100 Points

| Category | Points | Criteria |
|----------|--------|----------|
| **Feedback Quality** | 25 | Detailed feedback (200+ chars) = 25pts, Moderate (100-200) = 18pts, Brief (50-100) = 10pts, Minimal (<50) = 5pts |
| **Verification** | 20 | 2 screenshots = 20pts, 1 screenshot = 10pts, None = 0pts |
| **Testing Duration** | 20 | 7+ days = 20pts, 5-7 days = 16pts, 3-5 days = 12pts, 1-3 days = 8pts, <1 day = 4pts |
| **Response Time** | 15 | Within 24 hours = 15pts, 2 days = 12pts, 3 days = 10pts, 3+ days = 5pts |
| **Rating Submission** | 10 | Any rating submitted = 10pts, None = 0pts |
| **Bonus** | 5 | Complete package (2 screenshots + detailed feedback) = 5pts |

### Engagement Levels

```
85-100  → Excellent  (Green)
70-84   → Good       (Blue)
50-69   → Satisfactory (Yellow)
30-49   → Poor       (Orange)
0-29    → Minimal    (Red)
```

## Implementation Details

### Database

**Migration:** `20260126204044_add`

New fields on `Application` model:
- `engagementScore` (Int, default: 0) — 0-100 score
- `feedbackSubmittedAt` (DateTime, nullable) — When feedback was submitted

### Core Function

**File:** `lib/engagement-scoring.ts`

```typescript
calculateEngagementScore(application: EngagementInput): number
```

Calculates score based on:
- Feedback character count and quality
- Verification screenshot count
- Testing duration (start → end dates)
- Response time (created → feedbackSubmitted)
- Rating presence (1-5 stars)

### API Endpoints

**Route:** `app/api/applications/[id]/engagement-score/`

#### GET `/api/applications/[id]/engagement-score`
**Purpose:** Retrieve engagement score breakdown for analysis

**Returns:**
```json
{
  "success": true,
  "applicationId": "...",
  "engagementScore": 78,
  "breakdown": [
    {
      "category": "Feedback Quality",
      "points": 25,
      "explanation": "Detailed feedback (245 characters)"
    },
    // ... other categories
  ],
  "total": 78
}
```

#### POST `/api/applications/[id]/engagement-score`
**Purpose:** Recalculate and save engagement score to database

**Returns:**
```json
{
  "success": true,
  "applicationId": "...",
  "engagementScore": 78,
  "testerName": "John Doe"
}
```

### Components

#### ApplicationCard
**File:** `components/applications/application-card.tsx`

- Displays engagement score badge (colored by level)
- Shows score (0-100) and level name (Excellent, Good, etc.)
- Includes "Calculate Score" button for COMPLETED applications
- Auto-fetches score on feedback submission

**Display:**
```
Engagement Score: 78/100 [Good]
```

#### TestingReportViewer
**File:** `components/jobs/testing-report-viewer.tsx`

Added metrics to engagement section:
- **Average Engagement Score** — Mean score across all testers
- **Excellent Testers** — Count of testers with score ≥ 85
- **Good Testers** — Count of testers with score 70-84
- **Scoring Note** — Explains calculation methodology

## User Workflows

### For Developers

1. **View Tester Quality:**
   - Open job detail page
   - Look at ApplicationCard for each tester
   - See engagement score and level (Excellent, Good, etc.)
   - Click score badge for detailed breakdown

2. **Generate Testing Report:**
   - Go to "Testing Report" tab on job detail
   - See engagement metrics:
     - Average score across all testers
     - How many are "Excellent" or "Good"
   - Export report as JSON/CSV

### For Testers

No manual action needed. Score is **automatically calculated** when they:
1. Submit verification screenshots (both images) ✓
2. Provide feedback on the app ✓
3. Rate the app (1-5 stars) ✓
4. Complete their testing period ✓

Score improves by:
- Submitting **detailed feedback** (200+ characters) vs brief feedback
- **Testing longer** (7+ days vs 1-2 days)
- **Responding quickly** (within 24 hours vs days later)

## Bonus Features

### Detailed Breakdown
Developers can click the engagement score badge to see:
- How many points for each category
- Specific explanations (e.g., "Tested for 5.2 days", "Detailed feedback: 245 characters")
- Why the tester earned or missed points

### Automatic Calculation
When a tester completes testing and submits feedback:
1. Score is automatically calculated
2. Stored in database for future reference
3. Displayed immediately on job detail page
4. Included in testing report exports

## Testing & Analytics

### View Engagement in Reports

```bash
GET /api/jobs/{jobId}/testing-report
```

Report now includes:
```json
{
  "engagement": {
    "avgEngagementScore": 75,
    "excellentTesters": 3,
    "goodTesters": 2
  }
}
```

### Export Scoring Data

Testing reports can be exported as JSON/CSV with:
- Individual tester engagement scores
- Scoring breakdown for each tester
- Overall metrics and analytics

## Future Enhancements

### Optional Manual Logging
Testers can manually log testing activities:
- "Tested login flow" = +5pts
- "Tested payment processing" = +5pts
- "Found critical bug" = +10pts

### SDK Integration (Premium)
Developers with SDKs can track:
- Actual app launches
- Feature usage
- Session duration
- Real usage metrics

## Migration & Rollback

### Apply Migration
```bash
npm run prisma:migrate -- --name add_engagement_score
```

### Rollback (if needed)
```bash
npm run prisma:migrate -- --name reset
```

## Code Examples

### Get Engagement Score in Component

```typescript
import { getEngagementBadgeColor, getEngagementLevel } from '@/lib/engagement-scoring'

const score = application.engagementScore ?? 0
const level = getEngagementLevel(score)
const badgeColor = getEngagementBadgeColor(score)

return <Badge className={badgeColor}>{score} - {level}</Badge>
```

### Calculate Score in Server

```typescript
import { calculateEngagementScore } from '@/lib/engagement-scoring'

const score = calculateEngagementScore(application)
// Save to database
```

### Get Detailed Breakdown

```typescript
import { explainEngagementScore } from '@/lib/engagement-scoring'

const { breakdown, total } = explainEngagementScore(application)
// breakdown = [ { category, points, explanation }, ... ]
```

## Performance Notes

- Scoring calculation is **O(1)** — fixed algorithm, no loops
- No additional database queries needed
- Safe for real-time calculation during API requests
- Results cached in database for reporting

## FAQ

**Q: Can testers see their engagement score?**
A: Not in the current version. Only developers see tester scores. (Can be added later)

**Q: What if feedback is submitted after testing ends?**
A: Late feedback still counts (though response time penalty applies). Encourages timely submissions.

**Q: Is the score final or recalculated?**
A: Saved in database but can be recalculated anytime via POST endpoint if data changes.

**Q: How does duration work if testing auto-completes?**
A: Testing period is set by developer. Duration calculated from `testingStartDate` → `testingEndDate`.

**Q: Can developers dispute a score?**
A: Not in current version. Score is algorithmic/transparent. No manual override.
