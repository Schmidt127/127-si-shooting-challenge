# Tutorials content tools (read-only)

Online Agent 8 utilities for Tutorials vs `Tutorials & Assets` consolidation readiness.

## Commands

```bash
cd tools/tutorials-content
npm test
npm run audit:duplicates -- --source ../../tests/fixtures/tutorials-content/tutorials-assets-source.json --target ../../tests/fixtures/tutorials-content/tutorials-canonical.json
npm run validate:quality -- --input ../../tests/fixtures/tutorials-content/quality-cases.json
```

## Guarantees

- No Airtable API calls
- No credential usage
- No production writes
- Optional `--out` report files only when requested
)
