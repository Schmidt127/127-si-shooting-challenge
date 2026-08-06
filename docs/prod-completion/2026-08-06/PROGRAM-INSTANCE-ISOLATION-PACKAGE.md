# Program Instance Isolation Package — 2026-08-06

**PROD base:** `appn84sqPw03zEbTT`  
**Branch:** `cursor/program-instance-isolation-b956`  
**PR:** [#92](https://github.com/Schmidt127/127-si-shooting-challenge/pull/92)  
**Controlling doc:** `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`

### Commit SHAs (branch)

| Commit | Message |
|--------|---------|
| `3046baa` | fix: scope submission enrollment and week matching by program instance |
| `5821ab7` | fix: isolate summaries streaks perfect week and milestones by enrollment |
| `8e95f68` | fix: scope xp homework zoom email and level rules |
| `66b9bc2` | fix: scope website queries to program instance |
| `3c48a24` | test: add program instance isolation audit and prod evidence |
| `94dbac6` | docs: complete program instance isolation package |
| `80a35e7` | docs: record PR #92 and commit SHAs on isolation package |

**Merge commit / final master SHA:** `3c3e5d3` (`3c3e5d33a589f23048db874d10c8f9a141aeee85`) — PR #92 merged.

## Deployment matrix (authoritative)

| Automation | Repository Updated | Merged to Master | PROD Pasted | Live Tested | Result |
| ---------- | ------------------ | ---------------- | ----------- | ----------- | ------ |
| 005 v4.1 | Yes | Yes | Yes | Yes | **PASS** |
| 023 v3.1 | Yes | Yes (pending merge) | No (re-paste v3.1) | PARTIAL — v3.0 fallback only | **INCOMPLETE** |
| 053 5.3 | Yes | Yes | No | No | — |
| 066 v3.5 | Yes | Yes | No | No | — |
| 118 v1.7 | Yes | Yes | No | No | — |
| 119 v1.7 | Yes | Yes | No | No | — |
| 043 v2.1 | Yes | Yes | TBD (if Live) | TBD | — |

### 023 status (honest — do not advance to 053 yet)

```text
Repository v3.0: merged
PROD v3.0: pasted
Live test: PARTIAL — fallback path passed
Program Instance-safe Week path: NOT YET VALIDATED
Final result: INCOMPLETE
```

**Gap:** Live PROD test used `matchMode = single-active-enrollment-safe-fallback` with empty Submission Program Instance fields. Submission has linked Week `recWeVrSabnsYaHc2` (Early Bird) whose Program Instance is `rec5mEM0YPqPqq0hZ`. **v3.1** derives PI from `Submission.Week → Weeks.Program Instance` before any Athlete-only fallback.

**After v3.1 Week path PASSes in PROD:**

```text
Repository updated: Yes
Merged to master: Yes
PROD pasted: Yes
Live PROD tested: Yes
Result: PASS
```

### 005 live PROD test evidence (do not retest unless dependency break)

```text
Submission: recElDBcFvuE6jWwc
Enrollment: recCyFEPeATOVNlr9
Program Instance: rec5mEM0YPqPqq0hZ
Activity Date: 2026-08-05
Selected Week: recWeVrSabnsYaHc2
Selected Week Name: Early Bird
Source: Activity Date Fallback
Status: Complete
Same-Program-Instance Weeks reviewed: 12
Weeks excluded from other Program Instances: 13
```

## Architecture rule

```text
Athlete = the person
Enrollment = that Athlete in one Program Instance
Program Instance = configuration year / program cycle

Week, Submission, Submission Asset, Homework Completion,
Video Feedback, Weekly Athlete Summary, XP Event,
Achievement Unlock, Streak, Level, Zoom Attendance,
Email Package, and all challenge progress
= scoped through Enrollment → Program Instance
```

Never assume Athlete, Week Name, Activity Date, Grade Band, homework title, XP rule type, or meeting date is globally unique.

## Root causes

1. **Automation 005 (v4.0):** Activity Date Week fallback scanned all active Weeks by date range only. Overlapping test Week `reci5GdxEC57vfoS3` (PWTEST) and operational Week `recWeVrSabnsYaHc2` (Early Bird) both matched → multi-match stop.
2. **Automation 023 (v2.0):** Enrollment match used Athlete + Active? as primary. When prior Enrollment `recgP9qZYjAhE7NXm` remained Active alongside `recCyFEPeATOVNlr9`, script stopped with two candidates. Program Instance narrowing was optional soft fallback.
3. **053 / 066:** Enrollment-scoped shot/streak math was correct, but Week attribution used date-only helpers (first match / no PI).
4. **118 / 119:** Week resolution by End Date alone — first match across Program Instances; armed all Active enrollments.
5. **Website fallbacks:** Leaderboard/profile could mix Active? enrollments across School Years when Web views are missing.

## Scripts audited

| # | File | Verdict |
|---|------|---------|
| 005 | `…assign-week-to-submission-homework-first.js` | **Rewritten v4.1** |
| 023 | `…assign-enrollment-to-submission.js` | **Rewritten v3.1** (Week → PI before fallback) |
| 031 | `…find-or-create-weekly-athlete-summary…js` | SAFE (Enrollment RID + Week RID / Summary Key) |
| 035 | `…create-weekly-threshold-xp-events.js` | SAFE for identity; XP Rule Key treated **global** |
| 053 | `…streak-occurrences-rebuild…js` | **Updated 5.3** (Week PI scope) |
| 055 | `…recalculate-current-shooting-streak…js` | SAFE (Enrollment RID only) |
| 057 | `…calculate-perfect-week-eligibility.js` | SAFE (WAS Enrollment + Week + linked children) |
| 066 | `…create-shot-milestone-unlocks.js` | **Updated v3.5** (Week PI scope; shots already Enrollment-scoped) |
| 010, 054, 059, 064, 101, 113 | XP Reward Rule selectors | **Documented global** (Rule Key unique base-wide) |
| 020 / 033 | Homework / PHA | MIXED — PHA uses PI when present; HC identity SAFE |
| 041 / 042 | Levels | Enrollment XP SAFE; Levels catalog global |
| 043 | Level Gate Rule | **Updated v2.1** (School Year / Rule Set prefer) |
| 072 / 074 / 075 / 077 | Weekly email build/send | SAFE (Enrollment+Week / eventId) |
| 076 | Daily submission email | Homework labels Week+GB (catalog risk noted) |
| 118 / 119 | Weekly email schedule | **Updated v1.7** |
| 101 / 117 | Zoom | Enrollment-safe attendance; rules global |
| web | `web/lib/airtable/queries.ts` | **Updated** optional `AIRTABLE_ACTIVE_SCHOOL_YEAR` |

## Scripts rewritten / changed

| Script | New version | Repository | PROD Airtable |
|--------|-------------|------------|---------------|
| 005 | v4.1 | Updated | **Pasted + Live Tested PASS** (see evidence above) |
| 023 | v3.1 | Updated | **Re-paste v3.1 next** — clear Enrollment on test Submission so Week→PI path runs; do not start 053 until PASS |
| 053 | 5.3 | Updated | Paste after 023 |
| 066 | v3.5 | Updated | Paste after 053 (includes v3.4 createRecords fix) |
| 043 | v2.1 | Updated | Paste only if still Live and PROD version stale |
| 118 | v1.7 | Updated | Paste after 066 |
| 119 | v1.7 | Updated | Paste after 118 |
| web queries | — | Updated | Deploy with Vercel on merge |

## Scripts confirmed safe without logic changes

031, 035 (identity), 055, 057, 041, 063, 065, 072, 074, 075, 077, 114, 117

## Fields and dependencies reviewed

| Table | Field | Role |
|-------|-------|------|
| Enrollments | Program Instance | Season boundary |
| Enrollments | School Year | Parallel year key / Enrollment Key segment |
| Enrollments | Active? | Must not be sole disambiguator |
| Weeks | Program Instance | Required for date matching |
| Weeks | Start/End Date, Active Week? / Active? | Date match within PI |
| Submissions | Enrollment, Week, Athlete | No native Program Instance on Submissions (2026-07-23 snapshot) |
| WAS | Summary Key, Enrollment, Week | Enrollment Key \| Week Key |
| XP Events | Source Key | Mostly RID-based |
| XP Reward Rules | Rule Key | **Global** today (no PI field) |
| Level Gate Rules | School Year / Rule Set | Text year scoping (043) |
| Zoom Meetings | Week | PI via Week link |

## Dedupe keys reviewed

| Key | Shape | Isolation |
|-----|-------|-----------|
| WAS Summary Key | Enrollment Key \| Week Key | Good if School Year unique |
| WEEKLY_THRESHOLD Source Key | WEEKLY_THRESHOLD\|enr\|week\|pct | Good |
| SHOT_MILESTONE | SHOT_MILESTONE\|enr\|milestoneId | Good |
| STREAK occurrence | enr\|achievement\|endDate | Good |
| PERFECT_WEEK | PERFECT_WEEK\|enr\|weekId | Good |
| WEEKLY_EMAIL | WEEKLY_EMAIL\|enr\|week | Good |
| Unlock Key (formula) | display names | **Weak** — prefer Milestone Source Key / RID keys for ops |

## XP Reward Rules — global vs Program Instance–specific

**Current PROD schema:** XP Reward Rules have **no Program Instance link**.

| Rule family | Classification | Lookup requirement |
|-------------|----------------|--------------------|
| Shooting Base, Homework, Video, Zoom attend, Streak, Weekly Threshold, Perfect Week, Shot Milestone | **Globally reusable** | Immutable unique `Rule Key` base-wide; only one Active row per key |
| (Future year-specific amounts) | Would be PI-specific | Add PI link + filter by Enrollment PI before inventing duplicate keys |

Do **not** duplicate global rules per year unless amounts diverge.

## Fillout mapping improvement

Daily submission Fillout enrollment lookup is still `UNKNOWN_UI_ATTESTATION` (F-ATT-04).

Recommended durable mapping:

1. Hidden Program Instance RID → Submissions.Program Instance (add field if missing), **or**
2. Hidden Enrollment RID → Fillout Enrollment Id / Enrollment Record ID text field, **or**
3. Ensure only one Active Enrollment per Athlete until mapping exists (fragile — not preferred).

023 v3.1 resolves PI from: existing Enrollment → Fillout Enrollment Id → native Submission PI (if present) → **Submission.Week → Weeks.Program Instance** → School Year → single-active safe fallback only when no PI/Year context exists.

## Test fixture isolation (Phase 3)

| Record | Name | Action |
|--------|------|--------|
| `reci5GdxEC57vfoS3` | PWTEST\|2026-08-05\|CASE-01\|WEEK | **Must not remain Active** while overlapping Early Bird in same PI |
| `recWeVrSabnsYaHc2` | Early Bird | Operational |

**Convention (selected):** Prefer a **dedicated testing Program Instance** for overlapping date fixtures. Alternatively deactivate/delete the fixture Week after Perfect Week tests and clear Active Week?.

Do not delete until dependencies inspected (WAS, unlocks, XP Source Keys referencing that Week RID).

## PROD validation status

| Area | Status | Notes |
|------|--------|-------|
| Live Airtable API from this agent | **Unavailable** (no `AIRTABLE_API_TOKEN`) | Interactive Mike paste + Test Automation in Airtable UI |
| 005 v4.1 | **Live Tested PASS** | Early Bird via Activity Date Fallback; 12 same-PI weeks; 13 other-PI excluded |
| 023 v3.0 live | **PARTIAL / INCOMPLETE** | Fallback passed; Week→PI path not validated — blocked on v3.1 paste + retest |
| Remaining pastes | **In progress** | 023 v3.1 → 053 → 066 → 118 → 119 → 043-if-Live |
| Known live-test context | Documented | Submission `recElDBcFvuE6jWwc`, Athlete `recgqVstObQRzgXJF`, Enrollment `recCyFEPeATOVNlr9`, PI `rec5mEM0YPqPqq0hZ`, Week Early Bird `recWeVrSabnsYaHc2` |
| Email sends | **Not executed for 118/119** | Controlled dryRun packages only; no uncontrolled parent email |

## Repository audit tooling

```bash
node tools/program-instance-isolation/audit-program-instance-isolation.mjs
```

See `tools/program-instance-isolation/README.md`.

## Deployment status (honest)

| Layer | Status |
|-------|--------|
| GitHub repository | **Merged to `master`** — PR #92 @ `3c3e5d3` |
| PROD Airtable | **005 pasted + PASS**; remaining scripts paste with Mike interactively |
| Website | Ships on Vercel after merge to `master` (Root Directory `web`) |
| Completion Master | Updated with 005 PASS + remaining paste order |

## Rollback

1. Re-paste prior script versions from `master` before this PR for any pasted automation.
2. Revert web env `AIRTABLE_ACTIVE_SCHOOL_YEAR` if set incorrectly.
3. Re-activate fixture Week only inside a dedicated test Program Instance.
