You are auditing the TestForPay codebase to find anything that doesn't align with the new fixed plan structure. Search the ENTIRE codebase (all files) and report every mismatch.
NEW PLAN STRUCTURE (The Source of Truth)
Table
Plan	Dev Price	Testers	Payment/Tester	Platform Fee	Duration
STARTER	€28.00	12	€2.30	€0.40	14 days
GROWTH	€48.00	15	€2.75	€6.75	14 days
PRO	€78.00	25	€2.75	€9.25	14 days
Key Rules:
Only 3 plans exist: STARTER, GROWTH, PRO
No "Custom" plan anymore
No "Professional" or "Enterprise" plan names
Currency is EUR (€), not USD ($) in the dashboard/API
Tester count is FIXED per plan (not editable by user)
Duration is ALWAYS 14 days (not editable)
Payment per tester is FIXED per plan (not editable)
Platform fee is a FIXED amount, NOT a percentage
AUDIT CHECKLIST
Search every file in the project and check for:
1. OLD PLAN NAMES
[ ] Search for: "Professional", "ENTERPRISE", "Custom", "CUSTOM", "PROFESSIONAL"
[ ] Any enum/constant that includes old plan names
[ ] Any UI text showing old plan names
2. OLD PRICING (€150 / €250)
[ ] Search for: 150, 250, "150", "250", 15000, 25000 (cents)
[ ] Any hardcoded prices that don't match €28/€48/€78
[ ] Any "starting at" or "from" prices that are wrong
3. OLD TESTER COUNTS (20 / 35 / 50)
[ ] Search for: 20, 35, 50 when referring to testers
[ ] Any "20+ testers" or "35 testers" text
[ ] Any validation requiring min 20 testers (should be 12)
[ ] Any default tester count not matching plan config
4. OLD PAYMENT PER TESTER (€7.50 / €7.14)
[ ] Search for: 7.50, 7.5, 750, 714, 7.14
[ ] Any hardcoded payment amounts not €2.30 or €2.75
5. PERCENTAGE-BASED PLATFORM FEE
[ ] Search for: 0.15, 15%, "15%", PLATFORM_FEE_PERCENTAGE
[ ] Any code calculating fee as percentage instead of fixed amount
[ ] Any display showing "Platform fee (15%)" — should just say "Platform fee"
6. EDITABLE PLAN FIELDS
[ ] Any form/input allowing user to edit: testersNeeded, testDuration, paymentPerTester
[ ] Any API route accepting these from client instead of deriving from planType
[ ] Any schema validating user-provided tester counts or payments
7. CURRENCY MISMATCHES
[ ] Dashboard/API charging in EUR but landing page showing USD — this is OK if noted
[ ] Any Stripe or payment code using wrong currency (should be 'eur')
[ ] Any formatters showing "$" instead of "€" in dashboard
8. SCHEMA / DATABASE
[ ] Prisma schema: does TestingJob have planType field?
[ ] Any schema still requiring testersNeeded/paymentPerTester from client
[ ] Any migration files referencing old columns
9. API ROUTES
[ ] /api/jobs — does it validate planType against STARTER/GROWTH/PRO only?
[ ] /api/jobs — does it compute testers/payment/duration/fee from PLAN_CONFIG?
[ ] /api/payments/create-intent — does it compute amount server-side from DB?
[ ] Any route still accepting and using old fields (testersNeeded, paymentPerTester)
10. FRONTEND COMPONENTS
[ ] Job creation form — only shows 3 plan cards, no Custom option?
[ ] Job detail page — shows plan badge (Starter/Growth/Pro)?
[ ] Jobs list — shows plan badges?
[ ] Edit job page — shows plan info but doesn't allow editing it?
[ ] Any page still referencing old plan names or prices
11. EMAILS / NOTIFICATIONS
[ ] Any email template mentioning old prices (€150)
[ ] Any email template mentioning old tester counts (20+)
[ ] Any email template with wrong plan names
12. CONSTANTS / CONFIG FILES
[ ] Does constants file have PLAN_CONFIG with correct values?
[ ] Are old PRICING_TIERS constants still being imported anywhere?
[ ] Is PLATFORM_FEE_PERCENTAGE still being used anywhere?
13. STRIPE / PAYMENT
[ ] Checkout form — does it display correct amount from props?
[ ] Any hardcoded Stripe amounts or prices
[ ] Webhook handlers — do they compute payouts from plan config?
14. TESTER-SIDE PAGES
[ ] Tester dashboard showing job payments — are amounts correct?
[ ] Tester applying to jobs — sees correct per-test pay?
15. REPORTS / ANALYTICS
[ ] Any revenue calculations using old pricing
[ ] Any admin dashboard metrics using old plan names
OUTPUT FORMAT
For EACH issue found, report:
plain
FILE: path/to/file.ts
LINE: ~42
SEVERITY: [CRITICAL / WARNING / INFO]
ISSUE: Brief description
CURRENT: What the code says
SHOULD BE: What it should say instead
FIX: Specific code change needed
Severity Levels:
CRITICAL: Will break functionality or cause wrong charges
WARNING: Causes confusion, mismatched UI, or outdated info
INFO: Cleanup opportunity, dead code, or minor inconsistency
START AUDIT
Begin by searching for these exact strings across the entire codebase:
"Professional" / 'Professional' / PROFESSIONAL
"Enterprise" / 'Enterprise' / ENTERPRISE
"Custom" / 'Custom' / CUSTOM (in plan/pricing context)
150 (especially near "price", "eur", "cost", "fee")
250 (especially near "price", "eur", "cost", "fee")
20 (especially near "tester", "testers", "needed")
35 (especially near "tester", "testers")
50 (especially near "tester", "testers")
7.50 / 750 / 7.5
0.15 / 15% / PLATFORM_FEE_PERCENTAGE
$ (in dashboard/API files — landing page is OK)
testersNeeded (as user input, not DB read)
paymentPerTester (as user input, not DB read)
testDuration (as user input, not DB read)
Then check each file that imports from:
@/lib/constants
@/lib/pricing
@/lib/config
Any file with "pricing", "plan", "tier" in the name
AFTER AUDIT
Provide a summary:
Total CRITICAL issues found
Total WARNING issues found
Total INFO issues found
Priority order to fix them
Any files that are safe and aligned