# SC-157 — PR #340 disposition (2026-09-04)

**Agent:** A4 Independent Verification  
**Backlog:** SC-157  
**PR:** [#340](https://github.com/Schmidt127/127-si-shooting-challenge/pull/340) — `cursor/sc147-reconcile-formula-f173`  
**Disposition:** **FULLY SUPERSEDED — close without merge**  
**SC-147 status (must remain closed):** **COMPLETE / Live Tested** — Automation **101 v6.8** (PR **#398**)

---

## Verdict

| Question | Answer |
|----------|--------|
| Contains necessary unresolved reliability work? | **No** |
| Partly superseded? | **No** — fully superseded |
| Fully superseded? | **Yes** |
| Conflicts with SC-152/SC-153 Perfect Week remediation? | **No** — Zoom 101 / REC_PENDING only; does not touch 057/058 |

**Action taken:** Close PR #340 as draft superseded by Production SC-147 closeout. Do **not** merge. Do **not** re-open SC-147.

---

## What PR #340 contained

Draft documentation only (no Automation 101 script changes):

| Artifact | Role |
|----------|------|
| `docs/deploy-checklists/SC-147-reconciliation-trigger-formula-fix.md` | Exact formula package (5 new fields + append `\|REC_PENDING=` to signature) — marked **NOT applied** at PR open (2026-09-02) |
| Pointer updates | Operator packet, OMNI review status, CURRENT-TRUTH, trigger map, design brief → point at that formula doc |

Stated goal: wake Automation 101 for **recording-only** Zoom Attendance approval without Attendees writes and without Automation 121.

---

## Why fully superseded

### 1. SC-147 Production outcome already closed the reliability gap

- Automation **101 v6.8** is Live and Live-Tested (recording half-XP + live base XP + idempotent replay).
- Evidence: [`SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md`](./SC-147-101-V68-PRODUCTION-CLOSEOUT-20260904.md), [`VERIFY-2026-09-02-POST-PASTE.md`](../testing/evidence/sc-147-101-v68/VERIFY-2026-09-02-POST-PASTE.md), merge PR **#398**.
- Disposable proof recorded `ZOOM_RECORDING_CREDIT|*` @ 30 XP, `REC_PENDING` token/rollup cleared, `Needed?` settled to 0, no duplicate XP on replay.

### 2. Live Production already has the formula package PR #340 designed

Independent MCP schema check on Production base `appn84sqPw03zEbTT` (2026-09-04):

| Field | Table | Live ID | Notes |
|-------|-------|---------|-------|
| `Recording Pending Reconcile Token` | Zoom Attendance | `fldweZu4WK0HbCQEo` | formula |
| `Recording Pending Reconcile Tokens` | Zoom Meetings | `fldlwTA4ExUnEhvHu` | rollup of attendance token |
| `Zoom XP Current Signature` | Zoom Meetings | `fldR6F73pNOboBQSL` | includes `\|REC_PENDING=` + rollup |
| `Zoom XP Reconciliation Needed?` | Zoom Meetings | `fldxpTxg5IJsfGzHU` | guarded signature mismatch → 1/0 |

Live signature formula (field IDs redacted to names for readability):

```text
… |EVENT_SIG=… |REC_PENDING= & IF({Recording Pending Reconcile Tokens}, {Recording Pending Reconcile Tokens}, "")
```

Paste card already stated: keep Production `|REC_PENDING=` + rollup — **no formula paste required** for 101 v6.8 ([`101-v6.8-paste-card.md`](../deploy-checklists/101-v6.8-paste-card.md)).

### 3. Draft PR content is stale and hazardous to merge

- Targets **101 v6.7** paste sequence (“do not paste 101 today / paste tomorrow”) — superseded by **v6.8** Live.
- Would rewrite CURRENT-TRUTH / CHANGELOG toward a pre-closeout state.
- Would re-open OMNI formula work that Production already satisfies.
- Conflicts with “SC-147 must remain closed” wave constraint.

### 4. Mike’s prior note on the PR

Owner comment (2026-09-04): close as superseded unless a narrow independent formula change remains. Live schema + Live Tested proof show **no remaining formula gap**.

---

## Useful work preserved (without merging #340)

This disposition file is the replacement record. Canonical live references:

| Keep using | Why |
|------------|-----|
| [`SC-147-zoom-recording-half-xp.md`](../deploy-checklists/SC-147-zoom-recording-half-xp.md) | Production-complete contract |
| [`101-v6.8-paste-card.md`](../deploy-checklists/101-v6.8-paste-card.md) | REC_PENDING keep note |
| SC-147 closeout + VERIFY evidence | Proof matrix |
| Live fields above | Authority for wake path |

Do **not** revive `SC-147-reconciliation-trigger-formula-fix.md` from the draft branch as an actionable checklist. Historical design intent is archived on branch `cursor/sc147-reconcile-formula-f173` / closed PR #340 if ever needed for archaeology only.

---

## Relation to SF wave (SC-152–SC-156)

| Item | Impact |
|------|--------|
| Perfect Week 057/058 (SC-152/SC-153) | **None** — #340 does not modify those scripts |
| P1 031/041/070a (SC-154–SC-156) | **None** |
| Zoom recording vs PW | Recording credit still **excluded** from Perfect Week (by design; 057 reads live Attendees) |

Closing #340 does not block or conflict with Perfect Week lifecycle remediation.

---

## Closeout checklist

- [x] Independent review of PR #340 files + commits
- [x] Confirm SC-147 COMPLETE / 101 v6.8 Live Tested
- [x] Confirm live `|REC_PENDING=` + rollup on Production
- [x] Confirm no 057/058 conflict
- [x] Document disposition (this file)
- [x] `gh pr close 340` with supersession comment
- [ ] Coordinator updates Master Future Work List / CURRENT-TRUTH (SC-157) — **out of A4 exclusive paths**

---

## Record

| Item | Value |
|------|-------|
| Disposition date | 2026-09-04 |
| Reviewer | Agent 4 (`verify/sc-152-157-pw-verify-a4`) |
| Base tip at review | `origin/master` `ec8070a7` |
| PR #340 final state | **CLOSED** (not merged) |
