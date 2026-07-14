# C-027 — Major-event notifications design (Stage 13)

**Status:** COMPLETE (repo design package)  
**Package:** `C-027-major-event-notifications-design`  
**Stage:** S13  
**Base SHA:** `feb8cee`  
**Date:** 2026-07-13  
**Scope:** Repo design only — **no Airtable / Make / SMS provider changes**

---

## 0. Approved owner rules (locked — do not reopen)

| Rule | Value |
|------|-------|
| Audience (v1) | **Parents** only |
| In-scope events | **Level up** · **Major shot milestone** · **Perfect Week** · **Major streak milestone** |
| Explicitly out | Ordinary daily-submission / daily XP notifications |
| Do not alter | **071** homework feedback emails · video feedback notification flows (**073** and related) |
| Idempotency | Stable send key (C-024 style) — one successful send per event occurrence |

---

## 1. Dependency audit (repo)

| Event | Upstream signal | Notes |
|-------|-----------------|-------|
| Level up | **042** assigns current/next level when gate passes | Notify on successful level change, not on every gate recompute |
| Major shot milestone | **066** unlock → **059** XP | “Major” = catalog rows marked major (config) or milestones at/above an owner threshold (§10) |
| Perfect Week | **058** unlock (then **059** XP) | Notify on unlock success, once |
| Major streak milestone | **054** streak XP / streak occurrence | “Major” = 7/10/20/… config list (§10) |
| Homework feedback | **071** | **UNCHANGED — out of scope** |
| Video feedback | **073** (+ upload chain) | **UNCHANGED — out of scope** |
| Weekly summary | **072** / **074** | Parallel path; do not merge major-event into weekly builder |
| Daily packages | **076** / **077** | Remain non–major-event; no new daily alerts |
| Visibility / progress | C-010 `Active?` + `Progress Processing Enabled?` | Send only when enrollment is Active for parent-facing comms; Schmidt test ID suppressed |

Stage 8 audit reference: `PIPELINE-summary-comms-audit-stage8.md`.

---

## 2. Behavior contract

### 2.1 Send decision (v1)

Send a **parent** major-event notification **iff** all hold:

1. Event type ∈ in-scope set.
2. Enrollment `Active?` = true (parent-visible athlete).
3. Enrollment is **not** the Schmidt test enrollment (use same ID guard as Stage 8 gates).
4. Event occurrence has a stable Send Key and **no** prior successful send for that key.
5. Channel config enabled for that event type (once channel chosen — §10).

`Progress Processing Enabled?` governs whether XP/level pipelines run; if progress is off, upstream events should not fire. Still gate sends on Active + Schmidt for safety.

### 2.2 Non-goals

- No athlete-direct SMS/email in v1 (parents only).
- No “you gained 5 XP today” messages.
- No edits to **071** / video feedback copy or triggers.
- No provider account creation in this package.

### 2.3 Idempotent Send Key (C-024-aligned)

| Event | Send Key |
|-------|----------|
| Level up | `MEN\|LEVEL_UP\|{enrollmentId}\|{levelId}` |
| Major shot milestone | `MEN\|SHOT_MILESTONE\|{enrollmentId}\|{milestoneRuleId}` |
| Perfect Week | `MEN\|PERFECT_WEEK\|{enrollmentId}\|{weekId}` |
| Major streak | `MEN\|STREAK\|{enrollmentId}\|{streakOccurrenceKey}` |

Prefix `MEN` = Major Event Notification. Store on a `Notification Sends` (or equivalent) log row / existing send log if one exists — **proposal only**.

Re-run rule: find-by Send Key → if `status=sent` → skip; if failed → allow retry with same key (do not create second success).

---

## 3. Proposed data model (Airtable — proposal only)

### 3.1 Table: `Notification Sends` (recommended)

| Field | Type | Purpose |
|-------|------|---------|
| `Send Key` | Text | Unique idempotency key |
| `Event Type` | Single select | Level Up / Shot Milestone / Perfect Week / Streak Milestone |
| `Enrollment` | Link | Athlete enrollment |
| `Parent Contact` | Email/Phone | Resolved recipient snapshot |
| `Channel` | Single select | Email / SMS |
| `Status` | Single select | Pending / Sent / Failed / Skipped |
| `Skip Reason` | Text | inactive / schmidt / duplicate / channel_off |
| `Payload JSON` | Long text | Template inputs (no secrets) |
| `Provider Message Id` | Text | External id when available |
| `Sent At` | DateTime | Success timestamp |
| `Source Record` | Text | Upstream record id (level change, unlock, XP) |

### 3.2 Enrollment / Config fields (optional)

| Field | Purpose |
|-------|---------|
| `Major Event Notify Opt-In?` | If owner requires opt-in (§10) |
| Config table rows for templates / major milestone flags | Keep copy out of scripts |

---

## 4. Channel options (design menu — unresolved)

| Option | Pros | Cons |
|--------|------|------|
| **Email via existing Make path** | Fits **074**-family patterns; lowest new infra | Not “immediate SMS” |
| **SMS via new provider** | Matches early owner interest | Credentials, opt-in law, new Make scenario |
| **Email now, SMS later** (recommended default for design) | Ships v1 without credentials | Owner may still want SMS soon |

**Do not guess.** Implementation waits on OD-1…OD-4.

---

## 5. Interaction with existing automations

| Script | C-027 action |
|--------|----------------|
| **042** | Emit/queue level-up event after successful level write (or watch Current Level change) — **separate** notify automation preferred over bloating **042** |
| **066** / **059** | After major milestone XP/unlock succeeds → queue notify |
| **058** | After Perfect Week unlock → queue notify |
| **054** | After major streak XP → queue notify |
| **071** / **073** | **No code changes** |
| **072** / **074** | Do not piggyback weekly email for major events (different cadence/idempotency) |

Recommended shape: thin **queue writer** near each source + one **dispatcher** automation that sends + logs Send Key (mirrors upload verify pattern), GitHub-first.

---

## 6. Parent communication content (bounds)

| Event | Parent message intent (not final copy) |
|-------|----------------------------------------|
| Level up | Congratulations — athlete reached {Level Name} |
| Major shot milestone | Athlete hit {Milestone Public Name} |
| Perfect Week | Athlete earned Perfect Week for {Week Label} |
| Major streak | Athlete reached a {N}-day streak milestone |

Copy authorship → ChatGPT / Mike (Phase 2/4). This package only defines slots + keys.

Suppress public names/XP internals that owner treats as coach-only.

---

## 7. Failure modes

| ID | Scenario | Safe behavior |
|----|----------|---------------|
| N-01 | Duplicate trigger | Skip — Send Key exists sent |
| N-02 | Hidden / inactive enrollment | Skip — `Active?` false |
| N-03 | Schmidt test | Skip — enrollment guard |
| N-04 | Provider failure | Status=Failed; retain payload; allow retry same key |
| N-05 | Daily submission XP | Never enqueue |
| N-06 | Homework/video feedback | Never route through MEN dispatcher |

---

## 8. Offline tests (this stage)

`tools/airtable/tests/test_c027_major_event_send_contract.py` encodes:

- In-scope event allowlist
- Send Key builders
- `should_send_major_event` gates (Active, Schmidt, duplicate, out-of-scope)
- Idempotent sent/failed retry rules

---

## 9. Owner decisions — unresolved operational only

| ID | Question | Suggested default |
|----|----------|-------------------|
| OD-1 | Channel for v1: email, SMS, or email-now-SMS-later? | Email now, SMS later |
| OD-2 | Opt-in required vs Active enrollment implies notify? | Active implies notify for v1; add opt-out later |
| OD-3 | Which shot milestones count as “major”? | Config flag on Shot Milestones; default milestones ≥ 500 or catalog `Major?` |
| OD-4 | Which streak lengths count as “major”? | 7, 10, 20, 30 (match existing streak XP steps) |
| OD-5 | Immediate send vs nightly digest of major events? | Immediate per event (still not daily XP) |

---

## 10. Definition of done (design package)

- [x] Locked rules restated without reopening
- [x] Trigger dependency audit
- [x] Send Key + notification log proposal
- [x] Channel options + non-goals
- [x] Automation interaction map (**071/073** untouched)
- [x] Offline tests
- [x] OD list limited to operational choices

**Next:** owner OD answers → implementation package (DEV fields + dispatcher) — not unattended.
