# C-025 — DEV OMNI runbook (Stage 12 + S16)

**Status:** Proposal only — **DEV only** · no PROD · no Cursor Airtable writes  
**Prerequisite:** Owner decisions approved (S16). Catalog: [C-025-C-027-configuration-catalog-stage16.md](./C-025-C-027-configuration-catalog-stage16.md)

---

## Hard stops

- No PROD.
- No hardcoded 50 / 7 / Perfect Week truth in formulas or scripts when Config fields exist.
- Do not create a second settings table — extend **Config**.
- Do not invent parent-attestation fields (quiz path only).

---

## Phase 0 — Inspect existing tables (read-only)

1. **Config** — list current fields; confirm Active School Year row.
2. **XP Reward Rules** — confirm `ZOOM_ATTEND_BASE` amount.
3. **Zoom Meetings** — recording URL / attendees fields present?
4. **Homework** — suitable quiz catalog pattern (HW17-like).
5. **Achievements / Shot Milestones** — note only (C-027).
6. Report findings before creating anything.

---

## Phase 1 — Create only missing fields

### Config (global/program)

Create fields from catalog §3.1 with documented defaults.

### Zoom Meetings

Create override + availability fields from catalog §3.2 if missing.

### Homework / Completions

Create or link Zoom Recording Quiz assignment; ensure Enrollment + Zoom Meeting links on submission path.

### XP Reward Rules

Confirm live base row; optional recording display row — **percent still authoritative in Config**.

### Enrollment attendance

Update `Total Zoom Attendances` only after gate-credit design reviewed (union of live + recording attendees when Config gate credit on).

---

## Phase 2 — Automations (GitHub → DEV paste later)

1. Award on Satisfactory (honor Config toggles).
2. Deadline helper uses Config days/mode + meeting overrides.
3. Parent email only after Satisfactory when enabled.
4. Dual-detect legacy live Source Keys.
5. Unit/offline contracts must stay green.

---

## Phase 3 — Acceptance

| # | Scenario | Expect |
|---|----------|--------|
| 1 | pct Config = 40, live = 40 | Recording XP = 16 |
| 2 | Makeup days Config = 10 | Deadline shifts +10 from available |
| 3 | Perfect Week Config off | Recording does not satisfy PW Zoom |
| 4 | Approval email Config off | No parent package |
| 5 | Live already awarded | Recording skipped |
| 6 | Quiz submit only | No XP until Satisfactory |
| 7 | Missing Config pct | Fallback 50 |

---

## Rollback

Disable recording award automation; leave Config values; do not delete historical XP.
