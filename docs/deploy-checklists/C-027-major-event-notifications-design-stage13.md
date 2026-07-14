# C-027 — Major-event notifications design (Stage 13 + S16 amendment)

**Status:** Owner decisions **APPROVED** (2026-07-13) · configuration-driven  
**Canonical config catalog:** [C-025-C-027-configuration-catalog-stage16.md](./C-025-C-027-configuration-catalog-stage16.md)  
**Scope:** Repo design only — **no Airtable / provider changes from Cursor**

---

## 0. Approved owner rules (locked)

| # | Rule | Config home |
|---|------|-------------|
| 1 | Channel = **email first**; expandable | Config `Major Event Notify Channel` (default Email) |
| 2 | Eligibility = existing **Active?** + exclude test/comms-suppressed enrollments | Enrollments + Schmidt guard — **no new eligibility system** |
| 3 | Timing default **Immediate** (not weekly digest) | Config `Major Event Notify Timing` |
| 4 | Major streaks default **10,20,30,40,50,60** | **Achievements** rows + `Parent Notification Enabled?` — **not** hardcoded list in script |
| 5 | Major shot milestones = records with notify flag | **Shot Milestones** `Parent Notification Enabled?` |
| 6 | Events: level up · major shot · Perfect Week · major streak | Config per-event enables; **no** daily submission; **no** 071/video changes |

---

## 1. Send decision

Send parent MEN iff:

1. Config `Major Event Notify Enabled?` is on (fallback: off → no send).
2. Event type allowed by Config event toggles.
3. Event-specific rule record allows notify (streak Achievement / Shot Milestone flag) when applicable.
4. Enrollment `Active?` true; not Schmidt / excluded-comms.
5. Channel resolves (default Email).
6. Timing = Immediate (or later modes when implemented).
7. Send Key not already `sent`.

Send Keys (unchanged):

| Event | Key |
|-------|-----|
| Level up | `MEN\|LEVEL_UP\|{enrollmentId}\|{levelId}` |
| Shot milestone | `MEN\|SHOT_MILESTONE\|{enrollmentId}\|{milestoneRuleId}` |
| Perfect Week | `MEN\|PERFECT_WEEK\|{enrollmentId}\|{weekId}` |
| Streak | `MEN\|STREAK\|{enrollmentId}\|{streakOccurrenceKey}` |

---

## 2. Milestone eligibility (record-driven)

```text
is_major_streak_notify(achievement) :=
  achievement.Parent Notification Enabled? == true
  AND achievement.Trigger Type == Streak Length

is_major_shot_notify(milestone) :=
  milestone.Parent Notification Enabled? == true
```

Scripts **must not** contain `[10,20,30,40,50,60]` as the eligibility source of truth. Seeding those Achievements checked is an **OMNI data** step.

---

## 3. Non-goals

- Daily submission notifications  
- Editing **071** / video feedback  
- SMS credentials unattended (channel config may list SMS for future)

---

## 4. Next package

`C-027-dev-omni-implementation` → **BLOCKED_AIRTABLE**  
Runbook: [C-027-dev-omni-runbook-stage13.md](./C-027-dev-omni-runbook-stage13.md)
