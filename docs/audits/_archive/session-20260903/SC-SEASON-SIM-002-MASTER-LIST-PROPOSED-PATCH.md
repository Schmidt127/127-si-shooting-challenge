# Proposed patch — Master Future Work List (SC-SEASON-SIM-002 reconciliation)

**Status:** PROPOSAL ONLY — do not commit or merge until Mike reviews  
Live authority: [`SC-SEASON-SIM-002-FINAL-LIVE-STATUS-RECONCILIATION.md`](./SC-SEASON-SIM-002-FINAL-LIVE-STATUS-RECONCILIATION.md)  
(supersedes stale blockers in the earlier complete-reconciliation report where noted).  
**Target file:** `docs/127-SI-MASTER-FUTURE-WORK-LIST.md`  
**Rule:** Preserve history. Do not mark Production-verified without Mike attestation. Separate code-complete from Production-verified.

### Live-pass corrections (2026-09-03 afternoon)

| Prior blocker | Live fact | List action |
|---|---|---|
| 072 hardcoded recordId | Dynamic `$ref` Live (v4.9.1) | Remove as blocker; mark STALE |
| Writer arms not on master | Merged | Remove |
| Vercel SHA lag / auth OFF | Prod SHA = `41c77a23`; auth ON → sign-in | Update SC-112/SC-149 |
| Temporary formulas “unknown / claimed restored” | Confirmed **NOW()-only** (gates inactive) | Next sim requires **re-paste**, not restore |
| Cleanup “claimed clean” | VERIFY public athletes + ACTIVE SEASON-SIM XP remain | Add cleanup approval item |

---

## A. Findings vs current master list

| Finding | Master list today | Proposed change |
|---|---|---|
| SC-SEASON-SIM-002 marked COMPLETE | § D L1080–1101 + summary L1450 COMPLETE | Keep COMPLETE for **Athlete1 execute infrastructure + T213135Z controlled run**, but add explicit **Production attestation open** + **next execute NO-GO** until blockers clear |
| “Writer arms not on master” | Still in § D note | Strike — merged PR #349 |
| “Acceptance (next execute): Paste 010/114/073…” | Still present | Move to new child task **SC-SEASON-SIM-002-RERUN** (or subsection) — not “incomplete infrastructure” |
| SC-SEASON-SIM-001 | Planned / Future | Unchanged — remain separate |
| SC-112 | Built in Repository | Add: Production auth enablement + Preview proof = separate Mike actions; privacy PRs #359/#361 on master |
| SC-147 Zoom half-XP | Built / Paste Pending | Keep Paste Pending; do not mark COMPLETE |
| SC-147 RCC (same ID) | Built in Repository | **Rename** to distinct ID (e.g. **SC-147-RCC** or reclaim unique ID) — DUPLICATE |
| SC-149 branding vs Family Dashboard | Two rows same ID | Split: keep SC-149 branding; Family Dashboard nav → **SC-149-NAV** or new ID under SC-112 dependency |
| FUT-008 | Complete | Keep; note parent-email display soft-confirm |
| FUT-009 | Delivered in repo; no Prod | Keep CODE-ONLY / Paste Pending language |
| Parent-email Live cutover | Implied via CURRENT-TRUTH / PR #350 | Ensure explicit backlog row if missing: **PARTIAL — Mike UI Live inputs** |
| 072 hardcoded recordId | Buried in audit only | Add explicit ops defect row (or under SC-SEASON-SIM-002-RERUN blockers) |
| Positive Perfect Week sim scenario | Implied in audit | Add **SC-SEASON-SIM-002-PW+** (or FUT) — NOT-STARTED; separate from athlete1 negative Eligible design |
| Untracked probe scripts | Not listed | Do not invent backlog for trash; optional cleanup note under repo hygiene |

---

## B. Proposed SC-SEASON-SIM-002 status rewrite (replace status paragraph only)

```markdown
### SC-SEASON-SIM-002 — Athlete 1 Season Simulation Infrastructure (May–June 2027)

**Priority:** P2  
**Status:** **INFRASTRUCTURE COMPLETE / CONTROLLED RUN COMPLETE (2026-09-02)** — Final controlled run
`SEASON-SIM-2027-20260902T213135Z-athlete1` writer complete; cascade verified under gated formulas
(Submission Base XP 58; streak/weekly arms exercised; PW Eligible=0 expected by design).
Local evidence (gitignored): `tools/season_simulation/reports/evidence-final-SEASON-SIM-2027-20260902T213135Z-athlete1.json`.
Writer streak/PW/weekly arms merged to `origin/master` (PR **#349**).

**Production attestation still open (do not treat as Live-verified ops):**
- Temporary Season Sim formulas claimed restored — **Mike/OMNI must confirm live formula text**
- Automations **010 / 114 / 073** GitHub ahead of inventory — **UI version attestation required**
- Production **072** `recordId` must be dynamic triggering WAS — **OMNI confirm before email-on execute**
- Hub Test Allowlist restore after temporary restrict — **confirm**
- Disposable graph cleanup — **spot-check**

**Next Production season simulation: NO-GO** until the attestation blockers above are resolved.
Use a **new run ID**. Email delivery remains off by default.

**Related (distinct — do not merge):**
- **SC-SEASON-SIM-001** — five-enrollment unattended (Planned / Future; not started)
- **SC-SEASON-SIM-002-RERUN** — next gated execute ops (new ID; formula/paste gates) — see below
- **SC-SEASON-SIM-002-PW+** — positive Perfect Week Eligible=1 scenario — not started
- **SC-112 / SC-149 / SC-147** — remain separate tracks
```

---

## C. Proposed new entries (add after SC-SEASON-SIM-002)

```markdown
### SC-SEASON-SIM-002-RERUN — Next Athlete 1 gated execute (ops)

**Priority:** P1  
**Status:** **NO-GO / BLOCKED** until Mike attestation  
**Owner:** Mike (OMNI/Airtable) + Cursor (harness only after GO)  
**Dependencies:** SC-SEASON-SIM-002 infrastructure on master; Hub allowlist; 072 dynamic recordId  
**Blockers:**
1. Confirm temporary formulas active or re-paste from `FORMULAS-TO-PASTE.txt` / operator checklist
2. Confirm Production paste of 010 v10.13 / 114 v6.2 / 073 v4.6 (or attest already live)
3. Confirm 072 recordId = triggering WAS ($ref)
4. New `--simulation-id`; email off unless weekly explicitly in scope after 072 fix
5. Optional pause 056 during window
**Next action:** Mike completes P0 attestations in reconciliation report §22; then Cursor may run execute only if Mike authorizes.
**Do not** conflate with SC-SEASON-SIM-001, SC-112, SC-147, or parent-email Live cutover.

### SC-SEASON-SIM-002-PW+ — Positive Perfect Week Eligible scenario

**Priority:** P2  
**Status:** NOT-STARTED  
**Owner:** Cursor (design) → Mike authorize disposable  
**Dependencies:** SC-SEASON-SIM-002 writer; temporary same-day/grace formulas  
**Note:** Athlete1 design intentionally Eligible=0. Separate scenario required for Eligible=1 proof
(7 countable days, ≥3 videos, 100% satisfactory HW, Zoom if required). Do not force Eligible on athlete1 rows.
```

---

## D. Proposed disambiguation (IDs)

| Current | Proposed |
|---|---|
| SC-147 (RCC) | Rename display to **SC-147-RCC** (or assign unused ID after Mike picks) — keep “no auto repairs” |
| SC-147 (Zoom half-XP) | Keep **SC-147** for Zoom recording half-XP (most referenced in CURRENT-TRUTH) |
| SC-149 (Fairfield branding URLs) | Keep **SC-149** |
| SC-149 (Family Dashboard nav) | Rename to **SC-149-NAV** (or fold under SC-112 as dependency note) — status CODE-ONLY until Vercel SHA attested |

---

## E. Status hygiene rules for this patch

- Do **not** change SC-147 Zoom to COMPLETE.  
- Do **not** change SC-112 to Live Tested in PROD.  
- Do **not** mark parent-email Live cutover COMPLETE.  
- Do **not** mark FUT-009 Production-complete.  
- Explicitly state: **next season simulation is NO-GO** until listed blockers resolve.  
- Preserve COMPLETE language for T213135Z **controlled run** while separating **Production attestation** and **rerun ops**.

---

## F. Owner / next action / priority (summary for Mike)

| ID | Owner | Next action | Priority |
|---|---|---|---|
| SC-SEASON-SIM-002 | Mike attest + Cursor docs | Confirm closeout facts; update CURRENT-TRUTH | P1 |
| SC-SEASON-SIM-002-RERUN | Mike | P0 OMNI attestations; then authorize execute | P0/P1 |
| SC-SEASON-SIM-002-PW+ | Cursor later | Design positive PW scenario | P2 |
| SC-112 | Mike | Preview enable TEST_MODE + Upstash | P1 |
| SC-147 | Mike/OMNI | Trigger review → paste → disposable proof | P1 |
| Parent-email Live | Mike | Automations UI Live inputs when ready | P1 |
| SC-149 / SC-149-NAV | Mike | Vercel env + deploy SHA | P2 |
| FUT-009 | Mike | Lambda + 120 when ready | P2 |

---

**End of proposal.** No edits applied to `docs/127-SI-MASTER-FUTURE-WORK-LIST.md` by this audit.
