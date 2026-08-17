# Tutorials & Assets web cutover (2026-08-17)

Web `/shoot` media catalogs now read **Tutorials & Assets** only.

| Item | Value |
|------|--------|
| Table | `Tutorials & Assets` |
| Table ID | `tblDOTgsWfqPm18bw` |
| Deleted (do not use) | `Tutorials` / `tbldfoVGdhqATi4MS` |
| Page title | Skills and Technique Tutorials |
| Deploy path | Push `master` → Vercel project root `web` |

## Promotion / post-deploy checks

1. Confirm Vercel production deployment succeeded for the cutover commit.
2. Confirm `Web - Tutorials Catalog` exists on **Tutorials & Assets**, or rely on formula fallback:
   `AND({OK to Publish on Softr} = "checked", OR({Associated Program} = "", FIND("Shooting Challenge", ARRAYJOIN({Associated Program}))))`
3. Confirm published rows use `OK to Publish on Softr` = `checked` (single-select, not checkbox).
4. Spot-check:
   - https://www.fairfieldbasketballclub.com/shoot/tutorials
   - one tutorial detail (poster visible before play)
   - https://www.fairfieldbasketballclub.com/shoot/shoutouts
   - https://www.fairfieldbasketballclub.com/shoot/articles
5. Confirm runtime requests use table name `Tutorials & Assets` only — never `Tutorials` / `tbldfoVGdhqATi4MS`.

## Out of scope

- No Airtable record/field/table changes from this web deploy
- No email / Make / Lambda changes

## Closeout notes

| Step | Status |
|------|--------|
| Code + tests + build | Done |
| Docs / CHANGELOG / C-026 backlog / PROJECT_STATE | Done |
| Commit | `5a8bb3a` on `master` |
| Push to `origin/master` (Vercel trigger) | Done 2026-08-17 |
| Live spot-check | Mike — after Vercel deploy green |
