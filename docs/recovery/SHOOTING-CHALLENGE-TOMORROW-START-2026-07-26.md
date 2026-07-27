# Shooting Challenge — Tomorrow Start (2026-07-26)

## Clean starting state

- Recovery audit branch: `docs/post-outage-recovery-2026-07-25` (PR **#47**)
- **2026-07-26 reconciliation:** PRs #43–#47 rebased into a clean stack on `origin/master` (`c3a60b0`)
- Stack tips (all draft, unmerged):

| PR | Branch tip SHA |
|----|----------------|
| #43 | `8db4426` |
| #44 | `92cb070` (includes #43) |
| #45 | `39df7cb` (includes #44) |
| #46 | `8a3cf2d` (includes #45) |
| #47 | `c62bd1c` (includes #46) |

- Duplicate **057** code removed from #44 (paste runbook only; code canonical in #43)
- **SCN-027 collision resolved:** quiz Option B keeps SCN-027/028 (#44); weekly-email retry is **SCN-029** (#46)
- PROD Airtable read access works from desktop through `.env.local` `AIRTABLE_API_TOKEN`
- No Airtable writes, automation enables, emails, or Make schedule changes from the reconciliation session

## Completed prior night (unchanged)

### COM-MAKE-001 — Email Delivery Queue Processor

Success path passed in controlled PROD testing (scheduling remains **OFF**). Retryable-failure and retry-exhausted live proof still open.

## Exact first package tomorrow

### Option A — Repository merges (no Airtable paste)

Merge in order **#43 → #44 → #45 → #46 → #47** (or merge tip #47 once if reviewing the full stack). All remain draft until Mike approves.

### Option B — Production browser QA path (after merge/deploy of #45+)

1. In Vercel Production for `127-si-shooting-challenge`, set:
   ```text
   NEXT_PUBLIC_LANDING_URL=https://www.hoopchallenges.com
   ```
2. Deploy web changes from #45 (landing URL guard + browser-QA fixes).
3. Confirm Production includes `39df7cb` or its merge commit.
4. Rerun Production Playwright toward **44/44**.
5. Capture evidence before promoting any additional SC items beyond what browser QA already recorded.

## Authoritative package sources

| Package | Source |
|---------|--------|
| 035 v1.1 | PR #43 only — **Ready for PROD Paste** |
| 057 v1.4 | PR #43 only — **Ready for PROD Paste**; #44 keeps paste runbook |
| 067 Option B | PR #44 — Built / install packet |
| Browser QA / landing URL guard | PR #45 |
| SC-041 retry SOP | PR #46 — Built; fixture **SCN-029** |
| Recovery state and tomorrow handoff | PR #47 |

## Known blockers and cautions

- 035 is **not** installed in PROD.
- 067 is absent from the PROD Automations inventory.
- 057 PROD version is not verified as v1.4 (assume v1.3 until UI-confirm after paste).
- SC-041 has no deliberate failure→recovery live proof.
- Production may still serve the `hooopchallenges.com` typo until Vercel env + redeploy.
- COM-MAKE-001 scheduling must remain OFF until the controlled failure package is completed.
- Do **not** mark 035/057/067/SC-041 **Live Tested** or **Complete** without paste + Schmidt evidence.

## Recommended order after repo merges

1. Vercel landing URL + #45 production deploy + Playwright evidence.
2. 057 v1.4 paste (PR #43) and Schmidt Perfect Week regression.
3. 035 v1.1 OFF-first install and Schmidt Tests 1–5.
4. 067 Option B install and HC / 0 assets / 1 XP proof.
5. COM-MAKE-001 retryable and exhausted failure-path proof.
6. SC-041 deliberate failure→recovery proof with explicit authorization.

## Resume prompt

Use this instruction tomorrow:

Start from `docs/recovery/SHOOTING-CHALLENGE-TOMORROW-START-2026-07-26.md`. Merge stack #43→#47 only with Mike approval. Prefer Vercel landing URL + PR #45 production deploy next, then 057/035/067 paste packages one at a time. Do not enable Make schedules or mark Live Tested without evidence.
