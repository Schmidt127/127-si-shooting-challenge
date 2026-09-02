# Automation Trigger Map

Maps Airtable automations and extension scripts to triggers, tables, and downstream effects (XP, Make webhooks, email).

**Canonical script list:** [../../../docs/automation-index.md](../../../docs/automation-index.md)

**Base:** 127 SI Shooting Challenge (`appn84sqPw03zEbTT`)

---

## Airtable native automations (by pipeline)

### Enrollment (001–003)

| # | Table | Trigger (documented) | Script | Downstream |
|---|-------|----------------------|--------|------------|
| 001 | Enrollments | *confirm in Airtable* | `001-...-find-or-create-athlete-and-link-enrollment.js` | Athletes link, enrollment setup |
| 002 | Enrollments | *confirm in Airtable* | `002-...-assign-grade-band-initial.js` | Grade Band on enrollment |
| 003 | Enrollments | Grade changes | `003-...-assign-grade-band-if-grade-changes.js` | Grade Band update |

### Submission intake → XP (005–010, 021–023)

PKG-006R reconciliation fields are installed per Mike's 2026-08-13
attestation. Verify, rather than create or recreate, the exact field contract
in [daily-submission-xp-reconciliation-fields.md](./daily-submission-xp-reconciliation-fields.md).
The trigger wording below is the committed target contract; current Production
version/state/mapping must still be confirmed in the Airtable UI.

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| 023 | Submissions | *confirm* | `023-...-assign-enrollment-to-submission.js` | Enrollment link |
| 005 | Submissions | *confirm* | `005-...-assign-week-to-submission-homework-first.js` | Week assignment |
| 007 | Submissions | *confirm* | `007-...-duplicate-checker-for-submissions.js` | Duplicate flags |
| 006 | Submissions | *confirm* | `006-...-set-video-count.js` | Video count fields |
| 021 | Submissions | *confirm* | `021-...-set-attachment-upload-status.js` | Upload status |
| 009 | Submissions | *confirm* | `009-submission-intake-create-submission-assets.js` | Submission Assets |
| **010** | Submissions | `Reconciliation Needed? = 1`; dynamic `recordId` | `010-submission-intake-create-xp-event.js` | **XP Events** (SHOOTING_BASE); positive and correction branches, exact-key recheck, same-event deactivate/reactivate, bounded settlement, latch acknowledgement |

### Weekly summary chain (030–034)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| **031** | Submissions | Counted submission, WAS empty | `031-...-find-or-create-weekly-athlete-summary-from-submission.js` (**v4.1**) | **Weekly Athlete Summary** create/link |
| 032 | Weekly Athlete Summary | *confirm* | `032-...-link-challenge-goal-record-to-weekly-athlete-summary.js` (**v3.4**) | Challenge Goal link |
| 033 | Weekly Athlete Summary | *confirm* | `033-...-assign-homework-to-weekly-athlete-summary.js` | Homework assignment |
| 030 | Weekly Athlete Summary | *confirm* | `030-...-copy-enrollment-grade-band-to-weekly-summary.js` | Grade Band copy |
| 034 | Weeks / WAS | *confirm* | `034-...-set-previous-week-helper-values.js` | Previous week helpers |

### Homework pipeline (020, 063–065, 070a, 071)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| **020** | Submission Assets | Homework asset ready | `020-homework-link-or-create-homework-completion.js` | Homework Completions |
| 063 | Homework Completions | *confirm* | `063-...-copy-enrollment-grade-band-to-homework-completion.js` | Grade Band |
| 064 | Homework Completions | Satisfactory + Review Complete + Coach Feedback + Enrollment + Homework + Week present; no Submission Date/Base XP/XP Events-empty filter | `064-...-prepare-homework-xp-award.js` | XP prep fields |
| **065** | Homework Completions | `Homework XP Reconciliation Needed? = 1` (formula-backed local + linked state signature) | `065-...-create-homework-xp-event.js` | **XP Events** (HOMEWORK) award, repair, deactivate, reactivate |
| **070a** | Submission Assets | Send to Make + homework ready (**verify Live/Off in UI**) | `070a-...-send-homework-asset-payload-to-make.js` (**v4.7** — Airtable `fetch`) | **Make** upload engine (not parent email) |
| **078** | Homework Completions | Satisfactory? + Coach Feedback (native Update Record) | *(no script)* | Sets Homework `Parent Feedback Ready?` |
| **071** | Homework Completions | Parent Feedback Ready? + gates (see below) | `071-...-send-homework-feedback-email-webhook.js` (**v4.3**) | **Email Handoff Queue** → **079** → Hub → Resend |

**071 trigger (Hub handoff — GitHub v4.3; confirm UI matches):**

| Include | Notes |
|---------|--------|
| Parent Feedback Ready? checked | Written by **078** (native Update Record), **not** by **065** |
| Parent Feedback Sent? unchecked | 071 does not write Sent / Sent On |
| Satisfactory? checked | Product gate |
| Coach Feedback not empty | Required for Hub payload |

Do **not** treat Make/Gmail as the homework parent-email sender.

### Video pipeline (013, 070b, 070c, 022, 111–114, 073)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| **013** | Submission Assets | Video asset ready | `013-...-create-or-link-video-feedback.js` (**v3.2.0**) | Video Feedback create/link + Grade Band blank-only repair; arms upload for **070b** |
| **022** | Submission Assets | Upload status + child linked | `022-...-sync-child-upload-writeback-from-submission-asset.js` (**v2.1**) | VF upload fields / `Video URL or Drive Link` |
| **070b** | Submission Assets | Send to Make Trigger + Pending Link + Video Feedback destination | `070b-...-send-video-asset-payload-to-make.js` (**v4.7** — Airtable `fetch`) | **Make** upload engine → Lambda (not parent email) |
| **070c** | Submission Assets | `Writeback Complete?` greater than 0 (+ writeback fields) | `070c-...-verify-async-video-asset-upload.js` (**v1.1**) | Verifies writeback; clears `Send to Make Trigger` — does **not** upload |
| 111 | — | **Absent / retired** — do not recreate | Historical Grade Band copy only | Grade Band prep owned by **013** |
| 112 | Submission Assets | **Expected OFF** | `112-...-create-video-feedback-from-submission-asset.js` | Legacy duplicate of **013** — keep OFF |
| 113 | Video Feedback | *confirm in Airtable UI* | `113-...-assign-base-video-xp.js` (**v6.4**) | Base video XP fields from XP Reward Rule `VIDEO_SUBMISSION` |
| **114** | Video Feedback | Lifecycle update (posted / Ready for XP / withdrawal) | `114-...-create-or-update-video-xp-event.js` (**v6.1**) | **XP Events** (`VIDEO_SUBMISSION\|{vfId}`) |
| **073** | Video Feedback | Parent Feedback Ready? (manual) + gates (see below) | `073-...-send-video-feedback-parent-email-webhook.js` (**v4.2**) | **Email Handoff Queue** → **079** → Hub → Resend |

**073 trigger / ownership (Live PROD Code MATCH v4.2 — 2026-08-20):**

| Gate | Owner / rule |
|------|----------------|
| `Parent Feedback Ready?` checked | **Manual** coach/operator — no mark-ready automation for Video |
| `Parent Feedback Sent?` unchecked | Required; **073 does not write** Sent / Sent On |
| `Feedback Posted?` checked | Coach gate (required by script) |
| Coach Feedback not empty | Required by script |
| Delivery | Hub renders + Resend sends; Make/Gmail do **not** send parent feedback email |

**Writeback owner (resolved 2026-08-20 VF; 2026-08-31 HC FUT-032):** Communications Hub PATCHes Video Feedback **and** Homework Completions after Resend success/failure (`Parent Feedback Sent?`, `Sent On`, `Delivery Status`, `Delivery Error`, `Hub Event ID`, `Resend Message ID`). **079** only marks Email Handoff Queue Accepted. See Hub `docs/contracts/VIDEO_FEEDBACK_SOURCE_WRITEBACK_v1.md` and `HOMEWORK_FEEDBACK_SOURCE_WRITEBACK_v1.md`.

### Achievements and streaks (053–059, 066)

> **PKG-038 Production status:** COMPLETE (Mike production proof, 2026-08-16). 053 v5.5, 054 v5.8, 066 v3.8, and 059 v3.6 are installed and ON; final audit v2.1 returned issueTotal = 0. Early Bird remains countable.

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| 053 | Submissions | Record updated; must watch Enrollment, Activity Date, `Count This Submission?`, and `Total Shots Counted` so positive and correction changes reach reconciliation | `053-...-rebuild-and-upsert-from-submissions.js` (**v5.5**) | Canonical Streak Occurrences; unsupported topology becomes inactive |
| **054** | Streak Occurrences | Record updated; must watch `Active?`, Source Status, Enrollment, Achievement, Week, Streak End Date, and XP Events | `054-...-create-or-repair-streak-xp-event.js` (**v5.8**) | **XP Events** (streak); exact-owned inactive event deactivates/reactivates |
| 055 | Submissions | *confirm* | `055-...-recalculate-current-shooting-streak-from-submission.js` | Streak rollups |
| 056 | Enrollments | *scheduled* | `056-...-refresh-current-shooting-streaks-daily.js` | Streak refresh |
| 057 | Weekly Athlete Summary | *confirm* | `057-...-calculate-perfect-week-eligibility.js` (**v2.2**) | Perfect week flags |
| 058 | Weekly Athlete Summary | *confirm* | `058-...-create-perfect-week-unlock.js` (**v1.5**) | Achievement Unlocks |
| **059** | Athlete Achievement Unlocks | Lifecycle-reachable record update/create; watch Active?, XP Award Status, XP Events, Enrollment, Shot Milestone, Week, and Milestone Source Key; never filter Ready for 059 XP? or Shot Milestone presence | `059-...-create-xp-event-from-achievement-unlock.js` (**v3.6**) | **XP Events** (achievement); corrected-history milestone lifecycle |
| 066 | Enrollments | `Run Shot Milestone Check?` checked; the upstream reconciliation must re-arm it after counted-total changes | `066-...-create-shot-milestone-unlocks.js` (**v3.8**) | Canonical shot-milestone unlocks; corrected-history lifecycle |

### Levels (041–043)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| **041** | Enrollments / Levels / Level Gate Rules | Scheduled every **15 minutes**; optional `recordId` only for a controlled single-Enrollment proof; scheduled mapping blank | `041-...-mark-enrollment-for-level-recalculation.js` (**v5.1** — installed and verified in Production 2026-08-16) | Queue only: `Level Recalc Needed?`, `Progression Last Queued Signature` |
| **042** | Enrollments | When record enters view `042 - Needs Level Assignment` (`viwm9OgwkPKI2bii3`); filters `Level Recalc Needed?` checked + `Active?` checked; dynamic `recordId` from triggering Enrollment | `042-...-assign-current-and-next-level-with-gate-blocking.js` (**v4.1.2** — installed and verified) | Current/Next Level, Gate Rule, Status, reconciled signature |
| 043 | Levels | **Retired — do not enable or recreate** | `043-...-set-level-gate-rule-from-next-level.js` (historical source only) | No downstream writer; `042` owns `Level Gate Rule` |

### Email packages (072, 074, 076, 078A, 079, 118–119)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| **072** | Weekly Athlete Summary | `Build Weekly Email Now?` | `072-...-build-weekly-summary-email-package.js` | Email package fields |
| 074 | Weekly Athlete Summary | *confirm* | `074-...-send-weekly-summary-email-package-to-make.js` | Hub queue (filename historical “Make”) |
| **078A** | Enrollments | Athlete + Parent Email - Cleaned + Program Instance | `078A-...-enrollment-create-welcome-email-handoff.js` | Email Handoff Queue `WELCOME` row |
| 075 | Enrollments | **LEGACY RETIRED — do not enable** | `075-...-build-challenge-welcome-email.js` (archive only) | Formerly Enrollment subject/HTML; superseded by **078A → 079 → Hub** |
| 076 | Submissions / Enrollments | *confirm* | `076-...-build-daily-submission-email-package.js` (**v8.12**) | Daily email package |
| **079** | Email Handoff Queue | Status = Ready — *confirm in Airtable* | `079-...-send-queue-handoff-to-communications-hub.js` (**v2.5**) | Communications Hub WELCOME / DAILY_SUBMISSION handoff |
| **118** | Weeks / Enrollments | Scheduled Sunday 05:00 America/Denver | `118-...-schedule-weekly-summary-email-build.js` (**v2.0**) | Arms Weekly Athlete Summary email build |
| 077 | — | **Retired / deleted from Airtable — do not recreate** | `077-...-send-daily-submission-email-package-to-make.js` (GitHub historical source only) | No active native automation; daily-email Hub boundary is 076 → 079 |

### Zoom (101)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| **101** | Zoom Meetings | **When record matches conditions:** sole condition `Zoom XP Reconciliation Needed? = 1`; dynamic triggering Zoom Meeting `recordId` | `101-zoom-attendance-xp-award-meeting-xp.js` (**v6.7** GitHub — SC-147 recording half-XP phase in same reconciliation pass; **NOT Live** until Mike Production paste + disposable proof). Reconciliation trigger formula fix required before paste: [`SC-147-reconciliation-trigger-formula-fix.md`](../../docs/deploy-checklists/SC-147-reconciliation-trigger-formula-fix.md). Do **not** use `Create XP Events` as the primary trigger condition. | **XP Events** (live attendance base + cumulative bonuses + SC-147 recording half-XP). Source Keys: live `ZOOM_ATTEND_BASE\|{Zoom Meeting Key}\|{Enrollment RID}`; recording `ZOOM_RECORDING_CREDIT\|{Enrollment RID}\|{Zoom Meeting RID}` |

### PKG-034 Production evidence (Mike-supplied, 2026-08-13)

Automation 101 is **ON** in Production base `appn84sqPw03zEbTT`. The live
trigger has no `Create XP Events`, `Attendees`, or `Completed` condition. The
nine installed reconciliation fields are documented in
[`docs/pkg-034-zoom-reconciliation-fields.md`](../../../docs/pkg-034-zoom-reconciliation-fields.md)
with their Production field IDs. This evidence proves installation and safe
empty-roster acknowledgement only; live-attendee XP and downstream lifecycle
proof remain pending.

### Asset reuse review (116)

| # | Table | Trigger | Script | Downstream |
|---|-------|---------|--------|------------|
| **116** | Submission Assets | **When record updated** · watched field **`Asset Reuse Decision`** · input `recordId` | `116-submission-assets-apply-asset-reuse-decision-consequences.js` | Do Not Award / Award Status suppress; **XP Events** deactivate or restore; Enrollment level recalc flag |

**Production validated 2026-07-10 (script `992677d`):** asset `recF86pJTIMFoEypJ` → VF `rec20xfx0hKCCwPw2` → XP `recx2MvUh2WP0tbjO` · Source Key `VIDEO_SUBMISSION|rec20xfx0hKCCwPw2` · confirm deactivated XP + `Duplicate Status = Duplicate - Remove`; reversal reactivated same row + `Duplicate Status = Unique` · S5A–S5L **12/12 PASS**. Replaced retired **008** (slot-neutral).

---

## Make.com webhooks (outbound from Airtable)

**Upload plane only** (not parent email). Parent feedback / weekly / welcome / daily notification email is **Communications Hub → Resend** via queue producers (**071** / **073** / **074** / **076** / **117**) and dispatcher **079**.

| Script | Scenario / blueprint | Payload highlights |
|--------|---------------------|-------------------|
| 070a | Upload Asset Engine — homework (**PROD OFF**) | Submission Asset routing payload |
| 070b | Upload Asset Engine — video | Submission Asset routing payload → Lambda writeback → **070c** verify |
| 071 / 073 / 074 / 076 / 117 | — | **Not Make parent-email senders** — Hub queue create (historical Make email rows obsolete) |
| 077 | Historical only — deleted from Airtable; do not recreate | Former Make daily email |

Blueprint: [../../../make/blueprints/upload-asset-engine-v1.json](../../../make/blueprints/upload-asset-engine-v1.json)

Docs: [../../../make/documentation/upload-asset-engine.md](../../../make/documentation/upload-asset-engine.md)

---

## Extension scripts (manual / button)

| Script | Mode | Purpose |
|--------|------|---------|
| `audit-*` (audits/) | Dry-run default | Pipeline integrity — Stages A–J |
| `backfill-*`, `repair-*`, `dedupe-*` (safe-backfills/) | `DRY_RUN` default | Historical repair |
| `export-schema.js` (schema/) | Read-only | In-base schema export |

---

## Idempotency keys

| Output | Guard |
|--------|-------|
| XP Events | Source Key / Dedupe Key per script (010, 054, 059, 065, 101, 114) |
| Weekly summary email | Hub queue key + Hub/Delivery writeback (not Make Gmail) |
| Parent feedback emails | Handoff Key on Email Handoff Queue (`071` / `073`); Hub → Resend. **VF Sent?/Delivery fields:** Hub source writeback. **HC Sent?:** still Hub PATCH TBD |
| Make upload | `Send to Make Trigger` + Lambda claim; **070c** clears trigger after verified video writeback |

See [field-map.md](./field-map.md) for canonical field names.

---

## Testing checklist (per automation)

1. Dry-run matching audit extension after deploy
2. Confirm no duplicate XP Events on automation retry
3. Confirm Make scenario receives expected payload ([test payloads](../../../make/test-payloads/))
4. Update [automation-index.md](../../../docs/automation-index.md) and `CHANGELOG.md`
