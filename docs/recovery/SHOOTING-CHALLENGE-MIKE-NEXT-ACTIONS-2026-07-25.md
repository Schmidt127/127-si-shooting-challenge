# Mike — Next Actions after Post-Outage Audit (2026-07-25)

Full audit: [SHOOTING-CHALLENGE-POST-OUTAGE-AUDIT-2026-07-25.md](./SHOOTING-CHALLENGE-POST-OUTAGE-AUDIT-2026-07-25.md)  
Matrix: [SHOOTING-CHALLENGE-RECOVERY-MATRIX-2026-07-25.md](./SHOOTING-CHALLENGE-RECOVERY-MATRIX-2026-07-25.md)  
Tomorrow handoff: [SHOOTING-CHALLENGE-TOMORROW-START-2026-07-26.md](./SHOOTING-CHALLENGE-TOMORROW-START-2026-07-26.md)

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

## First action tomorrow

1. Open Vercel → team **127 Sports Intensity** → project **`127-si-shooting-challenge`**.
2. Environment Variables → **Production** → set:
   ```text
   NEXT_PUBLIC_LANDING_URL=https://www.hoopchallenges.com
   ```
   Remove or replace any `https://hooopchallenges.com` value.
3. Do not stop at Save. `NEXT_PUBLIC_*` is baked at build time. Merge/deploy PR stack through **#45** (or tip #47), then verify Production.

Live proof already captured: production HTML at `https://www.hoopchallenges.com/shoot` contains the triple-o typo; Preview for PR #45 does not.

---

## Exact next package

**PR stack #43→#47 — repository merge, then #45 production path**

| Step | Owner | Action |
|------|-------|--------|
| 1 | Mike | Review draft PRs #43–#47 (stacked; merge in order) |
| 2 | Mike | Correct Vercel Production landing URL |
| 3 | Mike | Approve merge sequence **#43 → #44 → #45 → #46 → #47** (or tip #47 once) |
| 4 | Mike/Cursor | Confirm Production deployment includes #45 tip `39df7cb` or merge commit |
| 5 | Cursor | Rerun Playwright against Production; target **44/44**; record evidence |
| 6 | Mike | Only then paste 057/035/067 and run Schmidt packs |

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

## After PR #45 production validation

Recommended sequence, one package at a time:

1. **057 v1.4 paste** from PR #43 only — deploy checklist + Schmidt Perfect Week regression.
2. **035 v1.1 create/paste OFF-first** — PR #43 checklist + Schmidt Tests 1–5.
3. **067 Option B** — confirm missing automation, install from PR #44, prove HC / 0 assets / 1 XP.
4. **COM-MAKE-001 retry/failure proof** — scheduling OFF; controlled retryable and exhausted cases.
5. **SC-041** failure→recovery only with written Mike authorization (fixture **SCN-029**).

---

## Quick reference — PR HEADs

| PR | Branch | HEAD | Status |
|----|--------|------|--------|
| #43 | `cursor/sc-completion-threshold-date-311c` | `7aff310` | Draft; authoritative 035 + 057 |
| #44 | `cursor/prod-completion-pack-cbb3` | `7b5fa48` | Draft; authoritative 067 packet |
| #45 | `cursor/browser-qa-integration-0f49` | `18cd2df` | Draft; exact next production package |
| #46 | `cursor/sc-041-weekly-email-retry-sop-311c` | `1c2dcc7` | Draft; SOP only, no live failure proof |
| #47 | `docs/post-outage-recovery-2026-07-25` | recovery docs branch | Draft; clean-start record |

Master at audit start: `ee9578b`, clean and synced.

---

## Airtable desktop note

Desktop read access to PROD (`appn84sqPw03zEbTT`) works via `.env.local`. No additional Airtable writes should occur tonight. Resume tomorrow with one named package and update the completion master only after evidence is captured.