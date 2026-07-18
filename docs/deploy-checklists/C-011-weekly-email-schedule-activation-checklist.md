# C-011 — Weekly Email Schedule Activation Checklist (Approval Gate)

**Status:** Repository safeguards ready — **schedules must stay OFF** until Mike approves  
**Timezone:** America/Denver  
**Cadence:** Build Sunday **05:00** (118) · Send Sunday **10:00** (119)  
**Scripts:** 118 v1.1 · 119 v1.1 · 074 v2.1 · 072 (existing)  
**Authority:** [C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md](../v2/C011_AUTOMATIC_WEEKLY_EMAIL_DEV_INSTALL.md)

---

## What this package does **not** do

- Does **not** enable Airtable schedules.
- Does **not** send real parent email.
- Does **not** modify Make.com production scenarios.
- Does **not** set `sendMode=Live`.

---

## Safeguards implemented in repo

| Safeguard | Where |
|-----------|--------|
| `dryRun` defaults **true** | 118 / 119 |
| Refuse `sendMode=Live` when `dryRun=false` | 118 |
| Prior-Saturday scheduled date key (`scheduledWeekEndKeyOut`) | 118 / 119 |
| Skip already-sent packages | 118 / 119 / 074 |
| Send only Ready + package-complete rows | 119 |
| Schmidt enrollment hard exclude | 118 / 119 / 072 / 074 |
| Deterministic `eventId` = `WEEKLY_EMAIL\|{enrollmentId}\|{weekId}` | 074 payload (+ 072 package) |
| 074 does **not** clear `Weekly Email Sent?` after handoff | 074 v2.1 |
| Summary Key–aware WAS lookup / duplicate skip | 118 v1.1 |

---

## Activation checklist (Mike approval required)

### Phase 0 — Pre-flight

| # | Item | Done |
|---|------|------|
| 0.1 | Confirm DEV base `appTetnuCZlCZdTCT` | [ ] |
| 0.2 | Confirm prior Saturday Week row exists for target run | [ ] |
| 0.3 | Confirm DEV Make weekly scenario writeback (`Weekly Email Sent?`, `Weekly Email Sent At`) | [ ] |
| 0.4 | Confirm testRecipientEmail for 074 Test mode | [ ] |
| 0.5 | Confirm 072 Active? / Schmidt guards live (C-010) | [ ] |

### Phase 1 — Paste scripts (leave OFF)

| # | Item | Done |
|---|------|------|
| 1.1 | Paste **118 v1.1** into DEV automation (schedule type configured but **OFF**) | [ ] |
| 1.2 | Paste **119 v1.1** into DEV automation (schedule configured but **OFF**) | [ ] |
| 1.3 | Paste **074 v2.1** (eventId + no Sent? clear) | [ ] |
| 1.4 | Map inputs: `dryRun=true`, `sendMode=Test`, Schmidt exclude | [ ] |

### Phase 2 — Dry-run smoke (manual trigger, schedules still OFF)

| # | Test | Pass |
|---|------|------|
| 2.1 | 118 dryRun | Counts only; no Build Now flips |
| 2.2 | 118 dryRun=false on one test enrollment | Build Now? true → 072 Ready? |
| 2.3 | 119 dryRun | Would-arm only Ready && !Sent |
| 2.4 | Schmidt never armed | Pass |
| 2.5 | Already Sent? skipped | Pass |
| 2.6 | Not Ready skipped (`notReadyCountOut`) | Pass |

### Phase 3 — DEV Test webhook only (still no parent Live)

| # | Test | Pass |
|---|------|------|
| 3.1 | 119 arms Send to Make? on Ready package | [ ] |
| 3.2 | 074 posts DEV Make with `eventId` | [ ] |
| 3.3 | Test inbox only (`sendMode=test`) | [ ] |
| 3.4 | Make sets Sent? / Sent At | [ ] |
| 3.5 | Re-run 119 / 074 | No duplicate send |

### Phase 4 — Schedule enable (separate approval)

| # | Item | Done |
|---|------|------|
| 4.1 | Mike approves Sunday 05:00 / 10:00 America/Denver | [ ] |
| 4.2 | Enable 118 schedule in DEV only | [ ] |
| 4.3 | Enable 119 schedule in DEV only | [ ] |
| 4.4 | First Sunday monitored; keep `sendMode=Test` | [ ] |
| 4.5 | Explicit separate approval before PROD / Live | [ ] |

---

## Rollback

1. Turn 118/119 schedules **OFF**.
2. Re-paste prior 074 if needed.
3. Clear stuck `Send to Make?` on test WAS rows manually.
4. Leave Sent? history intact.

---

## Mike decisions still required

1. Approve schedule enablement in DEV.
2. Confirm empty-week email policy (Active enrollments with no activity).
3. Confirm Make already dedupes on `eventId` (or add Make filter).
4. Explicit approval before any Live / PROD cutover.
