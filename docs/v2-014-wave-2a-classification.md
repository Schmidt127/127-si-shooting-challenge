# V2-014 Wave 2A — Complete Automation Classification

**Status:** **Complete** (GitHub inventory — OMNI trigger confirm pending)  
**Date:** 2026-07-05  
**Sprint:** Phase 2A Engineering Sprint — Cursor Mission 1–3  
**Parent:** [v2-014-automation-modernization-roadmap.md](./v2-014-automation-modernization-roadmap.md)

**Rules tonight:** Classification only — **no rewrites, no production pastes, no merges executed.**

Complexity Score method: [v2/06-automation-standards.md](./v2/06-automation-standards.md). Scores below are **GitHub static analysis** (2026-07-05); refine per-script during OMNI trigger confirm.

---

## Summary dashboard

| Metric | Value |
|--------|------:|
| GitHub production scripts | **46** (`001`–`114`, excl. **012**) |
| Classified Category A–F | **46 / 46** |
| Complexity scored | **46 / 46** |
| V2 standard | **1** (**066**) |
| Partial standard | **28** |
| Legacy standard | **17** |
| Category A (leave alone / keep running) | **17** |
| Category B (V2 rewrite when scheduled) | **12** |
| Category C (merge candidate) | **7** |
| Category C/E (email → EMC) | **7** |
| Category E (Make upload handoff) | **2** |
| Category F (retire) | **3** (**012** done, **112**, **043**) |

### Complexity tier distribution

| Tier | Count | Scripts (high attention) |
|------|------:|--------------------------|
| Simple | 18 | **041**, **006**, **021**, **063**, **111** |
| Medium | 24 | **010**, **072**, **076**, **071**, **001**, **002** |
| Complex | 3 | **066**, **101**, **022** (borderline) |
| Critical | 1 | **072** at 2430 lines — treat as Critical for test rigor regardless of score |

---

## Category key (quick reference)

| Cat | Action |
|-----|--------|
| **A** | Production — leave alone (may still be Partial/Legacy format) |
| **B** | Production — V2 rewrite when scheduled |
| **C** | Merge candidate — four-axis pass required |
| **E** | Make / webhook handoff (upload engine) |
| **F** | Retire |

Email builders/senders (**071–077**) are tagged **C/E** — merge to EMC (Category C design) with Make send (Category E).

---

## Master classification table (all 46)

| # | Std | Lines | Cx | Tier | Cat | Pri | Merge / retire | Production risk | Modernization note |
|---|-----|------:|---:|------|-----|-----|----------------|-----------------|-------------------|
| 001 | Partial | 808 | 10 | Medium | B | P2 | — | Med | Enrollment intake — rewrite with 002/003 |
| 002 | Partial | 808 | 9 | Medium | B | P2 | — | Med | Grade band initial |
| 003 | Partial | 682 | 4 | Simple | B | P3 | — | Med | Grade band on change |
| 005 | Partial | 698 | 5 | Simple | B | P2 | — | Med | Week assign — C-018 calendar |
| 006 | Partial | 389 | 3 | Simple | C | P1 | **→ 021** | Low | Merge if single submission prep pass |
| 007 | Partial | 507 | 4 | Simple | B | P2 | — | Med | Duplicate checker — keep |
| 009 | Legacy | 462 | 5 | Simple | B | P1 | — | **High** | Asset creation — C-013 S3 |
| 010 | Partial | 1379 | 13 | Medium | B | P1 | **Do not merge 041** | **High** | Core XP — reference patterns |
| 013 | Partial | 626 | 7 | Medium | **A** | P0 | **111 → 013** | **High** | Production VF path — keep |
| 020 | Partial | 873 | 11 | Medium | **A** | P1 | **063 → 020** | **High** | HW link/create — keep |
| 021 | Legacy | 314 | 3 | Simple | C | P1 | **006 + 021** | Low | Merge candidate |
| 022 | Partial | 760 | 8 | Medium | **A** | P1 | — | **High** | Upload writeback — keep |
| 023 | Partial | 590 | 4 | Simple | B | P2 | — | Med | Enrollment assign |
| 030 | Partial | 509 | 4 | Simple | C | P2 | **030+032+033** | Low | WAS bootstrap group |
| 031 | Partial | 899 | 11 | Medium | **A** | P1 | — | **High** | WAS from submission — keep |
| 032 | Partial | 622 | 4 | Simple | C | P2 | **030+032+033** | Low | WAS bootstrap group |
| 033 | Partial | 679 | 4 | Simple | C | P2 | **030+032+033** | Med | WAS homework assign |
| 034 | Partial | 807 | 9 | Medium | B | P2 | — | Med | Week helpers — date patterns |
| 041 | Partial | 207 | 2 | Simple | **A** | P2 | **Never → 010** | Med | Simple flag — leave alone |
| 042 | Partial | 715 | 10 | Medium | **A** | P1 | **043 supersedes** | **High** | Level assign — keep |
| 043 | Partial | 517 | 4 | Simple | **F** | P0 | Retire | Low | **042** owns gate rule |
| 053 | Partial | 1017 | 11 | Medium | B | P2 | — | High | Streak rebuild |
| 054 | Partial | 905 | 13 | Medium | **A** | P2 | — | High | Streak XP — keep |
| 055 | Partial | 529 | 5 | Simple | **A** | P2 | — | Med | Streak recalc — keep |
| 056 | Partial | 506 | 5 | Simple | **A** | P2 | — | Med | Daily refresh — keep |
| 057 | Legacy | 627 | 8 | Medium | **A** | P2 | **Do not merge 058** | Med | Perfect week eligibility |
| 058 | Legacy | 358 | 5 | Simple | **A** | P2 | **Do not merge 057** | Med | Perfect week unlock |
| 059 | Partial | 1475 | 13 | Medium | **A** | P1 | — | **High** | Achievement XP — keep |
| 063 | Legacy | 298 | 2 | Simple | C | P2 | **→ 020** | Low | Grade band copy |
| 064 | Partial | 653 | 6 | Simple | **A** | P1 | **Do not merge 065** | High | HW XP prep |
| 065 | Partial | 1129 | 11 | Medium | **A** | P1 | **Do not merge 064** | **High** | HW XP create — keep |
| 066 | **V2** | 1113 | 16 | Complex | **A** | P0 | — | **High** | Reference — DEV test then prod |
| 067 | Partial | 541 | 7 | Medium | B | P2 | — | Med | HW17 quiz — C-009 |
| 070a | Partial | 682 | 6 | Simple | **E** | P1 | — | **High** | HW upload Make — keep |
| 070b | Partial | 682 | 6 | Simple | **E** | P1 | — | **High** | Video upload Make — keep |
| 071 | Partial | 1321 | 13 | Medium | C/E | P1 | **→ EMC** | Med | Email — merge later |
| 072 | Partial | 2430 | 14 | Medium | C/E | P1 | **→ EMC builder** | Med | Largest builder — complexity hotspot |
| 073 | Legacy | 791 | 12 | Medium | C/E | P2 | **→ EMC** | Med | Video feedback email |
| 074 | Legacy | 518 | 6 | Simple | C/E | P1 | **→ EMC sender** | Med | Weekly send webhook |
| 075 | Legacy | 1184 | 11 | Medium | C/E | P3 | **→ EMC** | Low | Welcome email |
| 076 | Partial | 1801 | 13 | Medium | C/E | P1 | **→ EMC builder** | Med | Daily builder |
| 077 | Partial | 632 | 6 | Simple | C/E | P1 | **→ EMC sender** | Med | Daily send webhook |
| 101 | Partial | 1651 | 15 | Complex | B | P2 | — | High | Zoom XP |
| 111 | Legacy | 240 | 2 | Simple | C | P2 | **→ 013** | Low | Grade band copy |
| 112 | Legacy | 467 | 4 | Simple | **F** | P0 | Retire | Low | **OFF — monitor** |
| 113 | Partial | 618 | 4 | Simple | **A** | P1 | **Do not merge 114** | High | Video XP prep |
| 114 | Partial | 1652 | 11 | Medium | **A** | P1 | **Do not merge 113** | **High** | Video XP — reference |

**Retired (not in table):** **012** deleted (F, done).

---

## Simplification recommendations (Mission 3)

Priority order follows **complexity reduction**, not slot recovery.

### P0 — Approved retirements (Mike 2026-07-05)

| Automation | Action | When |
|------------|--------|------|
| **112** | **Delete** | Next approved production maintenance window |
| **043** | **Retire** | Same — **042** is canonical |

### P1 — Merge when four-axis passes (do not execute tonight)

| Merge | Condition | Risk if wrong |
|-------|-----------|---------------|
| **006 + 021** | Same trigger timing on Submissions | Double-fire or missed status |
| **030 + 032 + 033** | WAS bootstrap atomic | Partial WAS rows |
| **063 → 020**, **111 → 013** | Copy at create time | Orphan children if create fails |
| **071–077 → EMC** | Schema + Email Key registry (C-011) | Email regression |

### P2 — Do not merge (documented)

| Pair | Reason |
|------|--------|
| **041 ↔ 010** | Formula/timing separation |
| **064 ↔ 065** | Prep vs award XP |
| **113 ↔ 114** | Prep vs award video XP |
| **057 ↔ 058** | Eligibility vs unlock |

### Extension-script candidates (Category D behavior — keep as automations unless bulk)

| Script | Why flagged | Verdict |
|--------|-------------|---------|
| **053** | Heavy rebuild | Keep automation — triggered by submission path |
| **072**, **076** | Very large builders | **EMC** first; consider builder split doc-only |
| Audits (existing) | Already Category D in extension-scripts | No change |

### Duplicate paths (confirmed)

| Keep | Retire / merge |
|------|----------------|
| **013** | **112** (F) |
| **042** | **043** (F) |

### Make vs Airtable boundary

| Keep in Airtable | Keep in Make |
|------------------|--------------|
| Business logic, XP, idempotency, record creates | Gmail send, file upload to S3/Drive, webhook orchestration |
| **070a/b** trigger + payload build | Upload engine scenarios |
| **071–077** package build (until EMC) | Actual email delivery |

### Unnecessary complexity hotspots

| Area | Issue | Recommendation |
|------|-------|----------------|
| Email cluster **071–077** | 7 automations, duplicated HTML patterns | EMC wave 2d–2g |
| **072** + **076** size | 2400+ / 1800+ lines | V2 rewrite only in dedicated wave; full audit + DEV test |
| Legacy intake **005**, **009**, **023** | No full schema validation | Category B when C-018/C-013 touched |
| Inactive enrollment skips **056**, **066**, **101** | C-019/C-020 test friction | Document; optional narrow Active? semantics later — **not tonight** |

---

## OMNI follow-up (Mike)

Complete [OMNI verification checklist](./v2-014-automation-modernization-roadmap.md#omni-verification-checklist-wave-2a--mike) — confirm live triggers match this table.

---

## Revision log

| Date | Notes |
|------|-------|
| 2026-07-05 | Wave 2A GitHub classification complete — 46/46 Cat + Cx; OMNI confirm pending |
