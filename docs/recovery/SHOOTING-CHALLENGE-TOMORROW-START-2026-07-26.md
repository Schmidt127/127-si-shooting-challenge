# Shooting Challenge — Tomorrow Start (2026-07-26)

## Clean starting state

- Recovery audit branch: `docs/post-outage-recovery-2026-07-25`
- Recovery PR: **#47**
- Audit baseline master: `ee9578b`, clean and synced when inspected
- PRs #43–#46 remain separate, pushed, draft, and mergeable
- No lost or corrupted package work was found
- PROD Airtable read access works from desktop through `.env.local` `AIRTABLE_API_TOKEN`
- No additional Airtable writes, automation enables, or scenario schedules were authorized at tonight’s stop

## Completed tonight

### COM-MAKE-001 — Email Delivery Queue Processor

Success path passed in controlled PROD testing:

1. Make selected one eligible Schmidt Delivery.
2. Attempt Count advanced.
3. Gmail sent the email.
4. Delivery changed to Sent.
5. Provider, Provider Message ID, and Sent At were recorded.
6. A Processed Integration Event with Sent outcome was created.
7. Integration Event Message mappings use `first(...)` in Modules 5, 8, and 10.
8. Retry filters are numeric `< 3` and `>= 3`.
9. Retry timing is 5 minutes after attempt 1 and 30 minutes after attempt 2.
10. Scenario scheduling remains **OFF**.

Not completed: retryable-failure and retry-exhausted live proof. Resume only as a separate named package.

## Exact first package tomorrow

### PR #45 — Production browser QA path

1. In Vercel Production for `127-si-shooting-challenge`, set:
   ```text
   NEXT_PUBLIC_LANDING_URL=https://www.hoopchallenges.com
   ```
2. Merge/deploy **PR #45 alone**.
3. Confirm Production includes `18cd2df` or its merge commit.
4. Rerun Production Playwright toward **44/44**.
5. Capture evidence before changing completion-master statuses.

## Authoritative package sources

| Package | Source |
|---------|--------|
| 035 v1.1 | PR #43 only |
| 057 v1.4 | PR #43 only; PR #44 copy is duplicate |
| 067 Option B | PR #44 |
| Browser QA / landing URL guard | PR #45 |
| SC-041 retry SOP | PR #46 |
| Recovery state and tomorrow handoff | PR #47 |

## Known blockers and cautions

- Do not combine PRs #43–#46.
- SCN-027 collides between #44 and #46.
- 035 is not installed in PROD.
- 067 is absent from the PROD Automations inventory.
- 057 PROD version is not verified as v1.4.
- SC-041 has no deliberate failure→recovery live proof.
- Production still serves the `hooopchallenges.com` typo until Vercel env + redeploy are completed.
- COM-MAKE-001 scheduling must remain OFF until the controlled failure package is completed.
- The completion master on master remains the controlling source; recovery docs identify corrections that must be applied only with evidence-backed package updates.

## Recommended order after PR #45

1. 057 v1.4 paste and Schmidt Perfect Week regression.
2. 035 v1.1 OFF-first install and Schmidt Tests 1–5.
3. 067 Option B install and HC / 0 assets / 1 XP proof.
4. COM-MAKE-001 retryable and exhausted failure-path proof.
5. SC-041 deliberate failure→recovery proof with explicit authorization.
6. Resolve SCN-027 collision before merging both affected PRs.

## Resume prompt

Use this instruction tomorrow:

> Use `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` as controlling source and `docs/recovery/SHOOTING-CHALLENGE-TOMORROW-START-2026-07-26.md` as the current checkpoint. Start with PR #45 Production browser QA path. Complete one package, test it live, and then update the completion master and recovery evidence.