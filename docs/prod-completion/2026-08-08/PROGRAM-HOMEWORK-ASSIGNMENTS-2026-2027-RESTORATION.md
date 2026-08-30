# Program Homework Assignments — 2026–2027 PROD Restoration

> **SUPERSEDED schedule note (2026-08-30):** Confirmed product rules are **Early Bird + Weeks 1–8 = 18 active PHA**, **Week 9 has no homework**, common **Due Date 2027-06-29**. Live Production matches that inventory (MRW-F11). The Week 9 HW17/HW18 / 90-row grade-band matrix below is **historical** from the 2026-08-08 restoration and must not be re-applied.

Date: 2026-08-08  
Environment: PROD Airtable `appn84sqPw03zEbTT`  
Program Instance: `rec5mEM0YPqPqq0hZ` — `Shooting Challenge | 2026-2027`

## Why this repair was required

During the 2026-08-08 completion audit, `Program Homework Assignments` (`tblhA3maf7xOa8EUS`) contained only eight records: two valid controlled Early Bird assignments plus six blank junk rows. The expected season schedule had disappeared.

That condition is unsafe because Automations 020/033 are designed to prefer Program Homework Assignments (PHA) for season-specific scheduling and fall back to reusable `FBC Curriculum - SYNC` Week links only when PHA has no match. The reusable curriculum still carries historical Week links, including HW17/HW18 on the prior-season Week 10.

## PROD action taken

Rebuilt the active 2026–2027 PHA schedule without modifying reusable curriculum Week links.

Season mapping:

| 2026–2027 Week | HW1 | HW2 |
|---|---|---|
| Week 1 | HW1 — Shot Tracker Usage | HW2 — Website Exploration |
| Week 2 | HW3 — The Choice is Yours | HW4 — Shooting Form and Technique |
| Week 3 | HW5 — Self Esteem and Accomplishment | HW6 — Layup Series Homework |
| Week 4 | HW7 — Touch and Talk | HW8 — 5 Spot Shooting Locations |
| Week 5 | HW9 — Mikan Drill | HW10 — Goal Setting — What GOATS do! |
| Week 6 | HW11 — Thank You Note | HW12 — Coach Yourself |
| Week 7 | HW13 — Visualization | HW14 — Build Your Freethrow Routine |
| Week 8 | HW15 — Bad Habit I Need to Fix | HW16 — Sportsmanship / Great Teammate |
| Week 9 | HW17 — Shooting Challenge Final Reflection Quiz | HW18 — Shot Tracker Summary |

The mapping was created for all five active grade bands:

- K-2 `recK7BDVSpHy2ipCS`
- 3-4 `reclWDQZzKbVBtdhG`
- 5-6 `recv9aWnHanY2sRgk`
- 7-8 `rec2VQFfGJa1ofA06`
- 9-12 `rec75ruo3XT5nSvaK`

Each Week has two slots (`HW1`, `HW2`), producing:

`9 weeks × 5 grade bands × 2 slots = 90 active season rows`

The two controlled Early Bird assignments were preserved:

- `reca5GM1JkROhXOiy` — HW1 / Shot Tracker Usage / Early Bird / 3-4
- `reccQhrgOK8e8Yngv` — HW2 / Website Exploration / Early Bird / 3-4

Six blank records were deleted:

- `rec38vQjMT0dx7JdF`
- `rec44saqzcLmPu1fb`
- `recFUR7vgQS6p1QeQ`
- `recYNvsYMiy6dN3Q5`
- `rectqM2WTHWZaNkvF`
- `recuojCuj8kswlHtE`

## Readback proof

Post-repair Airtable readback returned:

- 92 total PHA records
- 90 records scoped to 2026–2027 Weeks 1–9
- 2 preserved Early Bird controlled fixtures
- all 90 regular-season rows Active
- Week 9 contains HW17/HW18 for every active grade band
- generated Schedule Keys are populated from Program Instance + Week + Grade Band + Slot + Homework identity

Representative Week 9 records:

| Grade band | HW17 record | HW18 record |
|---|---|---|
| K-2 | `recbgm10qPmz5BjfZ` | `recM6oTrtmnvD9Vpl` |
| 3-4 | `recjAIzTN31LW6RCu` | `recCaBVW23egHo7iq` |
| 5-6 | `recBfEcITuchR2YaX` | `recONFbh8sna0Fh6T` |
| 7-8 | `rectQA4DisMY4O9Fb` | `recBSb7tig6yoQdku` |
| 9-12 | `recLUkEVMnlu4enJy` | `recH7S4kmMWDdYgBv` |

## Related code finding — Automation 067

Automation 067 v2.0 still resolves the HW17 Week directly from the reusable `FBC Curriculum - SYNC -> Week` link. The reusable HW17 record currently points at a legacy 2025–2026 Week 10, so restoring PHA data alone does not make Final Reflection ingestion season-safe.

GitHub issue #120 tracks the required 067 PHA-first repair.

Do **not** modify `FBC Curriculum - SYNC.Week` as a workaround. The library is reusable; PHA is the season-specific scheduling layer.

## Automation 068 repair

Automation 068 was independently made safe for this architecture:

- v1.1 commit: `6eab13bc017ef11f9f97fe30c676862775b80eac`
- regression update: `8c8dd07cf5e7b16ab13dde6f602e25df8cbe476a`

068 now resolves only the active HW17 curriculum identity and reconciles each Homework Completion using that completion's own Enrollment + Week. It no longer consumes the reusable curriculum Week link.

This means an HW17 completion already assigned to 2026–2027 Week 9 can reconcile to its Week 9 Weekly Athlete Summary even while the reusable curriculum record retains a legacy Week 10 link.

## Challenge Week Count note

The active Config still declares Challenge Week Count = 10. This document does **not** change that value. Homework occupying Weeks 1–9 does not prove the challenge itself is only nine regular weeks; challenge-year tooling treats regular week count as a separate season parameter.

Week 10 / Post-Challenge calendar validity should be evaluated through the challenge-year validation package before changing Config or Program Instance Week links.

## Remaining work

1. Repair 067 under issue #120 and add PHA-first regression cases.
2. Paste/test the repaired 067 in PROD using controlled Schmidt enrollment `recCyFEPeATOVNlr9`.
3. Verify Final Reflection resolves to 2026–2027 Week 9 without changing the curriculum library Week.
4. Validate the 10-week + Post-Challenge calendar through SC-032/SC-065 tooling before editing Config.
5. Update the Completion Master only as supported by live evidence.
