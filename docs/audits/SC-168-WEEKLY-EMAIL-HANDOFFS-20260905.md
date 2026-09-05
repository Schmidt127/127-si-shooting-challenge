# SC-168 — Missing Weekly Email Handoffs (Season Sim)

**Date:** 2026-09-05  
**Backlog:** SC-168  
**Branch:** `fix/sc-168-weekly-email-handoffs`  
**Base:** Production `appn84sqPw03zEbTT`  
**Source run:** `SEASON-SIM-2027-20260905T122531Z-athlete1`  
**Agent:** Agent 2 (weekly email specialist)

---

## Task Classification

| Field | Value |
|---|---|
| Type | Expectation / harness correction (not Production logic change) |
| Priority | P1 (discrepancy wave) |
| Difficulty | Medium |
| Owner | Cursor (Season Sim) + OMNI only if Live 072 wiring regresses |
| Dependencies | SC-SEASON-SIM-002; Hub Test Allowlist; 072/074/118/119 |
| Backlog ID | **SC-168** |
| Estimated Scope | Expectations + opt-in stage + tests + audit |
| Phase | 3 Implementation / 5 Close |
| Correct tool | Cursor |
| Repo | `127-si-shooting-challenge` |
| Mike's role | Review PR; authorize `weekly-email-stage apply` on next disposable run |

---

## Classification

**EXPECTED_BEHAVIOR_HARNESS_GAP** — not a Production weekly-email workflow defect.

Zero WEEKLY parent email handoffs after T122531Z execute (with `--enable-email-delivery`) is **consistent** with the current harness contract. Do **not** change working Production 072/118/119/074 logic merely to force simulated emails.

---

## Root cause + proof

### Pipeline (authoritative)

```text
118 (Sunday 05:00 Denver cron) → Build Weekly Email Now?
072 (recordMatchesConditions) → package + Weekly Email Ready?
119 (Sunday 10:00 Denver cron) → Send to Make?
074 → Email Handoff Queue WEEKLY_ATHLETE_SUMMARY
079 → Hub → Resend (Test Mode + allowlist)
```

### What Season Sim execute does

| Step | Execute + `--enable-email-delivery` |
|---|---|
| Arm Build Weekly (072) | **Yes** — false→true on Saturday WAS (`WAS_EMAIL_ARM`) |
| Fire 118/119 cron | **No** — sim clock does not drive Airtable schedules |
| Arm Send to Make? (119) | **No** — writer explicitly keeps `Send to Make? = false` |
| WEEKLY Hub handoffs | **Not produced** until send is armed |

### Evidence

| Fact | Proof |
|---|---|
| T122531Z email on; 6 weekly build arms | `execute-…T122531Z….json` → `enable_email_delivery: true`, `weekly_email_arms: 6` |
| T122531Z handoffs: 69 Accepted, **0 WEEKLY** | Closeout + `audit-cascade-…T122531Z….json` `by_event` (DAILY/WELCOME/HOMEWORK/ZOOM only) |
| T213135Z had **6 WEEKLY Accepted** | `evidence-final-…T213135Z….json` — after archive `_arm_weekly_send_213135.py` (119 substitute) |
| Operator checklist already warned | `SC-SEASON-SIM-002-operator-checklist.md`: email phase “still does not arm Hub send by itself” |
| 072 Live `recordId` is dynamic | MCP `get_automation` `wflnFeGqUMJFUaUOQ` (2026-09-05): `recordId.$ref = trigger → id` (hardcoded-id defect **STALE**) |
| 118/119 are cron | MCP: 118 Sunday `hour:11` UTC (=05:00 Denver), 119 Sunday `hour:16` UTC (=10:00 Denver) |
| Writer contract | `writer._arm_was_email_flags` sets Build true, Send to Make false; unit test asserts same |

### Ruled out

- Recipient allowlist / Hub Test Mode (69 other emails Accepted to Mike only)
- Email type disabled globally (daily/homework/zoom worked)
- Current 072 hardcoded `recordId` (fixed; Live `$ref`)
- Need to change Sunday scheduling or 074 dedupe for this discrepancy

---

## Fix / corrected expectation

1. **Document contract** in `expectations_weekly_email.py`: 0 WEEKLY after execute alone is expected.
2. **Annotate** Saturday `WEEKLY_ATHLETE_SUMMARY` intended emails with `requires_weekly_email_stage`.
3. **Add** `weekly_email_stage.py` + CLI `weekly-email-stage` (plan / verify / apply) as authorized **119 substitute**:
   - Ready? only
   - Allowlist recipients only (`schmidt@fairfieldbasketballclub.com`)
   - Default apply `limit=1`
   - Retry re-arm probes 074 Handoff Key dedupe
4. **Do not** auto-arm Send to Make during execute (avoids 6 unsolicited weekly emails).
5. Preserve Production Sunday 118/119 schedules; no paste of 013/067/122; no 021; no FUT-029.

---

## Files changed (this PR)

- `tools/season_simulation/expectations_weekly_email.py` (new)
- `tools/season_simulation/weekly_email_stage.py` (new)
- `tools/season_simulation/tests/test_sc168_weekly_email.py` (new)
- `tools/season_simulation/cli.py`
- `tools/season_simulation/scenarios.py`
- `tools/season_simulation/execute.py`
- `tools/season_simulation/writer.py`
- `tools/season_simulation/README.md`
- `docs/audits/SC-168-WEEKLY-EMAIL-HANDOFFS-20260905.md` (this file)
- `docs/deploy-checklists/SC-168-weekly-email-stage.md`
- `docs/127-SI-MASTER-FUTURE-WORK-LIST.md` (SC-168 block only)

**Not edited (coordinator-owned):** CURRENT-TRUTH, PROJECT_STATE, CHANGELOG, automation-index.

---

## Tests

```powershell
cd tools
python -m unittest season_simulation.tests.test_sc168_weekly_email -v
```

Covers: execute-alone expectation, T122531Z contract, recipient safety, apply confirm gates, not-ready skip.

---

## Live proof

**N/A for T122531Z fixtures** — enrollment/WAS/handoffs were cleaned in closeout (Athlete/Enrollment deleted; 69 handoffs deleted). No remaining Ready sim WAS to arm without a new disposable graph.

**Next authorized proof (Mike):**

1. On a live disposable run with Ready weekly packages + allowlist recipients  
2. `weekly-email-stage --weekly-email-mode apply --weekly-email-limit 1` with confirm gates  
3. Expect one `WEEKLY_ATHLETE_SUMMARY` Accepted to Mike only  
4. Retry probe: same Handoff Key, no duplicate row  
5. Cleanup registry-scoped fixtures

---

## Paste needs

None for SC-168. Confirm OMNI/ops still show 072 `recordId` = triggering WAS `$ref` (already verified 2026-09-05).

---

## Risks

| Risk | Mitigation |
|---|---|
| Apply arms send on wrong WAS | Enrollment scope + Ready gate + allowlist hard stop |
| Duplicate weekly emails | Default limit=1; 074 Handoff Key dedupe + retry probe |
| Accidental family email | Refuse any non-allowlist recipient before write |
| Operators expect WEEKLY from execute alone | README + dry-run print + expectations module |

---

## Coordinator proposals (do not merge here)

- Operator checklist: add SC-168 `weekly-email-stage` under email-enabled execute  
- CURRENT-TRUTH / PROJECT_STATE: note SC-168 expectation closed for T122531Z discrepancy #2  
- CHANGELOG under Tools: SC-168 weekly-email-stage
