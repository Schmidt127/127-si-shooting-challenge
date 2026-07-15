# S26 — Documentation / repo cleanup decision sheet

**Date:** 2026-07-14  
**Rule:** Do not indiscriminately delete. Never delete `chatgpt-recovery-*` or `media/`.

| Path / pattern | Classification | Rationale |
|----------------|----------------|-----------|
| `chatgpt-recovery-2026-07-14/` + `.zip` | **retain locally** | Mike recovery package |
| `media/**` | **retain locally** | Publicity assets |
| `airtable/schema/snapshots/c023-stage3-verify*/` | **commit** or **archive** later | Useful DEV/PROD schema evidence if intentional; review before discard |
| `docs/audits/_tmp_*` | **delete later** / **ignore** | Temp probe outputs |
| `docs/overnight-runs/_status-update-ready.md` | **delete later** | Stale scratch |
| `docs/overnight-runs/results/_stale_branch_raw.json` | **delete later** | Scratch |
| `tools/airtable/_probe_*` / `_c025_*` / `_tmp_*` / `_build_send_ready_zip.py` | **delete later** or promote intentional probes | Untracked overnight/debug; promote only if still needed |
| `tools/overnight/_tmp_*` | **delete later** / **ignore** | Cursor settings reconnaissance temps |
| `docs/v2/SHOOTING-V2-PROJECT-HANDOFF.md` (untracked) | **commit** after Lead review | Handoff draft — reconcile with PROJECT_STATE / CONTROL |
| Contradictory “do not start C2/D” notes in older status | **archive via superseding S25/S26 milestones** | Status log prepends newer truth |
| `.gitignore` for `_tmp_*` under tools/ | **update** when Mike approves | Optional hygiene — do not broad-ignore probes Mike still uses |

## Recommended Lead actions (not destructive tonight)

1. Commit intentional overnight packages (done under S26).
2. Leave recovery + media untouched.
3. After morning review, add selective `.gitignore` for `tools/**/_tmp_*` and `docs/audits/_tmp_*` if Mike agrees.
4. Do not auto-delete untracked tool files tonight.
