# SC-112 finalization closeout — repository / master-list (Agent 4)

**Date:** 2026-09-03  
**Branch:** `docs/sc-112-final-coord-a4`  
**Base:** `origin/master` @ `9a68281eadce33b101bcb2a1f0876530b9179e1d` (includes merged closeout PRs **#381** / **#382** / **#383**)  
**Mode:** Documentation accuracy + safe local hygiene. No Season Sim execute. No formula/schema changes. No Airtable deletes. Automations **003 / 067 / 101 / 117 / SC-147** not modified. Do not create **121**.

Status labels used below:  
`COMPLETE` · `PRODUCTION-VERIFIED` · `MERGED/DEPLOYED` · `PARTIAL` · `NEEDS-MIKE` · `NEEDS-PRODUCTION-PROOF` · `PASTE-ALIGNED` · `REQUIRES LIVE CONFIRMATION` · `DO-NOT-TOUCH` · `NOT AUTHORIZED`

---

## Post-merge reality (after #381 / #382 / #383)

Prior Agent 4 closeout PR **#381** landed on tip `a686e50b`, then **#382** / **#383** corrected Public On Web + SHA typos. This board **updates** that closeout so tip SHA and PR statuses match **current** `origin/master` — do not treat “open #377/#379/#380/#378” wording from the first closeout draft as current.

| PR | Topic | Current status |
|---|---|---|
| [#381](https://github.com/Schmidt127/127-si-shooting-challenge/pull/381) | Finalization closeout + stale-doc corrections | **MERGED** |
| [#382](https://github.com/Schmidt127/127-si-shooting-challenge/pull/382) | Public On Web / closeout PR status fix | **MERGED** |
| [#383](https://github.com/Schmidt127/127-si-shooting-challenge/pull/383) | Restore corrupted PR 378 merge SHA | **MERGED** |
| [#378](https://github.com/Schmidt127/127-si-shooting-challenge/pull/378) | Public On Web awards code | **MERGED** `a0e84533` (#376 closed superseded) |
| [#377](https://github.com/Schmidt127/127-si-shooting-challenge/pull/377) | Live email / magic-link cutover checklist | **MERGED** |
| [#379](https://github.com/Schmidt127/127-si-shooting-challenge/pull/379) | Multi-child parent auth docs | **MERGED** |
| [#380](https://github.com/Schmidt127/127-si-shooting-challenge/pull/380) | Multi-child second-enrollment evidence | **MERGED** — walkthrough still **PARTIAL / NEEDS-MIKE** |
| [#375](https://github.com/Schmidt127/127-si-shooting-challenge/pull/375) | Master list after SC-112 final wave | **MERGED** |

---

## Required facts (evidence-backed)

| Fact | Status label | Evidence |
|---|---|---|
| Automation **003** | **COMPLETE + PRODUCTION-VERIFIED + active DO-NOT-TOUCH** | Prod completion [`prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md`](../prod-completion/2026-09-03/AUTOMATION-003-GRADE-CHANGE-VERIFIED.md). Automations table: **Status** Live, **Automation Code** **v2.0**. Keep active. |
| Automation **067** | **COMPLETE (Live) + active DO-NOT-TOUCH** | Automations Code SCRIPT **v3.5** Live. Do not edit this closeout wave. |
| Magic-link authentication | **MERGED/DEPLOYED** + **works** | PRs **#350–#357**. Production auth **on**; magic-link request + delivery path operational for disposable/operator parent email. Full multi-child inbox walkthrough still separate (below). |
| Multi-child parent auth | **MERGED/DEPLOYED** + **PARTIAL / NEEDS-MIKE** (+ **NEEDS-PRODUCTION-PROOF** for signed-in select/switch/sign-out) | Code PR **#373** `97548cee`. Docs **#379** MERGED. Evidence **#380** MERGED — disposable multi Active enrollments present; authenticated select/switch/reuse still needs Mike inbox walkthrough. See [`SC-112-multi-child-production-verification-20260903.md`](./SC-112-multi-child-production-verification-20260903.md). |
| Public awards gate | **MERGED** (#378 `a0e84533`; #376 closed) | Live checkbox **`Public On Web`** is sole public publication gate. Fail-closed blank/false. |
| Homework late-credit | **GitHub COMPLETE** · Production Automations Code **PASTE-ALIGNED** (**020 v3.9 / 065 v10.6 / 057 2.3**) | PR **#372** `da009262`. Disposable late-HW / PW exclusion behavior proof still **REQUIRES LIVE CONFIRMATION**. |
| Email Live settings | **Operator checklist MERGED (#377)** — target Live values documented | Producers: `testMode=false` on 071/073/074/076/078A/117; 118 `dryRun=false` + `sendMode=Live`; 119 `dryRun=false`; Vercel `ATHLETE_AUTH_TEST_MODE=false` (magic-link to enrollment email). Checklist: [`parent-email-and-auth-live-cutover-2026-09-03.md`](../deploy-checklists/parent-email-and-auth-live-cutover-2026-09-03.md). Mike UI attestation remains authority if settings drift. |
| Season Simulation formulas | **Normal `NOW()` / `TODAY()`** — **DO NOT change** | Temporary Season Sim gated formulas are **not** active. |
| Season Simulation execute | **NOT currently authorized** | Next execute needs separate Mike authorization + temporary gated formula re-paste. |
| Real-family enrollments | **None present** | Production disposable/operator only (Schmidt / VERIFY). Parent emails = Mike school address only. |

---

## Tip SHA

| Check | Value |
|---|---|
| `origin/master` tip (this board) | **`9a68281eadce33b101bcb2a1f0876530b9179e1d`** |
| Prior stale tip in first closeout draft | `a686e50b…` (pre-#381–#383) — **superseded** |
| Public On Web code merge | `a0e84533` (ancestor of tip) |

Re-verify: `git fetch origin; git rev-parse origin/master`

---

## Hygiene (this coord pass)

Follow [`SC-112-untracked-hygiene-classification-20260903.md`](./SC-112-untracked-hygiene-classification-20260903.md). Mike authorized archive/remove of **Remove after approval** (and archive of **Archive after approval**) one-off helpers.

- Archived under `tools/season_simulation/_archive/session-20260903/` (and `docs/audits/_archive/session-20260903/` for the superseded master-list patch).
- **Required** class left in place for future Season Sim recovery.
- No `git clean` / `git reset --hard`. No secrets committed. No Season Sim package / formula changes.

---

## Explicit non-actions

- No Season Simulation run  
- No formula or schema changes  
- No Airtable record deletes  
- No edits to automations **003 / 067 / 101 / 117 / SC-147**; do not create **121**  
- Do not mark multi-child **PRODUCTION-VERIFIED** until Mike completes signed-in walkthrough  

---

## Remaining Mike actions

1. Merge this docs PR when reviewed (Agent 4 does not merge).  
2. Complete signed-in multi-child walkthrough → then flip **PARTIAL / NEEDS-MIKE** → **PRODUCTION-VERIFIED**.  
3. Optionally run disposable late-homework Perfect Week exclusion proof.  
4. Confirm Email Live producer/Vercel setting names still match the cutover checklist.  
5. Do **not** authorize Season Sim execute until Mike separately approves + temporary formulas re-pasted.
