# Field Writer Ownership Audit (High-Risk) — 2026-07-24

**Extends:** `docs/foundation-reset/CRITICAL-PATH-FIELD-OWNERSHIP-MATRIX-2026-07-23.md`  
**Related SC:** SC-046, SC-047, SC-049  
**Scope:** Testing/integrity priority fields only. Dual writers flagged; **no writers removed**.

Supersedes one stale recommendation in the foundation matrix: **do not add a Schmidt standings exclusion filter**. Schmidt must remain visible (overnight direction 2026-07-23/24).

---

## Legend

- **Risk:** Critical / High / Medium / Low  
- **Multiple writers?** Yes / No / Possible / Unknown  

---

## Enrollment

| Field | Type | Intended writer | Additional writers | Readers | Risk | Notes / correction |
|-------|------|-----------------|--------------------|---------|------|--------------------|
| Active? | checkbox | Human/ops | C-010 skip guards (read) | Web leaderboard, XP/email skips | High | Keep Schmidt `true`. **Do not** add exclusion field. |
| Athlete | link | 001 / intake | Human | Identity | Medium | |
| Grade Band | link | 002/003 | Human | XP rules, WAS | Medium | |
| Current Level | link | 042 | 041 marks recalc | Gates, web | High | |
| Next Level | link | 042 | — | Gates | High | |
| Level Gate Rule | link | 042 / config | — | Gate eval | High | |
| Level Recalc Needed? | checkbox | 041; 115 C025 toggle | — | 042 trigger | Medium | 115 may toggle only in C025 branch |
| Lifetime XP Manual Adjustments | number | Human | — | Lifetime XP formula | Medium | Manual Bonus path |
| Progress Processing Enabled? | checkbox | Ops (C-010) | — | 010/031/053/065 | High | Missing=enabled |

## Submissions

| Field | Type | Intended writer | Additional writers | Readers | Risk | Notes |
|-------|------|-----------------|--------------------|---------|------|-------|
| Enrollment | link | 023 or 115 pre-link / Fillout | Human | Downstream | High | Dual assign possible |
| Athlete | link | 023/115/Fillout | — | Display | Medium | |
| Week | link | **005 only** | — | WAS, XP context | Critical | Never invent Weeks |
| Activity Date | date | Fillout / 115 | Human | 005, 010 | High | Denver keys |
| Shot Total | number | Fillout / 115 | Human | 010, rollups | High | |
| Duplicate Review Status | singleSelect | **007** / **115 (`Count It`)** | Human | Counted shots | **Critical dual** | 115 bypasses review by design — product decision open |
| Count This Submission? | formula/checkbox chain | computed / rules | — | 010/031 | High | Do not script-write if computed |
| Weekly Athlete Summary | link | 031 | — | Emails | High | |
| XP Award Status | singleSelect | 008/010 chain | — | XP pipeline | High | Inventory live writers (UI) |
| Homework Name 1 / HW Sub 1 | link/attach | Fillout / 115 HW | — | 009/020 | High | |
| Video Upload | attach | Fillout / 115 Video | — | 009/013 | High | |
| Video Feedback Focus / Note | select/text | Fillout / 115 | — | 013 | Medium | |

## Weekly Athlete Summary

| Field | Type | Intended writer | Additional | Risk | Notes |
|-------|------|-----------------|------------|------|-------|
| Enrollment | link | 031 / 118 | — | Critical | Uniqueness half-key |
| Week | link | 031 / 118 | — | Critical | Uniqueness half-key |
| Summary Key | formula | **none (computed)** | — | Critical | Never write |
| Perfect Week Automation Status | singleSelect | 057; 115 C025 re-arm | — | High | Orchestration only |
| Threshold XP Status / Ready? | select/formula | Threshold writer (**missing in repo**) | — | Critical | See XP-D1 |
| Build/Send checkboxes | checkbox | Human / 118/119 | — | High | Keep schedules OFF until authorized |
| Calculation Status | select | 072 path | — | High | |

## XP Events

| Field | Type | Intended writer | Additional | Risk | Notes |
|-------|------|-----------------|------------|------|-------|
| XP Dedupe Key / Normalized | formula | **none (computed)** | Scripts may *read* for matching | Critical | Do not write from scripts |
| Source Key | text | Creating XP script only | Backfills | Critical | One pattern per source |
| XP Points | number | Same XP script | — | Critical | Do not change economics |
| XP Source | select | Same XP script | — | High | |
| XP Date / Activity Date | date | Same XP script | — | High | |
| Enrollment / Submission / VF / HC links | links | Same XP script | — | Critical | |
| Awarded By | text | Same XP script | — | High | Steal-guard signal |

## Submission Assets

| Field | Type | Intended writer | Risk | Notes |
|-------|------|-----------------|------|-------|
| Enrollment - Linked | link/lookup | 009 chain | High | |
| Upload status / Canonical URL / hash | text | Lambda / 070* / 116 | Critical | External dependency |
| Send to Make Trigger | checkbox | 070* / 009 defaults | High | |
| Homework Completions | link | 020 | High | Many assets → one HC |

## Homework Completions

| Field | Type | Intended writer | Additional | Risk | Notes |
|-------|------|-----------------|------------|------|-------|
| Enrollment | link | 020 | 067 | **High dual possible** | SC-013/014 |
| Homework | link | 020/067 | — | High | |
| Satisfactory? / review | checkbox/select | Coach / 061 | — | High | Gates 065/071 |
| XP Events | link | 065 | — | High | |

## Video Feedback

| Field | Type | Intended writer | Additional | Risk | Notes |
|-------|------|-----------------|------------|------|-------|
| Enrollment | link | **013** | **112** (retire/OFF) | Medium | 111 deleted; attest 112 OFF |
| Submission / Submission Asset | link | 013 | — | High | |
| Review status / Ready for XP | select/checkbox | Coach / 113 | — | High | |
| XP Events | link | 114 | — | High | |

## Athlete Achievement Unlocks

| Field | Type | Intended writer | Risk | Notes |
|-------|------|-----------------|------|-------|
| Achievement Unlock Key / Source Key | text | 058/066/… | Critical | H-001 rules |
| Enrollment / Achievement / Week | links | Same | High | |
| XP Award Status | select | 059 | High | |

## Testing Scenarios (framework only)

| Field | Type | Intended writer | Risk | Notes |
|-------|------|-----------------|------|-------|
| Run Test? | checkbox | Operator + cleared by 115 | Medium | Leave checked on intake hard error |
| Dry Run? | checkbox | Operator | Low | |
| Linked Submission | link | **115 only** | Medium | Newest only |
| Last Run Status / At / Actual Result / Pass/Fail Notes | select/text | **115 only** | Medium | |
| Test Status | select | Operator | Medium | **115 does not gate on this** (SCN-018 gap) |
| Related Enrollment | link | Operator | High | Schmidt allowlist |

## Make / email handoff (summary)

| Field area | Intended writer | Risk | Notes |
|------------|-----------------|------|-------|
| Daily email status | 076/077 | Medium | Schmidt-only testing |
| Weekly send keys | 074 / Make | Critical | Do not double-send |
| Zoom approval send key | 117f `ZOOM_REC_EMAIL\|…` | High | Webhook blank often |

## Dual-writer register (tonight)

| ID | Field | Writers | Severity | Action |
|----|-------|---------|----------|--------|
| FW-D1 | Submissions.Duplicate Review Status | **007** + **115** (`Count It`) | High | Product decision: keep Count It preset? |
| FW-D2 | Homework Completions create | 020 + 067 | High | SC-013/014 decision |
| FW-D3 | Enrollments.Active? | Ops + many readers/skips | Medium | Policy documented; no exclusion field |
| FW-D4 | WAS Threshold XP Status | Missing writer | Critical | Locate/rebuild automation |
| FW-D5 | Foundation matrix standings filter advice | Stale doc | Medium | Superseded — Schmidt visible |
| FW-D6 | Video Feedback create | **013 + 112** | Critical if both ON | Confirm 112 OFF; keep 013 |
| FW-D7 | Zoom recording XP | **117 + 117c** | High | Only one ON |
| FW-D8 | WAS create | **031 + 101** (+118) | High | Race; no DB unique index |

## Test evidence

- Offline 115 harness proves 115 writes only intake + scenario result fields  
- Live PROD 115 Submission shows Count It + Enrollment/Athlete pre-link  
- Verifier fixture `tools/testing/fixtures/live-115-bundle.json` PASS  

## Explicit non-actions

- No field renames  
- No select option changes  
- No writer removals without proof  
- No second XP/WAS/achievement pipeline
