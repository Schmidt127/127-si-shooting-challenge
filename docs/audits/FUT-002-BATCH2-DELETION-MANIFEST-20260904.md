# FUT-002 Batch 2 — Deletion Manifest (2026-09-04)

**Status: MANIFEST READY / DO NOT DELETE**  
**Phase gate:** Blocked until coordinator signals Phase 1 complete (**SF-07**, **SF-08**, **FUT-001**).  
**As of this pass:** FUT-001 = COMPLETE; SF-07 / SF-08 = unfinished P2 → **no field deletes performed**.

**Agent:** A6  
**Base:** `appn84sqPw03zEbTT`  
**Live evidence:** Airtable MCP 2026-09-04 — **35** tables / **1378** fields  
**Rollback/export ref:** `docs/audits/FUT-002-BATCH2-DEPENDENCY-MAP-20260904.md` · snapshot `airtable/schema/snapshots/prod-20260831-fut002-batch1/` · post-delete export TBD when authorized  

## Independent self-review legend

| Verdict | Meaning |
|---------|---------|
| **APPROVED-FOR-DELETE** | Text stub; empty; no formula/link/automation/web/interface runtime dep; within Batch 2 quarantine scope |
| **RETAIN** | Hard stop, real link, required config, or unresolved |
| **ALREADY-GONE** | Not present live; no action |

---

## Manifest rows

| # | Table | Field | Field ID | Type | Live? | Non-empty rows | Deps checked | Reason | Self-review |
|---|-------|-------|----------|------|-------|----------------|--------------|--------|-------------|
| 1 | Athlete Achievement Unlocks (`tblyT2AQo1JbvmvZS`) | XP Events copy | `fldWnU9gJCsTmTLpK` | singleLineText | Yes | **0** | Formulas/lookups/rollups: none · Automations/web/tools IDs: none · Interfaces: none · Make active maps: none · Docs/inventory only | Unused text stub next to real XP workflows | **APPROVED-FOR-DELETE** (gate blocked) |
| 2 | Shot Milestones (`tbl5C4TsQpOigIyRz`) | XP Events copy | `fldVcHPjvuabirn6E` | singleLineText | Yes | **0** | Same as above; real link `XP Events` `fldmmFEzJt3kmEDh4` **RETAIN** | Unused text stub; not the XP link | **APPROVED-FOR-DELETE** (gate blocked) |
| 3 | Video Feedback (`tblOV6pJDxQFBSQ3q`) | DELETE MAYBE - XP Events copy | `fldTJd1LkzRRmBiAZ` | singleLineText (historical) | **No** | n/a | Real link `XP Events` `fldkTbQ1yyK0qOyLp` remains · Make blueprint schema dumps still mention ID (legacy, non-runtime) | Already removed before this pass | **ALREADY-GONE** |
| 4 | Weeks (`tblcsKugv1cla36A6`) | Video Feedback | `fld8tdkjgyYmrs4Eq` | singleLineText | Yes | **0** | Field ID unused in automations/web · Name greps hit VF **table** only · Weeks real links (Submissions / XP Events / HC) **RETAIN** · Not calendar Start/End/Week Key | Calendar table text stub; do not confuse with VF table | **APPROVED-FOR-DELETE** (gate blocked) |
| 5 | Weeks (`tblcsKugv1cla36A6`) | Submission Assets | `fldo906P9t7nj9xmn` | singleLineText | Yes | **0** | Same pattern as #4; name greps hit SA **table** | Calendar table text stub | **APPROVED-FOR-DELETE** (gate blocked) |

### Explicit RETAIN (out of Batch 2 delete set)

| Table | Field | Field ID | Verdict | Reason |
|-------|-------|----------|---------|--------|
| Config | Root Google Drive Folder ID | `fldvG7kDIreffetRt` | **RETAIN** | Hard stop — Drive root |
| Config | Root Google Drive Folder Link | `fldwRqavjwXbCHzar` | **RETAIN** | Hard stop — Drive root |
| Weeks | XP Events (link) | `fldchUzF9JSCQzxai` | **RETAIN** | Real link / calendar |
| Weeks | Homework Completions (link) | `fldBCFzjforqsWunR` | **RETAIN** | Real link |
| Weeks | Submissions (link) | `fld8hxWh7fATBLghL` | **RETAIN** | Real link |
| Video Feedback | XP Events (link) | `fldkTbQ1yyK0qOyLp` | **RETAIN** | Real link |
| Shot Milestones | XP Events (link) | `fldmmFEzJt3kmEDh4` | **RETAIN** | Real link |
| Inventory `unknown` (279) | various | various | **RETAIN / unresolved** | OMNI review first |

---

## When Phase-1-complete signal arrives (operator steps — not executed now)

1. Re-confirm four APPROVED field IDs still present and empty.
2. Rename to quarantine names per `docs/deploy-checklists/FUT-002-batch2-quarantined-field-delete.md` (skip row #3).
3. Mike UI trash only (Meta API DELETE unsupported).
4. Export schema; expect live field count **−4** from 1378 baseline (→ ~1374), assuming no concurrent schema changes.
5. Update FUT-002 Master Future Work List row + CHANGELOG.

**Expected delete set when authorized:** rows **1, 2, 4, 5** only.

---

## Self-review attestation

- Did not approve deletes solely because fields are blank (also verified type, IDs, deps, interfaces, dual naming collisions on Weeks).
- Did not approve any linked-record field for deletion.
- Confirmed VF text stub already gone; did not invent a replacement delete.
- Stopped before any rename/delete due to Phase 1 gate (SF-07 / SF-08 unfinished).

**Gate status for coordinator:** **MANIFEST READY / DO NOT DELETE**
