# Public `/shoot` Production verify — 2026-08-25

**Package:** Step 1 equivalent of post–#43–#48 sequence (domain migrated)  
**Authority:** `docs/CURRENT-TRUTH.md`  
**Method:** HTTP GET from cloud agent (no Vercel dashboard mutation)

## Verdict

| Check | Result |
|-------|--------|
| Public URL | https://www.fairfieldbasketballclub.com/shoot |
| Production GitHub deployment SHA | **`f334c7a`** (`f334c7ab9594d17f873a513079984f470100f7bd`) |
| `origin/master` | Same SHA |
| `/shoot` HTTP | **200** |
| Triple-o typo `hooopchallenges.com` | **Absent** |
| Legacy `hoopchallenges.com` host in HTML | **Absent** (site uses fairfieldbasketballclub.com) |
| `/shoot/api/airtable` | `ok:true`, `tokenValid:true`, base preview `appn84…` |
| Core public routes | All **200** (JSON) |

Machine evidence: [`public-shoot-prod-verify.json`](./public-shoot-prod-verify.json)

## What this proves

- Production web tip matches current `master`.
- Historical #45 landing typo is not present on the current public host.
- Public surface still answers against PROD Airtable token on Vercel.

## What this does not prove

| Item | Why |
|------|-----|
| Exact Vercel Production env values | Dashboard not mutated/attested this run |
| Full Playwright matrix | Optional Mike/Cursor follow-up |
| Airtable paste status for 022 / 010 / 072 / 073 | Separate packages |

## Related

- Start packet: [`START-HERE-NEXT-PACKAGES.md`](./START-HERE-NEXT-PACKAGES.md)
- Deployment notes: `docs/deployment-notes.md`
- Prior smoke (hoopchallenges era): `docs/prod-completion/2026-07-25/PUBLIC-SHOOT-SMOKE.md`
