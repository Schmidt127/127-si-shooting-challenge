# FUT-014 — Homework page redesign and live Homework Library connection

**Backlog ID:** FUT-014  
**Status:** Completed (2026-08-26)  
**Systems:** Website `/shoot/homework`, Homework Library, Program Homework Assignments

## Brief Description field mapping (verified)

| Layer | Value |
|-------|--------|
| Airtable table | **Homework Library** |
| Airtable field | **`Brief Description - Display`** (`aiText`; references Full Assignment Description + Assignment Rationale) |
| Data loader | `web/lib/data/homework.ts` → `mapCurriculumToAssignment()` |
| API query fields | `web/lib/airtable/homework-queries.ts` → `CURRICULUM_CATALOG_FIELDS` |
| Normalized property | `HomeworkAssignment.briefDescription` |
| Card preview property | `HomeworkAssignment.instructionsPreview` (`resolveInstructionsPreview(briefDescription)`) |
| Blank fallback | `"Instructions coming soon."` |
| Previous mapping | **Correct** — already used `Brief Description - Display`; not `Full Assignment Description` |

## Production promotion

No Airtable, Make, Fillout, Stripe, or schema changes.

1. Merge/push website commit to `master`.
2. Vercel auto-deploys from `master` (Root Directory: `web`).
3. Wait for deployment **Ready**.
4. Run `npm run test:smoke:prod` from `web/`.
5. Verify live `/shoot/homework` on desktop and mobile (390px width).
6. Spot-check one card’s brief text against Homework Library → `Brief Description - Display`.

## Files changed

- `web/lib/airtable/homework-queries.ts` — catalog fetch includes `URL`, `URL Additional`, `Docs`
- `web/components/homework/homework-catalog-view.tsx` — card redesign, resource links, privacy (no operator notes on catalog)
- `web/components/homework/homework-catalog-view.test.ts` — expanded catalog/state tests
- `web/lib/airtable/homework-queries.test.ts` — brief-description + inactive PHA tests
- `web/lib/data/homework.test.ts` — full-description exclusion test
- `web/docs/site-hierarchy.md` — homework data source note
- `docs/127-SI-MASTER-FUTURE-WORK-LIST.md` — FUT-014 completion record

## Validation checklist

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run test:smoke:prod`
- [ ] Live homework catalog loads active PHA-scheduled assignments only
- [ ] Newest assigned week first
- [ ] Brief Description from `Brief Description - Display`
- [ ] Resource links render when URL/Docs present
- [ ] Homework detail routes unchanged

## Remaining limitations

- Catalog cards do not fetch `Full Assignment Description` (detail page only).
- `Published?` on Homework Library is not a catalog gate when PHA is active (by design).
- Athlete dashboard homework widget uses a separate public-athlete-homework loader.
