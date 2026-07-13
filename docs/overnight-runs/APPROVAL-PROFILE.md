# Overnight approval profiles

**Active profile:** **Balanced** (Version 1 initial)

**Manual Cursor setting (required):**  
**Cursor Settings → Agents → Approvals & Execution → Run Mode → Auto-review**

Repo file: `.cursor/permissions.json` (Balanced allowlist + block steering)

Mike has approved considering **Higher-autonomy overnight** after a successful two-session Desktop trial.

---

## Profile 1 — Conservative

| Category | Commands |
|----------|----------|
| Auto-allowed | `git status`, `git diff`, `git log`, `git branch`, `git fetch`, `git rev-parse`, `git show`; read-only Python test runs |
| Manual review | `git add`, `git commit`, `git merge`, `git push`, `git checkout`/`switch`, package installs |
| Blocked / steer block | `git reset`, `git clean`, force push, branch delete, file delete, AWS, deploy, credentials, env changes |

- **Interruptions:** High (many per stage)
- **Risk:** Low

---

## Profile 2 — Balanced (active)

| Category | Commands |
|----------|----------|
| Auto-allowed | Conservative read-only git; `git add`; `git commit`; `python tools/overnight/assert_git_lane.py`; `python -m unittest` for known suites; `python tools/airtable/c070a_overnight_offline_suite.py` |
| Manual review | `git merge`, `git push`, `git checkout`/`switch -c`, `pip install`, `npm install`, `gh` mutations, `.env` access |
| Blocked / steer block | `git reset --hard`, `git clean`, force push, branch deletion, destructive deletes, AWS, PROD/deploy, credentials, env changes, Airtable schema operations |

- **Interruptions:** Medium (roughly 2–6 per stage — mainly merge/push/checkout)
- **Risk:** Medium-low with branch guard

**Important:** Do not use bare `git` in `terminalAllowlist` — it matches all git subcommands.

---

## Profile 3 — Higher-autonomy overnight (deferred)

| Category | Commands |
|----------|----------|
| Auto-allowed | Balanced + `git merge` + `git push` + branch create for `overnight/*` only |
| Manual review | Package installs, AWS, PROD, commands outside repo |
| Blocked | Same destructive list as Balanced |

- **Interruptions:** Low
- **Risk:** Medium — requires proven branch guard + two-session trial PASS

**Promotion gate:** Mike explicit approval after Desktop v1 trial.

---

## Branch guard interaction

Broader auto-approval is only safe when combined with:

1. `python tools/overnight/assert_git_lane.py` before every commit
2. CONTROL.json canonical SHA verification before push
3. Push limited to `overnight/lead-integration` and `overnight/v2-run/*`

---

## Rollback

1. Remove or rename `.cursor/permissions.json`
2. Set Run Mode to Conservative behavior via IDE allowlist only
3. Operating rule still enforces branch guard and CONTROL.json
