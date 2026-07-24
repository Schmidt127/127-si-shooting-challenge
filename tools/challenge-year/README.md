# tools/challenge-year

CLI for the Challenge-Year Configuration and Season Rollover Engine.

```bash
node tools/challenge-year/cli.js <command> [options]
```

| Command | Purpose |
|---------|---------|
| `generate-weeks` | Week 0..N + Post-Challenge plan |
| `validate-weeks` | Validate CSV/JSON weeks |
| `validate-enrollments` | Enrollment-year fixture validation |
| `validate-was` | WAS uniqueness fixture validation |
| `resolve-config` | Config resolution |
| `preflight` | Annual rollover preflight |
| `manifest` | JSON + Markdown + Weeks CSV |

Library: `lib/challenge-year/`. Docs: `docs/challenge-year/`.
