# Content & External Dependency Audit — 2026-07-27

Repository-only scan. Does **not** invent missing URLs or mutate Vercel / Fillout / Airtable content.

| Area | Observed in repo | Source of truth | Mike action | Validation | Rollback |
|------|------------------|-----------------|-------------|------------|----------|
| Landing / hub URL | Code defaults + guards `hooop` typo → `https://www.hoopchallenges.com` (`web/lib/app-config.ts`) | Vercel Production `NEXT_PUBLIC_LANDING_URL` | Set env to `https://www.hoopchallenges.com` and redeploy | Header/footer hrefs on Production `/shoot` | Revert env + redeploy |
| Game Manual URL | App route `/shoot/game-manual` exists; external PDF env may be missing (SC-109) | Vercel env + Airtable presentation fields | Confirm PDF env if required for SC-109 Complete | Open Game Manual route; check download | Unset env |
| Zoom cover URLs | Web uses Airtable attachments / external media helpers | Airtable Zoom Meetings records | Fix broken cover attachments in base (OMNI) | Zoom catalog cards render | Restore prior attachment |
| Article categories | Web reads Airtable articles | Airtable Articles table | Fix category options if empty catalog | `/shoot/articles` | N/A |
| Weeks 9 / 10 content | Challenge-year engine supports variable week counts; content rows are base data | Weeks + curriculum tables | Seed/verify week rows for season length | Week generator dry-run + UI | Delete bad week rows |
| Fillout enrollment / daily URLs | Intake historically OFF (C-008); URLs not invented here | Fillout dashboard | Confirm forms when reopening intake | Submit test to Schmidt only | Keep OFF |
| Athlete authentication | Public demo / slug profiles; no full auth claimed Complete | Product decision + web routes | Decide auth wave separately | Demo athlete routes | N/A |
| Search indexing | `noindex` still present (SC-115 Decision Needed) | `web/app` metadata | Decide cutover indexing | View meta robots | Restore noindex |
| Current-season labels | Config / challenge-year fixtures | Config table `Is Current?` | Fail-closed if multiple current | `challenge-year` preflight | Clear extra Is Current |
| School year / grade-band examples | Docs + normalize helpers | Grade Bands table | Archive mojibake inactive bands | Grade band audit | Restore |
| Softr references | Marked Obsolete (SC-114) | Completion master | Do not restore Softr as launch path | Grep docs for “Softr required” | N/A |

## Safe repository fixes in this wave

- Recovery next-actions: MERGED banner for PRs #43–#47
- Truth audit document separating repo vs PROD
- Scenario catalog indexing SCN-030–043
- Landing URL guard already present; Playwright asserts hub `https://www.hoopchallenges.com`

## Intentionally untouched

- Live Airtable Zoom/Article/Week content
- Fillout form URLs (do not invent)
- Vercel production env (Mike only)
- Claiming SC-115 indexing Complete
