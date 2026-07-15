# S26 — Phase D decision (072 ∪ 074 Weekly Summary Email)

**Date:** 2026-07-14  
**Workstream:** 2 — Phase D prep  
**HEAD at prep:** `6205173`  
**Package state:** `READY_FOR_AUTHORIZATION` (repo only — not pasted/enabled)

---

## Verdict

**`safe_with_conditions`**

Combine **074** into surviving **072** with ordered BUILD → SEND steps, blank-webhook safe no-send, and human review gate intact. Do **not** execute UI until Mike authorizes.

Not `remain_separate` — capacity Path E needs the +1 slot and responsibilities are a clean sequential pair.  
Not unconditional `safe_to_combine` — dual-arm OR trigger, Make ownership of Sent?, and real-send risk require explicit conditions.

---

## Conditions (must hold)

1. Survive **072** v4.0.0; library-stub **074**; rollback folder present.
2. UI trigger uses OR of Build Now vs (Send ∧ Ready); Sent unchecked.
3. DEV webhook **blank** until test Make path approved; blank = skip not throw.
4. Do not set `Weekly Email Sent?` / Sent At in Airtable on handoff ACK — Make owns Gmail success.
5. Keep Folder 07 peers OFF; do not touch **117** / PROD / real family sends.
6. Prefer C2 (111 delete) complete so free-slot math lands at **5** after D.

---

## Capacity impact

| Milestone | Free (est.) |
|-----------|------------:|
| After C2 | 4 |
| After Phase D (074 retired) | **5** (+1) |

---

## Risks (summary)

- Large combined script (timeout / maintainability) — mitigated by sectioned build + isolated send helper.
- Duplicate email if Sent? lag after Make ACK — sendKey + Make-side dedupe; never stamp Sent in 072.
- Accidental live send — Folder OFF + blank webhook + `autoSendAfterBuild` default false.
- Sunday/schedule confusion — Phase D does not add schedule; C-011 remains separate.

---

## Repo evidence

| Artifact | Path |
|----------|------|
| Analysis | `docs/deploy-checklists/PHASE-D-072-074-current-state-analysis.md` |
| Risks | `docs/deploy-checklists/PHASE-D-072-074-risk-dependency.md` |
| Plan | `docs/deploy-checklists/PHASE-D-072-074-bootstrap-plan.md` |
| Mike UI | `docs/deploy-checklists/PHASE-D-072-074-mike-ui-actions.md` |
| Combined | `airtable/automations/shooting-challenge/072-…js` v4.0.0 |
| Stub | `074-…js` LIBRARY |
| Tests | `tools/airtable/tests/test_phase_d_072_074_combined.py` |

---

## Blockers for UI execution

1. Mike **Authorize Phase D UI**
2. Prefer Mike complete Phase C2 (**delete 111**) for clean capacity ledger
3. Test Make webhook / inbox path before any `sendEnabled` live smoke
