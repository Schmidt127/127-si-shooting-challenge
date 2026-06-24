# Stage J — Field Cleanup & Legacy Discovery

Stage J runs **after** pipeline audits and backfills (Stages A–H). Goal: prove canonical fields are in use and identify legacy cruft.

## Stage J status (2026-06-24)

| Check | Result |
|-------|--------|
| Stage H video XP audit | **PASS** — `issueTotal: 0`, 99/99 XP-ready rows OK |
| Field coverage (v1.0 profiles) | **PASS** — no `likelyUnusedFields` in canonical pipeline |
| WAS field name drift | Fixed in audit v1.1 (`Submissions`, `Weekly Email Sent?`) |
| Video + achievement profiles | Added in audit v1.1 |

## Run order (perfection pass)

```text
1. audit-field-coverage-report.js      (v1.1 — full profiles)
2. audit-xp-linkage-coverage.js        (explains partial Submission / WAS fill)
3. audit-orphan-xp-events.js           (v1.1 — repair WAS gaps)
4. audit-achievement-xp-pipeline-integrity.js   (Stage I — unlocks + streaks)
```

Re-run safe backfills only when an audit reports `issueTotal > 0`.

---

## Interpreting field coverage

| Fill rate | Meaning |
|-----------|---------|
| **~100%** on active/counted rows | Live pipeline field — keep |
| **Low but non-zero** | Often normal (homework slots, email triggers, type-specific XP links) |
| **0%** after backfills | Strong legacy/delete candidate — confirm in automations first |

### Expected low-fill fields (not bugs)

| Field | Why |
|-------|-----|
| Homework Name 1 / 2 | Only homework submissions |
| Submission Assets (on Submissions) | Only upload submissions |
| Send to Make Trigger | Transient — clears after Make handoff |
| Video Feedback / Homework Completion (on XP Events) | Type-specific XP only |
| Send to Make? / Weekly Email Sent? (on WAS) | Only after email package built/sent |
| Homework Completions Link (on WAS) | Only weeks with homework activity |

---

## Known LEGACY fields (manual cleanup list)

From schema snapshot — **hide from views first**, delete only after season review:

| Table | Field | Notes |
|-------|-------|-------|
| XP Reward Rules | `LEGACY - XP Reward - DO NOT USE` | Old reward config |
| Weekly Athlete Summary | `Weekly Bonus XP Earned - LEGACY DO NOT USE` | Superseded rollup |
| (table) | `ZZZ LEGACY - Homework` | Do not link new records |

Search Airtable for: `LEGACY`, `DO NOT USE`, `ZZZ` to find others.

---

## XP linkage expectations

After `audit-xp-linkage-coverage.js`:

- **~78% Submission link** on XP Events is normal — Zoom, Streak, Perfect Week, Shot Milestone, and Manual Bonus XP do not require Submission.
- **~97% Week + WAS** — remaining gaps should be fixed via `audit-orphan-xp-events.js` + WAS backfills.

### Legacy streak XP (68 rows as of 2026-06-24)

`audit-orphan-xp-events.js` reports `missingEnrollmentOrWeekCount: 68` — all legacy `STREAK_OCCURRENCE|` streak XP with Enrollment but **no Week**. Week exists on the Streak Occurrence; it was never copied to XP.

**Fix:**

1. `backfill-legacy-streak-xp-week-and-was.js` — `DRY_RUN=true` first, then `CONFIRM_WRITE=true` in batches of 25  
2. Re-run `audit-orphan-xp-events.js` until `issueTotal` is 0  

Do **not** delete these rows — repair links and optionally migrate Source Key to `STREAK_XP|`.

---

## Stage I

Achievement parity audit: `audit-achievement-xp-pipeline-integrity.js`

- **Unlocks** — `XP Award Status = Awarded` vs 059 source keys (`PERFECT_WEEK|`, `SHOT_MILESTONE|`)
- **Streaks** — `Source Status = Awarded` vs 054 keys (`STREAK_XP|`)

Legacy `STREAK_OCCURRENCE|` XP missing Week: `backfill-legacy-streak-xp-week-and-was.js`.

---

## Related

- [Audits README](../extension-scripts/audits/README.md)
- [Safe backfills README](../extension-scripts/safe-backfills/README.md)
- [CHANGELOG](../../CHANGELOG.md)
