# PKG-038 — Controlled Production test plan (one Schmidt athlete)

**Status:** Specification — execute only after paste + enablement per master packet  
**Controlled Enrollment:** `recCyFEPeATOVNlr9` (Schmidt, Testing — 2026-2027)  
**Athlete:** `recgqVstObQRzgXJF` · **Program Instance:** `rec5mEM0YPqPqq0hZ`  
**Owner:** Mike · Agents do not access Production

**Out of scope:** Schema changes, unrelated automations (010/041/042 logic changes), email/Make, web, Fillout.

**Non-negotiable:** No deletes of XP Events, unlocks, occurrences, submissions, or enrollments. Withdrawal = `Active?` false. Restoration = same record IDs reactivated.

---

## Preconditions (stop if any fail)

1. PKG-006R and PKG-036 complete; Mike confirms no competing lifetime-XP observation window.
2. Automations **053 v5.5**, **054 v5.8**, **066 v3.8**, **059 v3.6** pasted; triggers match paste packets.
3. **010** remains ON as sole Submission Base XP owner — do not modify for this test.
4. Read-only audit `audit-achievement-xp-pipeline-integrity.js` saved JSON — zero unresolved blockers for Schmidt scope.
5. Communications Hub / Make / outbound email paths isolated or disabled for test window.
6. Baseline evidence captured per [PKG-038-EVIDENCE-CHECKLIST.md](./PKG-038-EVIDENCE-CHECKLIST.md) **Before** section.

---

## Test matrix

| Step | Action | Expected automation chain | Pass criteria | Stop condition |
|------|--------|---------------------------|---------------|----------------|
| **A** | Inventory current streak + milestone state for `recCyFEPeATOVNlr9` | — | Record all `STREAK_XP\|…` and `SHOT_MILESTONE\|recCyFEPeATOVNlr9\|*` IDs | Ambiguous duplicate Source Keys |
| **B** | **Streak award:** ensure 3+ consecutive counted submission days exist (or add controlled submissions via approved intake) | 053 → 054 | New or restored Streak Occurrence; one `STREAK_XP` event; `Source Status=Awarded` | Second XP Event for same key |
| **C** | **Streak rerun:** touch same triggering submission or occurrence | 053 → 054 | Same occurrence ID + same XP Event ID; no duplicate | New XP Event or occurrence |
| **D** | **Streak correction:** set `Count This Submission?` ineligible on **middle** day of the streak block (not first/last if testing split) | 053 → 054 | Affected occurrence `Active?` false; linked `STREAK_XP` `Active?` false; records **not** deleted | XP Event deleted or orphan active event |
| **E** | **Streak restoration:** restore middle submission to counted | 053 → 054 | Same occurrence + XP Event IDs; `Active?` true both | New IDs created |
| **F** | **Separate streak period:** if data allows, break streak then rebuild to same threshold in a **later** date block | 053 → 054 | **New** occurrence + **new** `STREAK_XP` key (different Streak End Date); prior period remains historical | Duplicate key for different end date |
| **G** | **Milestone baseline:** check `Run Shot Milestone Check?` on enrollment | 066 → 059 | Idempotent skip or update; no duplicate unlocks | Unexpected new unlocks |
| **H** | **Milestone correction:** reduce counted shots on controlled submission(s) to drop below **one** earned threshold (document which `SHOT_MILESTONE|…` key) | 010 may queue milestone check → 066 → 059 | Target unlock `Active?` false; linked milestone XP `Active?` false | Unlock or XP deleted |
| **I** | **Milestone restoration:** restore submission shot counts | 066 → 059 | Same unlock ID + same XP Event ID active | Duplicate milestone XP |
| **J** | **Submission Base XP isolation:** on same submission used in H/I, verify `SUBMISSION_XP\|{Submission ID}` | **010 only** | Exactly one Submission Base event; unchanged by 053/054/066/059 | 053/054/066/059 wrote submission XP |
| **K** | **Formula settlement wait** | 041 may queue → 042 | Lifetime XP / WAS totals reflect inactive→active cycle; document timestamps | Totals diverge after agreed window |
| **L** | **Read-only audit rerun** | audit extension | Zero new critical findings for Schmidt scope | active_state_drift, duplicate_canonical_xp_source_key |

---

## Suggested controlled records (2026-08-05 evidence — verify before use)

### Streak XP Events (may have changed)

| XP Event ID | Source Key |
|-------------|------------|
| `rec4EJUNz9EmRvmiD` | `STREAK_XP\|recCyFEPeATOVNlr9\|recQuAtXyT2wKJNGI\|2026-08-04` |
| `recqzIkftOsyIPhkM` | `STREAK_XP\|recCyFEPeATOVNlr9\|rechOec7g8LBLcdgl\|2026-08-06` |
| `recPpgYv8Prc67nvP` | `STREAK_XP\|recCyFEPeATOVNlr9\|recP8QP4uhEXaiZAX\|2026-08-08` |

### Shot milestone source keys (8 unlocks)

`SHOT_MILESTONE|recCyFEPeATOVNlr9|recWGiiyPsv5wKeWd`  
`SHOT_MILESTONE|recCyFEPeATOVNlr9|recsmKrqpCjErhR1K`  
`SHOT_MILESTONE|recCyFEPeATOVNlr9|recvPCvwmMzIBogMP`  
`SHOT_MILESTONE|recCyFEPeATOVNlr9|recuzCxUOLUU6dDGx`  
`SHOT_MILESTONE|recCyFEPeATOVNlr9|rec697KEVaK8axCFK`  
`SHOT_MILESTONE|recCyFEPeATOVNlr9|recvzZE04Jg1mUsof`  
`SHOT_MILESTONE|recCyFEPeATOVNlr9|reccezOiPdSpOQQhy`  
`SHOT_MILESTONE|recCyFEPeATOVNlr9|rec5ySmeXYWeIReJn`

Pick **one** milestone key for steps H/I; record unlock ID + XP Event ID at step A.

---

## Pass criteria (package level)

- Every step B–L has timestamped evidence.
- Rerun steps produce **zero** duplicate canonical Source Keys.
- Correction steps deactivate without delete.
- Restoration steps reuse **same** record IDs.
- Separate streak period (F) earns **new** key when end date differs.
- Submission Base XP (J) untouched by achievement automations.
- Final audit clean for Schmidt scope.

---

## Fail / stop

Stop immediately and execute [PKG-038-ROLLBACK-PLAN.md](./PKG-038-ROLLBACK-PLAN.md) if:

- Duplicate active XP for same Source Key
- XP Event or unlock **deleted**
- Wrong-owner WAS or Week link
- 059 trigger did not fire on inactive unlock
- 053 first-create did not reach 054 (no XP after new occurrence)
- Unexpected email/Make activity

---

## Evidence outputs

Save to operator log (and optional `docs/testing/evidence/YYYY-MM-DD-pkg-038/`):

- Automation run history screenshots per step
- Before/after field exports for checklist rows
- Audit JSON (before + after)
- `git rev-parse HEAD` used for paste
