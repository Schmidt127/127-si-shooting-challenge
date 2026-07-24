# Automation Writer Inventory — Agent 9

**Generated:** 2026-07-24  
**Machine twin:** [`writer-inventory.json`](./writer-inventory.json)  
**Source Key registry:** [`xp-source-key-registry.json`](./xp-source-key-registry.json)  
**Scope:** Create/update writers for XP Events, WAS, Homework Completions, Submission Assets, Video Feedback, Athlete Achievement Unlocks, Streak Occurrences, Zoom Attendance, Enrollment level fields, email send keys/statuses.

Honesty rule: live ON/OFF is **not** proven from GitHub alone. Expected state is contractual; current evidence cites repo + overnight audits. Mike UI attestation fills gaps.

---

## Legend

| Field | Meaning |
|-------|---------|
| Expected ON/OFF | Contractual target state |
| Classification | `authoritative_writer` / `repair_only_writer` / `orchestrator` / `legacy_off` / `duplicate_risk` / `evidence_insufficient` |
| Risk | critical / high / medium / low |

---

## A. XP Events creators

| # | Script | Trigger | Source → Dest | Identity / Source Key | Rerun | Competing | Expected | Evidence | Risk |
|---|--------|---------|---------------|----------------------|-------|-----------|----------|----------|------|
| **010** | `010-submission-intake-create-xp-event.js` v10.4 | Submissions · Count This Submission? | Submissions → XP Events | `SUBMISSION_XP\|{submissionId}` | Recheck; refuse steal | — | ON | Proven post-reset | low |
| **054** | `054-…-streak-…-xp-event.js` v5.6 | Streak Occurrences · Ready for XP | Streak Occurrences → XP Events | `STREAK_XP\|{enr}\|{ach}\|{endDate}` | Create/repair | — | ON | Code-safe; unproven live | medium |
| **059** | `059-…-xp-event-from-achievement-unlock.js` v3.5 | Unlocks created · Pending | Unlocks → XP Events | Inherits unlock key | Recheck Source Key | — | ON | Unproven post-reset | medium |
| **065** | `065-…-create-homework-xp-event.js` v9.2 | HC satisfactory + XP pending | HC → XP Events | `HOMEWORK_XP\|{hcId}` | Recheck; **ignores** legacy `HOMEWORK_COMPLETION\|` | Legacy keys | ON | 0 HC post-reset; XP-D3 | high |
| **101** | `101-zoom-attendance-xp-award-meeting-xp.js` v5.5 | Zoom Meetings · Create XP Events | Meetings → XP Events (+WAS) | `ZOOM_ATTEND_BASE\|{meeting}\|{enr}` (+ bonuses) | Stable keys | WAS race vs 031/118 | ON (live) | Never write Attendees from recording | high |
| **114** | `114-…-video-xp-event.js` v5.8 | VF Ready for XP | VF → XP Events | `VIDEO_SUBMISSION\|{vfId}` | Update same; steal-guard; **reads** formula dedupe | — | ON | PROD key observed | low |
| **117** | `117-zoom-recording-credit-orchestrator.js` v1.1.1 | ZA Recording Quiz | ZA → XP Events | `ZOOM_CREDIT\|{enr}\|{meeting}` | Recheck; soft-void | **117c** | Exactly one ON | Dual create path | **critical** |
| **117c** | `117c-zoom-recording-create-zoom-xp-event.js` v1.1.0 | ZA Recording Quiz (slice) | ZA → XP Events | `ZOOM_CREDIT\|{enr}\|{meeting}` | Recheck | **117** | Exactly one ON | Same family as 117 | **critical** |
| **WEEKLY_THRESHOLD** | *missing in repo* | WAS Threshold fields | WAS → XP Events? | Unknown `WEEKLY_THRESHOLD_*` | Unknown | — | UNKNOWN | XP-D1 | **critical** |
| **MANUAL_BONUS** | *manual / none* | Ops | Enrollments adjust / freeform XP | Unknown | Manual | — | Manual only | No rule creator | medium |

**Formula-only (never write):** `XP Dedupe Key`, `XP Dedupe Key Normalized`. Scripts write `Source Key` only. Readers of formulas: **010**, **114**.

---

## B. Weekly Athlete Summary creators / linkers

| # | Script | Trigger | Fields written | Identity | Rerun | Competing | Expected | Evidence | Risk |
|---|--------|---------|----------------|----------|-------|-----------|----------|----------|------|
| **031** | `031-…-find-or-create-weekly-athlete-summary-from-submission.js` v3.1 | Submission counted · WAS empty | Enrollment, Week, Submissions link; orphan XP links | **Enrollment + Week** (Summary Key formula) | Lookup-before-create; throw on dupes; **never write Summary Key** | 101, 118 | ON | Schmidt 1 WAS / 3 submissions | high |
| **101** | (same as XP) | Live Zoom XP path | `findOrCreateWeeklySummaryId` | Enrollment + Week | Check-then-create | 031, 118 | ON | Race window | high |
| **118** | `118-…-schedule-weekly-summary-email-build.js` **v1.5** | Sunday 5am Denver | Enrollment, Week, Build checkbox, WAS sendMode | Enrollment + Week (Summary Key map) | Create if missing then arm; write WAS sendMode from input | 031, 101 | **ON** (verified_prod 2026-07-24); season `dryRun=false` + `sendMode=Live` | Installed; paste v1.5 if UI still v1.4 | high |
| **030** | `030-…-copy-enrollment-grade-band-to-weekly-summary.js` | WAS | Grade Band only | WAS RID | Repair copy | — | ON | Repair-only | low |
| **119** | `119-…-schedule-weekly-summary-email-send.js` **v1.4** | Schedule Sun 10am Denver | Send arm fields | WAS RID | Does not create WAS | — | **ON** (verified_prod) | Season: dryRun=false | high |

---

## C. Homework Completions

| # | Script | Trigger | Identity | Competing | Expected | Classification | Risk |
|---|--------|---------|----------|-----------|----------|----------------|------|
| **020** | `020-homework-link-or-create-homework-completion.js` v3.0.0 | SA homework ready | Submission + Homework + HW slot | 067; deleted 063 | ON | authoritative_writer | high |
| **063** | `063-…-copy-enrollment-grade-band-…js` | HC Grade Band | HC RID | 020 create-time GB | **DELETED/OFF** | legacy_off | medium |
| **067** | `067-…-reflection-quiz.js` v2.0 | Quiz submission | Enrollment + Week + Homework | 020 | Product open | duplicate_risk | high |
| **064** | Prepare Homework XP | HC review | HC RID | — | ON | orchestrator (no XP create) | low |

---

## D. Submission Assets

| # | Script | Role | Competing | Expected | Risk |
|---|--------|------|-----------|----------|------|
| **009** | Create assets from Submission | Authoritative creator | 067 quiz assets; 115 | ON | medium |
| **021** | Set attachment upload status | Status writer | Make/Lambda | ON | medium |
| **022** | Sync child upload writeback | Repair/sync | Make engine | ON | high |
| **070a** | Homework payload → Make | Orchestrator | Make | **OFF in PROD** until scheduled | high |
| **070b** | Video payload → Make v4.4 | Orchestrator | Make | ON | medium |
| **070c** | Verify async upload | Repair/verify | Make | ON | medium |
| **116** | Asset reuse consequences | Orchestrator (VF/XP Active?) | — | ON | medium |
| **MAKE upload engine** | Canonical URL / hash / status | Airtable writers 022/070c | ON (video) | high |

---

## E. Video Feedback

| # | Script | Identity key | Competing | Expected | Risk |
|---|--------|--------------|-----------|----------|------|
| **013** | Create or link VF | `VIDEO_FEEDBACK\|{assetId}` | **112** | ON | medium |
| **112** | Create VF from SA | raw `{assetId}` | **013** | **OFF** | **critical** |
| **111** | Copy Grade Band | VF RID | 013 create-time | **DELETED/OFF** | medium |
| **113** | Assign Base XP (no XP Event) | VF RID | — | ON | low |

---

## F. Athlete Achievement Unlocks / Streak Occurrences

| # | Script | Destination | Identity | Expected | Risk |
|---|--------|-------------|----------|----------|------|
| **053** | Rebuild/upsert streak occurrences | Streak Occurrences | Enrollment + achievement window | ON | medium |
| **055/056** | Current streak helpers | Enrollment streak fields / refresh | Enrollment | ON | medium |
| **058** | Perfect Week unlock | Unlocks | `PERFECT_WEEK\|{enr}\|{week}` | ON | medium |
| **066** | Shot milestone unlocks | Unlocks | `SHOT_MILESTONE\|{enr}\|{ms}` | ON | medium |
| **057** | Perfect Week eligibility | WAS + ZA flags | WAS Enrollment+Week | ON | medium |

---

## G. Zoom Attendance

| # | Script | Writes | Expected | Risk |
|---|--------|--------|----------|------|
| **117** | Orchestrator credit/status + XP | Exactly one ZOOM_CREDIT owner | critical |
| **117a** | Normalize Recording Quiz row | Prefer OFF if 117 owns path | medium |
| **117b/d/e** | Coach review / gate / PW flags | Modular; prefer OFF when 117 covers | medium |
| **117f** | Approval email send key | ON when email live | high |
| **101** | Live attendees XP only | ON; never from recording path | high |

Hard rule: recording path **must never** write `Zoom Meetings.Attendees`.

---

## H. Enrollment level fields

| # | Script | Fields | Expected | Classification |
|---|--------|--------|----------|----------------|
| **042** | Current Level, Next Level, Level Gate Rule, Level Status | ON | authoritative_writer |
| **041** | Level Recalc Needed? | ON | orchestrator |
| **002/003** | Grade Band | ON | authoritative for band |
| **115** | May toggle Level Recalc Needed? on C025 test path | DEV only | orchestrator (test) |

---

## I. Email send keys / statuses

| # | Script | Key / status | Expected | Risk |
|---|--------|--------------|----------|------|
| **072** | Build weekly package | Package fields | ON | medium |
| **074** | Send weekly → Make | `WEEKLY_EMAIL\|{enr}\|{week}` | When authorized | critical |
| **076/077** | Daily package + send | Daily Email Status | ON | medium |
| **071/073** | HW / VF parent feedback webhooks | Send statuses | ON | medium |
| **117f** | `ZOOM_REC_EMAIL\|{enr}\|{meeting}\|{za}` | When live | high |
| **118/119** | Schedule build/send arms | **ON** verified_prod; keep Live season inputs | high |

---

## Dual-writer register (inventory)

| ID | Area | Writers | Severity |
|----|------|---------|----------|
| OW-D1 | Video Feedback create | 013 + 112 | Critical if 112 ON |
| OW-D2 | ZOOM_CREDIT XP | 117 + 117c | Critical if both ON |
| OW-D3 | WAS create | 031 + 101 + 118 | High race |
| OW-D4 | HC create | 020 + 067 | High (open product) |
| OW-D5 | Homework XP legacy keys | 065 vs `HOMEWORK_COMPLETION\|` | High |
| OW-D6 | Upload fields | 022/070c + Make engine | High |
| OW-D7 | Weekly Threshold XP | **missing** | Critical gap |
| OW-D8 | Grade Band repair | 020/013 vs deleted 063/111 | Medium (attest deleted) |

Full row detail: [`writer-inventory.json`](./writer-inventory.json).
