# Parent-email Live cutover — Production operator packet

**Status:** GitHub ready (2026-09-03) — Mike Airtable UI steps pending  
**Base:** Production only (`appn84sqPw03zEbTT`)  
**Disposable proof recipient:** `schmidt@fairfieldbasketballclub.com` only  
**Hub:** Communications Hub → Resend (no Make/Gmail email send)

## Email plane (all paths)

| Path | Event type | Template key | Queue producer | Dispatcher |
|------|------------|--------------|----------------|------------|
| WELCOME | `WELCOME` | `WELCOME` | **078A v1.5** | **079 v2.5** |
| DAILY | `DAILY_SUBMISSION` | `DAILY_SUBMISSION` | **076 v8.12** | **079** |
| WEEKLY | `WEEKLY_ATHLETE_SUMMARY` | `WEEKLY_ATHLETE_SUMMARY` | **074 v3.5** (after **072 v4.9.1** / **118 v2.0** / **119 v1.7**) | **079** |
| HOMEWORK | `HOMEWORK_FEEDBACK` | `HOMEWORK_FEEDBACK` | **071 v4.3** | **079** |
| VIDEO | `VIDEO_FEEDBACK` | `VIDEO_FEEDBACK` | **073 v4.6** | **079** |
| ZOOM recording approval | `ZOOM_RECORDING_APPROVAL` | `ZOOM_RECORDING_APPROVED` | **117 v2.1** | **079** |

**Do not:** create Automation **121**; modify **101** / SC-147; re-enable Make/Gmail parent-email scenarios; run season simulation.

---

## 1. Script versions Mike must verify (GitHub → Production Automations UI)

Compare Production `Automation Code` to GitHub `SCRIPT.version` / docblock before Live inputs:

| Slot | GitHub version | Production paste required? |
|------|----------------|----------------------------|
| **071** | v4.3 | Confirm match |
| **072** | v4.9.1 | Confirm match |
| **073** | v4.6 | Confirm match |
| **074** | v3.5 | Confirm match |
| **076** | v8.12 | Confirm match |
| **078A** | **v1.5** | **Paste v1.5 if UI/table not already v1.5** |
| **079** | v2.5 | Confirm match; confirm `ingressSecret` input configured |
| **117** | v2.1 | Confirm match |
| **118** | v2.0 | Confirm match (header may say “not yet deployed”) |
| **119** | v1.7 | Confirm match |

Preflight CLI: `node tools/testing/parent-email-live-cutover.mjs preflight` (fails on version mismatch).

---

## 2. Automation inputs that exist

| Automation | Required inputs | Optional inputs |
|------------|-----------------|-----------------|
| **071** | `recordId` (Homework Completion) | `testMode` (boolean) |
| **072** | `recordId` (WAS) | `sendModeInput` / `sendMode` (default **test**), `emptyWeekPolicy`, `allowSchmidtInput` |
| **073** | `recordId` (Video Feedback) | `testMode` |
| **074** | `recordId` (WAS) | `testMode` |
| **076** | `recordId` (Submission) | `testMode` |
| **078A** | `recordId` (Enrollment) | **`testMode`** (boolean; **default true in script**) |
| **079** | `recordId` (Email Handoff Queue row), **`ingressSecret`** | — (reads queue `Test Mode?`; no send-mode input) |
| **117** | `recordId` (Zoom Attendance), **`enrollmentRid`**, **`zoomMeetingRid`** | `testMode` |
| **118** | — (scheduled batch) | `dryRun`, `sendMode`, `includeSchmidt`, `emptyWeekPolicy` |
| **119** | — (scheduled batch) | `dryRun`, `includeSchmidt`, `emptyWeekPolicy` |

**Dynamic mapping:** every `recordId` must map to the **triggering record ID**, never a hardcoded RID (except **118/119** Schmidt exclusion list for safety).

---

## 3. Safe values for test mode (default / rollback)

| Automation | Safe test setting | Queue / behavior |
|------------|-------------------|------------------|
| **071 / 073 / 074 / 076 / 117 / 078A** | `testMode` = **true** or omit input | Queue row `Test Mode?` = checked → Hub test routing |
| **118** | `dryRun` = **true** | Counts only; no WAS arm writes |
| **118** | `sendMode` = **Test** | Arms build with test send mode |
| **119** | `dryRun` = **true** | No `Send to Make?` arm |
| **072** | `sendModeInput` = **test** (default) | Package stored with test send mode |
| **079** | Leave **ON** | Dispatches only **Ready** queue rows; respects queue `Test Mode?` |

---

## 4. Values required for Live mode (future registrations)

| Automation | Live setting | Notes |
|------------|--------------|-------|
| **078A** | `testMode` = **false** | After v1.5 paste; triggers on new Enrollments |
| **076** | `testMode` = **false** | After countable submission + build gate |
| **071** | `testMode` = **false** | After homework feedback ready |
| **073** | `testMode` = **false** | After video feedback ready |
| **074** | `testMode` = **false** | After **072** + **119** arm `Send to Make?` |
| **117** | `testMode` = **false** | Map all three RIDs from trigger |
| **118** | `dryRun` = **false**, `sendMode` = **Live**, `includeSchmidt` = **false** | Sunday 05:00 Denver schedule |
| **119** | `dryRun` = **false**, `includeSchmidt` = **false** | Sunday 10:00 Denver schedule |
| **072** | `sendModeInput` = **live** when arming real weekly sends | Weekly package builder |
| **079** | `ingressSecret` set | No change to dispatcher logic |

**Recipient rule during disposable proof:** only `schmidt@fairfieldbasketballclub.com` — retarget VERIFY/Schmidt enrollments before `--apply` tests.

**Parent Email - Cleaned:** queue producers **071, 073, 074, 076, 078A, 117** use **Cleaned only** (no raw `Parent Email`). **072** may fall back to raw `Parent Email` when building weekly recipient strings — confirm Cleaned is populated for real families.

---

## 5. Disposable verification order

Run preflight first, then paths in this order (one path at a time; capture evidence):

1. **WELCOME** — disposable Enrollment via harness (`verify-all --apply`) or manual Enrollment create after **078A** Live inputs  
2. **DAILY** — countable Submission → **076** → queue  
3. **HOMEWORK** — Homework Completion → **071**  
4. **VIDEO** — Video Feedback → **073**  
5. **WEEKLY** — **118** build arm → **072** → **119** send arm → **074** → queue  
6. **ZOOM_RECORDING_APPROVAL** — Zoom Attendance → **117**

CLI: `node tools/testing/parent-email-live-cutover.mjs verify-all [--apply]`

---

## 6. Verify Hub acceptance and Resend delivery

For each queue row:

1. **Email Handoff Queue:** Status = **Accepted** (or **Failed** with `Last Error` captured).  
2. **Hub Event ID** populated on queue row.  
3. **Recipients JSON** resolves only to disposable allowlist email during proof.  
4. **Communications Hub → Deliveries:** provider = **Resend**; delivery id present.  
5. **079** automation run: `statusOut=success`, no secret leakage in outputs.

Hub health: `GET https://communications-two-blue.vercel.app/api/health` → `status: ready`, `provider: RESEND`.

---

## 7. Confirm no duplicate handoff

| Producer | Handoff key pattern | Duplicate behavior |
|----------|---------------------|-------------------|
| **078A** | `WELCOME\|ENROLLMENTS\|{enrollmentId}` | **duplicate-skipped** (no second queue row) |
| **076** | `DAILY_SUBMISSION\|SUBMISSIONS\|{submissionId}` | Idempotent reuse or skip |
| **071** | `HOMEWORK_FEEDBACK\|HOMEWORK_COMPLETIONS\|{hcId}` | Idempotent / Needs Review on conflict |
| **073** | `VIDEO_FEEDBACK\|VIDEO_FEEDBACK\|{vfId}` | Idempotent / Needs Review on conflict |
| **074** | `WEEKLY_ATHLETE_SUMMARY\|WEEKLY_ATHLETE_SUMMARY\|{wasId}` | Idempotent / Needs Review on conflict |
| **117** | `ZOOM_RECORDING_APPROVAL\|ZOOM_ATTENDANCE\|{zaId}` | Idempotent / Needs Review on conflict |
| **079** | — | Hub may return `accepted_duplicate`; queue not duplicated |

Replay the same source record after success → no second **Accepted** send for the same handoff key.

---

## 8. Roll back to test mode

| Setting | Rollback value |
|---------|----------------|
| **071 / 073 / 074 / 076 / 117 / 078A** `testMode` | **true** |
| **118** `dryRun` | **true** |
| **118** `sendMode` | **Test** |
| **119** `dryRun` | **true** |
| **072** `sendModeInput` | **test** |
| **079** | Leave ON; stop arming new queue rows if emergency |
| **118/119 triggers** | Disable schedules if full email pause needed |

Clear any stuck **`Send to Make?`** on WAS rows armed during weekly tests. Do not bulk-delete Delivery audit rows.

---

## 9. Keep Make/Gmail OFF

- No Make parent-email scenarios **ON** (historical Gmail bulk/daily/weekly Make routes retired).  
- **077** deleted — daily path is **076 → 079 → Hub** only.  
- **074/119** use legacy field name **`Send to Make?`** as an **arm flag only** — script does **not** POST Make.  
- **070a/070b** are asset upload Make paths — not parent email; leave per upload launch decision.  
- Confirm no automation script calls `hook.us1.make.com`, `remoteFetchAsync` for email send (GitHub contract tests enforce).

---

## 10. Prevent emails to personal Gmail

1. Preflight: `realFamilyCount` must be **0** (no active enrollments with non-disposable parent emails).  
2. Before disposable tests: harness retargets VERIFY/Schmidt enrollments to **`schmidt@fairfieldbasketballclub.com`**.  
3. Hub Test Mode + allowlist remain active until Mike authorizes participant-wide Live.  
4. **118/119:** keep `includeSchmidt=false` for Live schedule.  
5. Never paste hardcoded recipient emails or record IDs into automation scripts.  
6. Queue **`Test Mode?`** = checked until Live cutover inputs are deliberately set false.

---

## 078A v1.5 paste (Airtable UI)

1. Open **078A - Enrollment → Create WELCOME Email Handoff**.  
2. Paste GitHub body from `078A-email-notifications-and-external-handoffs-enrollment-create-welcome-email-handoff.js` (docblock through end; skip GitHub-only header).  
3. Preserve trigger: Enrollments when Athlete + **Parent Email - Cleaned** + Program Instance populated (after **001**).  
4. **Input variables tab:**  
   - `recordId` → **Record ID** from trigger (required).  
   - **`testMode`** → add optional boolean; set **false** only when authorizing Live welcome for future registrations.  
5. **Do not** add hardcoded recipient or enrollment record IDs.  
6. Script default when input omitted: **`testMode` = true** (safe).

---

## Preflight stop conditions

1. No real enrolled families on active rows.  
2. Hub health `ready` / Resend.  
3. Make/Gmail email scenarios OFF.  
4. GitHub vs Production version match for all slots in §1.  
5. **079** `ingressSecret` configured in automation inputs (not in GitHub).

---

## Evidence

Local only (gitignored): `docs/testing/evidence/parent-email-live-cutover/*.json` from preflight and verify-all runs.

## Post-cutover docs

Update `CHANGELOG.md` (### Airtable), `docs/CURRENT-TRUTH.md` § Email, `docs/integrations/email-send-plane.md` when Mike completes UI steps.

## SC-112 note

Athlete dashboard web privacy is separate (PR **#351**). Parent-email cutover does not implement athlete auth.
