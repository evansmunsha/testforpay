# Google Play Pre-flight Check MVP — Feature Specification

**Product Lead Specification**  
**Status:** Ready for Implementation  
**Date:** July 2026

---

## Goals

- Solve the "Is my build ready?" pain point for first-time developers
- Reduce failed Play Console submissions by catching issues early
- Create a natural funnel into closed testing jobs
- Build trust through clear, actionable reporting
- Establish pre-flight analysis as core to TestForPay's value

## Non-Goals

- Build a complete security scanner or virus analyzer
- Provide AI-powered recommendations
- Automate Play Console integration
- Offer deep static code analysis
- Compare against previous uploads (first version only)
- Provide ASO or marketing scoring

## User Stories

**Story 1: Upload Build**

As a first-time developer, I want to upload my APK or AAB so I can understand if it's ready for closed testing.

Acceptance Criteria:
- User can upload a file from their computer
- File size limit is enforced with clear error messaging
- Upload completes within 10 seconds on 4G connection
- User is redirected to results page after successful upload

**Story 2: See Results**

As a developer, I want a clear score and list of issues so I can understand what to fix.

Acceptance Criteria:
- Results page shows a numeric score (0-100) and status badge
- Issues are displayed with priority icons
- Each issue has a one-line explanation
- Passing checks are clearly marked as "✓"
- All text is beginner-friendly, no technical jargon

**Story 3: Understand Issues**

As a developer, I want to understand why each issue matters and how to fix it.

Acceptance Criteria:
- Each issue has a "Learn more" link to relevant academy content
- Explanations avoid Android jargon
- Every issue points to a fix or next action
- Critical issues are visually distinct from warnings

**Story 4: Track Progress**

As a returning developer, I want to see my previous reports so I can compare and validate changes.

Acceptance Criteria:
- Dashboard shows a list of recent pre-flight reports
- Each report shows date, app name, score, and status
- Clicking a report shows the full analysis again
- Reports are stored indefinitely for the user

---

## Technical Boundaries

### File Analysis

- Accept: APK and AAB files only
- Max file size: 100 MB
- Parsing must complete within 8 seconds
- Extract: package name, version code, version name, target SDK, min SDK, permissions, launcher activity
- Detection: debug vs release (via signing cert analysis if possible; optional if too complex)

### Rules Engine

The following checks must run on extracted facts:

| Check | Logic | Priority |
|-------|-------|----------|
| Version Code | Is it a valid integer? Can it be incremented? | Critical |
| Version Name | Does it follow semantic versioning? | Warning |
| Target SDK | Is it >= Play Console minimum? | Critical |
| Min SDK | Is it reasonable (9 or higher)? | Warning |
| Package Name | Valid format and not reserved? | Critical |
| Permissions | Count; highlight dangerous ones | Info |
| Launcher Activity | Does it exist? | Critical |
| Build Type | Release vs Debug | Info |

### Score Calculation

- Start at 100 points
- Each critical issue: -15 points
- Each warning: -5 points
- Minimum score: 0

### Database

Store every report with:
- userId, appName, packageName, versionCode, versionName, targetSdk, minSdk, permissions array, score, status, issues array, createdAt

### API Route

- `POST /api/preflight/upload` — accept file upload
- `POST /api/preflight/analyze` — analyze uploaded file
- `GET /api/preflight/reports` — list user's reports
- `GET /api/preflight/reports/:id` — view single report

---

## Acceptance Criteria (MVP Complete)

- [ ] User can upload APK or AAB from the dashboard
- [ ] System extracts core metadata (package, version, SDK, permissions)
- [ ] System generates readiness score and issue list
- [ ] Results page displays score, issues, and passing checks clearly
- [ ] Each issue includes a "Learn more" link to academy content
- [ ] User can view all previous reports in dashboard
- [ ] All explanations use beginner-friendly language
- [ ] Mobile experience is fully functional (upload, view results)
- [ ] Error states (upload fail, parse fail) are handled gracefully with clear messaging
- [ ] Performance: upload and analysis completes within 10 seconds on standard connection

---

## Success Metrics

- Pre-flight checks run per week
- Percentage of users who complete a check
- Average score (should improve over time as developers fix issues)
- Click-through rate on "Learn more" links to academy
- Conversion from pre-flight check to closed testing job creation
- Return visits to re-run pre-flight checks

---

## Implementation Roadmap

### Week 1: Backend & Parsing

- File upload route with validation
- APK/AAB parser (use existing library)
- Rules engine and score calculation
- Prisma schema for PreflightReport

### Week 2: API & Database

- Complete API routes for upload, analyze, list reports
- Store and retrieve reports
- Error handling and validation

### Week 3: UI & Experience

- Upload page component
- Results page component
- Report history view
- Links to academy content
- Mobile responsiveness

### Week 4: Polish & Launch

- Release manager review
- Edge case testing
- Performance optimization
- Launch on dashboard

---

## Specialist Assignments

| Specialist | Responsibility |
|------------|-----------------|
| Backend | File upload route, parsing orchestration, APK/AAB extraction library |
| Prisma | PreflightReport schema and queries |
| UI | Upload page, results page, report history view |
| Play | Validate rule logic, issue messaging accuracy |
| Academy | Write beginner explanations for each issue |
| SEO | Create discoverable content around pre-flight checks and common errors |
| Marketing | Feature announcement and homepage placement |
| Release | QA, edge case review, mobile testing |

---

## Open Questions

- Should pre-flight checks be free or gated behind sign-up?
- Should we email results or only show in dashboard?
- How aggressively should we prompt users to create testing jobs after a successful check?

**Product Lead Decision:** Free without sign-up for discovery. No email yet (MVP). Soft prompt on results page only.

---

## Ship Criteria

Feature ships when:
1. All acceptance criteria met
2. Release manager approves
3. Mobile UX works smoothly
4. Error paths tested
5. Academy content linked and published
