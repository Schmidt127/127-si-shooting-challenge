# Season launch validators

Offline tools for the 2026–2027 package. No Airtable API calls.

## validate-2026-2027-package.mjs

```bash
node tools/season-launch/validate-2026-2027-package.mjs
```

Reads `docs/challenge-year/generated/2026-2027/` and writes `validation-report.json`.

Exit codes: `0` = PASS or PASS WITH WARNINGS · `1` = FAIL

## Related

- `tools/challenge-year/cli.js` — week generation, launch-preflight (needs export JSON)
- `tools/enrollment-season/` — Fillout payload validators
