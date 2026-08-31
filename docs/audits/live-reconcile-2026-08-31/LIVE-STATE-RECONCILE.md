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
| **057** | 2.2 | 2.2 | Automations Code tracker refreshed **2026-08-31** (`Perfect Week Video Minimum`); **verify Automation UI** matches GitHub |
| **058** | 1.5 | 1.5 | |
| **059** | v3.7 | v3.7 | |
| **065** | **v10.5** | **v10.5** | GitHub + Automations Code synced **2026-08-31**; do not re-paste |
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

1. **Verify Automation 057 UI script** matches GitHub (Automations table Code refreshed 2026-08-31).
2. **FUT-003:** Activate Make Stripe writeback when registration opens (scenario **inactive**).
3. **FUT-026:** Player Manual — publish last before launch.
4. **SC-147:** Recorded Zoom half-XP — automation slot + rule row when ready.
5. **SC-SEASON-SIM-001:** **FUTURE** — do not start full simulation yet.

**Completed this session (2026-08-31):**

- GitHub **065 v10.5** synced (`assertOwned` no longer fails on points mismatch during reconcile)
- Automations table **Code** refreshed for **057** and **065** — evidence: [`automations-code-patch-results.json`](./automations-code-patch-results.json)

**Removed from queue (were stale in docs):**

- ~~Delete 5 `ZZZ DELETE` fields~~ — **done**
- ~~Archive WSTEST/PWTEST Weeks~~ — **0 test weeks in base**
- ~~Repaste / tracker refresh 057 CONFIG typo~~ — Automations Code **done**; UI verify only
- ~~Sync GitHub 065 to v10.5~~ — **done**
