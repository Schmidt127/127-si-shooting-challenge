# Owner decisions — 2026-09-06

These decisions supersede older open-status wording where there is a conflict.

## SC-166 — Coach Homework + Video Feedback work queues

**Status: COMPLETE / owner-verified (2026-09-06).**

Mike confirmed the Airtable Interface filter work is finished. Do not continue to list SC-166 as Mike-owned/manual or IN PROGRESS. No further SC-166 action is required unless a new defect is reported.

## FUT-003 — Stripe payment writeback

**Status: COMPLETE FOR CURRENT APP WORK / NO FURTHER ACTION NOW.**

The paid route was already validated. Mike is aware the Make scenario remains intentionally inactive until paid registration is opened. Do not keep presenting this as unfinished app work. Activation at registration-open time is an operational launch action, not a current development task. Free/$0/coupon routes remain outside current scope unless explicitly reopened.

## FUT-007 — AWS media naming

**Environment correction:** There is no DEV environment for this project. Do not create, require, or reference a DEV deployment/base as an execution dependency.

Current intent is to finish this once, using the existing Production architecture with safe feature-gating/dry-run controls. Existing S3 objects must not be renamed. New naming applies only to future uploads after explicit activation and verification. Before changing anything, audit the existing Lambda/S3/Airtable contract, identify exactly what remains behind the current flag, test non-destructively against controlled/disposable Production records or offline fixtures, then activate only after proof that existing upload/reviewer URLs and writebacks are unchanged.

## SC-SEASON-SIM-001 — simulation scope revision

Replace the old five-enrollment concept with a **three-athlete full-season simulation**. Reuse the proven SC-SEASON-SIM-002 infrastructure and safety model. The new run must use three disposable athletes with deliberately different behaviors so the combined run covers happy path, missed/broken-streak behavior, incomplete/late work, correction/replay/idempotency, milestones, levels, Perfect Week success/failure, Zoom live/recorded credit, video/homework XP, and weekly email handoffs in test/allowlisted mode only.

The simulation must run against the existing Production architecture because there is no DEV environment. It must remain dry-run by default, require an explicit execution phrase, stop on material failures, create only owned disposable records, and perform verified cleanup/restoration afterward.

## SC-170 — Vercel deployment storage cleanup

GitHub issue #426 was originally created as SC-161 before SC-161 was assigned to the Production leaderboard repair. The Vercel cleanup is now **SC-170**. SC-161 remains canonically the completed leaderboard repair.

SC-170 remains pending until a project-scoped Vercel token can be provided from desktop. Before deletion, Cursor must re-resolve current Production and never rely blindly on an older keep-set.
