# MASTER REMAINING WORK LIST

**Project:** 127 Sports Intensity Shooting Challenge  
**Repository:** `Schmidt127/127-si-shooting-challenge`  
**Created:** 2026-08-29  
**Audit SHA (start):** `5ae358d5` (`origin/master` at audit)  
**Authority when docs conflict:** Newest Master Update / Completion Master overlays + [`docs/CURRENT-TRUTH.md`](docs/CURRENT-TRUTH.md) + Section G of [`docs/127-SI-MASTER-FUTURE-WORK-LIST.md`](docs/127-SI-MASTER-FUTURE-WORK-LIST.md). Conflicts are recorded below, not silently dropped.

**Status vocabulary (this document only):** `COMPLETE` · `IN PROGRESS` · `READY TO IMPLEMENT` · `READY FOR PRODUCTION APPLY` · `NEEDS VERIFICATION` · `BLOCKED` · `FUTURE`

**Related:** [`RELEASE_BASELINE.md`](./RELEASE_BASELINE.md) · [`docs/AUTHORITY-MAP.md`](docs/AUTHORITY-MAP.md)

---

## Document conflicts (recorded)

| Topic | Newer / winning source | Lagging / conflicting source | Resolution for this list |
|-------|------------------------|------------------------------|--------------------------|
| Automation **057** | CURRENT-TRUTH / Future Work (2026-08-27): **v2.2** live + Config video minimum | Completion Master §0 (2026-08-24): **v2.0** | Treat **v2.2** as current; Master dashboard needs refresh |
| SEO / SC-115 | CURRENT-TRUTH / PROJECT_STATE: indexing cutover **complete** | Completion Master §0: SEO `deferred` / noindex | Indexing **COMPLETE**; athlete consent/indexability still open (FUT-025) |
| Perfect Week full award | Evidence 2026-08-28 + Unlocks schema: **058 blocked** (wrong field names `Source Key`/`Notes` vs prod `Milestone Source Key`/`Coach Note`); WAS `recl3DmBh22ADPWWe` Eligible=1, unlockCount=0 | Completion Master / older “harness READY” wording | **BLOCKED / NEEDS PRODUCTION VERIFICATION** (MRW-A01) — not COMPLETE until evidence JSON proves 058+059+100 XP+dedupe |
| PROJECT_STATE “Final reconciliation 2026-08-21” versions | CURRENT-TRUTH §8 overlays (010 paste, 057 v2.2, 065/066 closeout) | Same file older block (010 v10.11, 057 v1.7, …) | Prefer CURRENT-TRUTH §8 + dated overlays |
| FUT-001 narrative vs Section G | Narrative: “Complete (GitHub)”; G: IN PROGRESS | Paste pending | Repo = mergeable; Production paste separate |
| SC-PW-E2E evidence pointer | `tools/testing/sc-pw-e2e.mjs` + SC-PW-E2E.md | Some generated rows still cite grace-only / older verifier | Prefer SC-PW-E2E harness docs |
| Open PR inventory in CURRENT-TRUTH §13 | Live GitHub 2026-08-29: #264, #268, #269, #266, #262, #244, #240, #238, #237, #234 | CURRENT-TRUTH still lists older #218/#217/#214… | Use live `gh pr list`; refresh CURRENT-TRUTH |

---

## A. Must finish before the app is considered production-ready

### MRW-A01 — Disposable Perfect Week E2E live proof (SC-PW-E2E)

| Field | Value |
|-------|--------|
| **ID** | MRW-A01 |
| **Short title** | SC-PW-E2E qualifying live award — BLOCKED / NEEDS PRODUCTION VERIFICATION |
| **Description** | Prove 057→Eligible→058 unlock→059 XP on disposable PWTEST data. **Authoritative investigation (2026-08-28 evidence + Unlocks schema):** Production Unlocks identity field is **`Milestone Source Key`** (`fldHwWWMESmhYX2Da`); notes field is **`Coach Note`** (`fld8r3TVAnHcFsEPE`). Repo 058 previously expected non-existent **`Source Key`** / **`Notes`**, so create failed closed and the harness timed out with **zero unlocks**. Qualifying apply already proved **057 Ready**, **Days Logged=7**, **Eligible?=1** on WAS `recl3DmBh22ADPWWe` (enrollment `rec93mAfo5jKqP3g5`, week `recNzl4dNOtDmJqnV`, expected key `PERFECT_WEEK\|rec93mAfo5jKqP3g5\|recNzl4dNOtDmJqnV`). |
| **Why it matters** | Perfect Week award path is incomplete until 058 creates the unlock and 059 awards 100 XP with no duplicates. |
| **Current status** | **BLOCKED** / **NEEDS PRODUCTION VERIFICATION** — not COMPLETE |
| **Source document(s)** | `docs/testing/perfect-week/SC-PW-E2E.md`; Future Work Section G; evidence `docs/testing/evidence/sc-pw-e2e/qualifying-2026-08-28T2252.json` (preflight: `unlockSourceField=Milestone Source Key`, `unlockNotesField=Coach Note`; `stage058` timeout) |
| **Repository location(s)** | `058-…create-perfect-week-unlock.js` (v1.5+); `tools/testing/sc-pw-e2e.mjs`; `tools/testing/tests/test_058_perfect_week_lifecycle_runtime.mjs` |
| **Dependencies** | Paste corrected **058** to Production; Live 058 + lifecycle trigger; then 059 Pending path; Enrollments R/W token for later E2E only |
| **Exact files or production systems affected** | Production Airtable Automations **058** (paste) and **059** (verify); WAS `recl3DmBh22ADPWWe`; disposable PWTEST records |
| **Autonomous?** | No |
| **Required manual action** | See **Manual Airtable steps (MRW-A01)** below. **Do not** run qualifying `--apply` until those steps pass. **Do not** create another test week. |
| **Verification required** | Evidence JSON with: 058 created unlock; 059 created XP; XP Award Status = Awarded; XP event = 100; no duplicate unlock or XP event |
| **Recommended priority** | P0 |
| **Definition of done** | Evidence JSON pass + CURRENT-TRUTH §11 + Future Work SC-PW-E2E COMPLETE — **do not mark complete without that JSON** |
| **Notes** | Eligible?=1 alone is not award proof. Repo field-name fix must be pasted before re-testing. |

#### Manual Airtable steps (MRW-A01) — required before any new E2E `--apply`

1. Verify Automation **058** is **Live**.
2. Verify its trigger watches **created/updated Weekly Athlete Summary** records.
3. Verify `recordId` is **dynamically mapped** to the triggering WAS record.
4. Remove **positive-only** or **empty-unlock** filters that block lifecycle updates (withdrawal / restore).
5. Paste GitHub **058 v1.5+** (writes `Milestone Source Key`, optional `Coach Note`) — skip GitHub header.
6. Manually run **058** on WAS **`recl3DmBh22ADPWWe`**.
7. Confirm unlock created with **Milestone Source Key** = `PERFECT_WEEK|rec93mAfo5jKqP3g5|recNzl4dNOtDmJqnV`.
8. Confirm Automation **059** creates the **100 XP** event; XP Award Status = **Awarded**.
9. Re-run **058** to prove **deduplication** (no second unlock).
10. Only after steps 6–9 pass: run **one** qualifying E2E `--apply` and cleanup.

**Hard stops:** Do not run qualifying harness with `--apply` yet. Do not create another test week. Do not mark Perfect Week / SC-PW-E2E complete without the evidence JSON above.

### MRW-A02 — Production paste: secure video URL pipeline (022 / 072 / 073)

| Field | Value |
|-------|--------|
| **ID** | MRW-A02 |
| **Short title** | Paste 022 v2.2 + 072 v4.8 + 073 v4.4 |
| **Description** | Production still on 022 v2.1 / 072 v4.7 / 073 v4.3 while GitHub has Lambda-only parent URL gate. |
| **Why it matters** | Direct S3 links fail for parents; emails must use Lambda reviewer URLs only. |
| **Current status** | READY FOR PRODUCTION APPLY |
| **Source document(s)** | `docs/deploy-checklists/022-v2.2-secure-video-url-pipeline.md`; CURRENT-TRUTH §8/§10 |
| **Repository location(s)** | `airtable/automations/shooting-challenge/022-*.js`, `072-*.js`, `073-*.js` |
| **Dependencies** | None beyond Mike paste window |
| **Exact files or production systems affected** | Production Airtable Automations 022, 072, 073 |
| **Autonomous?** | No |
| **Required manual action** | Mike paste from GitHub (skip GitHub header); confirm Automations Code column |
| **Verification required** | Disposable video feedback email shows Lambda URL only; no AccessDenied S3 parent link |
| **Recommended priority** | P0 |
| **Definition of done** | CURRENT-TRUTH §8 versions match GitHub; CHANGELOG entry |

### MRW-A03 — Production paste: FUT-001 homework identity (020 v3.8 + 065 v10.4)

| Field | Value |
|-------|--------|
| **ID** | MRW-A03 |
| **Short title** | Paste FUT-001 automations |
| **Description** | After PR #264 merges to master, paste 020 v3.8 and 065 v10.4 so assignment identity + due-date enforcement are live. |
| **Why it matters** | HW1/HW2 slot matching will break year-to-year; late credit must be blocked. |
| **Current status** | READY FOR PRODUCTION APPLY (repo merge may still be pending at list write) |
| **Source document(s)** | `docs/deploy-checklists/FUT-001-homework-assignment-identity-deadline.md`; Future Work FUT-001 |
| **Repository location(s)** | `020-*.js`, `065-*.js`, `lib/homework-contracts/` |
| **Dependencies** | MRW-B01 (merge FUT-001 to master) |
| **Exact files or production systems affected** | Production Automations 020, 065 |
| **Autonomous?** | No (paste) |
| **Required manual action** | Mike paste + Schmidt re-submit proof (SC-016) |
| **Verification required** | Alternate slot match; late ineligible; no duplicate HC/XP |
| **Recommended priority** | P0 |
| **Definition of done** | Live versions = GitHub; SC-016 live re-submit evidence |

### MRW-A04 — Production paste: Automation 010 v10.12 settlement grace

| Field | Value |
|-------|--------|
| **ID** | MRW-A04 |
| **Short title** | Paste 010 v10.12 |
| **Description** | Production Automations Code still showed v10.10 (2026-08-23); GitHub has v10.12 formula settlement grace. |
| **Why it matters** | Avoids false error emails / premature settlement failures. |
| **Current status** | READY FOR PRODUCTION APPLY |
| **Source document(s)** | `docs/deploy-checklists/010-v10.12-formula-settlement-grace.md`; CURRENT-TRUTH §8 |
| **Repository location(s)** | `airtable/automations/shooting-challenge/010-*.js` |
| **Dependencies** | None |
| **Exact files or production systems affected** | Production Automation 010 |
| **Autonomous?** | No |
| **Required manual action** | Mike paste; confirm Code column |
| **Verification required** | Controlled submission XP path still awards; no false error on formula lag |
| **Recommended priority** | P0 |
| **Definition of done** | Prod Code = v10.12; CURRENT-TRUTH updated |

### MRW-A05 — Season Weeks / challenge calendar ready (SC-032 / SC-065)

| Field | Value |
|-------|--------|
| **ID** | MRW-A05 |
| **Short title** | 2026–27 Weeks production import |
| **Description** | Generated Weeks exist in repo tooling; Production Weeks import + Mike attestation still open. Weeks are protected configuration (not disposable-test deletes). |
| **Why it matters** | Challenge cannot run without correct week calendar. |
| **Current status** | BLOCKED |
| **Source document(s)** | Future Work SC-032/SC-065; Completion Master PKG-009 |
| **Repository location(s)** | `docs/challenge-year/`, weeks generators under tools |
| **Dependencies** | Mike calendar decisions; early-bird dates if used (SC-066 decided in principle) |
| **Exact files or production systems affected** | Production `Weeks` table |
| **Autonomous?** | No |
| **Required manual action** | Mike/OMNI import + attestation |
| **Verification required** | Week Start/End America/Denver; enrollment linkage; WAS create coverage |
| **Recommended priority** | P0 |
| **Definition of done** | CURRENT-TRUTH Weeks section + SC-065 COMPLETE |

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
| **Current status** | COMPLETE (repo merged via PR #271; live clear still Mike) |
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
| **Current status** | READY TO IMPLEMENT |
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
| **Current status** | IN PROGRESS |
| **Source document(s)** | Future Work WIP-XP-ACT; FUT-012 COMPLETE |
| **Repository location(s)** | Stash `lead-audit-wip-2026-08-29`; PR #240 |
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
| **Current status** | IN PROGRESS |
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
| MRW-C01 | Paste 010 v10.12 | READY FOR PRODUCTION APPLY | `010-v10.12-formula-settlement-grace.md` | Paste script | P0 |
| MRW-C02 | Paste 022 v2.2 | READY FOR PRODUCTION APPLY | `022-v2.2-secure-video-url-pipeline.md` | Paste script | P0 |
| MRW-C03 | Paste 072 v4.8 | READY FOR PRODUCTION APPLY | same | Paste after/with 022 | P0 |
| MRW-C04 | Paste 073 v4.4 | READY FOR PRODUCTION APPLY | same | Paste | P0 |
| MRW-C05 | Paste 020 v3.8 + 065 v10.4 | READY FOR PRODUCTION APPLY | `FUT-001-*.md` | After MRW-B01 | P0 |
| MRW-C06 | SC-151 Submitted Same Day? formula | READY TO IMPLEMENT | Future Work SC-151 | **After** MRW-A01; OMNI formula change | P2 |
| MRW-C07 | RCC views / Interface install | READY FOR PRODUCTION APPLY | `RELIABILITY-COMMAND-CENTER-PRODUCTION-INSTALL.md` | OMNI views | P1 |
| MRW-C08 | Automation UI version inventory (SC-058) | NEEDS VERIFICATION | AUTOMATION_VERSION_INVENTORY | Mike UI attestation | P1 |
| MRW-C09 | Retire/disposition Automation 043 (SC-059) | IN PROGRESS | Future Work SC-059 | Confirm 043 not deployed | P1 |

**Already applied (do not re-queue):** 057 v2.2; 059 Pending-only trigger; 065 v10.3 / 066 v3.9 dynamic `recordId`; 072 v4.7 weekly E2E; SEO indexing env.

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
| MRW-E01 | Confirm Vercel Production tracks master after merges | NEEDS VERIFICATION | Auto-deploy on master; verify `/shoot` + `/shoot/api/airtable` |
| MRW-E02 | SC-149 branding URL env + smoke | IN PROGRESS | Vercel env attestation |
| MRW-E03 | SC-148 mobile/a11y polish deploy | IN PROGRESS | Repo built; merge + smoke |
| MRW-E04 | Production smoke suite after web merges | NEEDS VERIFICATION | `npm run test:smoke:prod` (50/50 last known 2026-08-26) |

---

## F. Testing and verification still required

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| MRW-F01 | SC-PW-E2E live apply | NEEDS VERIFICATION | Same as MRW-A01 |
| MRW-F02 | SC-016 live re-submit after FUT-001 paste | NEEDS VERIFICATION | |
| MRW-F03 | Broader SC-005 season matrix | IN PROGRESS | Many paths green; PW + email inject open |
| MRW-F04 | SC-010/011/012/015 homework path re-tests | IN PROGRESS | Installed; re-prove |
| MRW-F05 | Video XP native trigger + 073 OFF attestation (SC-072) | NEEDS VERIFICATION | PKG-007 PASS; UI attest open |
| MRW-F06 | Zoom live attendance re-test (SC-073/084) | NEEDS VERIFICATION | 101 v6.7 |
| MRW-F07 | 118/119 weekly scheduler positive arm (SC-031/035) | IN PROGRESS | |
| MRW-F08 | Offline contract suite green on master after merges | IN PROGRESS | repository-qa workflow |

---

## G. Documentation and user-facing improvements

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| MRW-G01 | Doc reconciliation (Completion Master lag) | READY TO IMPLEMENT | Same as MRW-B04 |
| MRW-G02 | FUT-018 landing / SC page improvements | READY TO IMPLEMENT | Partial via #266/#270 |
| MRW-G03 | FUT-019 footer consistency | READY TO IMPLEMENT | |
| MRW-G04 | FUT-016 Tutorials redesign | FUTURE | Tied to C-026 |
| MRW-G05 | FUT-017 Zoom page redesign | FUTURE | |
| MRW-G06 | FUT-024 FAQ TST omission note | IN PROGRESS | `/faq` live; TST FAQ omitted by policy |
| MRW-G07 | FUT-025 athlete profile indexability/consent verify | IN PROGRESS | SC-115 public pages done |
| MRW-G08 | Refresh CURRENT-TRUTH open PR list | READY TO IMPLEMENT | |

---

## H. Future enhancements and optional ideas

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| MRW-H01 | FUT-002 unused Airtable field purge | FUTURE | Audit first; deletes Mike-only |
| MRW-H02 | FUT-004 award emailer (replace Tremendous) | FUTURE | Deferred |
| MRW-H03 | FUT-005 accomplishment emails | FUTURE | Deferred |
| MRW-H04 | FUT-007/009 AWS naming + corrected-video workflow | FUTURE | |
| MRW-H05 | FUT-003 free/$0 coupon routes | FUTURE | Deferred Nov/Dec 2026 |
| MRW-H06 | V2-013 Program Instance multi-year | FUTURE | |
| MRW-H07 | Learning Activities schema SC-018–020 | FUTURE | Needs Mike schema auth |
| MRW-H08 | C-027 major-event notifications | FUTURE | |
| MRW-H09 | Early-bird registration config (SC-066) | FUTURE | Decision: use early-bird; dates TBD |
| MRW-H10 | Recorded Zoom half-XP writer (SC-147) | FUTURE | Design brief only; do not overload 117 |

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
| MRW-I07 | Weeks 2026–27 import (MRW-A05) | BLOCKED | Calendar + import approval |
| MRW-I08 | Learning Activities schema (SC-018) | BLOCKED | Schema authorization |
| MRW-I09 | Fillout daily intake reopen (SC-146) | BLOCKED | After dry-run SC-135 |
| MRW-I10 | Production paste windows (C01–C05) | BLOCKED | Mike paste time |
| MRW-I11 | Branch protection / merge approval if CI requires human | BLOCKED | Approve merges if required |
| MRW-I12 | Vercel deploy credentials if auto-deploy fails | BLOCKED | Dashboard access |

---

## Recommended next task for Mike

1. **Merge-ready GitHub:** Approve merge of FUT-001 (#264) and SC-PW-E2E harness (#269) if not already merged by Lead this session.  
2. **Highest-value live action:** Run **SC-PW-E2E** qualifying `--apply` with an Enrollments-capable PAT, then paste **022/072/073** and **010 v10.12**.  
3. **Do not** activate FUT-003 or clear attachments until registration / storage windows are intentional.

---

## Deduplication notes

- SC-034 / V2-002 / PW config items → **COMPLETE**; not listed as open work.  
- FUT-011–015, FUT-020–023, FUT-006, FUT-008 → **COMPLETE**; omitted from open sections.  
- **FUT-WELCOME-LEGACY** (MRW-B07) → **COMPLETE** 2026-08-29 — six Enrollment fields deleted; 075 absent; do not restore.  
- SC-027/066 shot milestones live-tested → monitoring only.  
- Historical overnight MIKE-ACTIONS rows superseded by CURRENT-TRUTH / Section G where dated later.  
- Legacy C-/SC- inventory in Future Work Sections A–F remains evidence; **this file + Future Work Section G** are the operator queues.
