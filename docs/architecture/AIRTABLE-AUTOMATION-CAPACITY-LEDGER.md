# Airtable Automation Capacity Ledger — DEV (corrected)

| Field | Value |
|-------|-------|
| Base | `appTetnuCZlCZdTCT` (DEV) |
| Hard cap | **50** (ON + OFF both consume) |
| Ledger as-of | 2026-07-14 (S21 correction) |
| Stage | Analysis only — **no Airtable mutations** |
| Authority | Mike’s 50-item DEV list = current / required |

---

## Correction (binding)

| Rule | Meaning |
|------|---------|
| **OFF ≠ obsolete** | Intentionally disabled for DEV/safety; remains required |
| **No delete because OFF** | Never recommend deletion from ON/OFF status |
| **Required until replaced** | Keep slot unless **explicit replacement** evidence (code + backlog) |
| **Capacity path** | Safe **consolidation** of required automations |
| **070a–078** | Required handoffs — often OFF by design; reassessed as **Keep / Combine**, not delete |

**Retracted from prior S21 Path B:** retire **061**, **078**, or any automation **because** it is OFF; using OFF email/upload slots as free capacity.

---

## Summary counts

| Milestone | Occupied | Free | How |
|-----------|----------|------|-----|
| Pre–Phase A | **50** | **0** | Mike |
| **After Phase A (COMPLETE)** | **50** | **0** | 006 deleted; 117 OFF created (net zero) |
| **After Phase B (COMPLETE)** | **48 estimated** | **2 estimated** | Combined 030; **032** + **033** deleted. No visible Airtable counter — inventory math |
| **After Phase C1 (COMPLETE)** | **47 estimated** | **3 estimated** | Combined 020; **063** deleted (Mike UI) |
| After Phase C2 (111→013) | **46 estimated** | **4 estimated** | Absorb 111 into 013 |
| After Phase C (full: C1+C2) | **46** | **4** | 063→020 + 111→013 |
| After Phase D (072∪074) | **45** | **5** | **Target met** |
| Stretch Phase E (076∪077 + more EMC) | ≤43 | ≥7 | Later |

| Metric | Value |
|--------|------:|
| Current count (post Phase C1) | **47 estimated / 3 free estimated** (no visible Airtable counter; inventory − 032 − 033 − 063) |
| Proposed target (post Phase A–D) | **45** |
| Phase A slot delta | **0 net** |
| Deletions recommended for OFF status | **0** |

---

## Working 50 (required unless replaced)

Model used when full UI paste not yet filed: S21 reconciliation (docs ± known UI). Treat each as **required**. ON/OFF from Mike’s list when provided — status does not change disposition.

| # | Name (short) | ON/OFF | GH | Replacement evidence? | Rank (corrected) |
|---|--------------|--------|-----|----------------------|------------------|
| 001 | Find or Create Athlete | (Mike list) | Y | — | Needs investigation (trigger docs) |
| 002 | Grade Band — Initial | | Y | — | Combine with conditions (enrollment group later) |
| 003 | Grade Band — If Changes | | Y | — | Keep separate |
| 005 | Assign Week | | Y | — | Keep separate |
| 006 | Set Video Count | — | library | Replaced by **021** (Phase A) | **LIBRARY** — deleted from DEV UI |
| 007 | Duplicate Checker | | Y | — | Keep separate |
| 009 | Create Submission Assets | | Y | — | Keep separate |
| 010 | Create XP Event | | Y | — | Keep separate |
| 013 | Create/Link VF + GB repair | **ON** | Y | Absorbed **111** (C2) | Keep separate (combined) — Phase C2 IN FLIGHT |
| 020 | Link/Create HC + GB repair | **ON** | Y | Absorbed **063** | Keep separate (combined) — Phase C1 COMPLETE |
| 021 | Attachment Status + Video Count | ON | Y | Absorbed **006** | Keep separate (combined) |
| 022 | Sync Child Upload Writeback | | Y | — | Keep separate |
| 023 | Assign Enrollment | | Y | — | Keep separate |
| 030 | Bootstrap GB+Goal+HW | **ON** | Y | Absorbed **032/033** | Keep separate (combined) — Phase B COMPLETE |
| 031 | Find/Create WAS | | Y | — | Keep separate |
| 032 | Link Goal → WAS | — | library | Replaced by **030** | **LIBRARY** — deleted from DEV UI |
| 033 | Assign Homework → WAS | — | library | Replaced by **030** | **LIBRARY** — deleted from DEV UI |
| 034 | Previous Week Helpers | | Y | — | Keep separate |
| 041 | Level Recalc Flag | | Y | — | Keep separate |
| 042 | Assign Current/Next Level | | Y | — | Keep separate |
| 043 | Set Level Gate Rule | | Y | **Yes — 042** (GitHub + V2-014a) | **Combine with conditions into 042** or Mike-approved replacement retire — **never because OFF** |
| 053 | Streak Rebuild | | Y | — | Keep separate |
| 054 | Streak XP | | Y | — | Keep separate |
| 055 | Update Current Streak | | Y | — | Keep separate |
| 056 | Daily Streak Refresh | | Y | — | Keep separate |
| 057 | Perfect Week Eligibility | | Y | — | Keep separate |
| 058 | Perfect Week Unlock | | Y | — | Keep separate |
| 059 | XP from Unlock | | Y | — | Keep separate |
| 061 | Mark HW Reviewed | | N* | **No** explicit replacement | **Keep separate** (required; investigate GH gap) |
| 063 | Copy GB → HC | — | library | Replaced by **020** | **LIBRARY** — deleted from DEV UI |
| 064 | Base Homework XP | | Y | — | Keep separate |
| 065 | Homework XP Event | | Y | — | Keep separate (arms Parent Feedback Ready) |
| 066 | Shot Milestone Unlocks | | Y | — | Keep separate |
| 067 | HW from Reflection Quiz | | Y | — | Keep separate |
| 070a | Send HW → Make | often OFF | Y | — | **Keep separate** — intentional DEV OFF |
| 070b | Send Video → Make | often OFF | Y | — | **Keep separate** — intentional DEV OFF |
| 070c | Verify Async Upload | often OFF | Y | — | **Keep separate** — required async path |
| 071 | HW Feedback Email | often OFF | Y | — | Keep / later EMC combine |
| 072 | Build Weekly Email | | Y | — | **Combine with conditions** → 074 |
| 073 | VF Parent Email | often OFF | Y | — | Keep / later EMC |
| 074 | Send Weekly → Make | often OFF | Y | — | **Combine with conditions** → 072 |
| 075 | Build Welcome Email | | Y | — | Keep / later EMC |
| 076 | Build Daily Email | | Y | — | Combine later → 077 |
| 077 | Send Daily → Make | often OFF | Y | — | Combine later → 076 |
| 078 | Mark Parent Feedback Ready | | N* | **No** (065 sets flag — overlap only) | **Keep separate** until proven merge into 065 |
| 101 | Award Meeting XP | | Y | — | Keep separate |
| 111 | Copy GB → VF | ON until PASS | library | Replaced by **013** | **LIBRARY** after post-paste delete — Phase C2 |
| 113 | Base Video XP | | Y | — | Keep separate |
| 114 | Video XP Event | | Y | — | Keep separate |
| 115 | Test Framework | | Y | — | Keep separate |
| 116 | Asset Reuse Consequences | | Y | Replaced **008** | Keep separate |
| 117 | Zoom Recording Orchestrator | **OFF** | Y | — | Keep separate — DEV pasted v1.0.0; trigger not configured |

\*061/078: docs-table only / no GitHub file — still **required UI slots** until Mike authorizes fold into neighbors with tests; **not** deletable for OFF or missing GH.

**Not in Mike’s 50:** 008 (replaced by 116), 112 (Mike: not in DEV UI). Doc cleanup only.

---

## Safe consolidation groups (capacity math)

| Group | Members | Result shape | Slots freed | Timing / dependency risk | Rollback |
|-------|---------|--------------|------------:|--------------------------|----------|
| **A** | 006 + 021 | One Submissions prep | **+1** | Same table; low; must preserve 009 gate order | Re-split pastes |
| **B** | 030 + 032 + 033 | One WAS bootstrap | **+2** | Order-sensitive after 031 | Re-split three |
| **C** | 063 → into 020 | Drop separate 063 after 020 always writes GB | **+1** | Audit empty-GB HC rows first | Re-enable 063 |
| **D** | 111 → into 013 | Drop separate 111 after 013 always writes GB | **+1** | Audit empty-GB VF rows | Re-enable 111 |
| **E** | 072 + 074 | One weekly email path | **+1** | Make weekly; builders large | Re-split |
| **F** *(later)* | 076 + 077 | One daily email path | **+1** | Make daily | Re-split |
| **G** *(later)* | 071 + 073 + 075 → EMC | Fewer email autos | **+2–3** | C-011 registry; high regression | Per-email restore |
| **H** *(optional)* | 043 → into 042 | One level assigner | **+1** | **Replacement evidence only** (042 docblock + V2-014a) — not OFF | Re-paste 043 |
| **Blocked** | 070a/b/c + 022 | — | **0** | Upload/Make/Lambda order | — |
| **Blocked** | Delete any OFF | — | **0** | Violates Mike rule | — |

Hard **do-not-merge:** 041↔010 · 064↔065 · 113↔114 · 057↔058 · 070a↔070b↔070c↔022

---

## First migration phase (S22 — COMPLETE)

**Phase A COMPLETE 2026-07-14:** combined 021 live; smoke PASS; **006** deleted; **117 v1.0.0** OFF (blank webhook, no trigger yet).

**Phase B COMPLETE 2026-07-14:** combined 030 live; smoke PASS; **032** + **033** deleted; DEV **48 estimated / 2 free** (Airtable exposes **no visible** automations counter — count from inventory).

**Phase C1 COMPLETE 2026-07-14:** combined 020 v3.0.0 live; post-paste smoke PASS; **063** deleted; DEV **47 estimated / 3 free**.

**Phase C2 post-paste PASS 2026-07-14:** combined 013 v3.0.0 live; post-paste smoke PASS; awaiting Mike delete of **111** → **46 estimated / 4 free**. Do **not** start Phase D.

---

## Path to ≥5 free after 117

| Step | Group | Δ | Free after 117 |
|------|-------|--:|---------------:|
| A | 006∪021 then +117 | 0 net | 0 |
| B | WAS 030∪032∪033 | +2 | **2** (COMPLETE) |
| C | 063→020 (C1) | +1 | **3** (COMPLETE) |
| C2 | 111→013 | +1 | 4 |
| D | 111→013 | +1 | 4 |
| E | 072∪074 | +1 | **5** ✓ |

---

## 070a–078 reassessment

| # | Role | Corrected disposition |
|---|------|------------------------|
| 070a | HW → Make/Lambda | Keep — intentional OFF when idle |
| 070b | Video → Make | Keep |
| 070c | Async verify | Keep — required for Accepted path |
| 071 | HW parent email | Keep; EMC later |
| 072 | Weekly build | Combine with 074 (Phase E) |
| 073 | VF parent email | Keep; EMC later |
| 074 | Weekly send | Combine with 072 (Phase E) |
| 075 | Welcome build | Keep; EMC later |
| 076 | Daily build | Combine with 077 later |
| 077 | Daily send | Combine with 076 later |
| 078 | Arm Parent Feedback Ready | Keep until proven redundant with 065 merge |

None of these free slots by remaining OFF.

---

## Related

- [INVENTORY](./AIRTABLE-AUTOMATION-INVENTORY.md) (correction banner)
- [REFACTOR-PLAN](./AIRTABLE-AUTOMATION-REFACTOR-PLAN.md)
- [CORRECTED decision sheet](../deploy-checklists/AIRTABLE-AUTOMATION-ARCHITECTURE-mike-decision-sheet.md)
