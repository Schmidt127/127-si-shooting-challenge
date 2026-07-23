# Security & Privacy Audit — 2026-07-21

- **Repo:** `Schmidt127/127-si-shooting-challenge`
- **Branch:** `overnight/security-audit-2026-07-21`
- **Base commit at audit start:** `147b5f737241ec4a2dfd7c4a9cfd849adbc9e6ec`
- **Auditor:** Cursor agent (read-only)
- **Scope:** Repository working tree + Git-tracked files + a light Git-history check.

> **Redaction policy:** No live secrets, tokens, webhook URLs, athlete names, or
> parent email addresses are reproduced in this report. Findings describe the
> *type* of exposure and its *location* only. Verify specifics locally with the
> validation commands at the end of this document.

---

## Method & constraints honored

- No modifications to Airtable, Make, Gmail, Vercel, API credentials, environment
  variables, webhooks, production data, or live services.
- No credentials rotated or deleted. No Git history rewritten. No evidence files removed.
- No discovered secret text copied into this report.
- Secret scanning performed with repository-local `ripgrep`/Grep, `git ls-files`,
  `git check-ignore`, and `git log` (history read only).
- Ripgrep respects `.gitignore`, so this scan primarily reflects **trackable**
  content plus untracked-but-not-ignored files. Already-ignored local files
  (e.g. `.env.local`) were intentionally not opened for their secret values.

### Deviation note (branch base)

The working tree was on `overnight/docs-cleanup-2026-07-21` with uncommitted edits
and many untracked files at audit start. To avoid disturbing that in-progress work,
the audit branch was created from the current `HEAD` (`147b5f7`) rather than from
`master` (`4b5c91a`). This preserves the working tree exactly. Only the audit report
and `.gitignore` improvements are staged in the audit commit.

---

## Executive summary

- **No live credentials were found in Git-tracked files.** No Airtable Personal
  Access Token, no real Make webhook URL, no real Bearer token, and no AWS/Google/
  Slack/GitHub/OpenAI keys or private keys were detected. All such references are
  placeholders (e.g. `patXXXX…`, `REPLACE_WITH_AIRTABLE_TOKEN`,
  `REPLACE_WITH_DEV_CUSTOM_WEBHOOK`) or validation-only hostnames.
- **The primary risk is privacy, not secrets.** Multiple Git-tracked files contain
  **PII of minors** (athlete full names, schools, towns, grades, gender) and, in one
  file, **parent email addresses**. Binary media packets containing athlete photos
  are also tracked.
- **Git history is clean** of committed `.env`/`.env.local` files.
- **Immediate credential rotation: NOT required** based on this repository scan
  (no live secret exposure via Git). See per-finding notes.

**Highest-priority action:** confirm the GitHub repository is **private**, and
review/relocate the tracked minor-PII files (see Critical/High findings).

---

## Severity legend

| Level | Meaning |
|-------|---------|
| Critical | Live credential exposure, or contact PII of minors, in a way that could be publicly accessible |
| High | Sensitive PII of minors tracked in Git (names/photos/schools) |
| Medium | Identifiers or artifacts that weaken defense-in-depth or risk future accidental exposure |
| Low | Minor information disclosure (usernames, internal IDs, housekeeping) |
| Informational | Confirmed-safe / good-practice observations |

---

## CRITICAL

### C1 — Parent email addresses + minor athlete names in a tracked CSV at repo root

- **File:** `Award Recipients-Grid view from June 29 FINAL.csv`
- **Location:** repository root; header row + ~125 data rows
- **Type of exposure:** Contact PII of families of minors — parent email addresses,
  athlete full names, award/gift-card details, and Airtable record IDs.
- **Git-tracked:** **Yes**
- **Immediate credential rotation recommended:** No (not a credential). This is a
  privacy exposure, not a secret.
- **Recommended action:**
  1. Confirm the GitHub repo is private (see L-visibility note below).
  2. Remove this file from the working tree and relocate it outside the repo (or to
     an encrypted/private store). Do **not** auto-delete — leave for Mike to action.
  3. If the repo is or ever was public, treat as a reportable privacy incident and
     purge from history via a dedicated, approved history-rewrite task (out of scope here).
  4. Add a scoped ignore rule for stray root-level exports going forward.

---

## HIGH

### H1 — Tracked athlete/PII exports under `media/2025-2026/newspapers/`

- **Files (tracked):**
  - `media/2025-2026/newspapers/athlete-master-export.csv` (~65 athletes)
  - `media/2025-2026/newspapers/athlete-school-town-index.csv`
  - `media/2025-2026/newspapers/award-recognition-export.csv`
  - `media/2025-2026/newspapers/master-athlete-coverage-checklist.csv`
  - `media/2025-2026/newspapers/headshot-inventory.csv`
- **Location:** each is a header + per-athlete rows
- **Type of exposure:** PII of minors — full names, school, city/town, grade,
  gender, and Airtable record IDs.
- **Git-tracked:** **Yes**
- **Immediate credential rotation recommended:** No (not a credential).
- **Recommended action:** These support a legitimate publicity workflow
  (`media/README.md`), so do **not** blanket-ignore. Instead: (a) confirm repo is
  private; (b) confirm parental/publicity consent covers storing this data in the
  repo; (c) consider moving athlete PII exports to a private data store and keeping
  only non-PII working files in Git. Leave file changes to Mike.

### H2 — Tracked media packet ZIPs containing athlete photos + names

- **Files (tracked, representative):**
  - `media/2025-2026/newspapers/final-packets/*-SEND-READY.zip`
  - `media/2025-2026/newspapers/final-packets/*-WITH-PHOTOS.zip`
  - `media/2025-2026/newspapers/final-packets/*/Photos.zip`
- **Type of exposure:** Generated packet archives that bundle athlete photographs
  together with names/schools/towns (images of minors).
- **Git-tracked:** **Yes** (binary blobs in history)
- **Immediate credential rotation recommended:** No (not a credential).
- **Recommended action:** Same as H1 — confirm private repo + consent. Recommend
  moving large media/photo binaries out of Git (e.g., private cloud storage or
  Git LFS) so children's images are not permanently embedded in Git history.
  Do not auto-remove.

### H3 — Generated `_preview/` artifacts are tracked despite the ignore rule

- **Path:** `tools/airtable/_preview/**` (approximately 246 tracked files, including
  `tools/airtable/_preview/awards-top3-by-grade-band.csv`)
- **Type of exposure:** Generated operational previews — some contain athlete award
  data. `.gitignore` ignores `_preview/` for *new* files, but these were tracked
  before the rule and remain tracked (Git ignore does not untrack existing files).
- **Git-tracked:** **Yes**
- **Immediate credential rotation recommended:** No.
- **Recommended action:** Review whether any `_preview/*` file contains PII; for
  those that do, `git rm --cached` (Mike-approved) so they stop being tracked while
  remaining on disk. Not auto-actioned here.

---

## MEDIUM

### M1 — Production Airtable base ID committed repo-wide

- **Representative file:** `docs/airtable-base-map.md` (base ID documented), plus
  many docs, schema snapshots, and fixtures.
- **Value type (redacted):** Production base ID of the form `app…` (Shooting
  Challenge production base). The DEV base ID (`app…`) is likewise present.
- **Type of exposure:** Airtable base IDs are identifiers, not secrets — they are
  useless without a valid token. Still, broad exposure weakens defense-in-depth if a
  token ever leaks.
- **Git-tracked:** **Yes** (widespread)
- **Immediate credential rotation recommended:** No.
- **Recommended action:** Accept as documented behavior, but ensure Airtable tokens
  are always scoped/short-lived and never committed. No file change recommended.

### M2 — Recovery ZIP present and NOT ignored

- **File:** `chatgpt-recovery-2026-07-14.zip` (repo root)
- **Type of exposure:** Recovery archive likely mirroring docs (the sibling
  `chatgpt-recovery-2026-07-14/` folder holds ~91 doc-like files and *is* already
  ignored). The `.zip` is untracked but **not** ignored, so it can be committed by a
  careless `git add`.
- **Git-tracked:** No (untracked); **not ignored**
- **Immediate credential rotation recommended:** No.
- **Recommended action:** Added a `.gitignore` rule for recovery ZIPs (see below).
  Recommend Mike move/delete the local ZIP manually once no longer needed.

### M3 — Temp DEV export left in repo and NOT ignored

- **File:** `docs/audits/_tmp_missing_sa_fields_dev.json`
- **Type of exposure:** Temporary DEV data dump (schema/field gap output). Untracked
  but not ignored → accidental-commit risk.
- **Git-tracked:** No (untracked); **not ignored**
- **Immediate credential rotation recommended:** No.
- **Recommended action:** Added a `.gitignore` rule for `_tmp_*.json` (see below).

---

## LOW

### L1 — Production Airtable record IDs throughout the repo

- **Representative files:** `docs/testing/C-025-stage17-test-fixtures.json`,
  numerous `docs/`, `tools/airtable/`, `airtable/schema/snapshots/`, and audit JSONs.
- **Type of exposure:** Record IDs of the form `rec…`. These are opaque identifiers,
  not secrets, but some point at real production enrollment/award records.
- **Git-tracked:** **Yes** (widespread)
- **Immediate credential rotation recommended:** No.
- **Recommended action:** No change required; prefer synthetic/sandbox IDs in new
  fixtures where practical.

### L2 — Personal machine paths in tracked files

- **Files (tracked):**
  - `tools/make/extract_and_patch_v2_blueprint.py` (line ~13)
  - `media/2025-2026/radio/BUILD-SUMMARY.md` (multiple lines)
- **Type of exposure:** Absolute Windows paths revealing the local username
  (`C:\Users\<username>\…`). Minor information disclosure; no credential.
- **Git-tracked:** **Yes**
- **Immediate credential rotation recommended:** No.
- **Recommended action:** Replace absolute paths with repo-relative paths on next
  edit. Not auto-changed (out of audit scope).

### L3 — Nested duplicate repository inside the working tree

- **Path:** `127-si-shooting-challenge/` (contains its own `.git/`, `.gitignore`,
  `web/`, and duplicated automation files)
- **Type of exposure:** A nested partial clone duplicates repo content and can cause
  confusion and duplicate copies of any sensitive file. It is already ignored by the
  outer repo, so it will not be committed.
- **Git-tracked:** No (ignored)
- **Immediate credential rotation recommended:** No.
- **Recommended action:** Recommend Mike review and remove this nested directory
  manually. Not auto-removed (per instructions: do not delete evidence/files).

### L4 — `.gitignore` attribution ambiguity

- **Observation:** `git check-ignore -v` attributes ignore matches for
  `chatgpt-recovery-2026-07-14/`, `tools/overnight/`, and the nested
  `127-si-shooting-challenge/` to `.gitignore:37`, but line 37 of the outer
  `.gitignore` is blank in the editor view, and line-count tools disagree
  (`Get-Content -Line` vs. displayed content). This suggests a line-ending/encoding
  quirk in `.gitignore`.
- **Type of exposure:** None directly; but ambiguous ignore parsing can cause a file
  to be tracked/ignored unexpectedly.
- **Git-tracked:** N/A
- **Recommended action:** Normalize `.gitignore` line endings (LF) and re-verify with
  `git check-ignore -v <path>`. The new rules added by this audit were appended and
  verified independently.

---

## INFORMATIONAL (confirmed-safe / good practice)

| ID | Observation |
|----|-------------|
| I1 | `.env.local` exists locally, is **gitignored**, and is **not tracked** — correct. Its secret values were intentionally not opened. |
| I2 | Only `.env.example` files are tracked (`.env.example`, `tools/airtable/.env.example`, `web/.env.local.example`, `web/.env.example`) and use placeholders (e.g. `AIRTABLE_TOKEN=patXXXX…`). |
| I3 | Make blueprints are sanitized: `make/blueprints/upload-asset-engine-v2-with-file-hash-duplicate-check.json` and `make/blueprints/c025-117f-zoom-recording-approval-email-dev-v1.blueprint.json` use `Bearer REPLACE_WITH_AIRTABLE_TOKEN` / `REPLACE_WITH_DEV_CUSTOM_WEBHOOK` and include an explicit "Do not commit webhook URL" note. |
| I4 | `hook.us1.make.com` appears only as a validation **hostname** (e.g. `117f-zoom-recording-send-approval-email.js`), never a full webhook URL with a token path. |
| I5 | `web/lib/security/index.test.ts` uses a dummy literal `"secret-token"` in tests — not a real secret. |
| I6 | `tools/overnight/` (ignored) holds editor/agent cache dumps (`_tmp_state_out.txt`) with local paths and Cursor workspace/agent IDs — no credentials. |
| I7 | Git history contains **no** committed `.env`/`.env.local`; the only history hit was a *script named* `tools/airtable/c013_dev_rotate_secrets.py`, which contains no hardcoded secret. |
| I8 | No AWS (`AKIA…`), Google (`AIza…`), Slack (`xox…`), GitHub (`ghp_…`), OpenAI (`sk-…`), or PEM private keys found anywhere scanned. |

---

## Credential rotation determination

**No immediate credential rotation is recommended from this repository scan.** No
live secret was found exposed in Git-tracked files or in Git history. Local secrets
in `.env.local` are correctly ignored and were not exposed by the repository.

Caveat: this scan cannot see the contents of already-ignored local files, and does
not perform a deep full-history secret sweep. If desired, run a dedicated history
secret scan (e.g. `gitleaks detect`/`trufflehog`) as a follow-up task.

---

## `.gitignore` improvements applied

Scoped, non-destructive additions for clearly local/generated artifacts only. No
source directories or legitimate test fixtures were broadly ignored.

- Recovery archives: `chatgpt-recovery-*.zip`, `*-recovery-*.zip`
- Temporary JSON dumps: `**/_tmp_*.json`
- Reinforced local env safety: `**/.env.*.local`

Media packet ZIPs and athlete CSVs were intentionally **not** ignored (legitimate
work product; ignoring would neither untrack them nor address the privacy concern).

---

## Validation commands

Run from the repo root (PowerShell). None of these modify state.

```powershell
# Confirm no live Airtable PAT / API keys in tracked-scope
rg -n "pat[a-zA-Z0-9]{16}\.[a-zA-Z0-9]{32,}"
rg -n "AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z]{30,}|sk-[A-Za-z0-9]{20,}"

# Confirm Make webhooks are hostnames/placeholders only (no token path)
rg -n "hook\.(us1|us2|eu1|eu2)\.make\.com/[A-Za-z0-9]{6,}"

# Locate tracked PII exports
git ls-files "*.csv"
git ls-files "media/2025-2026/newspapers/final-packets/*.zip"

# Confirm env hygiene
git ls-files | Select-String "\.env"
git check-ignore .env.local

# Confirm new ignore rules take effect
git check-ignore chatgpt-recovery-2026-07-14.zip
git check-ignore docs/audits/_tmp_missing_sa_fields_dev.json

# History hygiene (read-only)
git log --all --oneline --name-only --diff-filter=A -- ".env" ".env.local" "**/.env" "**/.env.local"
```

---

## Recommended follow-up (for Mike / approval required)

1. **Confirm GitHub repo visibility is private** (`Schmidt127/127-si-shooting-challenge`).
   This is the single most important control given tracked minor PII.
2. Decide on relocation/removal of C1 and H1–H3 PII files (Mike-approved
   `git rm --cached` + move to private store; history purge only if repo was public).
3. Consider Git LFS or an external private asset store for media/photo binaries.
4. Optional: run `gitleaks`/`trufflehog` full-history secret scan as a follow-up.
5. Review and remove the nested `127-si-shooting-challenge/` directory (L3).
6. Normalize `.gitignore` encoding/line endings (L4).
