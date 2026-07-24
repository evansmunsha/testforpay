# Google Play Pre-flight Check MVP

## Purpose

Build a lightweight pre-flight check for APK/AAB uploads that helps first-time Android developers catch publishing issues before they submit to Google Play.

## Problem

Developers get stuck at the final mile because they cannot tell whether their build is ready for closed testing or production.

Common failures include:

- incorrect signing key
- wrong version code or name
- debug build instead of release
- package name mismatch
- missing required permissions or metadata
- unsupported target/min SDK
- Play Console rejection errors

## Target Users

- first-time Android developers
- Google AI Studio users
- Flutter / React Native / Expo developers
- solo founders and indie hackers
- developers preparing closed testing for the first time

## Core Experience

1. User uploads an APK or AAB
2. System analyzes the file and extracts key metadata
3. User sees a simple readiness score and issue list
4. Each issue explains:
   - what happened
   - why it matters
   - how to fix it
5. User receives a checklist summary and related help articles

## MVP Scope

### In scope

- upload APK or AAB file
- validate package name
- validate version code and version name
- detect debug vs release build
- inspect signing certificate SHA1 / SHA256
- read target SDK and min SDK
- detect common Play Console blockers
- show readiness score with beginner-friendly language
- surface related Developer Academy and Help Center content

### Out of scope for MVP

- full manifest parser for every edge case
- compatibility checks across all device families
- automated Play Console submission
- complete ASO / growth recommendations
- real-time file upload streaming analysis

## Success Metrics

- number of pre-flight checks run
- percentage of checks completed successfully
- reduction in follow-up Play Console errors for users who use the tool
- guide article clicks from issue explanations
- returning users to the dashboard after a check

## User Flow

1. Dashboard or homepage CTA: "Free pre-flight check"
2. Upload build (APK/AAB)
3. System analyzes file
4. Results page shows score, issues, and fix steps
5. User clicks related guide or re-uploads corrected build

## Implementation Roles

- Product Lead: validate MVP scope and priority
- Research: confirm top upload and publishing pain points
- Play Specialist: verify the check logic and issue messaging
- UI: design the upload experience and results page
- Backend: build file upload route, analysis flow, and result API
- Prisma: store report metadata and history
- Academy: write beginner-friendly issue explanations and links
- SEO: create discoverable content around pre-flight checks
- Marketing: position the feature on the homepage and in onboarding
- Release: review edge cases, mobile UX, and validation paths

## Risks

- users expect the tool to catch every publishing issue
- file upload may fail on slow or mobile connections
- inaccurate explanations could reduce trust
- analysis time may feel too slow for first-time developers

## Next Steps

- Draft the UI wireframe for the upload and result screens
- Define the backend route contract and validation schema
- Create the first set of issue definitions and beginner-friendly explanations
- Add feature to dashboard as a visible action
