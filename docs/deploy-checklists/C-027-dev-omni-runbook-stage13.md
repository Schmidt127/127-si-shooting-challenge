# C-027 — DEV OMNI runbook (Stage 13 + S16)

**Status:** Proposal only — DEV only · no PROD · no Cursor Airtable writes  
**Catalog:** [C-025-C-027-configuration-catalog-stage16.md](./C-025-C-027-configuration-catalog-stage16.md)

---

## Hard stops

- No PROD / no new SMS providers unattended.
- Do not hardcode streak day lists or shot totals into automations.
- Do not alter **071** / video feedback automations.
- Reuse **Config**, **Achievements**, **Shot Milestones** — no duplicate notification rules table unless Phase 0 proves one already exists to extend.

---

## Phase 0 — Inspect

1. Config fields present?
2. Achievements streak rows + thresholds?
3. Shot Milestones rows?
4. Any existing Notification / Email Log table?
5. Parent email fields on Enrollment?

Report before creates.

---

## Phase 1 — Fields

1. Add Config MEN fields (catalog §4.1) with defaults.
2. Add `Parent Notification Enabled?` to **Achievements** and **Shot Milestones**.
3. Seed streak Achievements 10/20/30/40/50/60 checked.
4. Seed shot milestones Mike marks as major (owner data call — do not guess shot counts).
5. Create `Notification Sends` log if none exists.

---

## Phase 2 — Automations (GitHub → DEV later)

Dispatcher reads Config channel/timing/enables; eligibility from Active? + rule flags; Send Key idempotent.

---

## Phase 3 — Acceptance

| # | Expect |
|---|--------|
| Level up Active athlete | One email when enabled |
| Streak 7 with flag off | No MEN |
| Streak 10 with flag on | MEN |
| Shot milestone flag off | No MEN |
| Master Config notify off | No sends |
| Inactive enrollment | Skip |
| Schmidt | Skip |
| Daily submission XP | No MEN |
| **071** unchanged | Smoke prior behavior |

---

## Rollback

Disable MEN dispatcher; leave log rows.
