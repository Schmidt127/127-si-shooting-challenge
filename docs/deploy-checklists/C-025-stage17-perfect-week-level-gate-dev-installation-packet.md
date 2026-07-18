# C-025 — Stage 17 Perfect Week + Level-gate DEV installation packet

**Status:** Repository-ready · **Do not paste until Mike authorizes** · **Do not enable permanently**
**Base:** DEV only `appTetnuCZlCZdTCT`
**PROD:** Forbidden
**Starting commit:** `1c08cfe`
**Companion:** [C-025-stage17-zoom-recording-dev-installation-packet.md](./C-025-stage17-zoom-recording-dev-installation-packet.md)

---

## Hard stops

- No PROD paste.
- Do **not** modify Automation **101**.
- Do **not** enable Automation **117** for this install (leave OFF).
- Do **not** write recording enrollments into `Zoom Meetings → Attendees`.
- Do **not** change Level Gate Rules thresholds or Perfect Week non-Zoom requirements.
- No Make / email / Softr / `noindex` / Bracket App.

---

## 1. Existing downstream architecture (traced)

### Perfect Week (Automation 057)

| Item | Current (pre-1.3) |
|------|-------------------|
| Script | `057-achievements-and-milestones-calculate-perfect-week-eligibility.js` **v1.2** |
| Writes | `Perfect Week Zoom Meeting Count`, `Perfect Week Zoom Attendance Count` on WAS |
| Live source | `Zoom Meetings.Attendees` contains Enrollment for meetings linked to WAS Week |
| Formula | `Perfect Week Zoom Requirement Met?` — if meeting count = 0 → met; else attendance ≥ 1 |
| Unlock | Automation **058** (unchanged) via `PERFECT_WEEK\|…` |

### Level gates (Automation 042)

| Item | Current (pre-3.1) |
|------|-------------------|
| Script | `042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` **v3.0** |
| Reads | `Enrollments.Total Zoom Attendances` (**count** of live `Zoom Meetings` / Attendees inverse) |
| Compares | `Level Gate Rules.Minimum Zoom Meetings` |
| Scope | Enrollment-lifetime (not weekly) |
| Writes | Current/Next Level, Level Gate Rule, Level Status, clears Level Recalc Needed? |

---

## 2. Combined Zoom-credit model

| Source | Eligibility |
|--------|-------------|
| **Live** | Enrollment ∈ `Zoom Meetings.Attendees` (101 path) |
| **Recording** | Zoom Attendance · Method = Recording Quiz · Approved · not Conflict · not Needs Correction · purpose flag |

**Perfect Week recording purpose flag:** `Effective Recording Counts for Perfect Week?`
**Gate recording purpose flag:** `Zoom Gate Credit Earned?`

| Rule | Value |
|------|--------|
| Dedupe key | Enrollment + Zoom Meeting |
| Precedence | Valid **live** wins when both exist for the same meeting |
| Max count per meeting | **1** |
| Attendees write | **Never** for recording |

---

## 3. Schema changes

**None required.** Reuses existing Stage 17 Zoom Attendance fields + live Attendees read.

Optional DEV cleanup (OMNI): clear premature `Gate Credit Applied?` / `Perfect Week Credit Applied?` on fixtures that were set before downstream consumption (orchestrator v1.1.0 mistake). Not a schema change.

---

## 4. Applied? semantics (corrected)

| Flag | Meaning after this package |
|------|----------------------------|
| `Gate Credit Applied?` | **042 counted** this recording credit into the effective Zoom total |
| `Perfect Week Credit Applied?` | **057 counted** this recording credit into WAS Zoom attendance for a week |

| Script | Sets Applied? |
|--------|----------------|
| **117 orchestrator v1.1.1** | **No** — reports `eligible_awaiting_042` / `eligible_awaiting_057` |
| **117d v1.2.0 / 117e v1.2.0** | **No** — observation only |
| **042 v3.1** | **Yes** — when recording meeting is newly counted |
| **057 v1.3** | **Yes** — when recording meeting is newly counted (and not already live) |

---

## 5. Repository scripts to paste (DEV)

| Automation | File | Version | Keep |
|------------|------|---------|------|
| **057** | `057-achievements-and-milestones-calculate-perfect-week-eligibility.js` | **1.3** | Existing trigger/inputs |
| **042** | `042-levels-and-progression-assign-current-and-next-level-with-gate-blocking.js` | **3.1** | Existing trigger/inputs; optional new output `effectiveZoomCountOut` |
| **117** (optional refresh) | `117-zoom-recording-credit-orchestrator.js` | **v1.1.1** | Stay **OFF**; Applied? no longer set here |

Paste from production docblock through end — skip GitHub header.

---

## 6. Controlled DEV tests (after paste)

Use Schmidt / isolated fixtures. Leave **117 OFF**.

### Perfect Week

1. Live only
2. Recording only (approved + PW flag)
3. Live + recording same meeting → count once
4. Conflict recording → does not count
5. Soft-void / unapproved / Needs Correction → does not count
6. Week with no Zoom meeting → unchanged (formula auto-pass)
7. Non-Zoom Perfect Week rules unchanged

### Level gates

1. Live only
2. Recording gate credit only
3. Live + recording same meeting → once
4. Multiple distinct meetings
5. Conflict / Needs Correction / missing approval → excluded
6. Gate min met / not met
7. Current/Next Level + gate-blocked behavior unchanged

### Safety

- Attendees unchanged by recording path
- No new `ZOOM_ATTEND_BASE` XP from these pastes
- Applied? only true after 042/057 count

---

## 7. Rollback

1. Re-paste prior **057 v1.2** and **042 v3.0** from git history if needed.
2. Clear Applied? flags set by the new scripts if desired.
3. Do not touch 101 or Attendees.

---

## 8. Final disabled / safety state

- **117 OFF**
- **101** unchanged
- **057 / 042** may remain ON after DEV verification (existing production pattern) — only after Mike approves DEV paste
- PROD untouched

---

## Status

| State | Value |
|-------|-------|
| Repo implementation | **Yes** (057 v1.3 · 042 v3.1 · 117 v1.1.1 · combined lib/tests) |
| New Airtable fields | **None** |
| Ready for DEV paste | **After Mike review** |
| PROD | **No** |
