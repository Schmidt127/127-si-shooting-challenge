# Empty-week policy — 072 v4.0 PROD paste + Schmidt test runbook

**Date:** 2026-07-24  
**Base:** PROD `appn84sqPw03zEbTT`  
**SC:** SC-035 (`send_short` approved)  
**Do not** enable Sunday Live schedules from this package.  
**Do not** paste or test without Mike present for controlled writes.

---

## What changed (repo)

| Piece | Version | Behavior |
|-------|---------|----------|
| **072** | **v4.0** | Enforces `emptyWeekPolicy` when building packages |
| **118** | **v1.4** | Default policy `send_short` (still arms Build; 072 shapes package) |
| **119** | **v1.4** | Default policy `send_short`; only arms Send when Ready? |
| Helpers/tests | `lib/was-email-contracts/empty-week-policy.js` | Plain-Node policy + short template tests |

### Empty-week matrix (072)

| Policy | Empty week | Non-empty week |
|--------|------------|----------------|
| **send_short** (default) | Concise **Weekly Check-In** reminder; Ready?=true; Send to Make?=false | Full weekly summary |
| **send_normal** | Full weekly summary (prior empty-week report) | Full weekly summary |
| **suppress** | Build cleared; **Ready?=false**; not send-ready | Full weekly summary |

072 still **never** posts webhooks or sends email (074 owns send). Test/Live `sendMode` preserved. Recipients / dedupe (`WEEKLY_EMAIL|{enr}|{week}`) / Sent? resend gate unchanged.

---

## Preflight

1. Confirm Schmidt enrollment `recgP9qZYjAhE7NXm` and a zero-activity WAS for week ending **2026-07-18** (or recreate via 118 Test arm).  
2. Confirm current PROD 072 is still building a **full** empty report (known gap before v4.0).  
3. Keep 118/119 schedules **OFF**.  
4. Map new 072 input if missing: `emptyWeekPolicy` (text) default **`send_short`**.  
5. Keep `allowSchmidtInput=true` only for controlled Schmidt builds.

---

## Paste order (manual UI)

### 1) Paste 072 v4.0 (required)

1. Open automation **072 - Email… Build Weekly Summary Email Package**.  
2. Paste repo script (skip GitHub SoT header if present):  
   `airtable/automations/shooting-challenge/072-email-notifications-and-external-handoffs-build-weekly-summary-email-package.js`  
3. Confirm inputs:

| Input | Value |
|-------|--------|
| `recordId` | Triggering WAS record id |
| `sendModeInput` | From WAS `sendMode` (or blank → record/test) |
| `allowSchmidtInput` | `"true"` for Schmidt tests only |
| `emptyWeekPolicy` | **`send_short`** |

4. Map new outputs if available: `actionOut`, `emptyWeekPolicyOut`, `weekIsEmptyOut`, `emptyWeekBuildModeOut`.  
5. Leave automation **ON** (existing trigger) — this is the package builder, not a mass schedule.

### 2) Optional: paste 118 / 119 v1.4

Only if you want input defaults aligned. Not required for the Schmidt empty-week proof if 072 already has `emptyWeekPolicy=send_short`.

---

## Schmidt empty-week proof (send_short)

1. Choose Schmidt WAS for week ending 2026-07-18 with **zero** activity.  
2. Clear prior package if needed for a clean read:  
   - Weekly Email Ready? = unchecked  
   - Send to Make? = unchecked  
   - Weekly Email Sent? remains unchecked  
3. Set `sendMode` = **Test**.  
4. Check **Build Weekly Email Now?** (or re-arm via 118 with `includeSchmidt=true`, `dryRun=false`, Test only).  
5. Confirm 072 run:
   - `statusOut=success`
   - `actionOut=built_short_empty_week`
   - `emptyWeekBuildModeOut=short`
   - `weekIsEmptyOut=true`
6. Confirm WAS fields:
   - Subject contains **Weekly Check-In** (not `Weekly Summary |`)
   - HTML contains **No activity logged this week** / short reminder
   - HTML does **not** contain full section wall (Shooting Summary / XP Event Detail tables)
   - Weekly Email Ready? = **checked**
   - Send to Make? = **unchecked**
   - Recipients still parent/athlete cleaned emails
7. Do **not** arm 074 / Live send for this proof unless Mike explicitly wants a Test webhook send.

---

## Policy spot-checks (optional, same WAS after reset)

| Test | 072 `emptyWeekPolicy` | Expect |
|------|------------------------|--------|
| A | `send_short` | Short check-in; Ready |
| B | `send_normal` | Full summary; Ready; subject `Weekly Summary \|` |
| C | `suppress` | Ready unchecked; action `skipped_empty_week_suppress`; no send-ready package |
| D | Non-empty Schmidt week (any policy) | Full summary |

---

## Rollback

1. Re-paste prior 072 **v3.9** from Git history if needed.  
2. Clear Build / Ready / Send checkboxes on affected WAS.  
3. Leave 118/119 OFF.

---

## Evidence to capture

- 072 run JSON (`version=v4.0`, actionOut, emptyWeekBuildModeOut)  
- WAS subject + HTML snippet (short vs full)  
- Ready? / Sent? / Send to Make? checkboxes  
- Confirmation no Make webhook fired from 072  

## Offline tests (repo)

```bash
node tests/was-email-contracts/run-all.js
```
