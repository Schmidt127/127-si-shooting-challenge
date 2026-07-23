# Active? Processing Audit

**SC item:** SC-068  
**Constraint:** Document and test the guard contract only. **Do not edit** consuming automation scripts in this package.  
**Helpers:** `tools/enrollment-season/active_guard_contract.py`  
**Fixtures:** `tests/fixtures/enrollment-season/active-guard-consumers.json`

---

## Foundation Reset direction (authoritative for this package)

| Rule | Value |
|------|-------|
| Schmidt Enrollment | `recgP9qZYjAhE7NXm` |
| Schmidt `Active?` | **true** |
| Public visibility | **Remain visible** in standings/public displays |
| New exclusion rule | **Do not create** |
| Historical C-019 Active?=false / hard-exclude | Superseded for standings visibility; email hard-exclude remains a **repo conflict** to resolve in email-owner package |

---

## Two-field model (C-010 evidence)

| Field | Controls |
|-------|----------|
| `Active?` | Web visibility + comms (weekly/daily) in C-010 design |
| `Progress Processing Enabled?` (PPE) | XP / streaks / WAS progress — **may be missing** in PROD; missing ⇒ treat as enabled |

---

## Consumer matrix (repository evidence)

| Consumer | Expected when Active | Expected when Inactive | Risk if guard missing | Evidence | Recommended owner agent |
|----------|----------------------|------------------------|-----------------------|----------|-------------------------|
| 023 | Auto-link Submission→Enrollment | Do not auto-link inactive | Wrong enrollment linkage | 023 docblock; C-010 | submission-intake |
| 010 | Award submission XP (PPE path) | Skip when PPE false | Withdrawn athletes earn XP | C-010; coverage gaps | xp-pipeline |
| 031 | Create/link WAS | Skip when PPE false | WAS for withdrawn | C-010 gaps | weekly-summary |
| 053 | Streak rebuild | Skip when PPE false | Streaks continue | C-010 | xp-pipeline |
| 056 | Refresh streaks | Skip inactive | Stale streak refresh | 056 Active? | xp-pipeline |
| 065 | Homework XP | Skip; leave Pending | HW XP leakage | C-010 | homework |
| 066 | Milestone unlocks | `skipped_inactive` | Milestone leakage | 066 | achievements |
| 072 | Build weekly email | `skipped_inactive` | Emails to inactive; **Schmidt hard-exclude conflict** | 072 v3.8; engine contracts | email-comms |
| 076 | Daily email package | Historical gap | Daily emails to inactive | C-010 gaps | email-comms |
| 101 | Zoom XP | Skip inactive attendees | Zoom XP leakage | 101 | zoom |
| 114 | Video XP | `skipped_inactive` | Video XP leakage | 114 | video |
| 118 | Ensure WAS for Active cohort | Exclude inactive + Schmidt ID | Mass WAS; Schmidt excluded from auto-build | 118 | weekly-summary |
| 119 | Arm Send to Make? | Exclude inactive + Schmidt ID | Mass email arming | 119 | email-comms |
| web-leaderboard | Include Active enrollments | Hide when Active?=false fallback | Public standings pollution | field ownership matrix | website |

**Known gaps (engine coverage list):** `010`, `031`, `053`, `065`, `076` — progress/comms hardening incomplete relative to C-010 packet.

---

## Guard gaps summary

1. PPE field may not exist → progress guards no-op (enabled fallback).  
2. Several XP/WAS scripts historically lack Active?/PPE early skip.  
3. **072 / 118 / 119 hard-exclude Schmidt ID** even when Active?=true — conflicts with Foundation Reset email-testing desire and Agent 7 “no exclusion rule” standings direction. Document only; email-owner agent must reconcile.  
4. Website fallback `AND({Active?}, …)` means Schmidt **will appear** while Active?=true — **intended** under current Agent 7 / Mike direction (remain visible).

---

## Schmidt must remain Active and publicly visible

Do not propose view filters or code exclusions that hide Schmidt from standings in this package. Status proposal: keep SC-004 processing truth (`Active?=true`) and treat standings visibility as **allowed**.
