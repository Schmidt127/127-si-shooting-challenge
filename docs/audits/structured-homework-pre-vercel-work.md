# Structured Homework — Pre-Vercel Work Audit

**Date:** 2026-09-09  
**Branch:** `cursor/structured-homework-pre-vercel-15d8`  
**Base SHA:** `3bfb5c95573eca8f67670359cae4be67e4583877`  
**Git status at start:** clean (`master`)

## Commands

| Scope | Command | Location |
|-------|---------|----------|
| Typecheck | `npm run typecheck` | `web/` |
| Lint | `npm run lint` | `web/` |
| Unit tests | `npm run test` | `web/` |
| Production build | `npm run build` | `web/` |
| Root homework contracts | `node tests/homework/*.test.js` | repo root |
| Pipeline XP | `node tests/pipeline/homework-xp-lifecycle.test.mjs` | repo root |

## Integration trace (SC-side)

| Step | Route / entry | Core module | Key fields |
|------|---------------|-------------|------------|
| Athlete homework link | `GET /shoot/api/curriculum/start` | `homework-link.ts`, `start/route.ts` | `assignmentKey` |
| Auth / session | Dashboard cookies | `lib/auth/server-session.ts`, `enrollment-access.ts` | enrollment from session |
| Active enrollment | `loadAuthorizedEnrollmentForSession` | `enrollment-access.ts` | `Active?`, `Grade`, `Grade Band` |
| Grade band | Handoff mint | `handoff.ts` | `curriculumGradeBandFromGrade` → five-band |
| Assignment Key routing | Start + Hub slug | `homework-link.ts` | `Assignment Key` on Homework Library |
| Hub handoff | `POST /shoot/api/curriculum/redeem` | `handoff.ts` | Bearer `CURRICULUM_HANDOFF_SECRET` |
| Submit authorization | Redeem response | `submit-auth.ts` | `submitAuthorizationToken` (NEW) |
| Assignments list | `GET /shoot/api/curriculum/assignments` | `assignments-service.ts` | ingress secret |
| Upload staging | `POST .../upload-staging` | `upload-staging-service.ts` | stagingId, enrollmentId |
| Final submit | `POST .../homework/submit` | `submit-service.ts` | Idempotency-Key + submit auth |
| Homework Completion | Airtable write | `buildHomeworkCompletionFields` | Enrollment, Homework, PHA, Week, Grade Band |
| Attempts / Responses | Airtable create | `createAttemptRecord`, `writeResponses` | Attempt Key, Response Key |
| Submission Assets | `bindCurriculumSubmitAssets` | `upload-staging-service.ts` | HW1 slot, Asset Label = questionKey |
| Weekly Athlete Summary | `ensureCanonicalWeeklySummaryForCurriculum` | `submit-service.ts` | Enrollment + Week |
| Coach / XP | Automations 064–065, 071 | Airtable (not SC web) | Satisfactory?, Review Status |
| Dashboard | `/shoot/dashboard` | `athlete-dashboard`, `homework-assignments` | completion status mapping |

## Fixes in this branch

### A. Submit authorization binding
- `submit-auth.ts`: mint on redeem, validate on submit
- Header: `X-Curriculum-Submit-Authorization` or body `submitAuthorizationToken`
- **Curriculum Hub required change:** persist token from redeem; send on every submit

### B. Fail closed on missing grade band
- `phaMatchesEnrollmentGradeBand`: returns `false` when enrollment band is null
- `assignments-service`: 422 when enrollment has no Grade Band
- `submit-service`: 422 before PHA resolution when band missing

### C. Grade band snapshot validation
- `grade-band-validation.ts`: maps enrollment band name → allowed submit snapshots
- Cross-checks payload against authorized session band

## Curriculum Hub interface contract (required)

After `POST /shoot/api/curriculum/redeem`:

```json
{
  "enrollmentId": "rec…",
  "gradeBand": "5-6",
  "submitAuthorizationToken": "<opaque>",
  "displayName": "…",
  "assignmentKey": "AESOP_CROW_PITCHER"
}
```

Every `POST /shoot/api/curriculum/homework/submit` must include:

- Header `Authorization: Bearer <CURRICULUM_INGRESS_SECRET>`
- Header `Idempotency-Key: <opaque>`
- Header `X-Curriculum-Submit-Authorization: <submitAuthorizationToken>` (or body field)
- Body `enrollmentId`, `assignmentKey`, `gradeBand` must match redeem session

## Known blockers (unchanged)

- Curriculum Hub repo not in this workspace — Hub submit-auth wiring unverified here
- Production Upstash Redis required for handoff + submit auth in production
- 070a live trigger still blocks HC-only Make upload until operator paste (see SC-STRUCTURED-HOMEWORK-FILES-001)
- No production Airtable validation in agent run
