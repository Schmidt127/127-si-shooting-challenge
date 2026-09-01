# Fillout Form Inventory — Shooting Challenge

**Authority:** FUT-039 Phase 2 planning  
**Date:** 2026-09-01  
**Base SHA:** `f8c74348` (`origin/master`)  
**Companion brief:** [FUT-039-FILLOUT-BRANDING-BRIEF.md](./FUT-039-FILLOUT-BRANDING-BRIEF.md)

This inventory lists Fillout surfaces referenced in this repository. **Live Fillout org form counts, internal form IDs, and unpublished draft forms are not fully documented in git** — rows marked **Mike UI attestation** require OMNI / Fillout UI confirmation before Phase 3 CSS work.

---

## Summary

| Category | Count in repo evidence |
|----------|------------------------|
| **Confirmed public URLs** | 3 |
| **Known form template ID (legacy host)** | 1 (`vNgeHardYcus`) |
| **Named forms without public URL in repo** | 2+ (HW17 quiz; future FUT-029 homework) |
| **Airtable integration views (not forms)** | 2 |
| **Total inventoried rows below** | **12** |

---

## Master table

| # | Form key | Public URL / pattern | Fillout template ID | Airtable destination | Purpose | Owner (repo) | Traffic / status | v1 in scope | Notes |
|---|----------|----------------------|---------------------|----------------------|---------|--------------|------------------|-------------|-------|
| 1 | `player_registration` | `https://forms.fairfieldbasketballclub.com/shoot-playerregistration` | **Mike UI attestation** (F-ATT-01) | `Enrollments` | Season enrollment + Stripe payment intake (FUT-003) | Mike / Fillout admin | Canonical in `web/lib/registration.ts`; smoke-tested HTTP 200 | **Y** | Highest parent-facing priority; FUT-003 Make writeback must not break |
| 2 | `daily_submission` | `https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions` | **Mike UI attestation** | `Submissions` | Daily shooting log + homework/video attachments | Mike / Fillout admin | **OFF** (C-008 / SC-146); linked from emails **076/071/073/078A** | **Y** | Reopen gated SC-146; branding before mass reopen |
| 3 | `edit_submission_parent` | `https://form.fillout.com/t/vNgeHardYcus?id={SubmissionRecordId}` | `vNgeHardYcus` | `Submissions` (edit prefill) | Parent edit/resubmit linked from daily receipt emails | Mike / Fillout admin | Formula field `Edit Submission - Parent` on Submissions | **Y** | Legacy `form.fillout.com` host — consider custom-domain alias in Phase 3 |
| 4 | `hw17_reflection_quiz` | **URL not in repo** | **Mike UI attestation** | `Final Reflection Quiz Submissions` | HW17 Final Reflection Quiz (attachment-less Option B today) | Mike / Fillout admin | Live path via automation **067**; C-009 queued for attachment path | **N** (v1) / **Y** (v2) | Brand after core intake trio stable; do not restyle during C-009 schema work |
| 5 | `homework_fillout_per_assignment` | **Not created** (FUT-029) | — | TBD (`Homework Completions` spine) | Optional/primary online homework answers | Future — FUT-029 | Design only; **no live forms** | **N** | Coordinate theme spec in FUT-039 but implement with FUT-029 |
| 6 | `learning_activity_response` | **Not in repo** (SC-019) | — | `Learning Activity Responses` (proposed) | Structured learning activity intake | Future — SC-019 | Built in Repository schema path; Fillout TBD | **N** | Out of FUT-039 v1 |
| 7 | `enrollment_test_clone` | **Mike UI attestation** | — | `Enrollments` (test) | Schmidt / ETF controlled enrollment tests | Mike | Referenced in season launch + SC-060 validation docs | **N** | Style only if still linked publicly; prefer hidden test URLs |
| 8 | `daily_submission_test_clone` | **Mike UI attestation** | — | `Submissions` (test) | Fillout-shaped submission tests (**115**, SC-001) | Mike | Testing Scenarios framework | **N** | Clone prod theme after prod forms validated |
| 9 | `org_shared_theme_only` | N/A (Fillout org default theme) | Org-level | All new forms | Default theme for org (Fillout “Default theme” setting) | Mike / Fillout admin | Fillout docs: shared across forms using same theme | **Y** (infra) | Primary lever for v1 consistency — see brief §4 |
| 10 | `stripe_payment_embed` | Same host as #1 (registration) | — | Webhook → Make FUT-003 | Stripe PaymentIntent capture on paid registration | Mike / Make | Validated inactive Make scenario 2026-08-26 | **Y** (section) | CSS must not alter payment field names / webhook payload |
| 11 | `homework_record_picker_view` | N/A — Airtable view | — | `Homework Library` / PHA picker | Operator view: **Homework Record Picker View on FILLOUT.COM** | Airtable / Mike | Schema snapshot view name; feeds Fillout linked-record choices | **N** | Not a Fillout URL — documents homework choice integration |
| 12 | `fillout_form_info_view` | N/A — Airtable view | — | Internal ops | **Fillout.com Form Info ONLY** view on Homework Library | Airtable / Mike | Ops metadata for form wiring | **N** | Not a Fillout URL |

---

## Canonical repo references

| Surface | Source |
|---------|--------|
| Registration + daily URLs | [`web/lib/registration.ts`](../../../web/lib/registration.ts) |
| Email / automation daily link | [`communications/emails/lib/brand.js`](../../../communications/emails/lib/brand.js), automations **071/073/076/078A** |
| Edit submission formula | Submissions.`Edit Submission - Parent` → `https://form.fillout.com/t/vNgeHardYcus?id=` & `RECORD_ID()` |
| Enrollment field contract | [`docs/online-agents/enrollment-season/FILLOUT-ENROLLMENT-CONTRACT.md`](../../online-agents/enrollment-season/FILLOUT-ENROLLMENT-CONTRACT.md) |
| Season routing stub | [`docs/challenge-year/fillout-season-routing.contract.json`](../../challenge-year/fillout-season-routing.contract.json) |
| HW17 quiz contract | [`lib/homework-contracts/quiz-path.js`](../../../lib/homework-contracts/quiz-path.js) |
| HTTP smoke URLs | [`web/scripts/http-smoke.mjs`](../../../web/scripts/http-smoke.mjs), [`docs/testing/PRODUCTION-SMOKE-RUNBOOK.md`](../../testing/PRODUCTION-SMOKE-RUNBOOK.md) |
| FUT-003 payment path | [`docs/deploy-checklists/FUT-003-fillout-stripe-payment-writeback.md`](../../deploy-checklists/FUT-003-fillout-stripe-payment-writeback.md) |

---

## v1 scope rollup (brief recommendation)

| v1 **Y** | v1 **N** |
|----------|----------|
| Player registration (#1) | HW17 quiz (#4) — v2 after intake stable |
| Daily submissions (#2) | FUT-029 per-assignment forms (#5) |
| Edit submission parent (#3) | SC-019 learning forms (#6) |
| Org shared theme (#9) | Test clones (#7–8) unless publicly linked |
| Stripe section on registration (#10) | Airtable-only views (#11–12) |

**Count:** **5** forms/surfaces in v1 scope · **7** deferred or non-form rows.

---

## Mike UI attestations still required

From [`FILLOUT-SEASON-ACTIVATION.md`](../../challenge-year/FILLOUT-SEASON-ACTIVATION.md):

| ID | Question | Blocks |
|----|----------|--------|
| F-ATT-01 | Live enrollment form ID / full URL list in Fillout org | Complete inventory row #1 ID |
| F-ATT-02 | Config link hidden field on enrollment? | Season routing only — not branding |
| F-ATT-03 | Hidden Program Instance + School Year defaults | Season routing |
| F-ATT-04 | Daily form year/Config hard-codes | SC-146 reopen |
| F-ATT-05 | Confirmation + redirect URLs for each form | Confirmation screen slice |
| **F-ATT-06** *(proposed)* | HW17 quiz public URL + theme assignment | Row #4 |
| **F-ATT-07** *(proposed)* | Full Fillout org form list (names + URLs) for cross-program audit (FUT-034 Jr. Ref naming) | Org-wide consistency |

---

## Change log

| Date | Change |
|------|--------|
| 2026-09-01 | Initial inventory for FUT-039 Phase 2 |
