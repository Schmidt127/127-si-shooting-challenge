# Mike — Next Actions after Post-Outage Audit (2026-07-25)

Full audit: [SHOOTING-CHALLENGE-POST-OUTAGE-AUDIT-2026-07-25.md](./SHOOTING-CHALLENGE-POST-OUTAGE-AUDIT-2026-07-25.md)  
Matrix: [SHOOTING-CHALLENGE-RECOVERY-MATRIX-2026-07-25.md](./SHOOTING-CHALLENGE-RECOVERY-MATRIX-2026-07-25.md)

## First action (do this now)

1. Open Vercel → team **127 Sports Intensity** → project **`127-si-shooting-challenge`**.
2. Environment Variables → **Production** → set:
   ```text
   NEXT_PUBLIC_LANDING_URL=https://www.hoopchallenges.com
   ```
   (Remove/replace any `https://hooopchallenges.com` value.)
3. Do **not** stop at Save — `NEXT_PUBLIC_*` is baked at build time. Plan a **Production redeploy** after PR #45 is approved (preferred) or redeploy current Production immediately if hub links must be fixed before the PR merge review.

Live proof already captured: production HTML at `https://www.hoopchallenges.com/shoot` contains the triple-o typo; Preview for PR #45 does not.

---

## Exact next package

**PR #45 — Browser QA production path**

| Step | Owner | Action |
|------|-------|--------|
| 1 | Mike | Review draft PR https://github.com/Schmidt127/127-si-shooting-challenge/pull/45 |
| 2 | Mike | Confirm Vercel Production landing URL (first action above) |
| 3 | Mike | Approve merge of **#45 alone** (do not combine with #43/#44/#46) |
| 4 | Mike/Cursor | Confirm Production deployment includes `18cd2df` (or merge commit) |
| 5 | Cursor | Rerun Playwright against Production; target **44/44**; record evidence |
| 6 | Cursor | Only then update completion-master SC-102/103/106/108/113/109 with evidence-backed statuses |

---

## Do not do yet

| Action | Why |
|--------|-----|
| Merge PRs #43+#44+#45+#46 together | SCN-027 collision; completion-master conflicts; 057 duplicate noise |
| Paste 035 / 057 / 067 during this recovery commit | Audit-only; paste is a later package |
| Deliberate SC-041 webhook failure | Needs explicit Mike authorization (email risk) |
| Mark any of SC-049 / SC-021 / SC-013 Option B **Complete** | No PROD paste + live XP/HC evidence |
| Trust process env `AIRTABLE_TOKEN` for MCP | Placeholder len=23; use `.env.local` `AIRTABLE_API_TOKEN` instead |
| Work inside nested `127-si-shooting-challenge/127-si-shooting-challenge/` | Separate clone at unrelated SHA |

---

## After PR #45 production validation

Recommended sequence (one package at a time):

1. **057 v1.4 paste** from PR #43 only — `docs/deploy-checklists/057-perfect-week-denver-v1.4.md` + Schmidt Perfect Week regression.  
2. **035 v1.1 create/paste OFF-first** — `docs/deploy-checklists/035-weekly-threshold-xp-v1.1.md` + Schmidt Tests 1–5.  
3. **067 Option B** — confirm missing automation in UI, follow PR #44 install packet, Schmidt HC/0 assets/1 XP.  
4. **SC-041** failure→recovery only with written Mike auth.  
5. Rename colliding **SCN-027** fixtures before merging both #44 and #46.

---

## Quick reference — PR HEADs (all pushed, all draft)

| PR | Branch | HEAD |
|----|--------|------|
| #43 | `cursor/sc-completion-threshold-date-311c` | `7aff310` |
| #44 | `cursor/prod-completion-pack-cbb3` | `7b5fa48` |
| #45 | `cursor/browser-qa-integration-0f49` | `18cd2df` |
| #46 | `cursor/sc-041-weekly-email-retry-sop-311c` | `1c2dcc7` |

Local master at audit: `ee9578b` (clean).

---

## Airtable desktop note

This machine **can** read PROD (`appn84sqPw03zEbTT`) via `.env.local`. Cloud agent ACCESS-BLOCKER on PR #44 is outdated for desktop. Still: no writes until a named live-proof package starts.
