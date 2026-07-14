# Airtable Automation Dependency Map — DEV

**As-of:** 2026-07-14 · Stage S21 · Analysis only  
**Companion:** [INVENTORY](./AIRTABLE-AUTOMATION-INVENTORY.md)

---

## How to read this map

- **Edges** are field writes / formula flags / view entries — Airtable does not hard-chain automations.
- Triggers marked **docs** come from the Automations documentation table (may drift from UI).
- External systems: **Make**, **Lambda**, **S3**, **Fillout**, optional email webhooks.

---

## Folder 01 — Enrollment (deep dive)

```mermaid
flowchart TD
  E[Enrollment created / updated]
  A001[001 Athlete find/create/link]
  A002[002 Grade Band initial]
  A003[003 Grade Band refresh]
  E --> A001
  A001 -->|Athlete linked| A002
  E -->|Grade Band Refresh Needed=1| A003
  A002 --> GB[Enrollment.Grade Band]
  A003 --> GB
  GB --> D030[030 WAS copy]
  GB --> D063[063 HC copy]
  GB --> D111[111 VF copy]
  GB --> D113[113 Video XP band]
  A001 --> D075[075 Welcome build]
  A001 --> D023[023 Submission enrollment]
```

| Dependency | Type | Risk if broken |
|------------|------|----------------|
| 001 → 002 | Soft (Athlete must exist) | 002 throws / skips |
| 002 ↔ 003 | Lifecycle split | Lost grade-change refresh |
| Docs 001/002 conditions | **Suspected swap** vs scripts | Orchestrator premature |

**Orchestrator note:** One enrollment orchestrator is **Combine with conditions** long-term, but **blocked** until Mike verifies live 001/002 views.

---

## Submission intake → assets → XP

```mermaid
flowchart LR
  S[Submissions]
  S --> A023[023 Enrollment]
  S --> A005[005 Week]
  S --> A007[007 Duplicate]
  S --> A006[006 Video count]
  S --> A021[021 Upload status]
  S --> A009[009 Assets]
  S --> A010[010 XP Event]
  A009 --> SA[Submission Assets]
  SA --> A013[013 Video Feedback]
  SA --> A020[020 Homework Completion]
  SA --> A022[022 Writeback sync]
  SA --> A070a[070a Make HW]
  SA --> A070b[070b Make Video]
  SA --> A070c[070c Async verify?]
  A070a --> Make[Make → Lambda → S3]
  A070b --> Make
  Make --> A022
```

| Pair | Relation | Orchestrator? |
|------|----------|---------------|
| 006 + 021 | Same table prep | **Combine safely** |
| 009 → 013 / 020 | Asset fan-out | Keep separate |
| 070a / 070b / 070c / 022 | Upload path | **Needs investigation** — do **not** merge near-term |
| 010 ↔ 041 | XP → level flag | **Keep separate** |

---

## Homework + video XP

```mermaid
flowchart TD
  HC[Homework Completions]
  VF[Video Feedback]
  SA[Submission Assets] --> A020[020 Link/Create HC + GB]
  A020 --> HC
  HC --> A061[061 Mark Reviewed?]
  HC --> A064[064 Base XP]
  HC --> A065[065 XP Event]
  HC --> A078[078 Parent Feedback Ready?]
  HC --> A071[071 Make email]
  A065 -->|sets Parent Feedback Ready| A071
  SA --> A013[013 Create/Link VF + blank-only GB]
  A013 --> VF
  VF --> A113[113 Base XP]
  VF --> A114[114 XP Event]
  VF --> A073[073 Make email]
  SA2[Submission Assets] --> A116[116 Reuse consequences]
```

| Edge | Note |
|------|------|
| 065 → 071 | 065 already arms Parent Feedback Ready — **078 likely redundant** |
| 064 ≠ 065 | Prep vs award — do not merge |
| 113 ≠ 114 | Same |
| **013 ← 111** | Phase C2 IN FLIGHT — GB blank-only repair in 013; retire 111 after post-paste PASS |
| **020 ← 063** | Phase C1 COMPLETE — GB repair in 020; 063 deleted |

---

## Weekly Athlete Summary

| Automation | Depends on | Feeds |
|------------|------------|-------|
| 031 | Counted Submission | WAS create |
| **030** (combined) | Enrollment.Grade Band; then Week+GB | WAS.Grade Band → Goal → Homework |
| 034 | Enrollment + Week | Prior-week helpers |
| 057 → 058 | Perfect Week queue | Unlock → 059 |

**Phase B COMPLETE:** former 032/033 absorbed into **030**; deleted from DEV UI. Keep 031 and 034 separate.

---

## Levels

| Automation | Role | Dependency |
|------------|------|------------|
| 041 | Sets Level Recalc Needed from XP | After XP Events |
| 042 | Assigns Current/Next Level **and Level Gate Rule** | After 041 |
| 043 | Sets Level Gate Rule from Next Level | Fold into **042** only with replacement evidence — **not** because OFF |

---

## Zoom

| Automation | Path | Notes |
|------------|------|-------|
| 101 | Live meeting XP | Keep separate |
| **117** (OFF) | Recording Quiz orchestrator A→F | Present in DEV; blank webhook; trigger not configured |

---

## Email / Make external map

| Cluster | Automations | External |
|---------|-------------|----------|
| Upload | 070a, 070b, (070c) | Make → Lambda → S3 |
| HW email | 071 (+078?) | Make webhook |
| VF email | 073 | Make webhook |
| Weekly | 072 build → 074 send | Make |
| Daily | 076 build → 077 send | Make |
| Welcome | 075 | Package; send may be separate/Make |

**EMC orchestrator:** 071–077 → 2 builders/senders long-term (high regression surface).

---

## Test harness

| Automation | Depends on | Rule |
|------------|------------|------|
| 115 | Testing Scenarios + intake ON | **Never** retire for capacity |

---

## Safe orchestrator groupings (evaluated)

| Group | Verdict | Slots |
|-------|---------|------:|
| Folder 01 enrollment monolith | **Blocked** — trigger investigation first | 0 now |
| 006+021 submission prep | **Safe** — first capacity phase | +1 |
| 030+032+033 WAS bootstrap | **Conditional** — confirm fire order | +2 |
| 063→020 / 111→013 | **Conditional** — create-path audit | +2 |
| 043→042 | Replacement evidence only — **not because OFF** | +1 optional |
| 061 / 078 | **Keep** — required; not deletable for OFF/missing GH | 0 |
| 070a/b/c+022 | Keep separate; OFF intentional; no upload orchestrator | 0 |
| 117 recording | Paste after consolidation frees +1 | −1 net after Phase A |
| 072∪074 (then EMC) | Later consolidation among required email autos | +1 (+more) |

Full migration order: [REFACTOR-PLAN](./AIRTABLE-AUTOMATION-REFACTOR-PLAN.md).
