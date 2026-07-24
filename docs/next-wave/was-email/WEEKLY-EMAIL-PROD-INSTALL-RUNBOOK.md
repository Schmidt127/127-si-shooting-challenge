# Weekly email PROD install / ops runbook — 118 / 072 / 119 / 074 / Make

**Updated:** 2026-07-24 (verified Schmidt E2E)  
**Base:** PROD `appn84sqPw03zEbTT`  
**Canonical architecture:** [`WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](./WAS-WEEKLY-EMAIL-ARCHITECTURE.md)

```text
118 → 072 → 119 → 074 → Make.com → Gmail → Make.com writeback
```

Schedules are **ON** (verified_prod 2026-07-24). Agents must not disable them without Mike authorization.

---

## Current verified state

| Piece | Version | PROD state |
|-------|---------|------------|
| **118** | v1.4 | Installed; schedule **ON** (Sun 5:00 AM Denver) — verified_prod 2026-07-24; confirm dryRun/includeSchmidt inputs in UI; `emptyWeekPolicy=send_short` |
| **072** | v4.0 | Installed/ON (trigger); empty-week policy enforced; post-test `allowSchmidtInput=false` |
| **119** | v1.4 | Installed; schedule **ON** (Sun 10:00 AM Denver) — verified_prod 2026-07-24; confirm dryRun/includeSchmidt inputs in UI; `emptyWeekPolicy=send_short` |
| **074** | Repo **v2.1** / UI cited **v2.0** | **ON** — posts webhook; does not mark Sent? |
| Make | `Weekly Athlete Summary - Bulk Email - May 18` | **ON** |

Schmidt empty-week proof PASS (2026-07-24): subject **Weekly Check-In**; Test Gmail delivery OK.

---

## Ownership (do not reverse)

| Actor | Owns |
|-------|------|
| **118** | WAS ensure + arm Build |
| **072** | Package build + **emptyWeekPolicy** |
| **119** | Arm `Send to Make?` only (**not** webhook) |
| **074** | Make webhook POST |
| **Make** | Gmail + Live Sent? writeback |

---

## 118 — Schedule Build (Sun 5:00 AM Denver)

1. Folder: **07 - Email, Notifications, and External Handoffs**
2. Name: `118 - Email - Schedule Weekly Summary Email Build`
3. Trigger: Weekly — Sunday **05:00** — America/Denver — **ON** (verified)
4. Script: `118-…-schedule-weekly-summary-email-build.js` **v1.4**
5. Inputs (confirm live UI values; controlled tests used dryRun/Test gates):

| Variable | Notes |
|---|---|
| `dryRun` | Confirm season posture in UI |
| `sendMode` | Confirm; Live parent sends require Live path via 074/WAS |
| `includeSchmidt` | Prefer `"false"` for unattended season traffic |
| `excludedEnrollmentIds` | blank unless filtering |
| `emptyWeekPolicy` | `"send_short"` |

---

## 072 — Build package (required for empty-week policy)

1. Name: `072 - Email, Notifications, and External Handoffs - Build Weekly Summary Email Package`
2. Script: **v4.0**
3. Inputs: `recordId`, `emptyWeekPolicy=send_short`, `allowSchmidtInput=false` (normal), `sendModeInput` from WAS
4. Does **not** call Make or Gmail

Empty-week matrix: see architecture doc.

---

## 119 — Schedule Send (Sun 10:00 AM Denver)

1. Name: `119 - Email - Schedule Weekly Summary Email Send`
2. Trigger: Weekly — Sunday **10:00** — America/Denver — **ON** (verified)
3. Script: **v1.4**
4. Inputs: confirm dryRun/includeSchmidt in UI; `emptyWeekPolicy=send_short`
5. Arms `Send to Make?` only when Ready && package present && !Sent

---

## 074 — Webhook handoff (keep ON)

1. Name: `074 - Email, Notifications, and External Handoffs - Send Weekly Summary Email Package to Make`
2. Trigger table: Weekly Athlete Summary — When record matches conditions:
   - Weekly Email Ready? checked
   - Weekly Email Sent? unchecked
   - Send to Make? checked
   - Subject / Recipients / HTML not empty
3. Inputs: `recordId`, `makeWebhookUrl` (required); optional `sendMode`/`sendModeInput`, `testRecipientEmail`, `replyTo`
4. **Production sendMode (required):** do **not** leave a fixed automation input `sendMode=Test`.
   - Prefer `sendMode` / `sendModeInput` = **Live**, **or**
   - Leave blank and inherit WAS `sendMode` (WAS must be Live for production parents).
   - Resolution: input → WAS → payloadJson → default `test`.
5. Controlled-test only: `sendMode=Test` + `testRecipientEmail=mschmidt@fairfield.k12.mt.us`
6. Clears `Send to Make?` after successful webhook; **does not** set Sent? (Make Live writeback does)

**Verified 2026-07-24:** Fixed Test input → email OK, no writeback. After `sendMode=Live` → `Weekly Email Sent?` checked, `Make Send Status=Sent`, timestamp populated.

---

## Make.com

| Item | Value |
|------|--------|
| Scenario | `Weekly Athlete Summary - Bulk Email - May 18` |
| Webhook | `Weekly Athlete Summary - Email - May 18` |
| Test | `sendMode=test` → only `mschmidt@fairfield.k12.mt.us` (**no** Sent? writeback — by design) |
| Live | `sendMode=live` → `csvemail` + CC Mike; writeback Sent?/status/timestamp after Gmail (**PASS 2026-07-24**) |

Do **not** create a duplicate scenario. Do **not** use `Weekly Athlete Summary Updated` as the email sender.

---

## Controlled Schmidt re-test (optional)

1. Set 118/119 `includeSchmidt=true`, `dryRun=false` only when Mike authorizes; never Live+Schmidt.
2. 072 `allowSchmidtInput=true` for the build window; restore `false` after.
3. Expect 119 `actionOut=send_armed`; 074 webhook success; Test Gmail delivery.
4. Restore post-test safety state (architecture doc).

---

## Remaining before Live Sunday schedules

- [x] Empty-week decision (`send_short`) + 072 v4.0 enforcement
- [x] Schmidt Test-mode end-to-end PASS (2026-07-24)
- [x] 074 PROD `sendMode=Live` + Make Live writeback PASS (Sent?/status/timestamp)
- [ ] Explicit Mike authorization to enable 118/119 Sunday schedules
- [ ] Optional: Make Test-branch Sent? writeback parity (not required for Live season)
- [ ] 118 Live sendMode policy when dryRun=false (product authorization)
