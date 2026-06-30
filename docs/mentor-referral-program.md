# Mentor & Referral Program — Future Feature Plan

> **Status:** Planned — do not build until 20–30 active testers are on the platform.
> **Author:** Evans Munsha
> **Last updated:** June 2026

---

## The Idea

Experienced testers on TestForPay can become **Mentors**. They recruit new testers using a personal referral code, help them through the onboarding and verification process, and earn a commission when their recruits complete testing jobs.

This is modelled on the affiliate/mentor experience Evans had on other platforms — having skin in the game makes users serious, invested, and loyal. Mentors treat the platform as partly theirs.

---

## How It Works

### For Mentors
1. Qualify as a mentor (see requirements below)
2. Get a unique referral code (e.g. `EVANS10`)
3. Share the code with friends, family, or online communities
4. When a recruit signs up using that code and completes a testing job, the mentor earns a commission
5. Track recruits and earnings in a dedicated Mentor Dashboard

### For Recruits (new testers)
1. Sign up using a mentor's referral code
2. Get guided help from their mentor during onboarding and first job
3. Complete jobs normally — their earnings are not reduced

### Commission Structure (to be finalised)
- Mentor earns a **flat bonus per recruit's completed job** — e.g. €1–2 per completed job
- Commission paid **by the platform**, not deducted from the tester's pay
- **One level only** — mentors cannot earn from other mentors' recruits (no pyramid structure)
- Commission only triggers on **COMPLETED** application status, never on pending or partial

---

## Mentor Qualification Requirements

To prevent low-quality mentors recruiting low-quality testers:

- Minimum **3 completed testing jobs** on TestForPay
- Engagement score average of **60 or above**
- Account in **good standing** (not flagged, suspended, or with fraud score above 20)
- Email verified

Mentors apply or are invited manually at first. Later this can be automated based on the criteria above.

---

## What Needs to Be Built

### Database Changes
- `referralCode` field on `User` (unique, generated on mentor approval)
- `referredBy` field on `User` (stores mentor's userId)
- `MentorCommission` model to track per-job commission payouts
- `mentorStatus` field on `User` (NONE, PENDING, ACTIVE, SUSPENDED)

### API Changes
- `POST /api/mentor/apply` — tester applies to become a mentor
- `GET /api/mentor/dashboard` — mentor sees their recruits and earnings
- `POST /api/auth/signup` — accept optional `referralCode` param and link recruit to mentor
- Cron or webhook trigger: when application status → COMPLETED, calculate and queue mentor commission

### Payout Changes
- Mentor commissions paid via existing Stripe Connect infrastructure
- Batch with the existing payout cron (3 AM UTC) or run separately
- Minimum payout threshold to avoid micro-transfers (e.g. €5 minimum)

### UI Changes
- Mentor application page in dashboard
- Mentor dashboard: recruit list, commission history, referral code/link
- Signup page: optional referral code field
- Settings: show referral code for active mentors

---

## Rules & Guardrails

- **One level only** — no multi-level commissions. Mentor → Recruit. That's it.
- **Platform absorbs the cost** — commission never comes out of tester pay. Testers must earn the same whether referred or not.
- **Mentor suspended if recruits show fraud patterns** — if a mentor's recruits have high fraud scores, the mentor gets reviewed.
- **No incentivising fake signups** — commissions only on completed jobs, never on signups alone.
- **Transparent to recruits** — recruits can see who their mentor is and understand the relationship.

---

## When to Build This

Do not start building until:

- [ ] 20–30 active testers are regularly completing jobs
- [ ] At least 5 developers have posted jobs
- [ ] Manually tested the concept — approached 2–3 good testers and asked them to refer friends informally
- [ ] Validated that referred testers complete jobs at a similar or better rate than organic signups
- [ ] Stripe Connect payout infrastructure is stable and proven

---

## Why This Will Work

Evans ran this model as an affiliate on other platforms. The key insight: when you have a code and earn from the people you bring in, you:
- Take onboarding seriously and teach recruits properly
- Stay active on the platform to monitor your recruits
- Promote the platform genuinely because your income depends on it
- Feel ownership over the platform's success

That psychological shift — from "user" to "stakeholder" — is the goal.

---

## Notes

- Keep the program invite-only or application-based at launch. Do not make it open to everyone from day one.
- Monitor commission fraud carefully: fake accounts, self-referrals, coordinated signups.
- Consider a public leaderboard for top mentors as a non-monetary engagement mechanic.
- Revisit commission rate after first 3 months of operation — adjust based on platform margins.
