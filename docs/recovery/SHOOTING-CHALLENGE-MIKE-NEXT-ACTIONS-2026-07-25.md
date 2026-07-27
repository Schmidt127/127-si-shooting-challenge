# Mike — Next Actions after Post-Outage Audit (2026-07-25)

> **MERGED into master (2026-07-27):** PRs **#43–#47** are merged at `origin/master` tip `9d18b26` (and successors). The Draft / merge-sequence table below is **historical**. Do not re-merge those PRs.

Full audit: [SHOOTING-CHALLENGE-POST-OUTAGE-AUDIT-2026-07-25.md](./SHOOTING-CHALLENGE-POST-OUTAGE-AUDIT-2026-07-25.md)  
Matrix: [SHOOTING-CHALLENGE-RECOVERY-MATRIX-2026-07-25.md](./SHOOTING-CHALLENGE-RECOVERY-MATRIX-2026-07-25.md)  
Tomorrow handoff: [SHOOTING-CHALLENGE-TOMORROW-START-2026-07-26.md](./SHOOTING-CHALLENGE-TOMORROW-START-2026-07-26.md)  
Truth audit: [../audits/REPO-COMPLETION-TRUTH-AUDIT-2026-07-27.md](../audits/REPO-COMPLETION-TRUTH-AUDIT-2026-07-27.md)

## Clean stop checkpoint — 2026-07-25

### COM-MAKE-001 — Email Delivery Queue Processor

Controlled Schmidt success-path proof completed in PROD:

- one eligible Delivery was selected;
- Gmail sent the test email;
- the Delivery record was updated to Sent;
- Attempt Count advanced;
- Provider / Provider Message ID / Sent At were written;
- a Processed Integration Event with Sent outcome was created;
- Message link mapping uses `first(...)` in success, retryable-failure, and retry-exhausted audit modules;
- scenario scheduling remains **OFF**.

Still open: deliberate retryable-failure and retry-exhausted live proof. Do not run those paths without starting a named controlled package.

---

## First action now (post #43–#47 merge)

1. Open Vercel → team **127 Sports Intensity** → project **`127-si-shooting-challenge`**.
2. Environment Variables → **Production** → set:
   ```text
   NEXT_PUBLIC_LANDING_URL=https://www.hoopchallenges.com
   ```
   Remove or replace any `https://hooopchallenges.com` value.
3. Do not stop at Save. `NEXT_PUBLIC_*` is baked at build time. Ensure Production deployment includes browser QA tip from merged #45 (`39df7cb` or later master), then verify Production HTML.

Live proof historically captured: production HTML at `https://www.hoopchallenges.com/shoot` contained the triple-o typo; Preview for PR #45 did not.

---

## Exact next package

**Repository stack #43→#47 — MERGED.** Production validation + Airtable paste remain Mike-owned.

| Step | Owner | Action |
|------|-------|--------|
| 1 | Mike | ~~Review draft PRs #43–#47~~ **DONE — merged** |
| 2 | Mike | Correct Vercel Production landing URL + confirm Production deploy includes #45 fixes |
| 3 | Mike/Cursor | Rerun Playwright against Production; record evidence |
| 4 | Mike | Only then paste 057/035/067 and run Schmidt packs |

---

## Do not do yet

| Action | Why |
|--------|-----|
| Paste 035 / 057 / 067 without dedicated live-proof | Each requires its own install + Schmidt package |
| Deliberately fail COM-MAKE-001 or SC-041 | Requires a named controlled failure-path package |
| Mark SC-049 / SC-021 / SC-013 Option B Complete | PROD paste + required live evidence is missing |
| Turn COM-MAKE-001 scheduling ON | Success path passed, but retry/failure paths are not live-proven |
| Trust process env `AIRTABLE_TOKEN` for MCP | Placeholder; desktop read uses `.env.local` `AIRTABLE_API_TOKEN` |
| Work inside nested `127-si-shooting-challenge/127-si-shooting-challenge/` | Separate unrelated clone |

---

## After Production #45 validation

Recommended sequence, one package at a time:

1. **057 v1.4 paste** — deploy checklist + Schmidt Perfect Week regression.
2. **035 v1.1 create/paste OFF-first** — checklist + Schmidt Tests 1–5.
3. **067 Option B** — confirm missing automation, install, prove HC / 0 assets / 1 XP.
4. **COM-MAKE-001 retry/failure proof** — scheduling OFF; controlled retryable and exhausted cases.
5. **SC-041** failure→recovery only with written Mike authorization (fixture **SCN-029** / **SCN-039–041**).

---

## Quick reference — PR HEADs (historical; all merged)

| PR | Branch | HEAD (at audit) | Status |
|----|--------|------|--------|
| #43 | `cursor/sc-completion-threshold-date-311c` | (merged) | **MERGED** — authoritative 035 + 057 |
| #44 | `cursor/prod-completion-pack-cbb3` | (merged) | **MERGED** — 067 packet |
| #45 | `cursor/browser-qa-integration-0f49` | `39df7cb` tip | **MERGED** — Production web package |
| #46 | `cursor/sc-041-weekly-email-retry-sop-311c` | (merged) | **MERGED** — SOP; no live failure proof |
| #47 | `docs/post-outage-recovery-2026-07-25` | (merged) | **MERGED** — recovery docs |

Master tip after stack: `9d18b26` (PR #47 merge).

---

## Airtable desktop note

Desktop read access to PROD (`appn84sqPw03zEbTT`) works via `.env.local`. No additional Airtable writes from agents. Resume with one named package and update the completion master only after evidence is captured.
