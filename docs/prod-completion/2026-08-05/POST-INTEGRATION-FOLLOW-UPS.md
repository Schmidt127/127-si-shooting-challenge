# Post-integration follow-ups (2026-08-05)

After squash-merging PRs **#66 → #65 → #64** into `master`.

**Tracking issue:** https://github.com/Schmidt127/127-si-shooting-challenge/issues/70

## Merge SHAs

| PR | Title | Squash merge SHA |
|----|-------|------------------|
| #66 | SC-009 photo homework E2E | `c79d6e4` |
| #65 | SC-007 / SC-008 reliability | `6f7f2d8` |
| #64 | SC-003–SC-006 testing control center | `3ce180c` |

## Final statuses (completion master)

| SC | Status |
|----|--------|
| SC-003 | Built in Repository |
| SC-004 | Live Tested in PROD |
| SC-005 | Live Tested in PROD |
| SC-006 | Live Tested in PROD |
| SC-007 | Live Tested in PROD |
| SC-008 | Live Tested in PROD |
| SC-009 | Live Tested in PROD (not Complete) |
| SC-150 | Complete |

## Mike actions remaining

### SC-003

1. Paste `docs/testing/views/OMNI-INSTALL-PROMPT.md` into Omni.
2. Complete `docs/testing/views/OPERATOR-CHECKLIST.md`.
3. Run `node tools/testing/verify_testing_views.mjs --require-installed`.
4. Advance SC-003 only after that passes.

### SC-009 / SC-101

1. Paste Airtable **070a v4.5** into PROD.
2. One controlled Schmidt photo upload.
3. Investigate Make **Accepted** without Airtable writeback (confirm Function URL + response consumption).
4. Do not add a second upload writer.

### Security (P0, separate)

Rotate credentials exposed during terminal troubleshooting. Do not rotate as part of the already-merged PRs.

## Confirmed non-actions

- No Lambda redeploy in this integration package.
- No credential commit or rotation in this package.
- SC-009 remains **Live Tested in PROD**, not Complete.
