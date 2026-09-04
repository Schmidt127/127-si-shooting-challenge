# SC-160 — Asset Intake Decouple (2026-09-04)

**Agent:** A2 — Asset Intake Decoupling  
**Branch:** `sc160/a2-asset-intake-decouple`  
**Baseline:** `origin/master` @ `95e83bf2e691cc589a3cfc836a37727ad9af4107`  
**Worktree:** isolated (`WORKTREE_ID=sc160-a2-4e9268c7`)

## Task Classification

| Field | Value |
|-------|--------|
| Type | Airtable automation + formula reliability |
| Priority | P0 (attachments present / assets missing) |
| Difficulty | Medium |
| Owner | Cursor Agent 2 |
| Dependencies | Live Submissions formulas + Automation 009 |
| Backlog ID | **SC-160** |
| Estimated Scope | 009 script + Ready/Why Not Ready formulas + tests + deploy checklist |
| Phase | 3 Implementation |
| Correct tool | Cursor (+ Airtable MCP live-read; Mike paste for prod publish) |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Paste 009 v1.3 then formulas; verify reported submission |

## Policy (Mike)

Asset intake is **always** allowed. Week-dependent scoring is evaluated separately. Create Submission Assets immediately for HW1 / HW2 / each video regardless of `Submission.Week`.

## Live verification (Production `appn84sqPw03zEbTT`)

### Submissions formulas (MCP `get_table_schema` 2026-09-04)

| Field | ID | Live behavior (pre-change) |
|-------|-----|----------------------------|
| Ready for 009 Asset Creation? | `fld31w9XjMW5DbBpk` | Requires Enrollment **and Week** + no assets + ≥1 attachment |
| Why Not Ready for 009? | `fld7PEP0RfvxBJ5sx` | Returns **`Missing Week`** before READY when Week empty |

Week field: `fldA3fpXWckngZ6g1`. Enrollment: `fld0fKiO62UiztNQH`.

### Automation 009 (MCP `get_automation`)

| Item | Value |
|------|--------|
| Automation ID | `wflGKNw4e06hCHyv9` |
| Name | 009 - Submission Intake and Asset Creation - Create Submission Assets from Submission |
| Status | Deployed |
| Trigger | `recordMatchesConditions`: Ready=`1` AND Activity Date Is Future?=`0` |
| Live script | **v1.2** — throws if Week link count ≠ 1 |

### Root cause

Two independent Week gates:

1. **Formula gate** — Ready stays `0` / Why Not Ready = `Missing Week` → 009 never triggers.
2. **Script gate** — even on manual run, v1.2 fails closed without exactly one Week.

Neither gate is required for provenance asset creation (Enrollment + attachments + slot authorization suffice). Week is not written onto Submission Assets by 009.

## Repo changes (this PR)

| Path | Change |
|------|--------|
| `airtable/automations/shooting-challenge/009-submission-intake-create-submission-assets.js` | **v1.3** — Week optional; multi-Week still fail closed; week-hold note on parent |
| `tests/homework/automation-009-sc160-asset-intake-decouple.test.js` | Offline contract + Ready formula helper |
| `docs/deploy-checklists/SC-160-009-asset-intake-decouple.md` | Rollback + new formulas + paste order |
| Master list / CURRENT-TRUTH / CHANGELOG / automation-index | SC-160 tracking |

### Preserved behavior

- Exactly one Enrollment required
- One SA per attachment (HW1, HW2, each video) when slot authorized
- Homework Name 1/2 exactly-one gate for HW slots; VIDEO ungated
- Source Attachment ID dedupe + compatible restoration
- Safe retry / needs-review on ambiguous matches
- Submission, Enrollment, attachment, filename, purpose/type, slot, source attachment ID, processing status retained

### Visible Week hold (v1.3)

When Week is missing and assets are created/repaired/skipped without needs-review:

- Parent `Attachment Upload Error` = `009: Week not linked — assets created; week-dependent scoring on hold`
- Outputs: `weekLinkedOut=false`, `weekHoldOut=true`

## Rollback formulas

Exported verbatim from live Production before change — see deploy checklist.

## Production publish status

| Step | Status |
|------|--------|
| GitHub 009 v1.3 | This PR |
| Airtable 009 script paste / Update | **Pending Mike** (do not agent-paste) |
| Formula update (Ready / Why Not Ready) | **Pending Mike** after 009 publish |
| Live proof on reported submission | Agent 4 / Mike — **read-only evidence first**; do not delete |

## Explicit non-goals

- Season Simulation — not run
- FUT-002 trash — not touched
- Automations 057 / 058 / 059 — not modified
- Week assignment (005) / Perfect Week scoring — unchanged owners

## Offline tests

```bash
node --test tests/homework/automation-009-sc160-asset-intake-decouple.test.js
```

## Reconciliation note (attachments present / assets missing)

When Enrollment + attachments exist and assets are empty, SC-160 Ready formulas must evaluate to READY even if Week is blank. Pre-fix Production evidence shows Why Not Ready = `Missing Week` for that shape (foundation-reset fixture pattern). After paste, that class of submissions should enter 009 and create one SA per authorized attachment.

Reported Mike test submission: treat as **read-only evidence**; redact record IDs in public notes.

## Closeout checklist

- [x] Live-read formulas + 009 trigger/script
- [x] Export rollback formulas
- [x] 009 script Week decoupling (v1.3)
- [x] Offline contract tests
- [x] Deploy checklist with paste order
- [x] Master list + CURRENT-TRUTH + CHANGELOG entries
- [ ] Mike paste 009 v1.3
- [ ] Mike paste formulas
- [ ] Live verification (Agent 4)
