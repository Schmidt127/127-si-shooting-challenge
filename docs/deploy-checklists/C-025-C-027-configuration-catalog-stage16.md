# C-025 / C-027 — Configuration catalog (Stage 16)

**Status:** COMPLETE (repo proposal) + **S17 live DEV gap note**  
**Date:** 2026-07-13  
**Owner decisions:** Approved 2026-07-13 (this package)  
**Architecture rule:** Adjustable business values live in Airtable **configuration / rules tables**. Scripts **read active config at runtime**. Reuse existing tables before proposing new ones. **Do not** hardcode tunable percentages, day counts, milestone lists, or notification toggles into automations.

### Live DEV gap (Meta inspect 2026-07-13 overnight S17)

| Location | Finding |
|----------|---------|
| Config | **None** of the C-025/C-027 catalog fields below exist yet (16 unrelated fields only) |
| Zoom Meetings | Policy currently stored as **editable** `Effective Recording *` fields (manual) |
| Zoom Attendance | Lookups of those meeting Effective* fields; credit formulas applied |
| Achievements / Shot Milestones | **No** `Parent Notification Enabled?` yet |

See also: `C-025-config-linkage-design.md`, `C-027-implementation-prep-stage17.md`.

---

## 1. Tables reused (inspect first — do not duplicate)

| Table | Role in C-025 / C-027 | Reuse decision |
|-------|----------------------|----------------|
| **Config** | Global/program season knobs (toggles, days, %, timing, channels) | **Primary home** for Zoom recording policy + MEN delivery settings. Already described as app-wide settings. |
| **XP Reward Rules** | Live Zoom XP amount (`ZOOM_ATTEND_BASE`); recording amount may be derived | Keep live base here. Recording XP = `floor(live * Config.Zoom Recording XP Percent of Live / 100)` unless explicit `ZOOM_ATTEND_RECORDING` row is preferred for display — **percent remains authoritative in Config**. |
| **Achievements** | Streak milestones (`Trigger Type` = Streak Length + `Trigger Threshold`) | Add **`Parent Notification Enabled?`**. Default check 10/20/30/40/50/60 — **not** a hardcoded script list. |
| **Shot Milestones** | Shot milestone catalog | Add **`Parent Notification Enabled?`**. Eligibility from records, not shot totals in code. |
| **Level Gate Rules** | `Minimum Zoom Meetings` | Unchanged amount table; recording gate credit controlled by Config toggle. |
| **Zoom Meetings** | Meeting-level overrides only | Optional override fields for makeup window / deadline mode. |
| **Homework** / Learning Activities path | Zoom Recording Quiz content | Quiz question bank as catalog rows (HW17-style), not Config scalars. |
| **Enrollments** | `Active?`, (future) `Progress Processing Enabled?` | Existing communication eligibility — do not invent parallel eligibility flags for MEN. |

**Do not create:** a second “Settings” table, a parallel XP percent table, or hardcoded milestone arrays in scripts.

---

## 2. Override precedence (global)

When the same setting may exist at multiple levels:

1. **Specific Zoom Meeting override** (if field present and non-blank)
2. **Program / active school-year Config row** (`Config` primary = Active School Year)
3. **Global active Config fallback** (same row when only one active season)
4. **Safe documented default** (below)

Example — makeup days:

Meeting `Makeup Window Days Override` → Config `Zoom Recording Makeup Window Days` → fallback **7**

---

## 3. C-025 configuration fields

### 3.1 Config table (proposed fields on active season row)

| Field | Type | Default | Allowed | Scope | Fallback if empty | Consumer |
|-------|------|---------|---------|-------|-------------------|----------|
| `Zoom Recording XP Percent of Live` | Number (0–100) | **50** | 0–100 integer | Global/program | **50** | Award automation: `floor(liveBase * pct / 100)` |
| `Recording Gives Full Zoom Gate Credit?` | Checkbox | **Checked** | on/off | Global/program | **Checked (true)** | Gate credit / attendance link writer |
| `Zoom Recording Makeup Window Days` | Number | **7** | ≥0 integer | Global/program | **7** | Deadline calculator |
| `Zoom Recording Deadline Mode` | Single select | **Later of Both** | `Days After Recording Available` · `End of Program Week` · `Later of Both` · `Earlier of Both` | Global/program | **Later of Both** | Deadline calculator |
| `Recording Makeup Counts for Perfect Week?` | Checkbox | **Checked** | on/off | Global/program | **Checked** | Perfect Week Zoom satisfaction (**057/058** path) |
| `Recording Quiz Requires Coach Approval?` | Checkbox | **Checked** | on/off | Global/program | **Checked** | Award gate: Satisfactory required when checked |
| `Recording Approval Email Enabled?` | Checkbox | **Checked** | on/off | Global/program | **Unchecked (false)** if missing* | Parent notify dispatcher |
| `Recording Approval Email Timing` | Single select | **On Satisfactory** | `On Satisfactory` only for v1 (expand later) | Global/program | **On Satisfactory** | Dispatcher |
| `Recording Approval Email Template Key` | Single line text | `ZOOM_RECORDING_APPROVED` | Non-empty template key | Global/program | Skip send + log `missing_template_key` | Make/email package |

\*Safe fallback for email: **do not send** if enabled flag cannot be resolved — avoids accidental parent spam. Documented exception vs “checked default” when field exists.

### 3.2 Zoom Meetings (optional overrides)

| Field | Type | Default | Scope | Fallback | Consumer |
|-------|------|---------|-------|----------|----------|
| `Recording Available At` | DateTime | — | Meeting | Required before deadline calc | Deadline calculator |
| `Makeup Window Days Override` | Number | blank | Meeting | Use Config days | Deadline calculator |
| `Deadline Mode Override` | Single select (same options) | blank | Meeting | Use Config mode | Deadline calculator |
| `Recording URL` | URL | — | Meeting | — | Parent/quiz UI |
| `Recording Attendees` | Link → Enrollments | — | Meeting | — | Gate / Perfect Week credit |

### 3.3 XP Reward Rules

| Rule Key | Field | Notes |
|----------|-------|-------|
| `ZOOM_ATTEND_BASE` | `XP Amount` | Live XP — **existing** |
| (optional display) `ZOOM_ATTEND_RECORDING` | `XP Amount` | May mirror computed amount for human readability; **authoritative % remains Config** so season tuning is one field |

### 3.4 Zoom Recording Quiz (proof — not Config scalars)

| Item | Home | Notes |
|------|------|-------|
| Quiz assignment | **Homework** catalog row (or Learning Activity when C-009 lands) | HW17-style short answers |
| Links | Enrollment + Zoom Meeting on completion/response | Required for credit identity |
| Review states | Needs Review → Satisfactory / Resubmit | Coach marks Satisfactory before credit |
| Resubmits | History preserved; credit once | Same Enrollment+Meeting credit identity |
| Sample reusable prompts | Content rows / form questions | “Prove you watched…”, “One coaching point…”, “One thing to use in training…” |

**Not proof:** clicking recording link alone; parent attestation (removed).

### 3.5 Credit / Source Keys (locked identity)

| Concern | Contract |
|---------|----------|
| Identity pair | **Enrollment RID + Zoom Meeting RID** |
| Live XP Source Key | `ZOOM_LIVE\|{meetingId}\|{enrollmentId}` |
| Recording XP Source Key | `ZOOM_RECORDING\|{meetingId}\|{enrollmentId}` |
| Exclusivity | At most one of live/recording active XP for the same pair |
| Migration | Preserve this RID pair identity; treat legacy `ZOOM_ATTEND_BASE\|{Zoom Meeting Key}\|{enrollmentId}` as live family |

No extra recording bonus beyond configured recording XP %.

---

## 4. C-027 configuration fields

### 4.1 Config table

| Field | Type | Default | Allowed | Scope | Fallback if empty | Consumer |
|-------|------|---------|---------|-------|-------------------|----------|
| `Major Event Notify Channel` | Single select | **Email** | `Email` · `SMS` · `Email+SMS` (future) | Global/program | **Email** | MEN dispatcher |
| `Major Event Notify Timing` | Single select | **Immediate** | `Immediate` · `Scheduled Batch` · `Weekly Digest` | Global/program | **Immediate** | MEN dispatcher |
| `Major Event Notify Enabled?` | Checkbox | **Checked** | on/off | Global/program | **Unchecked** (no send) | Master kill switch |
| `Major Event Level Up Enabled?` | Checkbox | **Checked** | on/off | Global/program | **Checked** | Event allowlist |
| `Major Event Shot Milestone Enabled?` | Checkbox | **Checked** | on/off | Global/program | **Checked** | Event allowlist |
| `Major Event Perfect Week Enabled?` | Checkbox | **Checked** | on/off | Global/program | **Checked** | Event allowlist |
| `Major Event Streak Milestone Enabled?` | Checkbox | **Checked** | on/off | Global/program | **Checked** | Event allowlist |

### 4.2 Achievements (streak)

| Field | Type | Default | Scope | Fallback | Consumer |
|-------|------|---------|-------|----------|----------|
| `Parent Notification Enabled?` | Checkbox | Unchecked until seeded | Achievement row | **No notify** | MEN enqueue on streak unlock |
| Existing | `Trigger Type` = Streak Length, `Trigger Threshold` | — | Row | — | Defines 10/20/30/40/50/60 without script lists |

**Seed (DEV OMNI):** check `Parent Notification Enabled?` on streak achievements with thresholds **10, 20, 30, 40, 50, 60**. Leave 3/5/7 unchecked unless owner later enables.

### 4.3 Shot Milestones

| Field | Type | Default | Scope | Fallback | Consumer |
|-------|------|---------|-------|----------|----------|
| `Parent Notification Enabled?` | Checkbox | Unchecked until seeded | Milestone row | **No notify** | MEN enqueue after **066/059** |

### 4.4 Eligibility (existing — reuse)

| Source | Rule |
|--------|------|
| Enrollments.`Active?` | Must be true for parent MEN |
| Schmidt test enrollment ID | Exclude from real-family communications (existing C-010 / Stage 8 pattern) |
| Config `Major Event Notify Enabled?` | Master off → no sends |

**Do not** invent a second opt-in table for v1 (owner: use existing active-enrollment / communication eligibility).

---

## 5. Settings that remain imperfectly configurable (document honestly)

| Setting | Why not fully Config-table driven |
|---------|-----------------------------------|
| Quiz question **wording** | Content lives in Homework / form / Learning Activity rows — correct place, not Config scalars |
| Exact Make scenario webhook URL | Secret / credential — not unattended Config |
| Schmidt enrollment RID | Currently a known ID guard in scripts/tests; optional future Config text field `Excluded Communication Enrollment IDs` — **propose later**, do not block this package |
| Template HTML body | Template Key → Make/content — body not in Airtable Config |

---

## 6. Offline tests covering this catalog

See updated:

- `tools/airtable/tests/test_c025_recording_watch_contract.py`
- `tools/airtable/tests/test_c027_major_event_send_contract.py`
