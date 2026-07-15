# ADR — Multi-Year / Season Architecture

**Status:** Proposed (docs only — **no schema mutations**)  
**ADR ID:** `MULTI-YEAR-SEASON-ARCHITECTURE`  
**Backlog:** **V2-013**  
**Stage:** S26 · Workstream 9  
**As-of:** 2026-07-14  
**Decision date (direction):** 2026-07-05  
**Supersedes:** Archive + clone plan in [shooting-challenge-v2-base-cutover.md](../shooting-challenge-v2-base-cutover.md) (**V2-001** deferred)

---

## Context

The 2025–26 season ran in a single production Airtable base (`appn84sqPw03zEbTT`). Preparing 2026–27 requires:

- New enrollments, weeks, and config numbers (levels, gates, XP rules)
- Historical accuracy for 2025–26 awards, disputes, and audits
- Shared Athletes across seasons (lifetime identity)
- Avoiding a brittle “duplicate entire base every year” ops model for web, Make, Fillout, and PATs

**Owner decision (2026-07-05):** One Airtable base + **Program Instance** (org table) for season scoping — **not** separate bases per year. Implementation is **queued** for a dedicated architecture wave; do not mix 2026–27 config into live production incrementally without that wave.

Read-only investigation (2026-07-05): config tables already have some mixed/future rows — confirms need for a deliberate wave, not ad-hoc links.

---

## Decision

### Season / year model

| Concept | Definition |
|---------|------------|
| **Program** | Shooting Challenge (product) — constant |
| **Program Instance** | One season of the program, e.g. `Shooting Challenge \| 2025-2026` |
| **Season** | Operational window for that Program Instance (intake calendar + challenge weeks) |
| **Athlete** | Lifetime person record — **not** season-owned |
| **Enrollment** | Athlete’s participation in **exactly one** Program Instance |

**Rule:** Every season-scoped operational or config row that can differ per year must eventually link to (or be filterable by) **Program Instance**.

### Rejected alternative

| Alternative | Why rejected (2026-07-05) |
|-------------|---------------------------|
| Archive + clone new base each year (**V2-001**) | Breaks single `AIRTABLE_BASE_ID` integrations; duplicates automations/ops; superseded by Program Instance direction |

Archive+clone remains **historical reference** only (cutover doc).

---

## Config-by-season

### Config / reference tables (must be season-scoped)

| Table | Why |
|-------|-----|
| Weeks | Calendars differ per season (intake vs challenge — C-018) |
| Levels | Thresholds change (V2-007) |
| Level Gate Rules | Gate spread retuned (V2-005) |
| XP Reward Rules | Amounts/economics change (V2-006) |
| Shot Milestones | Percentage ladder may change |
| Achievements | Catalog may expand/retire |
| Awards / Award catalog | Season cart differs |
| Challenge Goals | Band goals per season |
| Homework / curriculum links used as season catalog | Assignments rotate |

### How config versions

1. **Preferred:** Each config row links to **Program Instance**. Views default to **Active Program Instance**.
2. **Do not** mutate historical season rows in place to “update” next year’s numbers — **clone config set** for the new Program Instance, then edit the clone.
3. Scripts must resolve rules via **linked Program Instance** (or Enrollment→Program Instance), not “first Active row globally.”

### Config vs code

Numbers and gates stay in Airtable ([season-configuration-design](../v2/season-configuration-design.md), [config-vs-code](../shooting-challenge-v2-config-vs-code.md)). Scripts orchestrate; they do not hardcode season thresholds.

---

## Week / Enrollment ownership

| Entity | Owner of season | Cross-season allowed? |
|--------|-----------------|------------------------|
| **Enrollment** | Program Instance (required) | No — new Enrollment per season |
| **Week** | Program Instance (required) | No — Weeks belong to one season calendar |
| **Submission** | Via Enrollment (+ Week) | No direct link to other seasons’ Weeks |
| **WAS** | Enrollment + Week | No |
| **Homework Completion / Video Feedback** | Via Enrollment / asset chain | No |
| **XP Events** | Via Enrollment (season award) + lifetime Athlete rollups elsewhere | Season awards scoped; lifetime totals may sum across seasons (see XP) |
| **Athlete** | Org / lifetime | Yes — shared across Program Instances |

**Intake calendars (C-018):** Represent “intake open” vs “challenge run” as Week types or flags **inside** the Program Instance’s Weeks table — not as a second global calendar.

---

## Cross-season link prevention

Hard product rule for automation and UI:

1. **Enrollment.Program Instance** is authoritative for season membership.
2. When linking Week / Goal / Homework catalog / Milestone / Level / XP Rule, scripts and formulas must require:
   - Linked config.Program Instance == Enrollment.Program Instance  
   - Or linked config.Program Instance == Submission/WAS resolved Program Instance
3. **Reject / skip** (do not silently attach) if seasons differ.
4. Views and Interfaces for operators default-filter to Active Program Instance so accidental picks are rare.
5. Audits (future Stage K / V2-013 pack): flag any Submission, WAS, HC, VF, XP, Unlock whose Enrollment.Program Instance ≠ linked Week/config Program Instance.

Until Program Instance links exist, treat **current base = de facto single active season** and avoid creating parallel 2026–27 config that automations can pick by mistake (this is why incremental mixing is forbidden).

---

## Rollover

### Soft rollover (same base)

1. Create Program Instance `Shooting Challenge | 2026-2027`.
2. Clone config packs (Levels, Gates, XP Rules, Weeks skeleton, Achievements active set, Awards) → link to new Instance; leave 2025–26 rows linked to old Instance.
3. Mark prior Instance **Closed** / inactive for intake; set new Instance **Active**.
4. Open Fillout / web intake targeting new Instance (hidden field or mapping).
5. Automations filter Active Instance (see below).
6. Athletes returning: create **new Enrollment** for 2026–27; never “reset” prior Enrollment XP.

### Hard freeze of prior season

- Pause or condition intake automations so they only create pipeline rows for Active Instance.
- Close prior season public leaderboards via Enrollment `Active?` / publish flags (C-010) — do not delete history.
- Media kits stay under `media/YYYY-YYYY/` by season folder (already done for 2025–2026).

---

## Archive

| Layer | Approach |
|-------|----------|
| **Data** | Remain in the same base, scoped by Program Instance — primary “archive” |
| **Access** | Operator views hide Closed Instance by default; optional read-only interface for disputes |
| **Exports** | Schema + CSV snapshots per close-out (`airtable/schema/snapshots/`) |
| **Base-level archive** | Optional later if base becomes too large — **not** the default plan |

Do **not** delete closed-season Enrollments, XP Events, or Awards recipients.

---

## Form resolution (Fillout / web)

| Concern | Proposal |
|---------|----------|
| Which season am I enrolling into? | Form embeds / maps **Program Instance** (or Season Code) onto Enrollment create |
| Submissions | Resolve Enrollment first (**023**); Week via activity date within that Instance’s Weeks (**005**) |
| Testing | Schmidt Enrollment remains Instance-linked; C-020 Testing Scenarios pre-link Related Enrollment |
| Multi-form | Prefer one enrollment form per active season; avoid dual-open seasons without explicit Instance routing |

---

## Automation filtering

| Pattern | Guidance |
|---------|----------|
| **Enrollment trigger** | Prefer views filtered to Active Program Instance |
| **Submission / asset** | Resolve Instance via Enrollment; skip if Enrollment Closed / Progress Processing off (C-010) |
| **Config reads** | Query rules where Program Instance matches Enrollment |
| **Scheduled jobs** (056, weekly email) | Iterate Enrollments or WAS for Active Instance only |
| **Welcome / parent email** | Active Instance + Active? visibility (C-010) — no real sends in DEV regression |
| **117 Zoom** | Instance-scoped Meetings/Attendance; keep OFF until activation package |

Capacity modernization (V2-014 Phase A–D) is independent but must not assume “only one season of rows forever.”

---

## XP — lifetime vs season

| Bucket | Scope | Examples |
|--------|-------|----------|
| **Season XP** | Enrollment / Program Instance | Submission XP, Homework XP, Video XP, Zoom XP, streak XP, perfect week, shot milestones for that Enrollment |
| **Lifetime Athlete** | Athlete | Optional rollups / career stats for returning players; **do not** overwrite prior season Enrollment totals |
| **Source Keys** | Include Enrollment or season-stable identity as today; when dual-season exists, keys must remain unique across seasons (Enrollment id already partitions) |

**Do not** wipe prior-season XP Events at rollover. New season starts at Enrollment XP = 0 via **new Enrollment**, not by deleting history.

---

## Migration / rehearsal plan

### Phase 0 — Docs & inventory (this ADR) — **done in S26**

- Lock model: Program Instance + ownership + cross-link rules.
- No schema mutations.

### Phase 1 — Schema design (Wave 1b start; Mike-approved)

- Confirm Program Instance table shape (existing org table vs extend).
- Field ownership matrix (C-012 alignment): which tables gain Program Instance link.
- Dry-run on **DEV only** (`appTetnuCZlCZdTCT`).
- Do not retune 2026–27 gate numbers until Instance scoping exists (Wave 9 after 1b).

### Phase 2 — DEV rehearsal

1. Create second Program Instance in DEV.
2. Clone a minimal config pack; link Schmidt test Enrollment to Instance A; create parallel test Enrollment for Instance B.
3. Verify **005** week resolution does not cross Instances.
4. Verify XP writers cannot attach Instance A rules to Enrollment B.
5. Run [core regression matrix](../testing/CORE-WORKFLOW-REGRESSION-MATRIX.md) against both Instances (Schmidt only).
6. Snapshot schema; document failure modes.

### Phase 3 — PROD cutover (Mike gate)

1. Freeze intake.
2. Add Program Instance links to existing 2025–26 rows (backfill) — treat as one Instance.
3. Create 2026–27 Instance + config clones.
4. Update Fillout/web mapping.
5. Enable Active-Instance automation filters.
6. Open intake.

### Phase 4 — Close-out hygiene

- Closed Instance views; award disputes remain queryable.
- Pre-season audit pack (V2-011) + dry-run season (V2-012) before May 2027 enrollment wave.

---

## Phased proposal (summary)

| Phase | Outcome | Schema? | Base |
|-------|---------|---------|------|
| **0** | ADR + regression matrix alignment | No | — |
| **1** | Field/list design + ownership | Design only → DEV apply when approved | DEV |
| **2** | Dual-Instance rehearsal + matrix | DEV yes | DEV |
| **3** | Backfill + new season open | PROD yes | PROD (Mike) |
| **4** | Closed-season ops + audits | Minimal | Both |

**Stop triggers:** PROD schema, archive base deletion, real parent sends, enabling Zoom **117**, or mixing 2026–27 config into unscoped Active rows.

---

## Consequences

### Positive

- Single base ID for Vercel / Make / PAT
- Historical seasons queryable without juggling archive bases
- Athletes return cleanly with new Enrollments
- Config retunes without rewriting history

### Risks / mitigations

| Risk | Mitigation |
|------|------------|
| Automations pick wrong year’s Weeks/rules | Mandatory Instance match; Active views; audits |
| Premature dual config without filters | Keep V2-013 queued; no incremental mix |
| Table bloat | Closed-Instance filters; optional future archive export |
| C-010 / C-018 incomplete | Deliver scoping before dual-open seasons |

### Non-goals (this ADR)

- Implementing Airtable fields now
- Enabling **117**
- Retuning Level Gate numbers (Wave 9)
- Executing V2-001 base clone

---

## References

- [PROJECT_STATE § Multi-year](../PROJECT_STATE.md)
- [v2-change-backlog § V2-013](../v2-change-backlog.md)
- [shooting-challenge-v2-base-cutover.md](../shooting-challenge-v2-base-cutover.md) (superseded ops plan)
- [v2/season-configuration-design.md](../v2/season-configuration-design.md)
- [testing/CORE-WORKFLOW-REGRESSION-MATRIX.md](../testing/CORE-WORKFLOW-REGRESSION-MATRIX.md)
- [C-010 two-field behavior](../deploy-checklists/C-010-two-field-behavior-contract-stage4.md)
- [C-018 Weeks calendars](../testing-and-intake-architecture.md)

---

## Revision log

| Date | Change |
|------|--------|
| 2026-07-14 | S26 ADR: formalize Program Instance model, ownership, rollover, archive, XP, phased rehearsal — docs only |
