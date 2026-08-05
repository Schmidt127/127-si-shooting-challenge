# Evidence — HC WAS Link clarification + CASE-01 verify + 057 gates

| Field | Value |
|-------|--------|
| Date | 2026-08-05 |
| PROD base | `appn84sqPw03zEbTT` |
| Package | Program Homework Assignments MVP follow-up (PR #82) |
| Controlling doc | `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` |

## Field clarification (Homework Completions)

| Field | ID | Type | CASE-01 value | Classification |
|-------|-----|------|---------------|----------------|
| `Weekly Athlete Summary` | `fldhpGNYnu2l3bpUP` | **singleLineText** | empty / null on both HCs | **Unused / legacy** — eligible for a later cleanup package. Do **not** delete/rename/convert in this package. |
| `Weekly Athlete Summary Link` | `fldkoEbVnCugcMCCi` | **multipleRecordLinks** → WAS (`tbl9520d72adxlAKQ`) | both → `recKebuZ79QFTwivA` | **Actively used** — canonical HC→WAS relationship; written by Automation **020**; inverse of WAS `Homework Completions Link` (`fld7IEpY1KsacJTM6`) |

Empty text field is **not** a missing relationship.

## CASE-01 Homework Completions

| Record | Text `Weekly Athlete Summary` | Link `Weekly Athlete Summary Link` | Homework | PHA | Satisfactory? |
|--------|-------------------------------|------------------------------------|----------|-----|---------------|
| `recqXxlOpATQI3sD4` | *(empty)* | `recKebuZ79QFTwivA` | `rechVLOeyEVIqmy2v` | `reca5GM1JkROhXOiy` | true |
| `rechzFmWrUp1tonto` | *(empty)* | `recKebuZ79QFTwivA` | `rec6WmXjpLtIWDERo` | `reccQhrgOK8e8Yngv` | true |

WAS `recKebuZ79QFTwivA`: Homework Assigned Count **2**, Homework Satisfactory Count **2**, Days Logged **7**, Automation Status **Pending**.

**Verification:** **PASS** — `CASE01-VERIFY.json`

## Dependency findings

### `Weekly Athlete Summary Link` (actively used)

| Consumer | Role |
|----------|------|
| Automation **020** | Writes link from Submission → HC |
| Automation **065** | Reads HC link for XP WAS resolution |
| WAS `Homework Completions Link` | Inverse link; 057 + rollups |
| WAS rollups `Homework Assigned Count` / `Homework Satisfactory Count` | Via Completions Link |
| Audits / backfills | `audit-field-coverage-report`, `backfill-homework-completion-was-links`, homework pipeline audits — all use **Link** name |

### `Weekly Athlete Summary` text (unused / legacy)

| Check | Result |
|-------|--------|
| Automations (020/033/057/065) | **No writes/reads** of HC text field |
| Make blueprints | **No references** |
| Fillout mappings in repo | **No references** to this HC text field |
| Views / formulas | Text stub noted in RELATIONSHIP-MAP REL-05 |
| Scripts | Prefer Link; no active writer found |

**Disposition:** leave in place; cleanup later (SC-051-style) after ownership hide/delete pass.

## Automation 057 — exact Perfect Week gates (repo script + live formulas)

**Script does not write `Perfect Week Eligible?`.** It writes helpers + `Perfect Week Automation Status = Ready`.

### Script-calculated (057)

1. **Daily:** 7 official Sun–Sat dates of linked Week; each day needs ≥1 countable same-day submission totaling ≥ ceil(weeklyGoal/7) shots.
2. **Homework:** Assigned = WAS.`Homework` library links; Completions = WAS.`Homework Completions Link`. `homeworkMet = 1` if assignedCount===0 **OR** satisfactoryCount ≥ assignedCount (Satisfactory? or Completion Status = Satisfactory). Empty assigned + linked completions → fallback count from HC.Homework.
3. **Video:** Count Video Feedback where Enrollment matches WAS enrollment **and** Submission is in WAS.Submissions → written to `Perfect Week Video Count`.
4. **Zoom:** Meetings for week; live Attendees ∪ Stage 17 approved recording credit. Writes meeting/attendance counts. (Met formula below.)

### Formulas (Eligible)

| Field | ID | Rule |
|-------|-----|------|
| Perfect Week Eligible? | `fld0re4ydFGq2vvZC` | Status Ready **AND** Daily Met checkbox **AND** Homework Met=1 **AND** Video Met=1 **AND** Zoom Met=1 |
| Video Requirement Met? | `fldat2jCxT2sc9pms` | `Perfect Week Video Count >= 3` |
| Zoom Requirement Met? | `fldWok1MQBND9z0r9` | If Status≠Ready → 0; else if meeting count 0 → 1; else attendance ≥ 1 |

Homework is **required only when assigned** (or inferred from linked completions). CASE-01 has 2 assigned → both must be satisfactory (satisfied).

**057 code change:** none (no defect found).

## 057 readiness (CASE-01)

| Gate | Pre-run evidence |
|------|------------------|
| Daily | Days Logged 7; 7 countable submissions linked |
| Homework | Link field correct; Assigned/Satisfactory rollups 2/2; WAS.Homework library IDs aligned |
| Video | 3 Video Feedback on WAS submissions (`recNnc5jyNZhr7aMl`, `recU0fm1oWJWjjabv`, `recjxoiMZ2WTRuUmW`) |
| Zoom | 0 meetings for week → Zoom Met becomes 1 after Status=Ready |
| Status | Pending + Calculation Queue=1 |

**Ready to run manually.** Eligible stays 0 until 057 sets Status Ready and writes Video Count.

## Exact next manual action

1. Open PROD Weekly Athlete Summary **`recKebuZ79QFTwivA`**.
2. Confirm Automation **057** is ON / running (v1.5).
3. Open the automation → **Test** (or Run) with this WAS `recordId`, **or** toggle Status Error→Pending / ensure Calculation Queue still matches trigger.
4. Expect: Status **Ready**, Homework Met **1**, Video Count **≥3**, Zoom Met **1**, Eligible **1** (if daily Met checkbox set true by script).
5. Do **not** edit 057 unless that run fails with a proven script defect.

## Files in this folder

- `CASE01-VERIFY.json` / `CASE01-STABILIZE.json`
- `057-READINESS.json` / `057-VIDEO-PROBE.json`
- `FIELD-DEPENDENCY-AUDIT.md` (this document’s dependency section may be duplicated there)
- `_hc-was-link-reinspect.json` (fixtures sibling)
