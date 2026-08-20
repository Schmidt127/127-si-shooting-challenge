# Security and Sensitive Files

**Status:** Active  
**Last updated:** 2026-08-19  
**Current truth:** [`CURRENT-TRUTH.md`](./CURRENT-TRUTH.md)  
**Integrity audit:** [`REPOSITORY-INTEGRITY-AUDIT.md`](./REPOSITORY-INTEGRITY-AUDIT.md)

---

## Policy

1. Never commit API keys, PATs, OAuth secrets, webhook URLs with secrets, AWS keys, Vercel tokens, Tremendous keys, or private keys.  
2. Prefer placeholders: `REPLACE_WITH_*`, `Bearer REPLACE_WITH_AIRTABLE_TOKEN`, empty `Bearer `.  
3. Parent/guardian emails and athlete+contact combinations must not remain in committed exports.  
4. Athlete names in historical award/media packets may remain when needed for program history; treat as sensitive youth data.  
5. Local secrets live only in ignored `.env` / `.env.local` files.

---

## Redacted this audit (2026-08-19)

| File | What was removed | Replacement |
|------|------------------|-------------|
| `docs/overnight/config-xp/prod-config-snapshot.json` | ~36 unique parent emails in weekly payload fields | `[REDACTED_EMAIL]` |
| `docs/overnight/config-xp/prod-config-snapshot-2026-07-24.json` | Parent email(s) | `[REDACTED_EMAIL]` |
| `docs/overnight/communications/results/live-probe-20260723_223805.json` | ~36 unique parent emails | `[REDACTED_EMAIL]` |
| `docs/archive/sensitive/Award-Recipients-Grid-view-from-June-29-FINAL-REDACTED.csv` (moved from repo root) | Parent Email column values | `[REDACTED_EMAIL]` |

Notice files:

- `docs/overnight/config-xp/SENSITIVITY-NOTICE.md`
- `docs/archive/sensitive/README.md`

---

## Accepted non-secret emails (kept)

| Address / class | Why kept |
|-----------------|----------|
| `coach@127sportsintensity.com` | Org reply-to default in scripts/docs |
| `noreply@fairfieldbasketballclub.com` | Site/system address when present |
| Radio/TV newsroom emails in `media/**` | Public media outreach contacts |
| Fixture emails (`a@x.com`, `t@x.com`, `b@y.com`) | Unit tests |
| `mschmidt@fairfield.k12.mt.us` mentioned in investigation prose | Operator config documentation — not a secret; do not expand into recipient lists |

---

## Local ignored secrets (must stay untracked)

| Path | Notes |
|------|-------|
| `.env.local` | Root / web |
| `tools/airtable/.env` | PAT + optional AWS |
| `tools/airtable/.env.new-token` | Token rotation scratch |
| `make/exports/`, `*.local.json`, `*-unsanitized.json` | Unsanitized Make dumps |
| Nested `127-si-shooting-challenge/` | Accidental clone |
| `chatgpt-recovery-*` | Local recovery |

`.gitignore` already covers these patterns. This audit did not print or commit their contents.

---

## Blueprint credential posture

| Blueprint | Credential state |
|-----------|------------------|
| Tremendous v1/v2 | Make API-key credential placeholders only; HTTP to testflight |
| Upload engine templates | `REPLACE_WITH_PROD_*` placeholders |
| 117f email template | Retired for email; test inbox placeholder |

**Tremendous production API:** PENDING approval. Do not commit keys. Keep scenario OFF until approved + controlled live test.

---

## Media / publicity

`media/2025-2026/newspapers/**` contains athlete names, schools, and Airtable attachment URLs used for newspaper kits. These are intentional publicity assets. They do **not** include parent emails after this audit’s scans. Treat headshot URLs as time-limited CDN links, not secrets.

---

## Re-scan commands

```powershell
# Family-contact domains (should be empty outside intentional docs)
rg -n "@gmail\.com|@yahoo\.com|@hotmail\.com|@icloud\.com" --glob "!node_modules/**" --glob "!.git/**"

# High-risk secret shapes
rg -n "sk_live_|sk_test_|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|BEGIN (RSA |OPENSSH )?PRIVATE KEY" --glob "!node_modules/**" --glob "!.git/**"

# Make hooks that are not placeholders
rg -n "hooks\.make\.com/[a-zA-Z0-9]" make/ docs/ --glob "!**/node_modules/**"
```

---

## Residual risk (labeled)

| Risk | Status |
|------|--------|
| Athlete names remain in redacted award CSV and overnight snapshots | Accepted historical evidence — minimize redistribution |
| Foundation-reset JSON embeds full historical automation source text | Historical; org reply-to only; large files — do not treat as current paste |
| Git history still contains pre-redaction blobs | Expected — rewriting history was explicitly disallowed; future clones of old commits may still see emails |
| Local worktrees / nested clone may contain secrets outside this tree | Operator hygiene — outside repo-tracked scope |
