# Troubleshooting guide

**Status:** Built / Tested (playbook)

## Weekly email built but not sent

1. Confirm Ready? + subject/recipients/HTML present (072).
2. Confirm Send to Make? armed (119 or manual) and Sent? unchecked.
3. Confirm 074 ON and webhook populated.
4. Confirm **sendMode=Live** on 074 (or blank + WAS Live). Fixed Test → email may deliver but **no** Sent? writeback.
5. Confirm Make scenario **Weekly Athlete Summary - Bulk Email - May 18** Live branch.

## Make Send Status=Sent but Sent? unchecked

Writeback incomplete or Test branch used. Do **not** manually invent a second send. Verify Make Live writeback modules; reconcile checkbox/timestamp carefully.

## Sent? checked but still Send to Make?

Duplicate-send risk. Clear Send to Make? immediately. Do not re-run 074.

## XP missing for processed submission

1. Search XP Events for Source Key.
2. If exists → fix status linkage only.
3. If absent → re-run 010 once after uniqueness check.

## Duplicate Source Keys

Keep lowest/correct Active record; deactivate extras. Never delete without Mike approval on PROD.

## Historical year noise

Filter to current Challenge Year. Clear build/send arms on historical WAS.

## Stale Build Weekly Email Now?

Inspect `Weekly Email Error`. Clear flag or rebuild with 072 after fix.

## Level recalc stuck

Confirm Levels + Level Gate Rules exist; re-trigger 041→042.

## RCC CLI errors

- Missing `--fixture`/`--input` → usage error.
- Invalid JSON → fix export.
- Malformed shape → ensure arrays under known table keys (see AUDIT-RUNNER.md).
