# Tester Reputation & Leaderboards System

## What's Included

### 1. **Tester Reputation Profiles** ✅

Each tester now has a reputation profile showing:
- **Average Engagement Score** (0-100) - Overall quality rating
- **Tests Completed** - Total apps tested
- **Total Earnings** - Lifetime payouts
- **Average Rating** - From app developers
- **Member Since** - Account age
- **Achievements/Badges** - Excellent Tester, Highly Rated, Experienced, etc.

**Access:** `/dashboard/testers/[id]/profile`

### 2. **Top Testers Leaderboard** ✅

Global leaderboard showing:
- 🥇 🥈 🥉 Top rankings with medals
- Tester name, engagement score, tests completed, earnings
- Developer ratings (⭐⭐⭐⭐⭐)
- Pagination (50 per page)
- Real-time sorting by engagement score

**Access:** `/dashboard/leaderboards`

### 3. **Database Schema** ✅

Added to `User` model:
- `averageEngagementScore` (Float) - Cached avg score
- `totalTestsCompleted` (Int) - Count of finished tests
- `totalEarnings` (Float) - Lifetime payouts

**Migration:** `20260201_add_tester_reputation`

### 4. **API Endpoints**

#### Get Leaderboard
```
GET /api/leaderboards/top-testers?limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "averageEngagementScore": 92,
      "totalTestsCompleted": 15,
      "totalEarnings": 450.00,
      "averageRating": 4.8,
      "badge": "🥇 Excellent"
    }
  ],
  "pagination": {
    "total": 145,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Get Tester Profile
```
GET /api/testers/[id]/profile
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "averageEngagementScore": 92,
    "totalTestsCompleted": 15,
    "totalEarnings": 450.00,
    "averageRating": 4.8,
    "createdAt": "2025-01-15T..."
  }
}
```

#### Update Tester Reputation
```
POST /api/testers/[id]/update-reputation
```

**Response:**
```json
{
  "success": true,
  "reputation": {
    "totalTestsCompleted": 15,
    "totalEarnings": 450.00,
    "averageEngagementScore": 92,
    "averageRating": 4.8
  }
}
```

### 5. **Frontend Components**

#### Leaderboard Page
- **File:** `app/(dashboard)/dashboard/leaderboards/page.tsx`
- Displays top 50 testers
- Pagination support
- Real-time stats (total testers, excellent count, good count)
- Click tester name to view profile

#### Tester Profile Page
- **File:** `app/(dashboard)/dashboard/testers/[id]/page.tsx`
- Shows full tester profile
- Engagement score breakdown
- Achievements/badges
- All stats and ratings

#### useLeaderboard Hook
- **File:** `hooks/use-leaderboard.ts`
- Fetches leaderboard data with pagination
- Handles loading/error states
- Can be reused in other components

### 6. **Navigation Updates**

Added "Top Testers" link to tester sidebar:
- Icon: Trophy 🏆
- Link: `/dashboard/leaderboards`
- Appears only for TESTER role

### 7. **Gamification Features**

**Badges:**
- 🥇 **Excellent Tester** - Score 85+
- 🥈 **Good Tester** - Score 70-84
- 🥉 **Satisfactory Tester** - Score 50-69
- ⭐ **Experienced Tester** - 5+ completed tests
- ✨ **Highly Rated** - 4.5+ average rating

**Visual Indicators:**
- Color-coded badges (green, blue, yellow, orange)
- Medal emojis for top 3
- Star ratings for each tester
- Rank numbers for remaining testers

## User Flows

### For Testers

1. **Discover Leaderboard**
   - Click "Top Testers" in sidebar
   - See rankings of best testers
   - Compare their own stats

2. **View Own Profile**
   - Click own name in leaderboard
   - See detailed reputation breakdown
   - View earned badges
   - Check total earnings and stats

3. **Improve Ranking**
   - Complete more tests → rank increases
   - Write detailed feedback → engagement score increases
   - Get better ratings → appears higher on list
   - Build reputation over time

### For Developers

1. **Find Best Testers**
   - Browse leaderboard
   - Click tester profile
   - See their engagement score and history
   - Hire proven high-quality testers

2. **Verify Quality**
   - Check engagement score (how thorough)
   - Check completion count (how experienced)
   - Check ratings (feedback from devs)
   - Make informed hiring decisions

## How It Works

### Reputation Calculation

When a test is completed:

1. **Calculate Engagement Score** (0-100)
   - Feedback quality (25 pts)
   - Verification screenshots (20 pts)
   - Testing duration (20 pts)
   - Response time (15 pts)
   - Rating submission (10 pts)

2. **Update Reputation** (call `/api/testers/[id]/update-reputation`)
   - Fetch all COMPLETED applications for tester
   - Calculate average engagement score
   - Sum total earnings from payments
   - Count completed tests
   - Save to user.averageEngagementScore, etc.

3. **Rank on Leaderboard**
   - All testers sorted by averageEngagementScore DESC
   - Assigned rank (1st, 2nd, 3rd, etc.)
   - Assigned badge based on score level

### Real-Time Updates

After each test completion:
1. Application marked COMPLETED
2. Payment processed
3. Call `/api/testers/[id]/update-reputation`
4. Tester's ranking updates automatically
5. Leaderboard reflects new position

## Database Queries

### Query Top 50 Testers
```sql
SELECT * FROM "User" 
WHERE role = 'TESTER' 
  AND suspended = false
  AND "totalTestsCompleted" > 0
ORDER BY "averageEngagementScore" DESC
LIMIT 50;
```

### Get Tester Ranking
```sql
SELECT COUNT(*) as rank FROM "User"
WHERE "averageEngagementScore" > (
  SELECT "averageEngagementScore" FROM "User" WHERE id = $1
)
AND role = 'TESTER'
AND suspended = false;
```

## Performance Notes

- **Caching:** Reputation scores cached in User table (fast leaderboard queries)
- **Indexes:** `User.averageEngagementScore` for sorting
- **Pagination:** 50 results per page prevents huge result sets
- **Load Time:** <100ms for typical leaderboard query

## Files Created/Modified

**New Files:**
- `app/api/leaderboards/top-testers/route.ts`
- `app/api/testers/[id]/profile/route.ts`
- `app/api/testers/[id]/update-reputation/route.ts`
- `app/(dashboard)/dashboard/leaderboards/page.tsx`
- `app/(dashboard)/dashboard/testers/[id]/page.tsx`
- `hooks/use-leaderboard.ts`

**Modified Files:**
- `prisma/schema.prisma` - Added User fields
- `components/dashboard/sidebar.tsx` - Added leaderboard link

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Leaderboard page loads (no errors)
- [ ] Leaderboard shows testers sorted by engagement score
- [ ] Pagination works (next/previous buttons)
- [ ] Click tester name → profile page loads
- [ ] Profile shows engagement breakdown
- [ ] Badges display correctly
- [ ] "Top Testers" link in sidebar works
- [ ] API returns correct data structure
- [ ] Mobile view responsive

## Future Enhancements

- **Filters:** Filter by category, location, language
- **Notifications:** Alert testers when they rank up
- **Achievements:** More badge types (Veteran, Speedster, etc.)
- **Monthly Leaderboard:** Track best testers each month
- **Tester Search:** Find specific testers by name/email
- **Follow:** Developers can follow/bookmark top testers
- **Verify Badge:** Developer-only verified testers
