# MASTER REMAINING WORK LIST

**Project:** 127 Sports Intensity Shooting Challenge  
**Repository:** `Schmidt127/127-si-shooting-challenge`  
**Created:** 2026-08-29  
**Audit SHA (start):** `5ae358d5` (`origin/master` at audit)  
**Reconcile SHA:** `2e0759d2` (PR **#306** multi-asset HW) + live Weeks/PHA/FUT-010 MCP **2026-08-30** (18-assignment + R3 dry-run) + FUT-002 quarantine deletes + 065 dynamic remap  
**Authority when docs conflict:** Newest Master Update / Completion Master overlays + [`docs/CURRENT-TRUTH.md`](docs/CURRENT-TRUTH.md) + Section G of [`docs/127-SI-MASTER-FUTURE-WORK-LIST.md`](docs/127-SI-MASTER-FUTURE-WORK-LIST.md) + this list’s dated reconcile notes. Conflicts are recorded below, not silently dropped.

**Status vocabulary (this document only):** `COMPLETE` · `IN PROGRESS` · `READY TO IMPLEMENT` · `READY FOR PRODUCTION APPLY` · `NEEDS VERIFICATION` · `BLOCKED` · `FUTURE`

**Related:** [`RELEASE_BASELINE.md`](./RELEASE_BASELINE.md) · [`docs/AUTHORITY-MAP.md`](docs/AUTHORITY-MAP.md)

---

## Document conflicts (recorded)

| Topic | Newer / winning source | Lagging / conflicting source | Resolution for this list |
|-------|------------------------|------------------------------|--------------------------|
| Automation **057** | Live Airtable automation script MCP 2026-08-30: v2.2 CONFIG **`Perfect Week Video Minimum`** (correct) — **do not repaste** | Automations **Code tracker column** still embeds stale typo `MInimum` | **Paste COMPLETE**; Mike may refresh Automations Code text only (docs hygiene) |
| SEO / SC-115 | CURRENT-TRUTH / PROJECT_STATE: indexing cutover **complete** | Completion Master §0: SEO `deferred` / noindex | Indexing **COMPLETE**; athlete consent/indexability still open (FUT-025) |
| Perfect Week full award | MCP 2026-08-29: WAS `recl3DmBh22ADPWWe` unlock Awarded + 100 XP | Older timeout JSON / inaccurate second-run IDs | **COMPLETE** — evidence `award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json` |
| Paste queue 010/022/072/073/FUT-001/058/057 | Live scripts aligned (057 via `get_automation`) | Older paste-audit / Automations Code tracker lag on 057 | All listed pastes **COMPLETE** — do not re-paste |
| PROJECT_STATE “Final reconciliation 2026-08-21” versions | CURRENT-TRUTH §8 + 2026-08-29 Automations MCP | Same file older block | Prefer CURRENT-TRUTH + MCP |
| FUT-001 | 020 v3.8 / 065 v10.4 **Live** | Older “paste pending” | Paste COMPLETE; optional SC-016 re-submit only |
| SC-PW-E2E evidence pointer | MCP award JSON for WAS `recl3DmBh22ADPWWe` | `qualifying-2026-08-28T2252.json` timeout; untracked `…T223555.json` IDs not live | Prefer MCP award JSON |
| Open PR inventory | Drafts #266/#262/#244/#240/#238/#237/#234; #264–#274 merged | Stale open-PR lists | Use live `gh pr list` |

---

## A. Must finish before the app is considered production-ready

### MRW-A01 — Disposable Perfect Week E2E live proof (SC-PW-E2E)

| Field | Value |
|-------|--------|
| **ID** | MRW-A01 |
| **Short title** | SC-PW-E2E qualifying live award — COMPLETE |
| **Description** | Prove 057→Eligible→058 unlock→059 XP. **Authoritative proof (WAS `recl3DmBh22ADPWWe`):** unlock `recJ5umer4J4FHTOz`, Milestone Source Key `PERFECT_WEEK\|rec93mAfo5jKqP3g5\|recNzl4dNOtDmJqnV`, XP Event `reczehlzkA8fjiQh0`, XP Award Status **Awarded**, XP Points **100**, exactly one unlock for that key. |
| **Why it matters** | Confirms Perfect Week award path end-to-end. |
| **Current status** | **COMPLETE** |
| **Source document(s)** | [`docs/testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json`](docs/testing/evidence/sc-pw-e2e/award-was-recl3DmBh22ADPWWe-2026-08-29-mcp.json); operator queue |
| **Repository location(s)** | Production 058 **1.5** + 059 **v3.7** Live |
| **Dependencies** | Met |
| **Exact files or production systems affected** | Unlock / XP / WAS above (retain as evidence; do not re-`--apply`) |
| **Autonomous?** | Docs/verify only |
| **Required manual action** | **None** — do **not** create another test week; do **not** re-`--apply` for this WAS |
| **Verification required** | Met via MCP live read |
| **Recommended priority** | — |
| **Definition of done** | Met 2026-08-29 |
| **Notes** | `qualifying-2026-08-28T2252.json` is historical pre-award timeout. A later PWTEST unlock for week `recWQrHifFTbbRWDP` may remain Pending without XP — **optional** cleanup only; not required for DoD. Local `sc-pw-e2e-lib.mjs` WIP is unrelated — leave untouched. |

#### Manual Airtable steps (MRW-A01) — HISTORICAL (requirement already met)

Do **not** re-run these for WAS `recl3DmBh22ADPWWe`. Steps 6–9 already satisfied by live unlock/XP above.

### MRW-A02 — Production paste: secure video URL pipeline (022 / 072 / 073)

| Field | Value |
|-------|--------|
| **ID** | MRW-A02 |
| **Short title** | Paste 022 v2.2 + 072 v4.8 + 073 v4.4 |
| **Description** | Lambda-only parent URL gate (022/072/073). |
| **Why it matters** | Direct S3 links fail for parents. |
| **Current status** | **COMPLETE** (Automations Live: 022 v2.2, 072 v4.8, 073 v4.4 — MCP 2026-08-29) |
| **Source document(s)** | `022-v2.2-secure-video-url-pipeline.md`; `2026-08-29-PRODUCTION-OPERATOR-QUEUE.md` |
| **Required manual action** | **None** — do not re-paste |
| **Definition of done** | Met |

### MRW-A03 — Production paste: FUT-001 homework identity (020 v3.8 + 065 v10.4)

| Field | Value |
|-------|--------|
| **ID** | MRW-A03 |
| **Short title** | Paste FUT-001 automations |
| **Description** | Assignment identity + due-date enforcement. |
| **Why it matters** | HW1/HW2 slot matching breaks year-to-year; late credit must be blocked. |
| **Current status** | **COMPLETE** (Automations Live: 020 v3.8, 065 v10.4) |
| **Source document(s)** | `FUT-001-homework-assignment-identity-deadline.md`; operator queue |
| **Dependencies** | MRW-B01 met |
| **Required manual action** | Optional SC-016 live re-submit (MRW-F02) — not a paste blocker |
| **Definition of done** | Paste met |

### MRW-A04 — Production paste: Automation 010 v10.12 settlement grace

| Field | Value |
|-------|--------|
| **ID** | MRW-A04 |
| **Short title** | Paste 010 v10.12 |
| **Description** | Formula settlement grace. |
| **Why it matters** | Avoids false error emails / premature settlement failures. |
| **Current status** | **COMPLETE** (Automations Live: 010 v10.12) |
| **Required manual action** | **None** — do not re-paste |
| **Definition of done** | Met |

### MRW-A05 — Season Weeks / challenge calendar ready (SC-032 / SC-065)

| Field | Value |
|-------|--------|
| **ID** | MRW-A05 |
| **Short title** | 2026–27 Weeks production calendar |
| **Description** | Official Config `2026-2027` Weeks present (Early Bird + Weeks 1–9 + Post-Challenge). Early Bird **Apr 25–May 1, 2027** countable (May 1 inclusive); Week 1 starts May 2; all official rows have Config + PI. Homework: **18** active PHA (EB + Weeks 1–8 × HW1/HW2); Week 9 / Post-Challenge none; common due **2027-06-29**. |
| **Why it matters** | Challenge cannot run without correct week calendar; Early Bird must remain countable. |
| **Current status** | **COMPLETE** (calendar + 18-PHA verified 2026-08-30) |
| **Source document(s)** | [`WEEKS-2026-27-AUDIT-2026-08-30.md`](docs/testing/evidence/WEEKS-2026-27-AUDIT-2026-08-30.md); [`HOMEWORK-PHA-18-AUDIT-2026-08-30.md`](docs/testing/evidence/HOMEWORK-PHA-18-AUDIT-2026-08-30.md) |
| **Repository location(s)** | `docs/challenge-year/`, weeks generators under tools |
| **Dependencies** | Met |
| **Exact files or production systems affected** | Production `Weeks` / PHA (protected — no Cursor writes) |
| **Autonomous?** | Audit only — no Weeks writes |
| **Required manual action** | Before season sim: archive WSTEST/PWTEST Weeks (OMNI); optional archive inactive PHA `recpHX3stQ8YBVtLi` |
| **Verification required** | Met |
| **Recommended priority** | — |
| **Definition of done** | Met 2026-08-30 |

### MRW-A06 — Player Manual finalization (FUT-026)

| Field | Value |
|-------|--------|
| **ID** | MRW-A06 |
| **Short title** | Final Player Manual |
| **Description** | Publish Player Manual only after rules stabilize (homework deadlines, PW, Zoom half-XP, website). |
| **Why it matters** | Parent/athlete source of truth for the season. |
| **Current status** | FUTURE |
| **Source document(s)** | Future Work FUT-026 |
| **Repository location(s)** | Player Manual / Game Manual docs |
| **Dependencies** | MRW-A01–A05; Zoom recording XP decision; FUT-001 live |
| **Exact files or production systems affected** | Website / published manual URL |
| **Autonomous?** | Partial (draft copy in ChatGPT; final publish Mike) |
| **Required manual action** | Mike final review + publish |
| **Verification required** | Manual matches live rules |
| **Recommended priority** | P1 (pre-launch last) |
| **Definition of done** | Published URL live; FUT-026 COMPLETE |

---

## B. Existing implementation work already authorized (complete in repo)

### MRW-B01 — Merge FUT-001 (PR #264)

| Field | Value |
|-------|--------|
| **ID** | MRW-B01 |
| **Short title** | Merge homework assignment identity |
| **Description** | PR #264: 020 v3.8 + 065 v10.4 + `lib/homework-contracts/assignment-identity.js`; CI green. |
| **Why it matters** | Authorized FUT-001 repo closeout. |
| **Current status** | COMPLETE (repo merged via PR #271) |
| **Source document(s)** | Future Work FUT-001; `docs/deploy-checklists/FUT-001-homework-assignment-identity-deadline.md` |
| **Repository location(s)** | See PR #264 / #271 file list |
| **Dependencies** | None for merge |
| **Exact files or production systems affected** | GitHub master only until paste (MRW-A03) |
| **Autonomous?** | Yes (merge after checks; paste separate) |
| **Required manual action** | None for merge; paste later |
| **Verification required** | CI automation-contracts + homework contract tests |
| **Recommended priority** | P0 |
| **Definition of done** | Merged to master; RELEASE_BASELINE updated |

### MRW-B02 — Merge SC-PW-E2E harness hardening (PR #269)

| Field | Value |
|-------|--------|
| **ID** | MRW-B02 |
| **Short title** | Merge Perfect Week harness fixes |
| **Description** | Past completed Sun–Sat week anchors, unlock field schema alignment, evidence JSON. |
| **Why it matters** | Mike’s live run depends on a schema-correct harness. |
| **Current status** | COMPLETE (repo merged via PR #271) |
| **Repository location(s)** | `tools/testing/lib/sc-pw-e2e-lib.mjs`, contract tests, evidence |
| **Dependencies** | None |
| **Exact files or production systems affected** | Repo testing tools only |
| **Autonomous?** | Yes |
| **Required manual action** | Convert draft→ready if needed; merge |
| **Verification required** | `node tools/testing/tests/test_sc_pw_e2e_contract.mjs` |
| **Recommended priority** | P0 |
| **Definition of done** | On master; dry-run prints valid plan |

### MRW-B03 — FUT-010 intake attachment cleanup (repo)

| Field | Value |
|-------|--------|
| **ID** | MRW-B03 |
| **Short title** | Land FUT-010 fail-closed cleanup code |
| **Description** | Draft PR #268: shared helpers + CLI + extension; deletes Airtable attachment only after S3 verified. Dry-run default. |
| **Why it matters** | Authorized storage reduction; must not delete before durable S3 proof. |
| **Current status** | COMPLETE (repo merged via PR #271; Production dry-run evidence 2026-08-30 — live clear still Mike) |
| **Repository location(s)** | `lib/intake-attachment-cleanup/`, `tools/airtable/fut_010_*`, extension backfill |
| **Dependencies** | Mike approval before any live `--apply` / CONFIRM_WRITE |
| **Exact files or production systems affected** | Submission Assets attachments (after merge + Mike run) |
| **Autonomous?** | Repo merge yes; live clear **No** |
| **Required manual action** | Mike dry-run then supervised apply |
| **Verification required** | Unit/Python tests; dry-run zero deletes; sample confirmed clear |
| **Recommended priority** | P1 |
| **Definition of done** | Merged with tests; live clear tracked as MRW-C05 |

### MRW-B04 — Stale Completion Master / CURRENT-TRUTH reconciliation

| Field | Value |
|-------|--------|
| **ID** | MRW-B04 |
| **Short title** | Refresh Completion Master dashboard vs CURRENT-TRUTH |
| **Description** | Update Completion Master §0 for 057 v2.2, SEO cutover, SC-034 closeout, open PR list; align PROJECT_STATE stale version block. |
| **Why it matters** | Agents and Mike are misled by 2026-08-24 dashboard. |
| **Current status** | **COMPLETE** (this reconcile) |
| **Source document(s)** | AUTHORITY-MAP; CURRENT-TRUTH; this list |
| **Repository location(s)** | `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md`, `docs/PROJECT_STATE.md`, `docs/CURRENT-TRUTH.md` |
| **Dependencies** | None |
| **Exact files or production systems affected** | Docs only |
| **Autonomous?** | Yes |
| **Required manual action** | None |
| **Verification required** | No contradictory version claims for 057/SEO/010 paste state |
| **Recommended priority** | P1 |
| **Definition of done** | Dated overlay notes; conflict table cleared or marked historical |

### MRW-B05 — Athlete XP Activity WIP (WIP-XP-ACT)

| Field | Value |
|-------|--------|
| **ID** | MRW-B05 |
| **Short title** | Finish or discard uncommitted XP Activity ledger |
| **Description** | Stashed/uncommitted `web/lib/data/xp-activity*` + API route; overlaps FUT-012 (already COMPLETE on master) and draft PR #240 performance work. |
| **Why it matters** | Avoid half-landed duplicate Game Log stacks. |
| **Current status** | RESOLVED — ABANDON PR #240 (2026-08-30); see `docs/decisions/MRW-B05-xp-activity-wip-resolution.md` |
| **Source document(s)** | Future Work WIP-XP-ACT; FUT-012 COMPLETE |
| **Repository location(s)** | Stash `lead-audit-wip-2026-08-29` (not present in repo env); PR #240 |
| **Dependencies** | Decide: merge performance PR vs abandon duplicate |
| **Exact files or production systems affected** | `web/` athlete profile |
| **Autonomous?** | Partial — need conflict review vs master Game Log |
| **Required manual action** | Mike if product change beyond display |
| **Verification required** | Vitest + smoke; no XP calculation changes |
| **Recommended priority** | P1 |
| **Definition of done** | Either merged with tests or explicitly abandoned with note |
| **Notes** | Do not invent new XP rules. |

### MRW-B07 — FUT-WELCOME-LEGACY field retirement (PR #274)

| Field | Value |
|-------|--------|
| **ID** | MRW-B07 |
| **Short title** | Retire legacy Enrollment welcome-email fields |
| **Description** | Repo labeled 075 LEGACY/RETIRED; probes/contracts updated; live path **078A → Queue → 079**. Mike deleted all six Enrollments fields. |
| **Why it matters** | Removes inert 075 writers; protects Public Missing\* and **066** `Run Shot Milestone Check?`. |
| **Current status** | **COMPLETE** (repo + Airtable 2026-08-29) |
| **Source document(s)** | `docs/deploy-checklists/RETIRE-LEGACY-WELCOME-EMAIL-FIELDS.md`; PR #274 |
| **Repository location(s)** | Contracts, ops probe, automation-index, 075 archive label |
| **Dependencies** | None remaining |
| **Exact files or production systems affected** | Enrollments schema (fields gone); web/automations unchanged at runtime |
| **Autonomous?** | Docs/verify yes; field delete was Mike UI |
| **Required manual action** | None — do **not** restore Automation **075** |
| **Verification required** | MCP: six field IDs absent; Public Missing formulas valid; 066 on `fldwsuKGoypFBn2w4`; 075 absent; contracts + `/shoot` health |
| **Recommended priority** | — |
| **Definition of done** | All six IDs gone + protected fields valid + 075 absent — **met 2026-08-29** |

### MRW-B06 — Web public experience PR #266 (FUT-018 / 019 / 025)

| Field | Value |
|-------|--------|
| **ID** | MRW-B06 |
| **Short title** | Resolve conflicts and land public UX PR |
| **Description** | Draft PR #266 CONFLICTING with master after homepage redesign #270. |
| **Why it matters** | Authorized website improvements; homepage may already supersede parts. |
| **Current status** | **COMPLETE** (merged PR **#279**, 2026-08-30) |
| **Source document(s)** | Future Work FUT-018/019/025; PR #266 |
| **Repository location(s)** | `web/` public pages, footer, athlete privacy |
| **Dependencies** | Rebase onto post-#270 master; dedupe homepage |
| **Exact files or production systems affected** | Vercel `/shoot` after merge |
| **Autonomous?** | Yes for rebase/tests; product copy review optional ChatGPT |
| **Required manual action** | None for code; Mike review of privacy copy recommended |
| **Verification required** | lint, typecheck, vitest, smoke |
| **Recommended priority** | P1 |
| **Definition of done** | Merged conflict-free; FUT items status updated |

---

## C. Production Airtable automation changes still requiring manual application

| ID | Title | Status | Script / checklist | Manual action | Priority |
|----|-------|--------|-------------------|---------------|----------|
| MRW-C01 | Paste 010 v10.12 | **COMPLETE** | `010-v10.12-*.md` | Do not re-paste | — |
| MRW-C02 | Paste 022 v2.2 | **COMPLETE** | `022-v2.2-*.md` | Do not re-paste | — |
| MRW-C03 | Paste 072 v4.8 | **COMPLETE** | same | Do not re-paste | — |
| MRW-C04 | Paste 073 v4.4 | **COMPLETE** | same | Do not re-paste | — |
| MRW-C05 | Paste 020 v3.8 + 065 v10.4 | **COMPLETE** | `FUT-001-*.md` | Optional SC-016 only | — |
| MRW-C05b | Paste 058 1.5 + 059 v3.7 | **COMPLETE** | `058-v1.5-*.md` | Do not re-paste | — |
| MRW-C05c | 057 v2.2 Perfect Week Video Minimum | **COMPLETE (live script)** | Live automation MCP 2026-08-30; tracker Code column still stale | Optional Automations Code refresh only — **do not repaste** | — |
| MRW-C06 | SC-151 Submitted Same Day? formula | READY TO IMPLEMENT | Future Work SC-151 | OMNI formula change | P2 |
| MRW-C07 | RCC views / Interface install | READY FOR PRODUCTION APPLY | `RELIABILITY-COMMAND-CENTER-PRODUCTION-INSTALL.md` | OMNI views | P1 |
| MRW-C08 | Automation UI version inventory (SC-058) | NEEDS VERIFICATION | AUTOMATION_VERSION_INVENTORY | Mike UI attestation vs MCP | P1 |
| MRW-C09 | Retire/disposition Automation 043 (SC-059) | **COMPLETE** | Live automations list MCP 2026-08-30: **043 absent** | None — do not restore | — |
| MRW-C10 | FUT-010 live attachment clear | **DRY-RUN COMPLETE (R3 2026-08-30)** — **0 eligible** (homework scope 0); **no deletion request** | [`FUT-010-DRY-RUN-2026-08-30-R3.md`](docs/testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md) | Optional Mike sign-off + AWS creds when eligible rows appear | P2 |

**Already applied (do not re-queue):** 059 Pending-only trigger; 010 v10.12; 020 v3.8; 022 v2.2; **057 v2.2 correct field (live)**; 058 1.5; 059 v3.7; 065 v10.4; 066 v3.9; 072 v4.8; 073 v4.4; SEO indexing env; FUT-WELCOME-LEGACY field delete; PR **#298** public copy.  
**Still open paste:** **None** for the verified baseline set.

**For each C-item DoD:** Automations Code column matches GitHub version + CURRENT-TRUTH §8 updated + dated evidence.

---

## D. Production Make.com changes still requiring manual application

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| MRW-D01 | Activate FUT-003 Stripe payment writeback | READY FOR PRODUCTION APPLY | Scenario validated inactive 2026-08-26; Mike ON when registration opens. Checklist: `FUT-003-fillout-stripe-payment-writeback.md`. Blueprint: `make/blueprints/fut-003-*.json` (may be untracked until committed). |
| MRW-D02 | Tremendous Production API + scenario ON (C-028) | BLOCKED | Sandbox OK; Production API pending Tremendous/Mike. Scenario stays OFF. |
| MRW-D03 | Optional upload-engine secret rotation / retry proof | NEEDS VERIFICATION | 070b path live; ops follow-up |

**Do not restore Make email** — Hub → Resend is the email plane.

---

## E. Production / Vercel / deployment work

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| MRW-E01 | Confirm Vercel Production tracks master after merges | **COMPLETE (2026-08-30)** | Production deploy SHA `082edc7d` (PR #298); `/` + `/shoot` + `/shoot/api/airtable` HTTP 200 `tokenValid:true` |
| MRW-E02 | SC-149 branding URL env + smoke | **REPO COMPLETE** — prod attestation PASS 2026-08-30; Mike Vercel env dashboard checkboxes pending ([`SC-149-fairfield-branding-url-verification.md`](docs/deploy-checklists/SC-149-fairfield-branding-url-verification.md)) |
| MRW-E03 | SC-148 mobile/a11y polish deploy | IN PROGRESS | Repo built; merge + smoke |
| MRW-E04 | Production smoke suite after web merges | **COMPLETE** | Home hero assertion aligned to FUT-018 `HOME_HERO` copy; `npm run test:smoke:prod` **50/50** (2026-08-30) |

---

## F. Testing and verification still required

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| MRW-F01 | SC-PW-E2E live apply | **COMPLETE** | WAS `recl3DmBh22ADPWWe` MCP award evidence |
| MRW-F02 | SC-016 live re-submit after FUT-001 paste | **PARTIAL** | Live 020 multi-asset → one HC **PASS** (Testing3); 065 dynamic `recordId` **remapped** — desktop `--apply` XP proof **PENDING** — [`docs/testing/core-workflow/MULTI-ASSET-HW-RESULTS.md`](docs/testing/core-workflow/MULTI-ASSET-HW-RESULTS.md) |
| MRW-F03 | Broader SC-005 season matrix | IN PROGRESS | Many paths green; PW + email inject open |
| MRW-F09 | SC-ATHLETE-WF-001 individual athlete workflow QA | **COMPLETE (harness)** | Harness + offline contracts + dry-run + disposable apply evidence 2026-08-30. Submission XP + WAS verified. **MRW-I13 closed** (once per Count It submission). 065 Satisfactory-alone = expected skip. Plan: docs/testing/athlete-workflow/SC-ATHLETE-WF.md. |
| MRW-F11 | Core workflow reliability (calendar + XP + PHA + handoff) | **COMPLETE** (2026-08-30) | Contracts `lib/workflow-contracts/`; harness `tools/testing/sc-core-workflow.mjs`; live audit PASS; disposable apply PASS; orphan inactive PHA deleted. Multi-asset 020 path PASS — see `docs/testing/core-workflow/MULTI-ASSET-HW-RESULTS.md`. |
| MRW-F04 | SC-010/011/012/015 homework path re-tests | **PARTIAL** | SC-015 multi-asset live 020 **PASS**; 065 XP desktop `--apply` **PENDING** (config remap done) |
| MRW-F05 | Video XP native trigger + 073 OFF attestation (SC-072) | NEEDS VERIFICATION | PKG-007 PASS; UI attest open |
| MRW-F06 | Zoom live attendance re-test (SC-073/084) | NEEDS VERIFICATION | 101 v6.7 |
| MRW-F07 | 118/119 weekly scheduler positive arm (SC-031/035) | **COMPLETE** (harness 2026-08-30) | `docs/testing/weekly-email/MRW-F07-POSITIVE-ARM-HARNESS.md`; live `--apply` Mike disposable WAS |
| MRW-F08 | Offline contract suite green on master after merges | **COMPLETE** | repository-qa workflow; docs-canonical-header drift fixed 2026-08-30 |

> **Future (not active):** **SC-SEASON-SIM-001** / **MRW-H11** — 60-day five-enrollment season simulation. Tracked under Section H as **FUTURE**. Distinct from SC-005 matrix and from completed SC-PW-E2E. Do not start implementation from this note.

---

## G. Documentation and user-facing improvements

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| MRW-G01 | Doc reconciliation (Completion Master lag) | **COMPLETE** | Same as MRW-B04 (this reconcile) |
| MRW-G02 | FUT-018 landing / SC page improvements | **COMPLETE** | Shipped via #279 / prior homepage work |
| MRW-G03 | FUT-019 footer consistency | **COMPLETE** | Shipped via #279 |
| MRW-G04 | FUT-016 Tutorials redesign | **COMPLETE** | PR **#284** portfolio catalog (2026-08-30) |
| MRW-G05 | FUT-017 Zoom page redesign | **COMPLETE** | PR **#285** portfolio catalog (2026-08-30) |
| MRW-G06 | FUT-024 FAQ TST omission note | IN PROGRESS | `/faq` live; TST FAQ omitted by policy |
| MRW-G07 | FUT-025 athlete profile indexability/consent verify | **COMPLETE** | Env-gated `NEXT_PUBLIC_ATHLETE_PROFILE_INDEXING`; deploy checklist 2026-08-30 |
| MRW-G08 | Refresh CURRENT-TRUTH open PR list | **COMPLETE** | Reconciled 2026-08-30 — SHA `9f4a64b6`, PRs #279–#293 merged; open #276 + drafts #262/#244/#238/#237/#234 |
| MRW-G09 | Phase 4 safe public copy (CR-01–CR-11) | **COMPLETE** | PR **#298** merge `082edc7d`; Production `dpl_2uQ1wPJferY189xkCFkg4D67JcFR`; [copy review](docs/copy-reviews/2026-08-30-phase4-public-pages.md) |
| MRW-G10 | Phase 4 copy items needing Mike approval | **PARTIAL** | **CR-12 COMPLETE** via PR **#301**. Still deferred: CR-13 extra parents block; CR-17 grades-band nuance; CR-18 coach SLA |
| MRW-G11 | Public website chrome cleanup (Dashboard/Display) | **COMPLETE** | PR **#301** merge `f3be964f`; Vitest **487/487**; prod smoke **50/50** + HTTP smoke PASS; audit [`web/docs/public-route-audit-2026-08-30.md`](web/docs/public-route-audit-2026-08-30.md) |

---

## H. Future enhancements and optional ideas

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| MRW-H01 | FUT-002 unused Airtable field purge | **CLEANUP IN PROGRESS** | Live inventory 1350 fields (post-delete); Review Summary + 4 empties quarantined then **deleted** (`ZZZ DELETE`); Asset Key fixed; broader purge continues |
| MRW-H02 | FUT-004 award emailer (replace Tremendous) | FUTURE | Deferred |
| MRW-H03 | FUT-005 accomplishment emails | FUTURE | Deferred |
| MRW-H04 | FUT-007/009 AWS naming + corrected-video workflow | FUTURE | |
| MRW-H05 | FUT-003 free/$0 coupon routes | FUTURE | Deferred Nov/Dec 2026 |
| MRW-H06 | V2-013 Program Instance multi-year | FUTURE | |
| MRW-H07 | Learning Activities schema SC-018–020 | FUTURE | Needs Mike schema auth |
| MRW-H08 | C-027 major-event notifications | FUTURE | |
| MRW-H09 | Early-bird registration config (SC-066) | FUTURE | Decision: use early-bird; dates TBD |
| MRW-H10 | Recorded Zoom half-XP writer (SC-147) | **Repo prep shipped** | Draft + offline conflict matrix; Mike: slot + `ZOOM_RECORDING` rule row; do not overload 117 |
| MRW-H11 | SC-SEASON-SIM-001 60-day five-enrollment season simulation | **FUTURE** | Planned only — no full simulation run. **SC-SEASON-SIM-002** preflight package now in repo (`tools/season_simulation/`). Archive WSTEST/PWTEST before any execute. |

## F+. Weekly settlement QA (pre–season simulation)

### MRW-F10 — Weekly settlement matrix harness (SC-WEEKLY-SETTLEMENT-E2E)

| Field | Value |
|-------|--------|
| **ID** | MRW-F10 |
| **Short title** | Weekly settlement workflow QA harness |
| **Description** | Repeatable disposable matrix for WAS create/link, weekly calculations, Perfect Week fail-closed + cite award, level/threshold Source Key contracts, and 072/074/079 prep-only handoff compatibility. Ten weekly conditions (WS-01…WS-10). |
| **Current status** | **COMPLETE** (harness + live evidence 2026-08-30) |
| **Source document(s)** | [`docs/testing/weekly-settlement/SC-WEEKLY-SETTLEMENT-E2E.md`](docs/testing/weekly-settlement/SC-WEEKLY-SETTLEMENT-E2E.md); [`DEFECT-REPORT.md`](docs/testing/weekly-settlement/DEFECT-REPORT.md); [`RESULTS.md`](docs/testing/weekly-settlement/RESULTS.md) |
| **Repository location(s)** | `tools/testing/sc-weekly-settlement.mjs`; `tools/testing/lib/sc-weekly-settlement-lib.mjs`; contract tests |
| **Autonomous?** | Yes for dry-run/contracts; live `--apply` uses disposable data only; no email |
| **Required manual action** | Optional cleanup of archived WSTEST Weeks; disposition DEF-WS-001…003 wording in future operator docs |
| **Verification required** | Met — see RESULTS.md |
| **Recommended priority** | — |
| **Definition of done** | Met 2026-08-30 |
| **Notes** | Do not re-apply SC-PW-E2E for WAS `recl3DmBh22ADPWWe`. Season simulation still FUTURE (MRW-H11). |

---

## I. Blocked items requiring Mike’s decision or credentials

| ID | Title | Status | What Mike must provide |
|----|-------|--------|------------------------|
| MRW-I01 | SC-112 athlete auth approach | BLOCKED | Pick auth model |
| MRW-I02 | SC-074 / SC-086 Zoom recording XP architecture | BLOCKED | Dedicated automation vs email-only 117 (don’t steal email slot) |
| MRW-I03 | SC-022 / V2-006 Video XP 1-vs-25 + bonus rules | BLOCKED | Product XP amounts |
| MRW-I04 | SC-PW-E2E Enrollments-capable PAT | BLOCKED | Token with Enrollments R/W (agent PATs often 403) |
| MRW-I05 | FUT-003 Make activation timing | BLOCKED | When to turn scenario ON |
| MRW-I06 | C-028 Tremendous Production API | BLOCKED | Tremendous approval + keys in Make only |
| MRW-I07 | Weeks 2026–27 Early Bird window (MRW-A05) | **COMPLETE** | Apr 25–May 1, 2027 countable finalized; archive WSTEST/PWTEST before season sim |
| MRW-I08 | Learning Activities schema (SC-018) | BLOCKED | Schema authorization |
| MRW-I09 | Fillout daily intake reopen (SC-146) | BLOCKED | After dry-run SC-135 |
| MRW-I10 | Production paste windows (C01–C05c) | **COMPLETE** | Do not re-paste 010/020/022/057/065/072/073; optional Automations Code refresh for 057 tracker only |
| MRW-I11 | Branch protection / merge approval if CI requires human | BLOCKED | Approve merges if required |
| MRW-I12 | Vercel deploy credentials if auto-deploy fails | **COMPLETE** (2026-08-30) | CLI linked; Production public URL envs restored; redeploy Ready — keep dashboard access for future ops |
| MRW-I13 | SC-005 B3 same-day counted shooting XP policy | **COMPLETE** | **Decided 2026-08-30:** Submission XP once per Count It submission (`SUBMISSION_XP\|{id}`); same-day multi is expected. Codified in `lib/workflow-contracts` + ATHWF. |

---

## Recommended next task for Mike

1. **SC-MULTI-ASSET-HW live 065 XP proof** — desktop: `node tools/testing/sc-multi-asset-homework.mjs --apply` (065 dynamic `recordId` already remapped; do not repaste scripts).
2. **Archive overlapping WSTEST/PWTEST Weeks** in Program Instance `Shooting Challenge | 2026-2027` (OMNI) before season simulation.
3. **Do not** re-paste 010/020/022/057/058/059/065/072/073 and **do not** re-run Perfect Week `--apply`.
4. **FUT-010:** dry-run R3 still **0 eligible** — no deletion request.
5. Optional: refresh Automations **Code** text for 057 (tracker lag) — live script already correct.
6. **Do not** activate FUT-003 until registration intentionally opens.
7. ATHWF (MRW-F09) + weekly settlement (MRW-F10) + core workflow (MRW-F11) + **MRW-I13** are done. After WSTEST cleanup: **SC-SEASON-SIM-001** prep (still FUTURE).

---

## Deduplication notes

- **Paste debt C01–C05c + 058/059** → **COMPLETE** (live 057 correct; Automations Code tracker may lag).  
- **SC-034 / V2-002 / PW config items** → schema + live 057 CONFIG **COMPLETE**.  
- **Public copy Phase 4 + chrome** → PR **#298** / **#301** / **#304**.  
- **FUT-002** → quarantine phase **COMPLETE** (5 `ZZZ DELETE` deleted); broader purge continues.
- **SC-MULTI-ASSET-HW / PR #306** → live 020 **PASS**; 065 XP desktop proof **PENDING**.  
- **FUT-010** → dry-run **0 eligible** (R3); no delete request.  
- **Weeks 2026–27 + 18 PHA** → **COMPLETE** (Early Bird Apr 25–May 1; due June 29; Week 9/Post-Challenge no HW).  
- **SC-SEASON-SIM-001 / MRW-H11** → **FUTURE / Planned only** — not active.  
- **SC-WEEKLY-SETTLEMENT-E2E / MRW-F10** → **COMPLETE** (2026-08-30).  
- **SC-ATHLETE-WF-001 / MRW-F09** → **COMPLETE (harness)**; **MRW-I13 CLOSED** (once per Count It).  
- **SC-CORE-WF / MRW-F11** → **COMPLETE** (2026-08-30) — live Weeks/PHA audit + disposable apply; orphan inactive PHA deleted.  
- **SC-SEASON-SIM-002** → **Infrastructure landed** (`tools/season_simulation/`); offline tests green; do not run full season simulation yet.  
- **Automation 043** → **absent** from live automations list (MRW-C09 COMPLETE).  

- SC-027/066 shot milestones live-tested → monitoring only.  
- Historical overnight MIKE-ACTIONS rows superseded by CURRENT-TRUTH / Section G where dated later.  
- Legacy C-/SC- inventory in Future Work Sections A–F remains evidence; **this file + operator queue + Future Work Section G** are the operator queues.
