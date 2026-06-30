# Engagement Points & Activity Tracking — Future Feature Plan

> **Status:** Partially implemented (admin insights live) — full points system planned for later.
> **Author:** Evans Munsha
> **Last updated:** June 2026

---

## What's Already Built (June 2026)

### Admin Activity Insights (LIVE)
The admin dashboard now shows:
- Users active in last 24h / 7 days / 30 days (based on `lastLoginAt`)
- New signups in last 7 and 30 days
- Email verification rate
- Testers with Stripe set up vs without

### Data Already Tracked
- `User.lastLoginAt` — updated on every login
- `User.loginCount` — incremented on every login
- `User.lastIpAddress` — updated on every login
- `AppUsageLog` — tracks in-app events during testing (APP_LAUNCH, FEATURE_USED, FEEDBACK_SUBMITTED, SESSION_END)
- `Application.engagementScore` — 0–100 score per testing job

---

## Future: Full Points System

### The Idea
Award points to testers for positive actions on the platform. Points make the leaderboard more meaningful, give mentors a qualification threshold, and give testers a reason to stay active between jobs.

### Points Actions (proposed)
| Action | Points |
|---|---|
| Daily login | 1 pt |
| Completing a testing job | 50 pts |
| Submitting detailed feedback (200+ chars) | 10 pts |
| Verification approved first try | 5 pts |
| Streak bonus (7 days in a row) | 10 pts |
| Referring a tester who completes a job | 20 pts |

### What Points Unlock
Points must have real value or users ignore them. Proposed:
- **Mentor eligibility** — 200+ points required to apply as a mentor
- **Leaderboard ranking** — top testers by points get featured to developers
- **Priority application** — high-point testers get earlier visibility when developers browse
- **Future: small bonus** — top testers of the month get a €5 platform bonus (optional, run manually at first)

### Why Login Streaks Alone Are Weak
A tester who logs in daily but never actually tests apps is useless to developers. Points must weight **real work** (completed jobs, quality feedback) much higher than passive activity (daily logins). Login points should be the smallest reward.

---

## What Needs to Be Built

### Database
- `User.totalPoints` Int @default(0)
- `User.currentStreak` Int @default(0)
- `User.longestStreak` Int @default(0)
- `User.lastStreakDate` DateTime?
- `PointEvent` model — audit trail of every point awarded (type, amount, userId, createdAt)

### API
- `POST /api/user/record-activity` — called on page load for logged-in users, updates streak and awards login points
- `GET /api/user/points` — returns point total, streak, recent events
- Admin: `GET /api/admin/leaderboard` — sorted by points with filters

### Streak Logic
```
On login:
  if lastStreakDate is today → do nothing (already counted)
  if lastStreakDate is yesterday → increment streak, award bonus if milestone
  if lastStreakDate is older → reset streak to 1
  set lastStreakDate = today
```

### UI
- Points badge on tester profile
- Streak counter in dashboard sidebar
- "How to earn points" info card
- Points history page

---

## When to Build
- [ ] 50+ active testers using the platform
- [ ] Leaderboard has meaningful data to rank
- [ ] Mentor program planning is finalised (points feed into mentor eligibility)
- [ ] Admin has confirmed the current engagement scoring is working correctly

---

## Notes
- Do not make login the main way to earn points — it will be gamed
- Consider a weekly cap on login points (e.g. max 7 pts/week from logins)
- The `AppUsageLog` system already captures real usage — build points on top of that, not separately
- Run the first month manually: award points by hand to top testers, see how they react, then automate
