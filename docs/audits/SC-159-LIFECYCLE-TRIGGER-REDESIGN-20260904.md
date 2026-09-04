# SC-159 — Airtable-supported lifecycle trigger redesign (2026-09-04)

**Status:** **COMPLETE / Live Tested** (2026-09-04) — see [`SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md`](./SC-159-LIVE-VERIFICATION-CLOSEOUT-20260904.md)  
**Base:** `appn84sqPw03zEbTT`  
**Automation 059:** `wfltDo4HZxpYlbqn8` — **059 - Achievements and Milestones - Create XP Event from Achievement Unlock**  
**Live script:** **v3.8** via formula `059 Lifecycle Trigger?` = 1  
**GitHub script tip:** **v3.8** (nested OR checklist remains **superseded**)  
**Season Simulation / field trash:** not run; FUT-002 Batch 2 trash still gated on asset-intake review  

---

## 1. Why the documented trigger is not representable in the live UI

Approved checklist `docs/deploy-checklists/059-sf08-lifecycle-trigger-or.md` required:

```text
(XP Award Status = Pending AND Active? = checked)
OR
(Active? = not checked AND Shot Milestone is not empty)
```

Live MCP `get_automation` for 059 shows the trigger is `recordMatchesConditions` with a **single top-level `and`** of two equality predicates (Pending + Active?=true). Mike confirms Automation UI **does not offer nested conditional groups** for “When record matches conditions”; nested groups exist only on **view** filters.

Therefore the documented nested OR cannot be configured without changing the Boolean meaning.

**Do not flatten** to four top-level conditions under AND or flat OR:

| Flattening | Why invalid |
|------------|-------------|
| All four under AND | Impossible (`Active?` checked and not checked) |
| Four flat ORs | Far broader than intended; fires on almost any unlock |

**Do not use “record enters view”** for this wave: withdraw↔restore would require proving leave/re-enter for every transition; that proof is not available, and prior 065 experience shows matches/enter-view gaps are a real silent-miss class.

---

## 2. Live schema evidence (read-only)

### Current 059 trigger (deployed)

| Item | Live value |
|------|------------|
| Type | `recordMatchesConditions` |
| Table | Athlete Achievement Unlocks `tblyT2AQo1JbvmvZS` |
| Filter | **AND** `{XP Award Status}` = Pending (`fldHUsIkp3hF8W5kd` / `selTGKaa4edonHbrP`) **AND** `{Active?}` = true (`fldmDBm7IIP2yTGaA`) |

### Field IDs (exact names)

| Field | ID | Type |
|-------|-----|------|
| XP Award Status | `fldHUsIkp3hF8W5kd` | singleSelect (Pending / Awarded / Skipped / Error) |
| Active? | `fldmDBm7IIP2yTGaA` | checkbox |
| Shot Milestone | `fldop6wVgfxwKck0h` | link → Shot Milestones |
| XP Events | `fldnxSYwXBl2q61Aa` | link → XP Events |
| Ready for 059 XP? | `fldqXvC2AZ0q045Ti` | formula (number 1/0) |

### Existing formula — does **not** implement lifecycle OR

Live `Ready for 059 XP?` (`fldqXvC2AZ0q045Ti`):

```text
IF(
  AND(
    {Achievement},
    {Enrollment},
    {XP Award Status} = "Pending",
    LEN(ARRAYJOIN({XP Events})) = 0
  ),
  1,
  0
)
```

This is award-only, requires empty XP Events (known mid-run trap), and **never** equals 1 for Awarded+inactive Shot Milestone withdrawal. **Do not reuse as the SC-159 trigger.**

**No existing field** implements `(Pending ∧ Active) ∨ (¬Active ∧ Shot Milestone ∧ settle-safe)`.

---

## 3. Options evaluated

| Option | Verdict |
|--------|---------|
| **1. New formula `059 Lifecycle Trigger?` + matches-conditions = 1** | **RECOMMENDED** |
| **2. Two automations, same script (award vs withdraw)** | Acceptable alternative if Mike refuses new formula field |
| **3. `recordUpdated` watching writable fields** | Rejected for this wave without v3.9 no-op guards — script writes `XP Award Status` + `Trigger Context` every withdraw/award; watching those fields risks **re-entry loops** |
| **4. Existing combined field** | **None** — `Ready for 059 XP?` is not equivalent |
| Nested OR in matches-conditions | **Impossible** in current Automation UI |
| Flattened four-condition filter | **Forbidden** — changes logic |
| Record enters view | **Out of scope** until leave/re-enter proof exists |

---

## 4. Recommended design (Option 1)

### Exact formula (create on Athlete Achievement Unlocks)

**Field name:** `059 Lifecycle Trigger?`  
**Type:** Formula → Number (precision 0)  
**Formula (exact):**

```text
IF(
  OR(
    AND(
      {XP Award Status} = "Pending",
      {Active?}
    ),
    AND(
      NOT({Active?}),
      {Shot Milestone},
      {XP Award Status} = "Awarded"
    )
  ),
  1,
  0
)
```

**Why `{XP Award Status} = "Awarded"` on the withdraw branch:**  
After successful withdraw, script sets unlock to **Skipped**. That forces the formula to **0**, so the record **leaves** the matches-conditions set and can **re-enter** on restore (`Pending` + `Active?`).  

Without the Awarded gate, inactive + Shot Milestone stays formula=1 forever after withdraw → restore cannot re-enter `recordMatchesConditions` (same class of bug as 065 remap lessons).

Award/restore branch still covers Perfect Week (empty Shot Milestone) via Pending+Active only.

### Exact automation trigger (059 only)

1. Type: **When a record matches conditions**  
2. Table: **Athlete Achievement Unlocks**  
3. Conditions (single flat AND is fine — one field):  
   - `059 Lifecycle Trigger?` is `1`  
     (or “equals” `1` depending on UI wording for number formulas)  
4. Do **not** also filter Pending, Active?, Shot Milestone, Ready for 059 XP?, or XP Events empty.  
5. `recordId` → triggering record id  
6. Outputs: `statusOut`, `actionOut`, `errorOut`, `debugStep`, `lifecycleOut` (after v3.8 paste)

---

## 5. Loop and idempotency analysis

| Transition | Formula before → after | Trigger behavior | Script |
|------------|------------------------|------------------|--------|
| New Pending+Active (PW or SM) | 0→1 | Enters → runs | Award / create XP; status→Awarded → formula→0 |
| Re-arm Pending while Active + linked XP | 0→1 | Enters → runs | Restore path / existing XP; Awarded → 0; Source Key dedupe |
| Awarded SM + clear Active? | 0→1 | Enters → runs | Withdraw; status→Skipped → formula→0 |
| Restore Active? + Pending | 0→1 | Enters → runs | Restore XP Active; Awarded → 0 |
| Already Skipped inactive SM | stays 0 | No fire | — |
| Duplicate run while still matching | N/A if settle writes clear formula | — | Source Key + unlock link prevent second XP |

**Trigger loop:** Formula does not reference fields the script must keep flipping after settle. Post-award and post-withdraw both drive formula to **0**, so matches-conditions stops.

**Positive-only silent miss:** Cleared — Awarded+inactive+SM forces formula=1 until Skipped.

**No duplicate XP:** Unchanged v3.8 Source Key / ownership guards.

---

## 6. Option 2 (alternative) — two automations

If Mike will not add a formula field:

| Automation | Trigger (flat AND only) | Script |
|------------|-------------------------|--------|
| **059** (existing) | `XP Award Status` is Pending **AND** `Active?` is checked | Same GitHub v3.8 |
| **059B** (new) | `Active?` is not checked **AND** `Shot Milestone` is not empty **AND** `XP Award Status` is Awarded | Same GitHub v3.8 body |

Same settle semantics as the formula’s two branches. More UI surface; must keep both published and version-aligned.

---

## 7. Repository changes and tests

| Change | Purpose |
|--------|---------|
| This design doc | Authority for SC-159 reopen |
| New Mike checklist (formula path) | Replace unusable OR checklist |
| Banner on old OR checklist | SUPERSEDED |
| 059 script docblock | Point at formula trigger; bump patch notes |
| Offline contract test for Boolean cases | Guard formula intent |
| Master Future Work List SC-159 | Re-open until live-tested |

---

## 8. Paste guidance

**Do not paste v3.8 under the nested-OR checklist.**  
**Do not paste until** either:

- `059 Lifecycle Trigger?` exists and 059 trigger = formula is 1, **or**  
- 059B exists (Option 2).

Script body **v3.8** remains the correct logic once the supported trigger is in place (no further script change required for Option 1 beyond docblock alignment in repo).

---

## 9. Batch 2 field trash

**Still blocked on asset-intake.** SC-159 live verification **passed** (2026-09-04). Do **not** trash the four quarantined `ZZZ DELETE —` fields until the separate early/late asset-intake dependency review also completes.
