# Master Update Proposal — Agent 9 (do not auto-edit completion master)

**Target doc (not edited by this agent):** `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`  
**Source package:** `docs/next-wave/automation-ownership/`  
**Date:** 2026-07-24

Lead / Mike may paste or merge the following into the completion master when ready.

---

## Proposed section: Automation ownership & dedupe contract

### Status

| Item | State |
|------|-------|
| Writer inventory | Complete (Agent 9) — `docs/next-wave/automation-ownership/AUTOMATION-WRITER-INVENTORY.md` |
| Single-writer matrix | Complete — `SINGLE-WRITER-OWNERSHIP-MATRIX.md` |
| XP Source Key registry | Complete — `xp-source-key-registry.json` |
| WAS uniqueness (Enrollment+Week) | Contracted — `WAS-UNIQUENESS-CONTRACT.md` |
| Read-only harness | PASS (0 fails, 2 expected warns) |
| Live UI attestation | **OPEN** — Mike packet |

### Hard rules to record in master

1. Scripts write **`Source Key` only**. **`XP Dedupe Key`** / **`XP Dedupe Key Normalized`** are formula-only.  
2. WAS identity = **Enrollment + Week**; never write **`Summary Key`**.  
3. **112** must remain **OFF**; **013** owns Video Feedback create.  
4. Exactly one of **117** / **117c** owns **`ZOOM_CREDIT`** XP.  
5. **063** / **111** remain deleted; Grade Band owned at create by **020** / **013**.  
6. **118/119** schedules **ON** (verified_prod 2026-07-24); paste **118 v1.5** if UI still v1.4; season inputs `dryRun=false` + 118 `sendMode=Live`.  
7. Weekly Threshold XP writer = **missing in repo** until UI hunt closes XP-D1.

### Open decisions for master tracker

| ID | Decision needed |
|----|-----------------|
| OW-D2 | Sole ZOOM_CREDIT writer (117 vs 117c) |
| OW-D4 | 020 vs 067 HC product rule |
| OW-D7 | Threshold XP writer restore vs defer |
| OW-D3 | Keep vs remove 101 WAS side-create |

### Suggested master checklist lines

```
[ ] Mike PROD attestation: 112 OFF; 013 ON; 020 ON; 031 ON
[ ] Mike PROD attestation: 063/111 Deleted; 118/119 ON + season Live inputs; 118 v1.5 pasted
[ ] Mike PROD attestation: exactly one of 117/117c ON for ZOOM_CREDIT
[ ] Mike UI hunt: Weekly Threshold XP writer YES/NO
[ ] Link Agent 9 package as authoritative ownership contract until superseded
```

### Paths to cite from master

- `docs/next-wave/automation-ownership/REPORT.md`  
- `docs/next-wave/automation-ownership/RESULTS.json`  
- `docs/next-wave/automation-ownership/MIKE-ACTIONS.md`  
- `docs/next-wave/automation-ownership/AUTOMATION-ATTESTATION-PACKET.md`  

---

**Note:** Agent 9 intentionally did **not** edit `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`.
