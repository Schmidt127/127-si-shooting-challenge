# PKG-038 — Do not proceed gate

**Purpose:** Hard stop before any Production paste, trigger edit, or controlled test for automations **053, 054, 059, or 066**. If any row below cannot be proven from **live Airtable UI attestation** or **repository script/schema evidence**, report the blocker to ChatGPT/Cursor and **do not invent** a production change.

---

## Gate 1 — Schema proof

Stop unless Mike confirms in the live base (field name **and** type match):

| Table | Fields to verify | Evidence source |
|---|---|---|
| Submissions | `Enrollment`, `Activity Date`, `Count This Submission?` (formula), `Total Shots Counted` (formula) | [Field sheet](./PKG-038-FIELD-DEPENDENCY-SHEET.md); schema snapshot 2026-07-23 |
| Streak Occurrences | `Active?`, `Source Status` (options listed in sheet), `Streak End Date`, `XP Events` | Same |
| Athlete Achievement Unlocks | `Active?`, `XP Award Status`, `Milestone Source Key`, `Milestone Activity Date`, `XP Events`, `Shot Milestone` | Same |
| XP Events | `Source Key`, `Active?`, `XP Bucket`, `XP Source`, `Streak Occurrence`, `Achievement Unlock` | Same |
| Enrollments | `Run Shot Milestone Check?`, `Grade Band`, `Program Instance` | Same |

**Blocker examples:** field renamed, select option missing (`Ready for XP`, `Pending`, `Awarded`), link field prefers-single changed, formula field promoted to writable.

---

## Gate 2 — Production script version proof

Stop unless Mike captures editor version string matching **repository paste target**:

| Automation | Required repository version | Paste file |
|---|---|---|
| 053 | **5.5** | [PKG-038-053-v5.5-PASTE.txt](./PKG-038-053-v5.5-PASTE.txt) |
| 054 | **v5.8** | [PKG-038-054-v5.8-PASTE.txt](./PKG-038-054-v5.8-PASTE.txt) |
| 059 | **v3.6** | [PKG-038-059-v3.6-PASTE.txt](./PKG-038-059-v3.6-PASTE.txt) |
| 066 | **v3.8** | [PKG-038-066-v3.8-PASTE.txt](./PKG-038-066-v3.8-PASTE.txt) |

**Do not assume** `docs/AUTOMATION_VERSION_INVENTORY.md`, `automation-index.md`, or August 2026 reconciliation docs reflect the editor today. See [audit](./PKG-038-REPOSITORY-VS-PRODUCTION-AUDIT.md).

---

## Gate 3 — Trigger contract proof

Stop unless Mike attests each trigger matches its paste packet **before** enablement:

| Automation | Block if |
|---|---|
| **053** | Trigger does not fire on Submission **updates** to eligibility/identity fields; or uses fixed `recordId` |
| **054** | Trigger requires **only** `Source Status = Ready for XP` (blocks `Active?` withdrawal); or fixed `recordId` |
| **059** | Trigger filters on `Ready for 059 XP?` and/or requires `Shot Milestone` not empty (blocks Perfect Week + lifecycle); or fixed `recordId` |
| **066** | Trigger does not pass dynamic Enrollment `recordId`; or `Run Shot Milestone Check?` not the run signal |

**Known blocker (2026-08-04 export):** 059 trigger `Ready for 059 XP? = 1` — **must be removed/replaced** before PKG-038 paste.

---

## Gate 4 — Ownership and duplicate proof

Stop if read-only audit (`audit-achievement-xp-pipeline-integrity.js` v2.1) reports any of:

- Duplicate canonical Source Key with multiple active XP Events
- XP Event linked to wrong Streak Occurrence or Achievement Unlock
- Multiple WAS for same Enrollment + Week on test athlete
- Ambiguous streak occurrence identity for one enrollment + achievement + end date
- Ambiguous `SHOT_MILESTONE` unlock for one enrollment + shot milestone

Save audit JSON; do not paste until zero unresolved findings (or Mike explicitly scopes a separate repair package).

---

## Gate 5 — Upstream dependency proof

Stop unless:

| Dependency | Requirement |
|---|---|
| **010** | ON at approved reconciliation version; submission reversal proven for test athlete (PKG-006R) |
| **031** | Canonical WAS exists for test submission weeks |
| **041 / 042** | ON; Mike confirms no open progression observation window |
| Email / Make | 072/074/076/079/071/073 not armed for test rows |

---

## Gate 6 — Test athlete proof

Stop unless Mike records **record IDs** (not display names) for the controlled athlete before test:

| Record | Known Schmidt fixture (verify live) |
|---|---|
| Enrollment | `recCyFEPeATOVNlr9` (Testing 2026-2027) — or Mike-approved alternate |
| Program Instance | `rec5mEM0YPqPqq0hZ` (Early Bird 2026-2027) — confirm on enrollment |
| Grade Band | Confirm linked ID on enrollment at test time |
| Baseline unlocks | 8 milestone unlocks attested on `recCyFEPeATOVNlr9` (2026-08-08) — re-list IDs before test |
| Baseline streak XP | 3 `STREAK_XP` events attested (SC-029) — re-list IDs before test |

If any ID is missing or belongs to another athlete/enrollment, **stop** and select a clean fixture.

---

## Gate 7 — Rollback readiness

Stop unless Mike has:

1. Saved current script body (or export) for each automation **before** paste.
2. Saved trigger screenshots **before** paste.
3. Read [rollback plan](./PKG-038-ROLLBACK-PLAN.md) and agreed **no deletes** of XP Events, unlocks, occurrences, or athletes.

---

## Reporting a blocker

When any gate fails, report:

```
PKG-038 BLOCKED
Gate: <number and name>
Automation(s): <053|054|059|066>
What cannot be proven: <field/trigger/version/ownership>
Repository evidence: <file path>
What Mike should do: <OMNI inspect / screenshot / schema confirm / separate repair>
Do not proceed with: <paste|enable|test step>
```

Do **not** guess field renames, select options, trigger conditions, or production versions.
