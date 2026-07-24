# Cleanup Classification

Classes: **Keep** · **Rename later** · **Hide** · **Legacy** · **Candidate for retirement** · **Do not use** · **Unknown**

**Rule:** Do not delete solely because unused in GitHub. Require verification (views, Interfaces, Make, Fillout, historical data).

---

## Weekly email / send surface (WAS)

| Field | Class | Rationale |
|-------|-------|-----------|
| Build Weekly Email Now? | Keep | 118 → 072 |
| Weekly Email Ready? | Keep | 072 → 119/074 |
| Send to Make? | Keep | 119 → 074 |
| Weekly Email Subject/Recipients/HTML/Text/Payload/Week Label/Revision/Last Built At | Keep | Package |
| sendMode | Keep | Test/Live routing — PROD Live rule |
| Weekly Email Sent? | Keep | Make Live writeback (authoritative sent flag) |
| Weekly Email Sent At | Keep | Make Live timestamp |
| Make Send Status | Keep | Make Live status |
| Weekly Email Error | Keep | 074/package errors |
| Weekly Summary Email Status | Hide / Rename later | Overlaps Sent?/Ready? — confusing for ops |
| Weekly Summary Sent At | Unknown → Hide until ownership attested | Parallel to Weekly Email Sent At |
| Weekly Summary Send Error | Hide / merge later | Parallel error field |
| Weekly Summary Email Type | Unknown | Preview/Test/Regular — verify writers |
| Email Subject (formula) | Legacy / Do not use for send | 072 writes Weekly Email Subject instead |
| Combined Recipient Emails | Hide | 072 builds recipients into Weekly Email Recipients |

---

## Identity / keys

| Field | Class | Rationale |
|-------|-------|-----------|
| Enrollment Key | Keep | Formula identity |
| Week Key (`RECORD_ID()`) | Keep | Stable |
| Summary Key | Keep | WAS identity (read-only) |
| Weekly Summary Key | Do not use (for dedupe) / Hide | Display-based; superseded by Summary Key for scripts |
| Source Key | Keep | XP/email idempotency |
| XP Dedupe Key / Normalized | Keep (formula) | Never write |
| Unlock Key | Keep (formula) | Never write |
| Milestone Source Key | Keep | 066 |
| Homework Completion Key | Keep (formula) | Note rename sensitivity |
| Video Feedback Key | Keep | 013 canonical |

---

## Weeks table stubs

| Field | Class | Rationale |
|-------|-------|-----------|
| Homework 2 | Candidate for retirement | Text stub; real link is Homework Completions |
| Video Feedback (text) | Candidate for retirement | Not a link |
| Submission Assets (text) | Candidate for retirement | Not a link |
| XP Events copy | Candidate for retirement / Legacy | Copy artifact naming |

---

## Enrollments / gates / levels

| Field | Class | Rationale |
|-------|-------|-----------|
| Active? | Keep | Pipeline gate |
| Current Level / Next Level | Keep | 042 |
| Gate Meets* / Gate Passes | Keep | Gate engine |
| Gate Failure Summary - Formula | Rename later / Hide | Duplicate of Gate Summary; suspect FIND logic |
| Gate Summary | Keep (prefer one) | Cleaner numeric check |
| Registratioin Referrer | Rename later | Typo; low risk rename after inventory |
| Full Athlete Name vs Backward primary | Keep both | Primary is Backward formula |

---

## Submission Assets / storage

| Field | Class | Rationale |
|-------|-------|-----------|
| Canonical File URL / Storage Key / hash fields | Keep | C-013 path |
| Airtable Attachment | Keep (transient) | Until S3 cutover policy complete |
| Google Drive File URL / ID | Legacy | Bridge — do not delete until verified |
| Ready to Send to Make? | Keep | Upload gate — **not** WAS Send to Make? |
| Send to Make Trigger | Keep | Asset upload trigger |

---

## Achievements / XP

| Field | Class | Rationale |
|-------|-------|-----------|
| XP Bucket Weekly Threshold | Keep (bucket) | Writer missing — Unknown automation |
| XP Events copy (Unlocks) | Candidate for retirement | Text stub |
| Week Summary (Unlocks text) | Hide | Prefer links |
| HOMEWORK_COMPLETION\| Source Keys | Legacy | Cleanup via backfill only |
| ZOOM_RECORDING\| | Legacy / Do not use | Superseded by ZOOM_CREDIT\| |
| 112 VF raw asset key | Do not use | 112 OFF |

---

## Out of scope

| Item | Class |
|------|-------|
| Team Shot Tracker 3/7/10-day inactivity alerts | **Do not use** — not part of Shooting Challenge |
| Athlete-hub model in old `table-map.md` | **Do not use** as SoT — Enrollment hub |

---

## Classification summary counts (this pass)

| Class | Approx count (named fields) |
|-------|-----------------------------|
| Keep | Majority of pipeline fields |
| Hide | ~8 WAS/ops confusion fields |
| Legacy | Drive bridge, old Source Key prefixes |
| Candidate for retirement | ~6 text stubs |
| Do not use | Weekly Summary Key for dedupe; TST alerts; 112 keys |
| Unknown | Weekly Summary Sent At ownership; Threshold XP writer; Email Type |
| Rename later | Typo fields; overlapping email status labels |
