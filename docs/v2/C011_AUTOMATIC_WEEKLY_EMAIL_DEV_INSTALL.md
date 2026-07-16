# C-011 — Automatic Weekly Email — DEV Installation Packet

**Status:** Repository scripts **118/119 v1.0 + 072 v3.8** ready — **do not enable schedules**; DEV Make webhook **live-blocked**  
**Base:** DEV only `appTetnuCZlCZdTCT`  
**PROD:** Do not paste · Do **not** enable live sending  
**Backlog:** C-011 · Wave 5 · Depends on **C-010** (072 Active? gate)  
**Inventory:** [DEV_FIELD_TRIGGER_INVENTORY_2026-07-16.md](./DEV_FIELD_TRIGGER_INVENTORY_2026-07-16.md)  
**Workers:** **072** (build) + **074** (send) · **118** + **119** (schedule arm)  
**Hard stops:** `sendMode=Test` only · `dryRun=true` default · Schmidt excluded · No secrets in git

### Authoritative design (post-inventory)

| Question | Answer | Label |
|----------|--------|-------|
| Build automation | **072** (existing) armed by **118** | **repository-ready** |
| Send automation | **074** (existing) armed by **119** | **repository-ready** |
| Manual checkboxes | Keep `Build Weekly Email Now?` / `Send to Make?` | **verified in DEV (snapshot)** |
| Make writeback field | `Weekly Email Sent?` (+ `Weekly Email Sent At`) | **verified in DEV (snapshot)** fields; Make behavior **live-blocked** |
| Dedupe / eventId | `WEEKLY_EMAIL\|{enrollmentId}\|{weekId}` in 072 payload + 074/Make | **repository-ready** |
| DEV webhook | Not in env | **live-blocked** / **requires Mike approval** |
| Test recipient mode | `sendMode=Test` + 074 testRecipientEmail | **repository-ready** |
| 118/119 still correct? | **Yes** | **repository-ready** · **requires DEV paste** · do not activate schedule |
| 118/119 implemented? | **Yes** (`118-…js`, `119-…js` v1.0) | **requires DEV paste** |

---

## 0. Current vs target

| Today | Target |
|-------|--------|
| Staff checks `Build Weekly Email Now?` | **Sunday 5:00 AM** America/Denver auto-arm build |
| Staff reviews then checks `Send to Make?` | **Sunday 10:00 AM** America/Denver auto-arm send |
| No scheduled weekly email automation | **118** + **119** scheduled scripts |
| 072 forces `Send to Make?` false after build | Keep (review gap = 5 hours) |
| Make owns `Weekly Email Sent?` writeback | Unchanged |

**Do not remove** manual checkboxes — they remain **manual override** and machine triggers.

---

## 1. Schedule (America/Denver)

| Time | Automation | Job |
|------|------------|-----|
| **Sunday 5:00 AM** | **118** — Schedule Weekly Summary Email Build | Ensure WAS for prior week → set `Build Weekly Email Now?` |
| **Sunday 10:00 AM** | **119** — Schedule Weekly Summary Email Send | For Ready && !Sent → set `Send to Make?` |

**Target week:** Official Sunday–Saturday week whose **End Date / Week End Key** = **Saturday just ended** (yesterday at Sunday 05:00 Denver).

Pattern reference: Automation **056** (Airtable **At a scheduled time**, America/Denver).

---

## 2. Architecture

```text
118 (Sun 05:00) → Build Weekly Email Now? = true
       → 072 (existing matches-conditions)
       → Weekly Email Ready? = true; Send to Make? = false (still)

119 (Sun 10:00) → Send to Make? = true
       → 074 (existing matches-conditions)
       → Make webhook (DEV Test mode)
       → Make sets Weekly Email Sent? + Weekly Email Sent At
```

| Component | Create / Modify |
|-----------|-----------------|
| **118** | **NEW** scheduled script |
| **119** | **NEW** scheduled script |
| **072** | **PATCH** — Active? + Schmidt skip; do not clear Sent? when already sent; embed `eventId` |
| **074** | **PATCH** — Active? + Schmidt skip; require/pass `eventId`; DEV force `sendMode=test` |
| **071 / 073 / 076 / 077** | **Do not change** in this packet |

Numbering: next free after **117a/117b** → **118 / 119**.

---

## 3. No manual checkbox dependency

Operators never need to flip boxes for the weekly run. Machine flow uses the **same** field names:

- `Build Weekly Email Now?`
- `Weekly Email Ready?`
- `Send to Make?`
- `Weekly Email Sent?`
- `Weekly Email Sent At`
- `Weekly Email Error`
- Package fields: Subject / Recipients / HTML / Text / Payload JSON / Week Label / Revision / Last Built At
- `sendMode` (`Test` \| `Live`)

---

## 4. 118 algorithm (Sunday 5:00 AM)

1. Resolve target Week (ended Saturday).  
2. Load Enrollments where `Active?` = true.  
3. Skip `recgP9qZYjAhE7NXm` (Schmidt).  
4. Skip if both Parent/Athlete cleaned emails blank → count `skipped_no_email`.  
5. Ensure WAS: find by Summary Key `{Enrollment Key}|{Week Key}`; if missing, create with Enrollment + Week links only.  
6. If `Weekly Email Sent?` = true → skip (resend prevention).  
7. Else set `Build Weekly Email Now?` = true and `sendMode` = `Test` (DEV).  
8. Outputs: created / armed / skipped / errors. **No webhook.**

---

## 5. 119 algorithm (Sunday 10:00 AM)

For WAS linked to target Week:

| Condition | Action |
|-----------|--------|
| `Weekly Email Sent?` true | Skip |
| Enrollment not Active? or Schmidt ID | Skip |
| Ready? false OR subject/recipients/HTML empty | Count `not_ready` |
| Ready && !Sent && package OK | Set `Send to Make?` = true |

074 then POSTs Make. **DEV:** `sendMode=test` + `testRecipientEmail` required; `toEmail` = test inbox only.

---

## 6. Dedupe

| Layer | Rule |
|-------|------|
| WAS | `Summary Key` = `{Enrollment Key}|{Week Key}` (**031**) |
| Build arm | Skip if Sent? |
| Send arm | Skip if Sent? |
| 074 | Throws/skips if Sent? already checked |
| Make | Filter on `eventId` before Gmail |

---

## 7. Resend prevention

1. `Weekly Email Sent?` authoritative after Make Gmail success.  
2. 118/119/072/074 no-op when Sent.  
3. **072 patch required:** if Sent? already true → `statusOut=skipped`; do **not** uncheck Sent / clear Sent At / rewrite package (today’s clear-on-build is a resend hole).  
4. Make must refuse duplicate `eventId` even if Airtable flag lags.

---

## 8. Idempotency key

```text
WEEKLY_EMAIL|{enrollmentId}|{weekId}
```

Use Airtable record IDs. **072 v3.8+** writes `eventId` into `Weekly Email Payload JSON`. **074**/Make must use the same string before Gmail.

---

## 9. Failure recovery

| Failure | Safe behavior |
|---------|----------------|
| 072 build fail | Re-arm Build Now? via 118 next week or manual |
| Empty recipients | 072 skip; 119 never arms |
| 074 webhook fail | Write `Weekly Email Error`; **keep** `Send to Make?` checked (existing 074) |
| Make Gmail fail before writeback | Sent stays false → safe retry with same `eventId` guard |
| Missed Sunday | Manual Test-mode re-run of 118/119 for same Week |

---

## 10. Manual override

| Intent | Action |
|--------|--------|
| Rebuild one athlete | Check `Build Weekly Email Now?` (only if !Sent) |
| Send one early | After Ready, check `Send to Make?` |
| True resend after Sent | Clear Sent? + Sent At (optional Force Resend field — Mike authorize); prefer new `eventId` suffix `\|R2` |
| Suppress | Uncheck Enrollment `Active?` |

Optional field (Mike authorize before create): `Force Resend Weekly Email?` on WAS.

---

## 11. Test-recipient protection

| Guard | Value |
|-------|--------|
| Schmidt enrollment ID | `recgP9qZYjAhE7NXm` — hard exclude in 118, 119, 072, 074 |
| Comms gate | Enrollment `Active?` must be true |
| DEV sendMode | **`Test` only** |
| DEV testRecipientEmail | Mike test inbox (074 already requires in test mode) |
| Webhook | DEV Make scenario only — never PROD URL in this packet |
| First E2E | Prefer `dryRun=true` on 118/119 until arm counts look right |

---

## 12. DEV install steps (exact)

### Phase A — Prerequisites

1. Confirm base `appTetnuCZlCZdTCT`.  
2. C-010 **072** Active? gate live (or paste C-010 072 in same window).  
3. Confirm Week row exists for Saturday-just-ended (or use dryRun against a known DEV Week).  
4. Confirm DEV Make weekly scenario writeback fields: `Weekly Email Sent?`, `Weekly Email Sent At`.

### Phase B — Scripts (leave OFF)

1. Add `118-…-schedule-weekly-summary-email-build.js` (create in GitHub first).  
2. Add `119-…-schedule-weekly-summary-email-send.js`.  
3. Patch **072** / **074** per §2.  
4. Paste into DEV automations; map inputs; **OFF**.

### Phase C — Schedule UI

| Automation | Type | Timezone | Cadence |
|------------|------|----------|---------|
| 118 | At a scheduled time | America/Denver | Weekly · Sunday · 05:00 |
| 119 | At a scheduled time | America/Denver | Weekly · Sunday · 10:00 |

Inputs (config vars): `targetWeekMode=prior_ended`, `sendMode=Test`, `testRecipientEmail`, `dryRun`, `excludedEnrollmentIds=recgP9qZYjAhE7NXm`.

### Phase D — Smoke (no live parents)

| ID | Test | Pass |
|----|------|------|
| C011-T1 | 118 dryRun | Counts only; no Build Now? flips if dryRun |
| C011-T2 | 118 live arm on one Active test enrollment | Build Now? true → 072 builds → Ready? |
| C011-T3 | Schmidt | Never armed |
| C011-T4 | 119 dryRun | Would-arm count |
| C011-T5 | 119 → 074 Test mode | Webhook to DEV Make; test inbox only; Sent? writeback |
| C011-T6 | Re-run 119 | No second send (`eventId` / Sent?) |
| C011-T7 | Active?=false enrollment | Suppressed |

**Do not** set `sendMode=Live` in this packet.

---

## 13. Rollback

1. Disable 118/119 schedules (OFF).  
2. Re-paste prior 072/074.  
3. Clear any stuck `Send to Make?` on test WAS rows manually.  
4. No PROD changes to roll back.

---

## 14. Unresolved uncertainties

| Item | Status |
|------|--------|
| Exact Make module that sets Sent? / Sent At | **UNKNOWN** — verify DEV Make |
| Whether Make already filters on `eventId` | **UNKNOWN** |
| Empty-activity Active enrollments get email? | Design default **yes** (ensure WAS) — confirm with Mike |
| Airtable script timeout at ~90–100 Active enrollments | **UNKNOWN** — may need batching |
| DEV calendar has ended Week rows | **UNKNOWN** |
| Legacy fields (`Weekly Summary Email Status`, `Make Send Status`) still written? | **UNKNOWN** |

---

## 15. Mike approvals needed

1. Approve Sunday 5 AM / 10 AM America/Denver schedule.  
2. Authorize create of 118/119 + 072/074 patches in DEV.  
3. Provide / confirm DEV Make webhook + testRecipientEmail (not committed).  
4. Confirm empty-week email policy.  
5. Explicit approval before any Live / PROD cutover (separate checklist).

---

## 16. Related

- Stage-5 design audit (overnight) · [weekly-summary-flow.md](../data-flow/weekly-summary-flow.md)  
- C-010 guards: [C010_ACTIVE_GUARDS_DEV_INSTALL.md](./C010_ACTIVE_GUARDS_DEV_INSTALL.md)  
- Offline tests: `tools/airtable/tests/test_c011_weekly_email_contract.py`  
- Scripts (to be added in implementation PR): `118-…js`, `119-…js`
