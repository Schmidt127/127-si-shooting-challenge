# FUT-014 — Homework page redesign and live Homework Library connection

**Backlog ID:** FUT-014  
**Status:** **Complete** (2026-08-26)  
**Systems:** Website `/shoot/homework`, Homework Library, Program Homework Assignments  
**Production route:** https://www.fairfieldbasketballclub.com/shoot/homework

## Brief Description field mapping (verified)

| Layer | Value |
|-------|--------|
| Airtable table | **Homework Library** |
| Airtable field | **`Brief Description - Display`** |
| Field ID | `fldAnHr3uTuDN5bs9` |
| Field type | `aiText` |
| Website property | `briefDescription` |
| Normalized path | `fetchScheduledHomeworkCatalog()` → `mapCurriculumToAssignment()` → `HomeworkAssignment.briefDescription` → `resolveInstructionsPreview()` → `instructionsPreview` |
| Card property | `assignment.instructionsPreview` |
| Test selector | `data-testid="homework-catalog-brief"` |
| Blank fallback | `Instructions coming soon.` |
| Previous mapping | **Correct** — already used `Brief Description - Display` |

### Explicitly not used on catalog cards

| Field | Used on catalog card? |
|-------|----------------------|
| `Full Assignment Description` | **No** (detail page only) |
| `Description` | **No** |
| `Assignment Title` | **No** for brief text (headline uses `title` / `displayName`; brief comes only from **`Brief Description - Display`**) |

## Completed Homework page features

- Live Homework Library + PHA schedule data (no hardcoded assignment count)
- Active/published assignment display via PHA `Active?` gate
- Newest assigned week first
- Assignment title
- Assigned week
- Brief Description from verified field
- Due date (PHA Due Date with Week End Date fallback)
- Resource links: `URL`, `URL Additional`, `Docs`
- Keyboard-accessible links
- Detail-page links preserved (`/homework/[id]`)
- Operator Notes removed from public catalog cards
- Mobile layout verified (390px)
- **Four published cards** verified in production

## Commits

| Commit | Summary |
|--------|---------|
| `cdd2b97` | Redesign Homework page and verify description mapping |
| `4a26aa4` | Homework verification documentation |

## Validation (2026-08-26)

| Check | Result |
|-------|--------|
| Lint | Pass (4 pre-existing unrelated warnings) |
| Typecheck | Pass |
| Vitest | **406/406** pass |
| Build | Pass |
| Production smoke | **50/50** pass |
| `homework-due-date.spec.ts` | **3/3** pass |
| Desktop verification | Pass |
| Mobile verification (390px) | Pass |
| Homework detail route | Pass |
| Live Airtable spot-check | `rechVLOeyEVIqmy2v` ↔ `Brief Description - Display` |

## Production verification

| Check | Result |
|-------|--------|
| Live URL | https://www.fairfieldbasketballclub.com/shoot/homework |
| Assignment count | 4 published (dynamic) |
| Newest week | Early Bird before Perfect Testing Week |
| Deployment evidence | Live page + smoke tests (no formal Vercel API status read) |

## Remaining limitations

- Catalog cards do not fetch `Full Assignment Description` (detail page only).
- `Published?` on Homework Library is not a catalog gate when PHA is active (by design).
- Brief text may include markdown/emojis from `aiText` source; cards render as plain text.
- Athlete dashboard homework widget uses a separate public-athlete-homework loader.
