# Stage S22 — AUTHORIZED

## Stage

| Field | Value |
|-------|-------|
| Stage ID | S22 |
| Package ID | `phase-a-006-021-consolidate-117` |
| Base SHA | `d4659142725b69e1cf153cbf8297cf5576c91613` |
| Date | 2026-07-14 |

## Objective

Phase A only: consolidate DEV 006+021 into one Submissions prep automation, free +1 slot, paste **117** orchestrator OFF (blank webhook). No Phase B, PROD, or Folder 07 OFF changes.

## Authorized scope

- GitHub combined script + rollback copies
- Offline + DEV API fixture tests
- Docs / CONTROL / migration record
- Commit + push Lead
- Mike UI only for: paste combined into 021, retire 006 slot, create 117 (Meta automations API 403)

## Not authorized

- Phase B+ consolidations
- PROD
- Altering OFF Folder 07 automations (070a–078 etc.)
- Deleting automations because they are OFF

## Definition of done

- [ ] Rollback copies preserved
- [ ] Combined script on GitHub
- [ ] Offline tests PASS
- [ ] Live DEV evidence recorded (API and/or post-paste)
- [ ] 006 retired after PASS → +1 free → 117 OFF pasted (or Mike UI sheet at exact stop)
- [ ] Docs + CONTROL updated; Lead pushed
