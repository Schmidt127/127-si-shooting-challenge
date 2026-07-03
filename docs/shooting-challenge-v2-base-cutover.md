# Shooting Challenge v2 — Base cutover plan (2025–26 → 2026–27)

**Status:** Planning only — **no base clone or data delete until owner approves.**  
**Preferred approach (2026-07-03):** Archive current base → clone for next season → clear season data in clone → keep config/rules → update integrations.  
**Governed by:** [shooting-challenge-v2-master-direction.md](./shooting-challenge-v2-master-direction.md)

---

## Locked direction (owner, 2026-07-03)

| Question | Decision |
|----------|----------|
| **Close current base to edits?** | **Yes — treat as archive** after 2025–26 close-out is final. No new enrollments, submissions, or automations firing on live intake. |
| **New base for 2026–27?** | **Yes — clone** the current base, then **delete season data** in the clone. |
| **Keep config in clone?** | **Yes** — Levels, Level Gate Rules, XP Reward Rules, Achievements, Awards catalog, curriculum, tutorials, etc. |
| **GitHub fork?** | **No fork** for annual season reset. **Tag + branch** in this repo. **Separate repo** only if/when **Dribble Challenge** becomes its own product (already documented elsewhere). |

---

## Why clone + archive (not “same base, new year”)

| Benefit | Explanation |
|---------|-------------|
| **Clean season** | No leftover 2025–26 enrollments, submissions, or XP polluting audits |
| **Frozen history** | 2025–26 stays inspectable for disputes, taxes, parent questions |
| **Safer tuning** | Edit 2026–27 Level Gate Rules without touching last year’s rows |
| **Matches national vision** | Professional ops: one season = one production base |
| **Fillout / Make cutover** | Single switchover point before May 2027 |

| Cost | Mitigation |
|------|------------|
| New `AIRTABLE_BASE_ID` | Document in PROJECT_STATE; update Vercel, Make, Fillout, `.env` |
| Re-paste automations? | Clone **includes** automations — verify they still point at correct tables; GitHub remains source of truth |
| PAT / token scopes | Add new base ID to token before cutover |

---

## Phase A — Archive 2025–26 base (read-only policy)

**When:** After final emails, awards cart, and any last disputes (e.g. C-001 Lyle Kimm) are resolved or accepted.

**Actions (operational, not technical delete):**

1. **Rename** in Airtable UI, e.g. `127SI - SHOOTING CHALLENGE - ARCHIVE 2025-26`.
2. **Turn off** Fillout webhooks / daily submission form → this base.
3. **Disable or pause** automations that intake new season data (document list in [automation-index.md](./automation-index.md)).
4. **Reduce access** — editors → comment-only or remove except owner (Airtable workspace policy).
5. **Record in GitHub:** `docs/PROJECT_STATE.md` — archive base ID, name, “read-only as of DATE”.
6. **Optional:** Export schema snapshot + key CSV backups to repo (`airtable/schema/snapshots/`).

**Do not delete** the archive base — it is the system of record for 2025–26.

---

## Phase B — Clone for 2026–27

**When:** Q1 2027 (before config tuning and testing), or earlier if you want a long sandbox.

**Actions:**

1. Airtable: **Duplicate base** from archive (or from a named snapshot if Airtable offers it).
2. **Rename** clone, e.g. `127SI - SHOOTING CHALLENGE - 2026-27`.
3. Note new **base ID** — all integrations must switch at cutover.
4. Run **schema export** into repo: `tools/airtable/export_airtable_schema.py` → new dated snapshot folder.

---

## Phase C — Clear season data in clone (keep config)

Delete **rows** (or truncate tables) in the **clone only**. Automations and field definitions stay.

### Keep (config / rules / reference — do not wipe)

| Table | Why keep |
|-------|----------|
| **Levels** | Level names + XP thresholds (tune for 2026–27) |
| **Level Gate Rules** | Gate minimums (spread curve edits here) |
| **XP Reward Rules** | XP per activity |
| **Achievements** | Milestone definitions |
| **Shot Milestones** | Milestone thresholds |
| **Awards** | Award catalog |
| **Grade Bands** | Grade logic |
| **Target Goal Shots** | Shot targets |
| **FBC Curriculum - SYNC** | Homework definitions |
| **Tutorials** / **Tutorials & Assets** | Content |
| **Config** | Program settings |
| **Program Instance - Synced** / **School - Synced** | Reference sync (verify still valid) |
| **Automations** | Airtable automation metadata table (if present) |

### Clear (season / athlete activity — delete all rows)

| Table | Notes |
|-------|--------|
| **Enrollments** | Fresh enroll each season |
| **Submissions** | All shot logs |
| **Submission Assets** | All uploaded asset rows |
| **XP Events** | Full ledger reset |
| **Athlete Achievement Unlocks** | Per-season unlocks |
| **Streak Occurrences** | Per-season streaks |
| **Weekly Athlete Summary** | All weekly email rows |
| **Homework Completions** | All completion rows |
| **Video Feedback** | All feedback rows |
| **Award Recipients** | Fulfillment history (catalog stays in **Awards**) |
| **Final Reflection Quiz Submissions** | HW17 quiz intake |
| **Zoom Meetings** | Clear or replace with 2026–27 schedule rows only |

### Decide explicitly (owner call before delete)

| Table | Options |
|-------|---------|
| **Athletes** | **A)** Keep master athlete roster; re-link new enrollments. **B)** Clear and re-import at registration. **Recommended:** keep athletes, clear enrollments. |
| **Weeks** | **A)** Delete all week rows; regenerate 2026–27 dates (May 1–Jun 30, 2027). **B)** Keep structure, edit dates. **Recommended:** regenerate clean **Weeks** for new season. |

---

## Phase D — Post-scrub setup in clone

1. **Weeks** — Create 2026–27 week records (America/Denver boundaries).
2. **Level Gate Rules** — Set `Version Active?` for 2026–2027 rule set; spread gates (e.g. 1 HW early).
3. **XP Reward Rules** — Confirm active rules; adjust amounts if needed.
4. **Program Instance** — Confirm season label `2026-2027`.
5. **Test enrollments** — 2–3 fake enrollments; run pipeline audits dry-run.
6. **Automations** — Smoke-test 023, 010, 041/042, 072/074 on test rows.
7. **Make.com** — Duplicate scenarios or update base ID + webhook URLs to **clone**.
8. **Fillout** — Point forms to **clone** base (not archive).
9. **Vercel** — `AIRTABLE_BASE_ID` → clone ID on staging first, then production before May 1, 2027.
10. **Pre-season audits** — Stages A–J + 090 templates on clone with test data.

---

## GitHub strategy (no fork)

**Fork** creates a **new repository** and splits history — use that for a **different product** (e.g. Dribble repo), not for “next season” of Shooting Challenge.

**Recommended for 2026–27 Shooting Challenge:**

| Action | Purpose |
|--------|---------|
| **Tag** `season-2025-26-final` on commit after close-out docs + final email tooling | Frozen reference for archive season code |
| **Branch** `archive/2025-26` (optional) | Long-lived branch if you need hotfixes against archive automations |
| **Continue `master`** | V2 work, automations, docs — single repo stays canonical |
| **PROJECT_STATE.md** | Two base IDs during transition: ARCHIVE + LIVE 2026–27 |
| **CHANGELOG.md** | Note base cutover under `### Airtable` when it happens |

**Do not** fork `127-si-shooting-challenge` for season rollover — it adds confusion with landing, JR Ref, and Dribble repos already separate.

---

## Dribble Challenge (separate decision)

| Approach | GitHub | Airtable |
|----------|--------|----------|
| **Dribble as own program** | **New repo** (or existing `dribble` repo if created) | **Clone** from Shooting template **or** fresh base — strip shooting-specific tables later |
| **Same year, two programs** | Two repos, two Vercel roots (`/shoot`, `/dribble`) | **Two bases** recommended over one combined base |

Shooting 2026–27 clone does **not** require a GitHub fork.

---

## Cutover checklist (before May 1, 2027)

```text
[ ] Archive base renamed; intake disabled; automations paused on archive
[ ] Clone created; new base ID recorded
[ ] Season tables cleared per list above; config tables kept
[ ] Weeks regenerated for 2026-27
[ ] Level Gate Rules + XP Reward Rules tuned and Version Active set
[ ] Test enrollment end-to-end (submit → XP → level)
[ ] Make + Fillout + Vercel point at clone
[ ] PROJECT_STATE.md + deployment-notes.md updated
[ ] git tag season-2025-26-final (or equivalent)
[ ] Pre-season audit pack PASS on clone
```

---

## Constitution test

> Does cloning + archiving align with the Master Direction Plan?

**Yes** — supports data trust, clean launch Day 1, config-driven rules, and national-scale professionalism without redesigning the app each year.

---

## Related docs

- [shooting-challenge-v2-config-vs-code.md](./shooting-challenge-v2-config-vs-code.md)
- [deployment-notes.md](./deployment-notes.md)
- [PROJECT_STATE.md](./PROJECT_STATE.md)
- [automation-index.md](./automation-index.md)

## Revision log

| Date | Notes |
|------|-------|
| 2026-07-03 | Initial cutover plan — archive + clone + scrub season data; no GitHub fork. |
