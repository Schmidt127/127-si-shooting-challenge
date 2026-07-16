# DEV Release-Readiness Verification Package — 2026-07-16

**Agent:** Online Agent 2  
**Branch:** `cursor/dev-release-verify-2ca9`  
**Base tip used for package content:** `b320aa2` (`feature/shooting-v2-release-readiness` / PR #26 tip)  
**Starting `master` SHA at assignment start:** `babe74c49bf8d16eda5e55e72ed276e8958e7ce6`  
**Date:** 2026-07-16  

---

## 0. Merge gate (verified before work)

| PR | Title | At OA2 start | After Cloud Lead (2026-07-16) |
|----|-------|--------------|-------------------------------|
| #25 | Light-theme correction | OPEN draft | **MERGED** → `c1f135f` |
| #26 | V2 release readiness | OPEN draft | **MERGED** → `6ef60fd` |
| #27 | LA-000 handoff | OPEN draft | **MERGED** → `efa3322` |
| `master` tip at OA2 start | — | `babe74c` | Updated after merges; OA2/#28 reconciled onto post-merge tip |

**Implication:** Original OA2 work reviewed **PR #26 tip** content offline. After Lead merges, this packet is tip-of-master–compatible. Live DEV install remains Mike/OMNI-gated.

**CONTROL.json:** Tip-sync to final master SHA remains a Lead follow-up after #28 merges. Workers must not edit CONTROL.

---

## 1. Hard stops (confirmed for this run)

| Rule | Status |
|------|--------|
| No PROD Airtable changes | **Observed** — no Airtable API token in environment; no writes attempted |
| No AWS Lambda PROD deployment | **Observed** — no deploy scripts run against AWS |
| No secrets / credential changes | **Observed** |
| No Vercel setting changes | **Observed** |
| No merge to `master` | **Observed** |
| No force-push | **Observed** |
| 117a / 117b not activated in PROD | **Observed** — scripts remain repo-only |
| **070a remains OFF in PROD** | **Confirmed in repo decision record** — [AUTOMATION_070A_LAUNCH_DECISION.md](../v2/AUTOMATION_070A_LAUNCH_DECISION.md); inventory row PROD OFF. Live UI re-confirm still Mike/OMNI. |

**Live Airtable:** No `AIRTABLE_*` env, no `web/.env.local`, no `tools/airtable/.env`. Base ID string alone is **not** authorization. **Stop at executable manual packet** — no DEV schema paste by this agent.

---

## 2. Repository checks completed (2026-07-16)

| Check | Result |
|-------|--------|
| `node tools/validate-v2-release-readiness.js` | **PASS** (0 failures, 0 warnings) |
| `script-header-contract.test.js` | **PASS** (009, 066, 117a, 117b) |
| `c025-zoom-recording-credit.test.js` | **PASS** (all contract cases) |
| `python3 -m unittest tools.airtable.tests.test_c025_recording_watch_contract` | **PASS** (15) |
| `066-milestone-crossing-harness.test.js` | **PASS** (live OMNI still pending) |
| `v2-engine-contracts.test.js` | **PASS** |
| `python3 -m unittest discover -s lambda/upload-asset/tests` | **PASS** (38) |
| `cd web && npm run lint` | **PASS** |
| `cd web && npm run typecheck` | **PASS** |
| `cd web && npm test` | **PASS** (46) |
| `cd web && npm run build` (placeholder Airtable env) | **PASS** |

---

## 3. C-025 / 117a–117b readiness (repository)

**Verdict:** Implemented in repository · Ready for DEV installation · **Not verified in DEV** · Not for PROD.

### Review summary

| Topic | 117a | 117b |
|-------|------|------|
| Version header | `SCRIPT.version` **v1.0** (2026-07-15) | **v1.0** |
| Trigger table | Homework Completions | Homework Completions |
| Conditions | Satisfactory + Zoom Meeting + Enrollment | Satisfactory + send flag |
| Inputs | `recordId` | `recordId`, `makeWebhookUrl` |
| XP Source Key | `ZOOM_RECORDING\|{meetingId}\|{enrollmentId}` | N/A (no XP) |
| Bucket / source | `Zoom` / `Zoom Recording` | N/A |
| Idempotency | Skip if Source Key exists; skip if live exists | Skip if Email Sent?; do not clear trigger on webhook fail |
| XP % | Config `Zoom Recording XP Percent of Live` (fallback 50) | N/A |
| Deadlines | Config days + mode + meeting overrides | N/A |
| Approval email | N/A | Config enabled + template key; POST Make; set Sent? |
| Failure / retry | `statusOut=error` + throw; no second Event on rerun | Network/HTTP error keeps send trigger |
| Docs | [ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](../v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md) | same |

### Open gaps (do not paper over)

Documented in [C025_ARCHITECTURE_RECONCILIATION.md](../v2/C025_ARCHITECTURE_RECONCILIATION.md):

1. Perfect Week counting of Recording Attendees (057) — Config-driven follow-up  
2. Enrollments `Total Zoom Attendances` live ∪ recording union — OMNI formula review  
3. Post-award live+recording conflict soft-void — not in 117a/b  
4. 101 does not dual-detect recording keys yet — ops must prevent dual paths in PROD  

### Exact DEV-only installation + smoke sequence

Follow the install packet sections in order. Condensed operator sequence:

#### Phase A — Identity (Mike / OMNI)

1. Open Airtable base and **read base ID from URL / API** — must equal `appTetnuCZlCZdTCT`.  
2. If base ID ≠ DEV: **STOP**. Do not paste.  
3. Confirm Mike authorized **named DEV install** for C-025 on this base.  
4. Screenshot Config active season row before edits.

#### Phase B — Schema (DEV only; Mike/OMNI)

Execute [ZOOM_RECORDING_CREDIT_DEV_INSTALL.md](../v2/ZOOM_RECORDING_CREDIT_DEV_INSTALL.md) §1–2:

1. Config fields + defaults  
2. Zoom Meetings fields (`Recording Available At`, `Recording Attendees`, overrides)  
3. Homework Completions (`Zoom Meeting`, email flags)  
4. XP Events options (`Zoom Recording` source)  
5. Views `117a - Recording Quiz Ready for XP` and `117b - Recording Approval Email Queue`  
6. **Do not** edit Enrollments `Total Zoom Attendances` formula without OMNI review  

#### Phase C — Paste automations (DEV; leave OFF)

1. Create `117a - Zoom Recording Credit - Award XP from Quiz Completion`  
2. Paste from production docblock through EOF (skip GitHub header)  
3. Map `recordId` + outputs  
4. Leave **OFF**  
5. Create `117b - … Send Approval Email Webhook`  
6. Map `recordId` + `makeWebhookUrl` (**DEV Make webhook only**)  
7. Leave **OFF** until email dry-run  

#### Phase D — Smoke (test enrollments only)

| Step | Action | Pass |
|------|--------|------|
| D1 | Create Zoom Meeting A with `Recording Available At` | Fields save |
| D2 | Create HC Needs Review + Zoom Meeting A + test Enrollment | No XP |
| D3 | Turn **117a ON**; mark Satisfactory | `actionOut=created`; Source Key `ZOOM_RECORDING\|…`; XP = floor(liveBase×pct/100) |
| D4 | Re-run 117a | `skipped_already_awarded`; no second Event |
| D5 | Award live 101 for same meeting+enrollment on second fixture | Recording path `skipped_live_exists` |
| D6 | Past-deadline fixture | `skipped_past_makeup_deadline` |
| D7 | Gate credit Config on | Enrollment on `Recording Attendees` |
| D8 | 117b Config email OFF | `skipped_email_disabled` / config missing |
| D9 | 117b enabled + DEV webhook | HTTP 2xx; `Recording Approval Email Sent?` true; trigger cleared **only on success** |
| D10 | Force webhook 5xx | error; send trigger **not** cleared |

#### Phase E — Evidence before any PROD discussion

Capture: Config values, SCRIPT.version, XP Event IDs + Source Keys, console JSON, Recording Attendees before/after, operator + date. Update inventory DEV column only with live evidence.

---

## 4. Automation 066 OMNI readiness

**Verdict:** Offline harness **PASS** · Live Schmidt confirmation **still pending** · Do **not** close H-002.

| Item | Status |
|------|--------|
| Script | GitHub **v3.2** |
| Offline harness | PASS (2026-07-16) |
| Packet | [066-dev-omni-confirmation-packet.md](./066-dev-omni-confirmation-packet.md) |
| Unverified | Intake chain for named enrollment; live unlock create/skip set; Week write; trigger clear |
| Required test record | One DEV Enrollment `rec…` (Schmidt/test) + one counted Submission through 023/005/009?/010/031 |
| Expected Source Key | `SHOT_MILESTONE\|{enrollmentId}\|{shotMilestoneId}` |
| Can test without PROD records? | **Yes** — DEV base only; never check `Run Shot Milestone Check?` on PROD for this sandbox |
| Pass evidence | Output JSON + unlock IDs + rerun idempotency + precomputed crossing table |

### Exact OMNI sequence (Mike)

1. Confirm base ID `appTetnuCZlCZdTCT`  
2. Confirm 066 ON, paste = v3.2  
3. Complete intake evidence for chosen Submission (packet §2)  
4. Precompute expected milestones (packet §3)  
5. OMNI confirms intake + expected list  
6. Only then check `Run Shot Milestone Check?`  
7. Capture outputs; rerun; attach evidence  

---

## 5. Inventory / checklist / matrix reconciliation (this package)

| Doc | Update in this PR |
|-----|-------------------|
| AUTOMATION_VERSION_INVENTORY | Dated repo-verification note; 066/117a/117b/070a status clarified |
| V2_RELEASE_CHECKLIST | Link this verification package; record offline PASS date |
| V2_END_TO_END_TEST_MATRIX | Prep status + recommended first live DEV rows |
| known-issues | L3/L5 point at this package; note merge gate |
| PROD-promotion-rollback-index | C-025/066/070a rows aligned |
| automation-index | No live claim added |
| CONTROL.json | **Not edited** — Lead tip-sync after #25–#27 merge |

---

## 6. Recommended next live DEV test (priority order)

1. **Merge gate:** Lead/Mike merge #25 → #26 → #27 (or approved order); tip-sync CONTROL to new master.  
2. **066 OMNI** on DEV Schmidt enrollment (H-002 closeout) — no PROD.  
3. **C-025 Phase A–D** on DEV per §3 — 117a first; 117b only with DEV webhook.  
4. Execute E2E matrix rows **F1–F3** then **J4–J5** on DEV; leave remaining U until scheduled.  
5. Keep **070a PROD OFF**. Do not install 117a/117b in PROD.

---

## 7. Sign-off (repository verification only)

| Role | Result | Date |
|------|--------|------|
| Online Agent 2 — offline suite | **PASS** | 2026-07-16 |
| Live DEV C-025 install | **Not performed** | — |
| Live 066 OMNI | **Not performed** | — |
| Mike — authorize DEV install | **Required** | — |
