# Promotion steps — [Backlog ID] [Short name]

**Status:** Draft | Ready for Mike review | Promoted to Production  
**Backlog:** [e.g. C-012, H-002, V2-015]  
**DEV base:** `appTetnuCZlCZdTCT`  
**Production base:** `appn84sqPw03zEbTT` — **do not execute until Mike approves**

**Rule:** DEV changes are not official until this document exists in GitHub. See [v2/04 § Official promotion documentation](../v2/04-ai-development-standards.md#official-promotion-documentation-required).

---

## What changed in DEV

Brief summary of the experiment (tables, automations, views, Make, web, etc.).

| Artifact | DEV location / name | Notes |
|----------|---------------------|-------|
| | | |

---

## DEV test evidence

What was run in DEV and what passed.

| Test | Result | Date |
|------|--------|------|
| Audit dry-run (extension name) | Pass / Fail | |
| Sandbox record (enrollment ID or description) | Pass / Fail | |
| Automation run (automation #) | Pass / Fail | |

---

## Schema snapshot (if schema changed)

```powershell
cd tools/airtable
# DEV export
python export_airtable_schema.py -v --out-dir ../../airtable/schema/snapshots/dev-YYYYMMDD
# PROD export (before promote, for diff)
python export_airtable_schema.py -v --out-dir ../../airtable/schema/snapshots/prod-YYYYMMDD
```

Snapshot paths committed (if applicable):

- DEV: `airtable/schema/snapshots/dev-YYYYMMDD/`
- PROD (pre-promote): `airtable/schema/snapshots/prod-YYYYMMDD/`

---

## Production promotion steps

Execute **in order**. Do not skip steps.

### 1. Schema (if applicable)

| # | Action | Table | Field / object | Exact spec (type, options, formula text) | Done |
|---|--------|-------|----------------|------------------------------------------|------|
| 1 | Create field | | | | [ ] |
| 2 | Create formula | | | | [ ] |
| 3 | Create view | | | | [ ] |

**Order:** plain fields → link fields → rollups/lookups → formulas → views → interfaces.

### 2. Automations (if applicable)

| # | Action | Automation | GitHub script | Paste lines | Done |
|---|--------|------------|---------------|-------------|------|
| 1 | Paste script | | | docblock → end | [ ] |

### 3. Extension scripts / audits (if applicable)

| # | Action | Script | Environment | Done |
|---|--------|--------|-------------|------|
| 1 | Dry-run | | Production | [ ] |

### 4. Make / Fillout / web (if applicable)

| # | Action | Location | Done |
|---|--------|----------|------|
| 1 | | | [ ] |

---

## Production smoke test

| Check | Expected | Done |
|-------|----------|------|
| Schmidt sandbox or single test enrollment | | [ ] |
| Audit dry-run on prod | No unexpected errors | [ ] |
| Web route (if applicable) | | [ ] |

---

## Rollback / risk notes

What breaks if this is wrong; how to undo (if possible).

---

## Close-out

After Mike approves and prod steps are done:

- [ ] `CHANGELOG.md` updated (if production-impacting)
- [ ] Backlog item status updated in `docs/v2-change-backlog.md`
- [ ] [automation-index.md](../automation-index.md) updated (if automation)
- [ ] This doc **Status** → `Promoted to Production`
