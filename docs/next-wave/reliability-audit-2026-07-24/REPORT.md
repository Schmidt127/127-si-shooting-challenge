# Shooting Challenge — Automation Reliability + Data Model Audit

**Agents:** 1 (automation logic) + 2 (data model / field cleanup)  
**Date:** 2026-07-24  
**Repo tip at audit start:** `a8f3b00` (after `adfabc5` weekly-email architecture + sendMode Live doc)  
**Scope:** Shooting Challenge only — **not** Team Shot Tracker; **no** 3/7/10-day inactivity alerts  
**Evidence classes:** `verified_prod` · `repo_evidence` · `inferred` · `unverified`

> Canonical indexes are **not** replaced here.  
> Automation index: [`docs/automation-index.md`](../../automation-index.md)  
> Source keys: [`../automation-ownership/xp-source-key-registry.json`](../automation-ownership/xp-source-key-registry.json)  
> Single-writer matrix: [`../automation-ownership/SINGLE-WRITER-OWNERSHIP-MATRIX.md`](../automation-ownership/SINGLE-WRITER-OWNERSHIP-MATRIX.md)  
> Weekly email architecture: [`../was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md`](../was-email/WAS-WEEKLY-EMAIL-ARCHITECTURE.md)  
> PROD schema snapshot: [`../../foundation-reset/PROD-SCHEMA-EXPORT-2026-07-23.md`](../../foundation-reset/PROD-SCHEMA-EXPORT-2026-07-23.md)

---

## Executive summary

The weekly email path **`118 → 072 → 119 → 074 → Make Bulk Email May 18 → Gmail → Make writeback`** is **verified production** (`verified_prod`, 2026-07-24), including the correction that **074 must not stay forced to `sendMode=Test`**. Repository docs already record that correction (`a8f3b00`).

Highest remaining reliability risks are **version attestation gaps** (Automations table vs repo), **legacy dual writers still listed Live in the 2026-07-23 operator inventory** (063/111/112 conflict with 2026-07-24 attestations), **117 XOR 117c**, **WAS create races (031/101/118)**, and **missing Weekly Threshold XP writer**.

Known prompt numbers that are **not current** for Shooting Challenge:

| Prompt number | Status | Current SoT |
|---------------|--------|-------------|
| 012 | Retired / deleted | **020** HC create (`repo_evidence` + automation-index) |
| 051 / 052 | Not in repo | Streak path is **053 → 054** (+ 055/056) |
| 075 as Zoom XP | Wrong | **075** = Welcome Email; Zoom live XP = **101**; recording = **117/117c** |

---

## 1. Automation inventory (Agent 1)

Full trigger/status rows: [`../../foundation-reset/PROD-AUTOMATION-VERSION-INVENTORY-2026-07-23.md`](../../foundation-reset/PROD-AUTOMATION-VERSION-INVENTORY-2026-07-23.md) + [`../../automation-index.md`](../../automation-index.md).

### 1.1 Trust bands

| Band | Meaning | Members (primary) |
|------|---------|-------------------|
| **A — Trustworthy (verified_prod or strong recent proof)** | Live path proven or recently pasted | **072 v4.0**, **074 v2.1** (+ Live sendMode), **118 v1.5 / 119 v1.4** (**schedules ON** Sun 5:00 / 10:00 AM Denver — see `STALE-CLAIM-CORRECTION.md`), Make Bulk Email May 18 Live writeback, **070b/070c**, **117** Stage 17, **066 v3.3** / **054 v5.6** |
| **B — Likely Live, version unproven** | Operator table Live; script body not API-readable | 001–010, 020–034, 041–043, 053–059, 064–065, 071, 073, 075–077, 101, 113–114 |
| **C — Conflict / dual evidence** | Docs disagree | **063/111** (index: deleted 2026-07-24; inventory 2026-07-23: Live); **112** (must OFF vs inventory Live); **020** repo v3.0.0 vs inventory v2.3 |
| **D — OFF / not inventoried / testing** | Keep OFF or confirm UI | **112** must OFF; **115** not in Automations table; **116/070c/117/117f/118/119** omitted from 2026-07-23 operator table |
| **E — Redundant / retire candidates** | Do not delete yet | **043**, **063**, **111**, **112**, modular **117a–e** when **117** owns path, **008** already removed |

### 1.2 Weekly email ownership (verified_prod)

| Step | Owner | Writes | Must not |
|------|-------|--------|----------|
| 118 | Schedule Sun 5:00 AM Denver | Ensure WAS; arm `Build Weekly Email Now?` | Build HTML; `fetch` Make |
| 072 | WAS `Build Weekly Email Now?` | Package fields; Ready?; empty-week policy | Call Make |
| 119 | Schedule Sun 10:00 AM Denver | Arm `Send to Make?` only | Webhook / Gmail |
| 074 | WAS Ready + Send to Make? | POST webhook; clear `Send to Make?` on success | Final Sent? / Make Send Status / timestamp |
| Make Live | Bulk Email May 18 | Sent?, Make Send Status=Sent, timestamp | — |

**Production correction:** Fixed 074 `sendMode=Test` blocked Live writeback. After **Live**, email + Sent? + status + timestamp **PASS**.

### 1.3 Reference verification

| Area | Current automation |
|------|--------------------|
| Submission Base XP | **010** (`SUBMISSION_XP\|`) |
| Homework completion | **020** (not 012) |
| Homework XP | **064** → **065** |
| Zoom attendance XP | **101** |
| Zoom recording XP | **117** XOR **117c** |
| Video feedback prep | **013** (not 112; 111 retired) |
| Streak | **053 → 054** (not 051/052) |
| Shot milestones | **066 → 059** |
| Perfect Week | **057 → 058 → 059** |
| Levels | **041 → 042** (+ legacy **043**) |
| Weekly email | **118/072/119/074** |
| Welcome email | **075** (not Zoom) |

---

## 2–6. Audits (summaries)

Detailed matrices: [`INPUT-VARIABLE-AUDIT.md`](./INPUT-VARIABLE-AUDIT.md), [`DEDUPLICATION-AUDIT.md`](./DEDUPLICATION-AUDIT.md), [`FIELD-OWNERSHIP-AUDIT.md`](./FIELD-OWNERSHIP-AUDIT.md), [`CLEANUP-AND-MIGRATION-PLAN.md`](./CLEANUP-AND-MIGRATION-PLAN.md), [`MIKE-ACTIONS.md`](./MIKE-ACTIONS.md).

**Top timing risks:** 118/119 Live schedules; 059 Ready-formula trigger; 074 defaulting to test when blank; WAS race 031/101/118; Denver week boundaries.

**Top dedupe risks:** 117+117c both ON; legacy `HOMEWORK_COMPLETION\|`; 112 ON; WAS race; Weekly Threshold missing writer.

**Status ownership:** Make Live owns `Weekly Email Sent?` / `Make Send Status` / sent timestamp; 074 must not clear Sent?.

---

## 7. Data model (Agent 2)

PROD export lists ~30 tables including Enrollments, Weeks, Config, Submissions, Submission Assets, Homework Completions, XP Events, Athlete Achievement Unlocks, Streak Occurrences, Weekly Athlete Summary, Zoom Meetings, Video Feedback, XP Reward Rules, Level Gate Rules, Testing Scenarios (post-export).

Hand maps in `airtable/schema/current/` rewritten to Enrollment/WAS model (were stale Athlete-centric stubs).

Week pattern: `2026-2027|Week 0` … Week 9 + Post-Challenge (Config-linked).

No deletes/renames authorized. Cleanup classes Keep / Legacy / Do not use / Unknown in migration plan.

---

## 8. Ranked repair list

| Pri | Item |
|-----|------|
| **P0** | ~~Keep 118/119 OFF~~ **SUPERSEDED** — schedules **ON** (verified_prod); see `STALE-CLAIM-CORRECTION.md` |
| **P0** | Confirm 074 UI sendMode still **Live** (never fixed Test) — already verified; do not revert |
| **P1** | Attest 112 OFF; 063/111 deleted/OFF |
| **P1** | Attest versions 020 v3.0.0, 054 v5.6, 066 v3.3, 072 v4.0, 074 v2.1, 118/119 v1.4 |
| **P1** | 117 XOR 117c; 059 Created trigger |
| **P1** | Monitor WAS uniqueness |
| **P2** | Weekly Threshold XP decision; 043 retirement; 075 webhook naming |
| **P3** | Re-export Automations table including 115–119 |

---

## 9. Production changes by this agent

**None.** Repo documentation + tests only.

## Related

- [`RESULTS.json`](./RESULTS.json)
