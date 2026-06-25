# Stage J — Field Cleanup & Legacy Discovery

Stage J runs **after** pipeline audits and backfills (Stages A–H). Goal: prove canonical fields are in use and identify legacy cruft.

## Pipeline status (Stages A–J)

| Stage | Focus | Audit | Status |
|-------|--------|-------|--------|
| **A** | Submission intake | `audit-submission-pipeline-integrity.js` | Re-run to confirm |
| **B** | Submission XP (010) | `audit-xp-vs-submissions.js` | Re-run to confirm |
| **C** | Weekly summary / WAS | `audit-orphan-xp-events.js` | **PASS** (2,285/2,285) — re-run to confirm |
| **D** | Assets created | `audit-submission-pipeline-integrity.js` | Re-run to confirm |
| **E** | Homework upload | `audit-homework-completion-upload-edge-cases.js`, `audit-stuck-upload-processing.js` | Re-run to confirm |
| **F** | Homework XP (065) | `audit-homework-pipeline-integrity.js` | Re-run to confirm |
| **G** | Video upload | `audit-video-pipeline-integrity.js` | Re-run to confirm |
| **H** | Video XP (114) | `audit-video-xp-pipeline-integrity.js` | **PASS** — `issueTotal: 0` |
| **I** | Achievements / streaks | `audit-achievement-xp-pipeline-integrity.js` | **PASS** — 114 unlocks, 324 streaks, `issueTotal: 0` |
| **J** | Legacy cleanup | `audit-legacy-cleanup-candidates.js`, `audit-field-coverage-report.js` | **In progress** — manual field delete |

### Stage I repairs completed (2026-06-24)

- `backfill-legacy-streak-xp-week-and-was.js` — legacy streak XP Week/WAS
- `backfill-legacy-streak-xp-source-keys.js` — `STREAK_OCC*` → `STREAK_XP|`
- `backfill-shot-milestone-xp-week-and-was.js` v1.1 — shot milestone Week/WAS
- `backfill-shot-milestone-unlock-mark-awarded.js` — 52 Pending unlocks with XP linked → Awarded
- `archive-legacy-streak-unlock-records.js` — 156 orphan Streak Length unlock rows deleted
- `audit-pending-shot-milestone-unlocks.js` — 059 readiness diagnostic
- 059 automation trigger fixed (matches conditions; no `Ready for 059 XP?` formula)

## Stage J status (2026-06-25)

| Check | Result |
|-------|--------|
| Stage H video XP audit | **PASS** — `issueTotal: 0` |
| Orphan XP / WAS linkage | **PASS** — 2,285/2,285 |
| Stage I achievement/streak XP | **PASS** — `issueTotal: 0`, `unlock_ok: 114`, `streak_ok: 324` |
| Field coverage (v1.1 profiles) | **PASS** — no `likelyUnusedFields` in canonical pipeline |
| **Legacy cleanup** | **In progress** — runbook below |

### What to run next (in Airtable)

```text
1. audit-legacy-cleanup-candidates.js     ← start here (Stage J)
2. audit-orphan-xp-events.js              ← confirm still 0
3. audit-field-coverage-report.js         ← confirm canonical fields
4. audit-xp-linkage-coverage.js           ← optional linkage sanity
```

Then manual UI: delete legacy fields (Phase 3 below). Re-run step 1 until `legacyFieldCount` trends to 0.

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

From schema snapshot — **no production automations reference these fields**.

### Phase 1 — Audit (extension script)

```text
audit-legacy-cleanup-candidates.js
```

Reports legacy-named fields/tables + orphan streak unlock delete count.

### Phase 2 — Delete orphan streak unlock rows (~208)

Legacy **Athlete Achievement Unlock** rows for **Streak Length** achievements (blank/`Skipped`/`Pending`, no XP). Streak XP uses **Streak Occurrences + 054** now — not this table.

```text
1. archive-legacy-streak-unlock-records.js   DRY_RUN=true
2. CONFIRM_DELETE=true — batches of 25 until remainingCount=0
3. audit-achievement-xp-pipeline-integrity.js → unlock_not_ready drops sharply
```

**Never deletes** Awarded unlocks or unlocks with linked XP (Perfect Week / Shot Milestone safe).

### Phase 3 — Hide then delete fields (Airtable UI)

For each field: remove from **all views + interfaces**, then delete the field.

| Order | Table | Field | Safe? |
|-------|-------|-------|-------|
| 1 | **Achievements** | `LEGACY - XP Reward - DO NOT USE` | Yes — 0% fill, no automation refs |
| 2 | **Weekly Athlete Summary** | `Weekly Bonus XP Earned - LEGACY DO NOT USE` | Yes — formula only, superseded by XP Events rollup |
| 3 | **Submissions** | `Legacy - Ready for Daily Email Build?` | Yes — superseded by current email pipeline |
| 4 | **Submissions** | `Legacy - Daily Email Build Status` | Yes — superseded by current email pipeline |

**UI steps (per field):**

1. Open table → hide field from every grid view  
2. Check Interfaces / extensions — remove field if present  
3. Field menu → **Delete field** → confirm  

### Phase 4 — Legacy tables (Airtable UI)

Search base for tables matching `ZZZ` or `LEGACY`:

| Candidate | Action |
|-----------|--------|
| `ZZZ LEGACY - Homework` (if still present) | Hide table → confirm **0 records** and no live links from Homework Completions / Submissions → delete table |

Active homework source is **FBC Curriculum - SYNC** — not the ZZZ table.

### Phase 5 — Verify

```text
audit-legacy-cleanup-candidates.js     → legacyFieldCount trends to 0
audit-field-coverage-report.js         → still PASS on canonical profiles
```

---

## Legacy field reference (schema snapshot)

| Table | Field | Notes |
|-------|-------|-------|
| Achievements | `LEGACY - XP Reward - DO NOT USE` | Old reward config |
| Weekly Athlete Summary | `Weekly Bonus XP Earned - LEGACY DO NOT USE` | Superseded rollup |
| Submissions | `Legacy - Ready for Daily Email Build?` | Old daily email gate |
| Submissions | `Legacy - Daily Email Build Status` | Old daily email status |
| (table) | `ZZZ LEGACY - Homework` | Do not link new records |

Search Airtable for: `LEGACY`, `DO NOT USE`, `ZZZ` to find others added since last schema export.

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

**Shot Milestone XP (14 rows):** `backfill-shot-milestone-xp-week-and-was.js` v1.1 — resolves Week from unlock **Milestone Activity Date** (066 does not set Week on unlock).

---

## Stage I

Achievement parity audit: `audit-achievement-xp-pipeline-integrity.js`

- **Unlocks** — `XP Award Status = Awarded` vs 059 source keys (`PERFECT_WEEK|`, `SHOT_MILESTONE|`)
- **Streaks** — `Source Status = Awarded` vs 054 keys (`STREAK_XP|`)

Legacy streak XP repairs (Stage I):

1. `backfill-legacy-streak-xp-week-and-was.js` — Week/WAS for `STREAK_OCCURRENCE|` rows missing Week  
2. `backfill-legacy-streak-xp-source-keys.js` — migrate remaining `STREAK_OCC|` / `STREAK_OCCURRENCE|` keys → `STREAK_XP|` (~167 rows)  
3. `backfill-shot-milestone-xp-week-and-was.js` v1.1 — shot milestone Week/WAS from activity date  

---

## Related

- [Audits README](../extension-scripts/audits/README.md)
- [Safe backfills README](../extension-scripts/safe-backfills/README.md)
- [CHANGELOG](../../CHANGELOG.md)
