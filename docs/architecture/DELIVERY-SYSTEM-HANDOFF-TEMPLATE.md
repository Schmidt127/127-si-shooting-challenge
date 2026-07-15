# Delivery System — Handoff Template (Mike UI Gate)

**Status:** Standard for Delivery System v2.0 (full V2 governance)  
**Date:** 2026-07-15  
**Rule (D2 hybrid):** Short Mike status message + **one** nine-field sheet link. Do **not** duplicate sheet fields in chat. ChatGPT may summarize status only; must not rewrite fields 3–6.

**Workers:** Never author Mike sheets (Lead only) — see [DELIVERY-SYSTEM-WORKER-AGENT-MODEL.md](./DELIVERY-SYSTEM-WORKER-AGENT-MODEL.md).

**First validation sheet:** `docs/deploy-checklists/AUTOMATION-117-v2-pilot-mike-handoff.md`

---

## Template (copy per gate)

```markdown
# Mike UI gate — {PACKAGE_ID}

## 1. Current project / phase / step
- Project:
- Phase / package:
- Step: {n} of {total} for this package
- CONTROL tip SHA (pushed):
- Base: DEV `app…` / PROD `app…` (exactly one)

## 2. Why this action is required
{One short paragraph: capacity / behavior / unlock next test}

## 3. One exact UI action
{Single primary action in imperative form, e.g.
"Paste script into automation 072 and leave OFF" — not a menu of options}

## 4. Exact full Windows path
`C:\Users\…\127-si-shooting-challenge\…\file.js`

Lead verification (must be checked before sending to Mike):
- [ ] `Test-Path` = True on Lead worktree
- [ ] File SHA256:
- [ ] Docblock version:

## 5. Exact Airtable configuration
| Item | Value |
|------|--------|
| Table (if trigger) | |
| Automation exact name | |
| Folder | |
| Trigger type | |
| Trigger conditions (AND/OR) | |
| Inputs | name = value (blank webhook if required) |
| Outputs to map | |
| Initial ON/OFF | |
| Paste boundary | Skip GitHub header lines {a}–{b}; paste from … |

## 6. What must not change
- PROD / archive / Folder {X} / other automations / real webhook / …

## 7. Expected result
- Observable: fields / run status / smoke
- Capacity math if relevant:

## 8. Rollback action
{Exact reverse: turn OFF; paste from `_rollback/…`; recreate deleted if needed}

## 9. Exact message Mike sends back to Cursor
`{PACKAGE_ID} UI complete`

---

## Agent checklist (not for Mike)
- [ ] Paths verified on Lead tip matching origin tip
- [ ] Offline suite PASS cited
- [ ] Rollback folder exists
- [ ] No second “detailed” handoff issued in chat without this sheet
```

---

## Cursor automatic verification (required before presenting)

Lead must run (or equivalent) and record results in sheet §4 / agent checklist:

```powershell
# 1) Path exists
Test-Path -LiteralPath $Path

# 2) Tip matches claim
git rev-parse HEAD
git fetch origin
git rev-parse origin/<integration-branch>
# Must match the SHA printed in §1

# 3) Content fingerprint
Get-FileHash -Algorithm SHA256 -LiteralPath $Path

# 4) Version string present
Select-String -Path $Path -Pattern 'Version:|version:'
```

If any check fails: **do not send the sheet to Mike** — fix tip/path first.

Optional helper (proposed): `python tools/overnight/verify_mike_sheet.py --sheet path.md` asserting all Windows paths and SHAs.

---

## Anti-patterns (forbidden)

| Anti-pattern | Instead |
|--------------|---------|
| Relative path only (`airtable/automations/...`) | Absolute Windows path + relative for GitHub |
| “Paste the latest 117” without version | Exact filename + version + SHA |
| Multiple competing sheets for one gate | One sheet; deprecate others with banner |
| Chat invents trigger conditions | Copy from sheet only |
| Asking Mike to find the file | Lead verifies path |
| Multi-page narrative then bury the action | Field 3 is the action; narrative is field 2 only |

---

## Compression rule vs overnight status docs

| Audience | Allowed docs |
|----------|--------------|
| **Mike** | This template only (+ optional 1-screen morning tip) |
| **Agents** | AUTHORIZED + migration + results |
| **Ops tip** | CONTROL.json |

Morning handoffs should **link** the active Mike sheet, not restate triggers.

---

## Example (compressed) — 117 activation

1. **Phase:** C-025 / S29 / activation step 1  
2. **Why:** Capacity free; orchestrator ready; prove recording credit in DEV without email  
3. **Action:** Paste `117-zoom-recording-credit-orchestrator.js` v1.0.1 into `117 - Zoom Recording Credit - Orchestrator`; leave **OFF**; webhook blank  
4. **Path:** `C:\Users\mschmidt_fairfield\Documents\GitHub\127-si-shooting-challenge\airtable\automations\shooting-challenge\117-zoom-recording-credit-orchestrator.js`  
5. **Config:** Zoom Attendance; matches conditions (Recording Quiz + Enrollment + Meeting); inputs `recordId` + blank `webhookUrl`; OFF  
6. **Must not:** PROD; real webhook; paste 117a–f as six automations; Folder 07 changes  
7. **Expected:** Script saved; still OFF; ready for later ON smoke  
8. **Rollback:** Keep OFF; restore prior body from Git history if needed  
9. **Reply:** `117 paste UI complete`  

Full sheet remains: `docs/deploy-checklists/AUTOMATION-117-mike-activation-sheet.md`.

---

*End of handoff template.*
