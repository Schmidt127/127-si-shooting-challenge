# WAS creator ownership — 031 / 101 / 118

**Agent:** 12 · **Date:** 2026-07-24 (corrected same day — schedules ON)  
**Identity:** Exactly one Weekly Athlete Summary per **Enrollment + Week**  
**Formula key (read-only):** `Summary Key` = `{Enrollment Key}|{Week Key}`  
**Live shape verified 2026-07-23:** `ATH-{athleteRecId}|{schoolYear}|{weekRecId}`

> **Status correction (verified_prod 2026-07-24):** **118 is installed and schedule ON** (Sun 5:00 AM Denver). Older “not installed / keep OFF” wording below is **superseded**.

---

## Per-creator audit

### 031 — Find or Create WAS from Submission

| Item | Finding |
|---|---|
| When | Submissions · Count This Submission? · WAS empty |
| Why create | Submission rollups / week reporting need a WAS home |
| Lookup key | Builds `enrollmentKey\|weekKey`; matches Summary Key; validates Enrollment+Week links |
| Race | Check-then-create vs 101/118 |
| Retry | Throws if duplicate Summary Key matches; links when found |
| Create ownership necessary? | **Yes** for submission-driven weeks (primary live path) |
| Link-only candidate? | No — must create when first counted submission arrives |

### 101 — Zoom Attendance XP (side-effect create)

| Item | Finding |
|---|---|
| When | Awarding live meeting XP; attendee Enrollment + meeting Week |
| Why create | Zoom-only weeks otherwise have no WAS for XP link |
| Lookup key | Enrollment + Week **links** (not Summary Key string primary) |
| Race | Same check-then-create vs 031/118 |
| Retry | Throws on multiple existing matches |
| Create ownership necessary? | **Yes** until two consecutive scheduled Sundays prove 118 covers Zoom-only gaps |
| Link-only candidate? | Prefer link-only **after** that proof window |

### 118 — Schedule Weekly Summary Email Build

| Item | Finding |
|---|---|
| When | Sunday 05:00 America/Denver — **ON** (verified_prod); repo **v1.5** |
| Why create | SC-035 guarantee: every Active enrollment × ended week gets a WAS (incl. empty weeks) |
| Lookup key | Summary Key first, Enrollment+Week fallback for target week |
| Race | Batch vs late 031/101 |
| Retry | Skips duplicate map entries; creates if missing then arms Build |
| Create ownership necessary? | **Yes** for empty-week / homework-only guarantee |
| Link-only candidate? | No — this is the guarantee writer |
| Season inputs | `dryRun=false`, `sendMode=Live`, `includeSchmidt=false` |

---

## Authoritative strategy (current)

**Hybrid with one scheduled authority + two event creators:**

1. **118** = authoritative **scheduled ensure** creator for every Active enrollment × prior ended week (empty-week guarantee). **Schedule ON** — do not disable.
2. **031** = authoritative **submission-time** creator (keep).
3. **101** = keep create for Zoom-only weeks until 118 is proven across two consecutive Sundays; then convert 101 → **link-only** (find existing; soft-skip if missing — or create only as last-resort with shared helper).

**Shared rule for all creators (contract helper):**

- Normalize Summary Key candidate from Enrollment Key + Week Key.
- Select existing by Summary Key, else Enrollment+Week.
- If duplicates: pick deterministic winner (lowest record id), never create another.
- Link-only callers never create; ensure callers may create once after recheck.

Do **not** make 031 or 101 the sole owner — empty weeks would break SC-035 without 118.

---

## Decision table

| Scenario | Owner that must create |
|---|---|
| First counted submission | 031 |
| Zoom-only week before 118 proven | 101 |
| Empty week / email guarantee | **118** |
| Concurrent miss | Shared helper + deterministic winner on next read; accept rare duplicate → cleanup |

See also: overnight `WAS-GUARANTEE-AUDIT.md`, Agent 9 `WAS-UNIQUENESS-CONTRACT.md`.
