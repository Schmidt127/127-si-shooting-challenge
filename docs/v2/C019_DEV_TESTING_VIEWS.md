# C-019 — DEV Testing Views Specification

**Status:** Specification for Mike/OMNI UI work — views are **UI-only** (API cannot create or read filters)  
**Base:** DEV `appTetnuCZlCZdTCT`  
**PROD:** Optional later mirror — not part of this packet  
**Backlog:** C-019 · Wave 6 · Pairs with **C-020** (Automation 115)  
**Authority:** Completed Airtable readiness audit · [C-019-airtable-ui-work-order.md](../deploy-checklists/C-019-airtable-ui-work-order.md) · [C-019-testing-views-verification-checklist.md](../deploy-checklists/C-019-testing-views-verification-checklist.md)

---

## 0. Locked Schmidt reference

| Item | Value |
|------|--------|
| Enrollment label | `Schmidt, Testing - 2025-2026` (may show as Testing Schmidt) |
| Enrollment record ID | `recgP9qZYjAhE7NXm` |
| Athlete record ID | `recgqVstObQRzgXJF` |
| `Active?` | **false** (standings/audits only) |
| `Progress Processing Enabled?` | **true** (when C-010 field exists) |
| Test flags on pipeline rows | **None** — filter by Enrollment link only |

---

## 1. Global view rules

| Rule | Requirement |
|------|-------------|
| View name | `Testing` (exact) |
| Filter logic | Single condition (AND group with one clause) |
| Operator | `is` / `=` |
| Value | Schmidt enrollment above |
| Forbidden | `Is Test Record?`, `Active?`, `Test Status`, any test checkbox |
| Avoid unless documented | Date ranges, upload/XP/completion status, week filters |
| Why no Active? filter | Schmidt is intentionally inactive; rows must still appear |

Sorting / grouping defaults below keep coach-style scanning without hiding rows.

---

## 2. Required views (exact)

### 2.1 Submissions

| Item | Spec |
|------|------|
| **Table** | Submissions |
| **View name** | `Testing` |
| **Filters** | `Enrollment` **is** `Schmidt, Testing - 2025-2026` |
| **Sorting** | `Activity Date` descending (then `Created` desc if needed) |
| **Grouping** | None |
| **Purpose** | See all C-020 / manual intake submissions for Schmidt without leaderboard noise |
| **Related test IDs** | C-020 Test A (Daily), B (Homework), D (Video); C010-T1–T3; C009-T1–T4; V2 matrix B/C/D |

---

### 2.2 Submission Assets

| Item | Spec |
|------|------|
| **Table** | Submission Assets |
| **View name** | `Testing` |
| **Filters** | `Enrollment - Linked` **is** `Schmidt, Testing - 2025-2026` (**not** `Enrollment`) |
| **Sorting** | `Created` descending |
| **Grouping** | Optional: `Asset Purpose` (document if used) |
| **Purpose** | Multi-file video/homework asset parity; C-009 HW17 PDF assets; upload ladder |
| **Related test IDs** | C-020 Test B/D; C009-T2–T5; C-013 DEV smoke; V2 matrix G |

---

### 2.3 Homework Completions

| Item | Spec |
|------|------|
| **Table** | Homework Completions |
| **View name** | `Testing` |
| **Filters** | `Enrollment` **is** `Schmidt, Testing - 2025-2026` |
| **Sorting** | `Submission Date` descending (or Created desc) |
| **Grouping** | None (optional `Completion Status` — document if used) |
| **Purpose** | HW review / Fillout HW17 / Zoom recording quiz (C-025) completions |
| **Related test IDs** | C-020 Test B; C009-T1–T7; C010-T4; C-025 117a/b; V2 matrix C6 |

---

### 2.4 Video Feedback

| Item | Spec |
|------|------|
| **Table** | Video Feedback |
| **View name** | `Testing` |
| **Filters** | `Enrollment` **is** `Schmidt, Testing - 2025-2026` |
| **Sorting** | Created descending |
| **Grouping** | None |
| **Purpose** | Confirm **013** (not 112) creates VF rows for video assets |
| **Related test IDs** | C-020 Test D; V2 matrix D1/G; [AUTOMATION_112_OFF_STATE_VERIFICATION.md](./AUTOMATION_112_OFF_STATE_VERIFICATION.md) |

---

### 2.5 XP Events

| Item | Spec |
|------|------|
| **Table** | XP Events |
| **View name** | `Testing` |
| **Filters** | `Enrollment` **is** `Schmidt, Testing - 2025-2026` |
| **Sorting** | `Activity Date` descending (or Created desc) |
| **Grouping** | Optional: `XP Source` |
| **Purpose** | Idempotency checks (Source Keys) across 010/065/054/059/114/101/117a |
| **Related test IDs** | C010-T1/T4/T6; C009-T7; V2 matrix F/G/L2; C-025 recording XP |

---

### 2.6 Weekly Athlete Summary

| Item | Spec |
|------|------|
| **Table** | Weekly Athlete Summary |
| **View name** | `Testing` |
| **Filters** | `Enrollment` **is** `Schmidt, Testing - 2025-2026` |
| **Sorting** | Week Start Date descending (or Week link order) |
| **Grouping** | None |
| **Purpose** | 031 WAS create; C-011 email build/send suppression for Schmidt |
| **Related test IDs** | C010-T2/T5; C011-T3; V2 matrix weekly path |

---

### 2.7 Streak Occurrences

| Item | Spec |
|------|------|
| **Table** | Streak Occurrences |
| **View name** | `Testing` |
| **Filters** | `Enrollment` **is** `Schmidt, Testing - 2025-2026` |
| **Sorting** | Created descending |
| **Grouping** | Optional: Achievement |
| **Purpose** | 053 rebuild visibility while Active?=false |
| **Related test IDs** | C010-T3; V2 matrix streaks |

---

### 2.8 Athlete Achievement Unlocks

| Item | Spec |
|------|------|
| **Table** | Athlete Achievement Unlocks |
| **View name** | `Testing` |
| **Filters** | `Enrollment` **is** `Schmidt, Testing - 2025-2026` |
| **Sorting** | Created descending |
| **Grouping** | Optional: `XP Award Status` |
| **Purpose** | 058/066 unlocks → **059** XP; verify Pending→Awarded without Ready-formula trap |
| **Related test IDs** | V2 matrix F4/G5/L2; [AUTOMATION_059_TRIGGER_RESOLUTION.md](./AUTOMATION_059_TRIGGER_RESOLUTION.md) |
| **Note** | View may already exist (`viwhHkNyEPe21oMbI` from 2026-07-07 probe) — **verify filter in UI** |

---

## 3. Recommended extra DEV views (optional, named distinctly)

Not required for C-019 core eight, but useful for install packages:

| View name | Table | Filters | Purpose | Related |
|-----------|-------|---------|---------|---------|
| `C-009 HW17 Quiz Queue` | Final Reflection Quiz Submissions | Enrollment is Schmidt | Quiz intake | C009-T* |
| `C-011 Weekly Email Queue` | Weekly Athlete Summary | Enrollment is Active? true · Sent? unchecked · Ready? (ops) | Ops — **not** Schmidt Testing | C011-T* |
| `059 - Pending Unlock XP` | Athlete Achievement Unlocks | XP Award Status = Pending · Shot Milestone not empty | 059 soak | 059 packet |

Do **not** name these `Testing` unless they follow §1 rules.

---

## 4. Click path (Mike / OMNI)

1. Open DEV base `appTetnuCZlCZdTCT`.  
2. Open table → **+** → Grid → name `Testing`.  
3. Filter → one enrollment condition per §2.  
4. Apply sorting per §2.  
5. Remove forbidden filters.  
6. Record footer count in verification checklist.  
7. Re-run name probe only (optional):

```bash
python tools/airtable/_probe_c019_testing_views.py
```

Probe confirms **view name existence only** — not filter correctness.

---

## 5. Sign-off

| Field | Value |
|-------|--------|
| Verifier | |
| Date | |
| Base | DEV `appTetnuCZlCZdTCT` |
| All 8 `Testing` views exist | ☐ |
| Filters verified in UI (not API) | ☐ |
| Forbidden filters absent | ☐ |
| Post C-020 smoke counts recorded | ☐ |

---

## 6. Uncertainties

| Item | Status |
|------|--------|
| Live filter definitions | **Not readable via API** — UI only |
| DEV field label drift vs `Enrollment - Linked` | **UNKNOWN** if renamed — use Enrollments link field |
| Additional DEV test enrollments beyond Schmidt | Document IDs when OMNI exports (G3) |

---

## 7. Mike approvals / actions

1. Create/verify all eight `Testing` views in DEV UI.  
2. Sign verification checklist.  
3. Optionally export additional test enrollment IDs for multi-athlete sandbox.  
4. Do not filter Testing views by `Active?`.

---

## 8. Related

- Work order: [C-019-airtable-ui-work-order.md](../deploy-checklists/C-019-airtable-ui-work-order.md)  
- Checklist: [C-019-testing-views-verification-checklist.md](../deploy-checklists/C-019-testing-views-verification-checklist.md)  
- Architecture: [testing-and-intake-architecture.md](../testing-and-intake-architecture.md)  
- Offline contract: `tools/airtable/tests/test_c019_testing_views_contract.py`
