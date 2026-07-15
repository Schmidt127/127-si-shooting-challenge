# C-025 — Zoom recording credit design (Stage 12 + S16 amendment)

**Status:** Owner decisions **APPROVED** (2026-07-13) · configuration-driven  
**Packages:** `C-025-zoom-recording-design` + `c025-c027-owner-config-decisions`  
**Scope:** Repo design only — **no Airtable changes from Cursor**  
**Canonical config catalog:** [C-025-C-027-configuration-catalog-stage16.md](./C-025-C-027-configuration-catalog-stage16.md)

---

## 0. Approved owner rules (locked)

| # | Rule | Configurable? |
|---|------|---------------|
| 1 | Proof = **Zoom Recording Quiz** (HW17-style short answers). Coach marks **Satisfactory** before credit. No parent attestation. Link click ≠ proof. | Quiz content in Homework/LA catalog; `Recording Quiz Requires Coach Approval?` in **Config** (default checked) |
| 2 | Recording XP = **% of live Zoom XP** (default **50%**) | **Config** `Zoom Recording XP Percent of Live` — **never hardcode 50 in automation** |
| 3 | Recording gives **full Zoom level-gate credit** (default on) | **Config** `Recording Gives Full Zoom Gate Credit?` |
| 4 | Cannot receive live + recording credit for same meeting | Stable identity: **Enrollment RID + Zoom Meeting RID**; Source Keys `ZOOM_LIVE|…` / `ZOOM_RECORDING|…` |
| 5 | Makeup window default **7 days** after recording available; mode default **Later of Both** | **Config** days + deadline mode; meeting overrides allowed |
| 6 | Recording counts for Perfect Week Zoom requirement (default on) | **Config** `Recording Makeup Counts for Perfect Week?` |
| 7 | Coach approval required before XP/gate (default on) | **Config** `Recording Quiz Requires Coach Approval?` |
| 8 | Parent email **only after Satisfactory** (not on submit) | **Config** email enabled / timing / template key |
| 9 | No extra recording bonus beyond configured % | Policy — scripts must not invent bonuses |
| 10 | Migration preserves stable Zoom credit key identity | Dual-detect legacy `ZOOM_ATTEND_BASE` as live |

---

## 1. Happy path (approved)

1. Meeting completes; live attendees get live path via **101**.
2. Recording published (`Recording Available At` / URL set).
3. Athlete submits **Zoom Recording Quiz** linked to Enrollment + Zoom Meeting (Needs Review).
4. Coach marks **Satisfactory** (required when Config approval checkbox is on).
5. Automation reads **Config** + live `ZOOM_ATTEND_BASE` amount → awards recording XP at configured %.
6. If gate credit enabled → link onto `Recording Attendees` / attendance union.
7. If Perfect Week toggle on → recording satisfies that week’s Zoom requirement the same way live does.
8. If approval email enabled → send parent package **after** Satisfactory only.

---

## 2. Deadline calculation (config-driven)

Inputs:

- `availableAt` = meeting `Recording Available At`
- `weekEnd` = linked Week end date (America/Denver)
- `days` = meeting override → Config `Zoom Recording Makeup Window Days` → **7**
- `mode` = meeting override → Config `Zoom Recording Deadline Mode` → **Later of Both**

```text
daysDeadline = availableAt + days calendar days
weekDeadline = weekEnd

switch mode:
  Days After Recording Available → daysDeadline
  End of Program Week → weekDeadline
  Later of Both → max(daysDeadline, weekDeadline)
  Earlier of Both → min(daysDeadline, weekDeadline)
```

Submissions after deadline: reject / skip credit.

---

## 3. XP calculation (config-driven)

```text
pct = Config.Zoom Recording XP Percent of Live ?? 50
live = XP Reward Rules[ZOOM_ATTEND_BASE].XP Amount
recordingXp = floor(live * pct / 100)
```

No recording-specific bonus XP.

---

## 4. Exclusivity / migration

Identity pair: `(enrollmentId, meetingId)`.

Before award: skip if live or recording already active for pair (incl. legacy live keys mapped by Zoom Meeting Key).

Migration: keep Source Key shapes and RID pairing; do not invent a new key scheme mid-season without dual-read.

---

## 5. Parent communication (C-025 recording approval)

| Trigger | Send? |
|---------|-------|
| Quiz submitted (Needs Review) | **No** |
| Coach Satisfactory + Config email enabled | **Yes** (template key) |
| Config email disabled / missing | **No** |

Does not alter **071** / video feedback.

---

## 6. Implementation next (Airtable — not this commit)

See [C-025-dev-omni-runbook-stage12.md](./C-025-dev-omni-runbook-stage12.md) (S16-updated). Package: `C-025-dev-omni-implementation` → **BLOCKED_AIRTABLE**.
