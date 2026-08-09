# Homework Library Architecture — PROD Execution Checklist

Date: 2026-08-09  
Base: PROD `appn84sqPw03zEbTT`  
Controlling doc: `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` — **update only after live proof**

---

## Architecture rules (post-migration)

- **Homework Library** = reusable content identity (`tblUuxwYlX4EQ9MKE`)
- **Program Homework Assignments** = sole current scheduling authority (`tblhA3maf7xOa8EUS`)
- **No** full-season PHA seed; **JIT assignment only**
- **No** code derives schedule from Homework Library.`Week`
- **PHA table is currently empty** — old PHA IDs and 90-row seed are obsolete

---

## Airtable rename / change order

| Step | Action | Notes |
|------|--------|-------|
| A1 | Rename table `FBC Curriculum - SYNC` → **`Homework Library`** | Table ID `tblUuxwYlX4EQ9MKE` unchanged |
| A2 | Update linked field labels pointing to old name | PHA, Submissions, HC, interfaces |
| A3 | Paste GitHub automations (see B) | Uses new table name in `base.getTable()` |
| A4 | Create JIT PHA proof rows (see C) | Fresh record IDs expected |
| A5 | Update Fillout choice filters | Only current PHA-assigned library RIDs |
| A6 | Refactor `Assignment Full Name - Display` | Content-only formula — see field matrix |
| A7 | Delete obsolete library schedule fields | After proof — see field matrix deletion order |
| A8 | Deploy web (`master` → Vercel) | `homework-queries.ts` uses Homework Library name |

---

## B — Automation paste order

| Order | Script | Version | Why this order |
|-------|--------|---------|----------------|
| 1 | `005` | **v5.0** | Stops library Week driving Submission.Week |
| 2 | `033` | **v4.0** | PHA-only WAS homework assign |
| 3 | `067` | **v3.0** | HW17 Week from PHA |
| 4 | `068` | v1.1 | Table rename only (logic unchanged) |
| 5 | `020` | **v3.3.0** | Already strict — verify not downgraded |
| 6 | `072` / `076` | current | Table alias rename |

**Do not weaken 020.**

---

## C — Controlled JIT PHA proof (create manually in PROD)

Create **two** active PHA rows (fresh IDs):

| Field | HW1 row | HW2 row |
|-------|---------|---------|
| Homework Assignment | `rechVLOeyEVIqmy2v` | `rec6WmXjpLtIWDERo` |
| Program Instance | `rec5mEM0YPqPqq0hZ` | same |
| Week | `recWeVrSabnsYaHc2` | same |
| Grade Band | `reclWDQZzKbVBtdhG` | same |
| Homework Slot | `HW1` | `HW2` |
| Active? | ✓ | ✓ |

Verify `Schedule Key` formula populates:
`PI|Week|GB|Slot|LibraryRID`

---

## D — Regression test procedure (operator)

### D1 — Repo offline tests (before paste)

```bash
node --test tools/testing/tests/test_homework_architecture_offline.mjs
node --test tools/testing/tests/test_005_023_chain_offline.mjs
node --test tests/homework-contracts/067-summary-link.test.js
node --test tests/homework-contracts/068-summary-reconciliation.test.js
cd web && npm test -- homework-queries.test.ts
```

### D2 — 005 proof

1. Submission with Enrollment `recCyFEPeATOVNlr9`, Activity Date in Early Bird week range.
2. Homework Name 1 = `rechVLOeyEVIqmy2v`.
3. Run 005 → Week = `recWeVrSabnsYaHc2` from Activity Date (not `recnMGC2JBHjO0ay6` legacy library week).
4. PHA validation passes for HW1.

### D3 — 020 proof

1. Complete intake chain (009 → 020) for same submission.
2. Expect success with PHA link on Homework Completion.
3. Wrong-week PHA or missing PHA → **fail closed** (expected).

### D4 — 033 proof

1. Weekly Athlete Summary with Week + Grade Band matching PHA.
2. Run 033 → Homework links = both library RIDs from PHA only.

### D5 — Public site

1. `/shoot` homework catalog shows only PHA-scheduled items.
2. Unassigned library content does not appear.

### D6 — Fillout

1. Participant choices limited to current PHA assignments.
2. Stored values remain library RIDs.

---

## E — Historical data (explicit non-goals)

- **Do not** restore 90-row PHA season seed
- **Do not** preserve 2025–2026 library Week links for scheduling
- **Do not** reference old PHA IDs (`reca5GM1JkROhXOiy`, `reccQhrgOK8e8Yngv`) as current
- PWTEST / legacy week RIDs (`reci5GdxEC57vfoS3`, `recnMGC2JBHjO0ay6`) must not affect current Submission Week

---

## F — Promotion closeout (after proof)

1. Update `CHANGELOG.md` under `### Airtable`
2. Update `docs/automation-index.md` versions
3. Update `docs/data-flow/homework-flow.md`
4. **Then** update `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`
5. Mark `PROGRAM-HOMEWORK-ASSIGNMENTS-2026-2027-RESTORATION.md` superseded (JIT policy doc)

---

## G — Rollback notes

If 020 fails after 005 paste:

1. **Do not** weaken 020 — fix Week/PHA alignment instead.
2. Verify JIT PHA rows match Submission Week + Grade Band + library RID + slot.
3. Re-run extension audit: `airtable/extension-scripts/audits/audit-curriculum-pha-cross-year-integrity.js`
