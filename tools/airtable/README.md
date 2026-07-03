# Airtable Schema Exporter

Exports schema metadata and optional record audits from the **127 SI Shooting Challenge** Airtable base.

GitHub holds the script and dated snapshots. Airtable remains the live production base.

## Setup

```bash
cd tools/airtable
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` with your Personal Access Token and base ID. The token needs **`schema.bases:read`** on this base (and `data.records:read` only if using `--include-record-audits`).

## Views (not exported — expected)

**Airtable view metadata is not exported** for this base. Do not treat empty `views_*.json` or a views API 404 as a problem to fix.

- Snapshots include **tables, fields, formulas, and links** only.
- View names and filters for the web app live in [`web/docs/airtable-views.md`](../../web/docs/airtable-views.md).
- Use `--skip-views` if you want slightly faster runs (default full export already skips meaningful view data).

See [`airtable/schema/snapshots/README.md`](../../airtable/schema/snapshots/README.md).

## Schema export (default)

Writes timestamped files to `airtable/schema/snapshots/`:

```bash
python export_airtable_schema.py -v
```

### Other programs

JR Referee Clinics, Tournament Brackets, and Dribble Challenge each have their own repo and `tools/airtable/` exporter. See [docs/MULTI-REPO-ARCHITECTURE.md](../../docs/MULTI-REPO-ARCHITECTURE.md).

Subset of tables:

```bash
python export_airtable_schema.py -v --only "Enrollments,Submissions,Weeks"
```

Skip views (optional; views are not exported anyway — see **Views (not exported)** above):

```bash
python export_airtable_schema.py -v --skip-views
```

Custom output folder:

```bash
python export_airtable_schema.py -v --out-dir ../../airtable/schema/snapshots/2026-06-20
```

## Record audits (optional)

Requires data record read access. Fetches records and writes operational audit JSON reports:

```bash
python export_airtable_schema.py -v --include-record-audits --out-dir ../../airtable/schema/snapshots/2026-06-20/audits
```

Audit reports include record counts, select usage, blank key fields, duplicate keys, XP Events health, date mismatches, level gate blockers, and homework pipeline checks.

## Outputs

Each run writes files such as:

- `schema_raw_*.json` / `schema_enhanced_*.json`
- `schema_doc_*.md` — human-readable schema snapshot
- `base_summary_*.json`, `export_health_report_*.json`
- `field_index_*.json`, `dependencies_*.json`
- `manifest_*_latest.json` — index of all files from the run

After a meaningful schema change, commit the dated snapshot folder and note it in `CHANGELOG.md`.

## Season close-out — Award Recipients cleanup (2025–2026)

Read-only Python helpers for end-of-season award fulfillment. They use `airtable_read.py` and a PAT with **`data.records:read`** (`tools/airtable/.env` or `web/.env.local`).

### Problem we fixed

During award catalog rename/cleanup, many **Award Recipients** rows kept the same athlete, week, and date but had the **Award** link pointed at the wrong catalog record. The June 29 grid export is the fulfillment truth for weekly cards sent through that date.

### Reference snapshot (Git)

| File | Purpose |
|------|---------|
| `Award Recipients-Grid view from June 29 FINAL.csv` (repo root) | Grid export before award name changes — **124 Sent/Pending rows** |
| `_preview/june29-snapshot-crossmatch-report.md` | Internal consistency check on that CSV (duplicates, Conquered Goal, etc.) |

### Scripts and reports

| Script | Output | Purpose |
|--------|--------|---------|
| `compare_award_recipients_snapshot.py` | `_preview/award-recipients-snapshot-vs-live.md` | Compare snapshot vs live; **done when** wrong links = 0, manual = 0, dupes = 0 |
| `audit_goal_conquer_reconciliation.py` | `_preview/goal-conquer-reconciliation.md` | **Separate** from award-link fix: Enrollment `Goal Met?` vs Conquered Goal recipient rows |
| `audit_awards_catalog_and_connections.py` | `_preview/awards-catalog-audit-report.md` | Awards catalog + recipient connection audit |
| `audit_final_awards.py` | `_preview/final-awards-audit-report.md` | End-of-challenge cart + grade-band standings |
| `preview_final_email.py` | `_preview/geraghty-final-email.html` | Per-athlete final summary email preview (revision `final-summary-2026-07-03-v2`) |
| `generate_final_summary_preview.py` | `_preview/final-emails/` | Batch HTML for all qualifying enrollments (`--all`) |
| `stage_final_emails_to_was.py` | `_preview/final-emails/stage-report-v2.json` | Write approved HTML to latest **Weekly Athlete Summary** (dry-run; `--confirm-write` to update Airtable) |
| `arm_final_emails_send.py` | `_preview/final-emails/arm-send-report.json` | Check **Send to Make?** on staged WAS rows → automation **074** (`--confirm-arm`) |
| `generate_final_awards_email.py` | `_preview/final-awards-end-of-season-email.html` | Public broadcast email from **In Amazon Cart** rows only |

**Individual final emails (2025–26 close-out):** Build with `preview_final_email.py`, stage with `stage_final_emails_to_was.py`, send via **074** only (not **072**). Skips enrollments with **Total Shots Counted ≤ 50**. Regenerate batch previews: `python generate_final_summary_preview.py --all`.

Run from `tools/airtable/`:

```bash
set PYTHONPATH=.
python compare_award_recipients_snapshot.py
python audit_goal_conquer_reconciliation.py
```

### Same checks inside Airtable (Scripting extension)

| Order | Extension script |
|-------|------------------|
| 1 | [`audit-final-award-recipients-closeout.js`](../../airtable/extension-scripts/audits/audit-final-award-recipients-closeout.js) — **one file**, copy all |
| 2 | `audit-final-goal-conquer-reconciliation.js` |
| 3 | `audit-final-awards-catalog-quick.js` |
| 4 | `audit-final-awards-cart-summary.js` |

Full list: [airtable/extension-scripts/audits/README.md](../../airtable/extension-scripts/audits/README.md) — Season close-out section.

Regenerate embedded snapshot after CSV changes:

```bash
python generate_june29_snapshot_data.py
```

### Cleanup workflow (plain English)

1. **Award link cleanup** — For each row in the snapshot, open the live row (same athlete + week + date). Change only the **Award** linked field to the current catalog name (cheat sheet in the comparison report). Do **not** delete Sent rows for cards already emailed.
2. **Duplicates** — Cancel/delete exact duplicate rows (same athlete + award + week + date).
3. **Manual review** — When two awards went out the same day, assign each live row to the correct award from the snapshot.
4. **Re-run** `compare_award_recipients_snapshot.py` until the report shows **0** wrong links, **0** manual review, **0** duplicates. **70** new Post Challenge / In Amazon Cart rows since June 29 is expected.
5. **Goal Met / Conquered Goal** — Run `audit_goal_conquer_reconciliation.py` separately. Athletes conquer the full shot target **once**; the Conquered Goal recipient row is the permanent gift-card log even if `Goal Met?` rollup moves later.

**Status (2026-07-02):** Award Recipients historical cleanup and Goal Met / Conquered Goal reconciliation both passed (14/14 aligned).

### Old award name → current catalog (snapshot era)

| June 29 export label | Link this award today |
|----------------------|------------------------|
| Homework - Submitted & Satisfactory | Homework Recognition Award |
| Level Leaders | Level Leader Award |
| Video Submission - Submitted | Video Submission Recognition Award |
| Video Submission - Make the Shout out Page | Shout-Out Video Award |
| Zoom - Attendance | Zoom Attendance/Participation Award |
| Zoom - Random Drawing Winner | Zoom Drawing — Winner |
| Zoom - Random Drawing Runner Up | Zoom Drawing — Runner-Up |
| Zoom - Random Drawing Third Place | Zoom Drawing — Third Place |
| Shots - Conquered Goal | Conquered Goal Award |
| Grade Band Award - Overall Achievement | Grade Band Achievement Award |
| Special Awards - Dedication | Dedication Award |
| Special Award - Random for Incentive | Random Drawing Incentive Award |

## Related docs

- Hand-maintained schema notes: `airtable/schema/current/`
- Airtable extension audits (in-base JS): `airtable/extension-scripts/audits/`
- Live ops snapshot: [docs/PROJECT_STATE.md](../../docs/PROJECT_STATE.md)
