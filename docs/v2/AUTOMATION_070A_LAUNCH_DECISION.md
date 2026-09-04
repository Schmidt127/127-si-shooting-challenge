# Automation 070a — Homework upload launch decision

**Status:** Live attestation supersedes historical OFF recommendation — see **Current Production status** below  
**Original decision date:** 2026-07-15 · **Attested:** 2026-09-04 (SC-156)  
**Script:** `070a-email-notifications-and-external-handoffs-send-homework-asset-payload-to-make.js`  
**Evidence sources:** [SC-156-070A-ENABLED-OBSERVABILITY-20260904.md](../audits/SC-156-070A-ENABLED-OBSERVABILITY-20260904.md) · [C-070a-production-overnight-package-2026-07-11.md](../deploy-checklists/C-070a-production-overnight-package-2026-07-11.md) · [PROD-promotion-rollback-index-stage10.md](../deploy-checklists/PROD-promotion-rollback-index-stage10.md) · [PROJECT_STATE.md](../PROJECT_STATE.md)

---

## Current Production status (2026-09-04)

| Field | Value |
|-------|-------|
| automationId | `wflIYVOmRRaHu9cl2` |
| deploymentStatus | **deployed (ON)** |
| Script | **v4.7** |
| Long-term ON/OFF policy | Still Mike-owned; do not flip OFF/ON from this doc alone |
| Open publish fix | Remove post-script Update that clears `Send to Make Trigger` — [SC-156 checklist](../deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md) |

---

## What 070a does

Sends one **homework** Submission Asset payload to the Make → Lambda → S3 upload engine when `Send to Make Trigger` is checked and the homework asset is ready (Homework Completion linked). Writes upload/status fields back onto Submission Assets (sync clear or async via **070c**).

It is the homework sibling of **070b** (video). Shared script bodies historically used `automationNumber` input `070a` vs `070b`.

---

## Why it was historically OFF in PROD (2026-07 decision)

| Reason | Evidence |
|--------|----------|
| Video path (**070b/070c**) was prioritized and **PROD proven** (C-013 closeout 2026-07-11) | PROJECT_STATE |
| Homework S3 wave intentionally deferred | PROD promotion/rollback index: “Leave OFF until explicit” |
| Overnight package: Production paste/enable gates and credential isolation required | C-070a overnight package |
| Avoid double-send / orphan trigger risk until homework route keys + Lambda allow-list verified in PROD | C-024 orphan review references on overnight branches |

---

## What functionality depends on it

| Depends on 070a ON | Works without 070a |
|--------------------|--------------------|
| Canonical S3 URL / hash writeback for **homework** assets | Homework Completion + review + **065** XP (attachment may remain Airtable/Drive) |
| Parent/coach flows that require S3 canonical homework files | Quiz/reflection paths that never needed Make upload |
| Parity with video storage architecture (C-013) for homework | Local/Airtable attachment viewing in interfaces |

**067** reflection quiz path may bypass asset upload entirely — do not assume 070a covers all homework types.

---

## Risks of enabling PROD now

- Wrong Make/Lambda route (`homework_completion`) → failed uploads or video route contamination
- Clearing `Send to Make Trigger` on failure → stuck assets
- Double-send if Production webhook pointed at PROD or duplicate automations
- Hash/reuse (C-023) consequences applied incorrectly on homework bytes
- Parent-visible broken links if writeback partial

## Risks of leaving PROD OFF

- Homework files may remain on Airtable attachments / legacy Drive links
- Storage cost/consistency divergence vs video path
- Future features expecting canonical homework URLs blocked
- Operators must not assume S3 exists for homework in PROD

---

## Exact Production evidence required before PROD consideration

From overnight package + C-013 patterns (all must be documented with dates/IDs):

1. [ ] 070a script version in Production matches GitHub intended version (overnight cites **v4.4** path — **confirm live SCRIPT/CONFIG.version**)
2. [ ] Input `automationNumber=070a` and Production `makeWebhookUrl` only
3. [ ] Lambda `ALLOW_ROUTE_KEYS` includes `homework_completion` in **Production**
4. [ ] Happy-path asset: trigger → Uploaded + canonical URL + SHA-256 + Writeback Complete
5. [ ] Idempotent rerun / `skipped_already_uploaded`
6. [ ] Failure path: webhook error does **not** clear trigger incorrectly
7. [ ] C-023 hash/reuse behavior acceptable on homework fixture
8. [ ] Async Accepted path verified with **070c** if used
9. [ ] Test enrollment only (Schmidt); no real-family spam

Overnight claims “Production E2E PASS 2026-07-12” for parts of this — **re-verify on current GitHub SHA before PROD**.

---

## Exact PROD activation steps (when Mike approves)

1. Freeze homework send triggers OFF.
2. Confirm PROD Lambda allow-list + Make scenario for homework route (not Production URLs).
3. Paste identical GitHub script to PROD 070a (skip GitHub header).
4. Map inputs: `recordId`, `makeWebhookUrl` (PROD), `automationNumber=070a`.
5. Keep automation **OFF**.
6. Single Schmidt/prod fixture smoke with monitoring.
7. Enable 070a only for monitored window.
8. Update CHANGELOG + inventory PROD status.
9. Promotion doc required under `docs/deploy-checklists/`.

---

## Rollback procedure

1. Turn PROD **070a OFF** immediately.
2. Leave assets; do not mass-delete S3 objects.
3. Re-paste previous known-good script SHA if bad paste.
4. Redeploy prior Lambda/Make if route broken.
5. Re-check triggers still checked on failed rows for retry.

---

## Recommended launch decision (evidence-only)

**Historical (2026-07):** Keep PROD 070a OFF for V2 launch (video-first storage).

**Current (2026-09-04 SC-156):** Production UI shows **070a deployed/ON** at v4.7. Treat that as live truth. Do not “enable from this document”; do not silently turn it OFF without Mike. Complete the [post-clear trigger removal](../deploy-checklists/SC-156-070a-remove-post-clear-trigger-20260904.md) so failures remain retryable, then Mike confirms long-term homework S3 policy.
