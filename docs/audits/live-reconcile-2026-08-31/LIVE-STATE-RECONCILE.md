# Live Production reconcile — 2026-08-31

**Base:** `appn84sqPw03zEbTT` (`127SI - SHOOTING CHALLENGE GAME - NEW 5_1_2026`)  
**Method:** Airtable Meta API + Records API (Automations table Name / Status / Automation Code)  
**Schema snapshot:** `airtable/schema/snapshots/prod-20260831/`  
**Machine-readable:** [`live-state.json`](./live-state.json) · [`automation-version-table.md`](./automation-version-table.md)

---

## Schema (live)

| Metric | Value |
|--------|-------|
| Tables | 35 |
| Fields | **1367** |
| `ZZZ DELETE — *` fields | **0** (quarantine UI delete **COMPLETE**) |
| Former quarantine IDs (`fldHchlovIaPlGKLk`, `fldTzIGODB2e03rvE`, `fldltgFPGVXHwRj4X`, `fldBFDl629arXFcnp`, `fldkIzG5emvUBQ0Tw`) | **Absent** |

**FUT-002 status:** Quarantine phase **COMPLETE**. Broader unused-field purge remains **optional future** work — no pending Mike UI deletes.

**Enrollments welcome fields (live):** `Welcome Email To` only — six legacy welcome-email writer fields **absent** (FUT-WELCOME-LEGACY complete).

---

## Challenge calendar (live)

| Check | Result |
|-------|--------|
| `Weeks` rows | **11** (Early Bird + Weeks 1–9 + Post-Challenge) |
| WSTEST / PWTEST week labels | **0** (already archived / absent) |
| Active `Program Homework Assignments` | **18** (2026–2027 season) |

---

## Automations table (live)

**Rows:** 49 · **Authority columns:** Name · Status · Automation Code only

### Verified Live — version-aligned with operator baseline

| # | Prod (Code header) | GitHub | Notes |
|---|-------------------|--------|-------|
| **010** | v10.12 | v10.12 | Do not re-paste |
| **020** | v3.8 | v3.8 | FUT-001 |
| **022** | v2.2 | v2.2 | Lambda-only parent URLs |
| **057** | 2.2 | 2.2 | Automations **Code text** still contains typo `Perfect Week Video MInimum` in comment — **optional tracker refresh only**; do **not** repaste for typo |
| **058** | 1.5 | 1.5 | |
| **059** | v3.7 | v3.7 | |
| **065** | **v10.5** | v10.4 | **Production ahead of GitHub** — sync GitHub header on next 065 edit; do **not** re-paste |
| **066** | v3.9 | v3.9 | |
| **072** | v4.8 | v4.8 | |
| **073** | v4.4 | v4.4 | |
| **101** | **v6.6** | v6.6 | Prior docs citing v6.7 were **stale** |
| **117** | v2.1 | v2.1 | Hub handoff only |

Full table: [`automation-version-table.md`](./automation-version-table.md)

### Absent (expected)

| # | Status |
|---|--------|
| **043** | Not in Automations table — retired |
| **075** | Not in Automations table — retired (welcome path **078A → Queue → 079**) |
| **077** | Not in Automations table — deleted |

---

## Paste queue

**Empty.** Do not re-paste 010 / 020 / 022 / 057 / 058 / 059 / 065 / 072 / 073.

---

## Mike actions remaining (ordered)

1. **Optional:** Refresh Automations **Code** column text for **057** (comment typo only — not a functional paste).
2. **Optional:** Sync GitHub **065** SCRIPT header to **v10.5** to match Production (Cursor — not a paste).
3. **FUT-003:** Activate Make Stripe writeback when registration opens (scenario **inactive**).
4. **FUT-010:** No action — last dry-run **0 eligible**.
5. **FUT-026:** Player Manual — publish last before launch.
6. **SC-147:** Recorded Zoom half-XP — automation slot + rule row when ready.
7. **SC-SEASON-SIM-001:** **FUTURE** — do not start full simulation yet.

**Removed from queue (were stale in docs):**

- ~~Delete 5 `ZZZ DELETE` fields~~ — **done**
- ~~Archive WSTEST/PWTEST Weeks~~ — **0 test weeks in base**
- ~~Repaste 057 for CONFIG field name~~ — not required; optional Code comment refresh only
