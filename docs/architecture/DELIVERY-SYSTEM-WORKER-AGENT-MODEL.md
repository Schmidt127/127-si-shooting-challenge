# Delivery System v2.0 — Lead & Worker Agent Model

**Status:** Binding for Delivery System v2.0 (Shooting Challenge V2 rebuild + reusable OS for Mike’s other Airtable/Vercel apps)  
**Date:** 2026-07-15  
**Authority:** [DELIVERY-SYSTEM-V2-PROPOSAL.md](./DELIVERY-SYSTEM-V2-PROPOSAL.md) · Mike clarifications (pilot = validation only; full V2 scope)  
**Related:** Assignment / result templates below · Role matrix · Pilot charter (validation period only)

Worker-agent **efficiency** is a first-class system property: parallelism must increase throughput without increasing Lead rework, merge conflicts, or state corruption.

---

## 1. Revised Lead model

The **Cursor Lead** is the single integration authority for a package.

### Owns exclusively

| Area | Examples |
|------|----------|
| Package planning | Decompose work; decide 0 / 1 / 2 workers |
| Assignment contracts | Write worker assignment files (template §5) |
| Integration branch | Merge worker branches → integration; resolve conflicts |
| Final verification | Independently review diffs; **rerun** required tests |
| State updates | CONTROL queue/next_action/tests/capacity; DEPLOYMENT-REGISTRY |
| Mike surface | Nine-field sheets; short status messages; reply handling |
| Closeout | Migration record, G6, promotion readiness, integration→master PR |
| Hard stops | Enforce PROD / send / archive / credential stops |
| Takeover | Stall threshold → Lead completes or rejects worker work |

### May do Lead-direct

- Any tightly coupled work (shared files, shared schema migration, shared automation body, same test fixture orchestration)
- Any package where path ownership cannot be made exclusive
- Research that becomes implementation without a worker handoff

### Must not

- Accept worker output without independent diff review + test re-run  
- Let workers edit CONTROL, capacity, registry, Mike sheets, or final closeout  
- Launch workers for “busywork” that is not independently testable  
- Claim CONTROL SHA as current tip (lagging-pointer rule)

### Lead acceptance of worker output

1. Confirm assignment contract was followed (writable paths only)  
2. `git diff` / file list vs allowed paths — reject path violations  
3. Rerun **assignment’s required test commands** on integration after merge (or on worker tip before merge, then again after merge if conflict risk)  
4. Classify: **accepted without rework** | **accepted with rework** | **rejected** | **stalled→takeover**  
5. Record classification in closeout / CONTROL package notes  

---

## 2. Revised worker-agent model

Workers are **bounded parallel implementers**, not co-Leads.

### Used only when all are true

1. Deliverable is **genuinely parallel** (Lead would otherwise wait idle)  
2. **Path-disjoint** from Lead and other workers (exclusive writable ownership)  
3. **Independently testable** with stated commands  
4. Bounded deliverable + acceptance criteria fit in one assignment file  
5. Does not require editing CONTROL / registry / Mike sheets / closeout  

### Workers may

- Commit on their assigned feat branch / worktree only  
- Write only listed writable paths  
- Read listed read-only paths  
- Produce the expected result artifact  
- Escalate product ambiguity to Lead (not Mike)

### Workers must not

- Update CONTROL, capacity ledger live numbers, DEPLOYMENT-REGISTRY, Mike sheets, AUTHORIZED final, or G6 closeout  
- Merge to integration or push to `master`  
- Edit prohibited paths  
- Invent triggers/paths for Mike  
- Expand scope past bounded deliverable  
- Start a second workstream without a new assignment  

### Default mental model

```text
Lead plans → optional Worker A/B implement behind exclusive paths →
Lead reviews diffs + reruns tests → Lead merges → Lead owns state + Mike gate
```

---

## 3. Concurrency decision rules

| Workers | When |
|--------:|------|
| **0 (Lead-direct)** | Tightly coupled code; shared automation/script; schema + dependents in one migration; unclear path split; package &lt; ~45 minutes; prior worker stall rate high on similar work; UI-gate-dominated package |
| **1** | One clean parallel slice (e.g. offline test suite OR website mock page) while Lead owns the primary script/migration; paths exclusive |
| **2 (max)** | Two independent slices (e.g. Worker A = offline contracts for package X; Worker B = mock website route set) with **no shared writable files**; Lead integrates both |

**Never 3+ concurrent writers** under v2.0 (Lead + 2 workers is the hard max including Lead’s own write lane).  
Research-only readonly subagents do not count as workers if they commit nothing.

---

## 4. Exclusive path ownership (merge-conflict prevention)

1. Lead assigns **non-overlapping writable globs/paths** per worker and for Lead’s own concurrent edits.  
2. Shared files (CONTROL, registry, Mike sheets, migration closeout) are **Lead-only** — listed as prohibited for all workers.  
3. If a file must be touched by two roles → **serialize**: one worker finishes and merges before the next starts, or Lead-direct.  
4. Overlap discovered mid-flight → workers **stop writing**; Lead reallocates or takeovers.  
5. Branch names encode ownership: `feat/<backlog>-worker-a-<slug>`.  

---

## 5. Stall threshold and Lead takeover

| Event | Threshold | Lead action |
|-------|-----------|-------------|
| No productive commit / no result artifact progress | **15 minutes** after assignment start (or after last productive commit) | Ping once; if no clear ETA ≤10 more minutes → **takeover** |
| Worker reports blocked on product decision | Immediate | Lead resolves or Mike gate; do not leave worker idle on product Q |
| Path violation or scope creep | Immediate | **Reject** branch; Lead rewrite or reassign |
| Tests fail and worker cannot fix within one retry cycle | After one documented retry | Takeover or reject |
| Worker unavailable / tool failure | Immediate | Takeover |

**Takeover rule:** Lead finishes the bounded deliverable Lead-direct (or narrows scope), records `stalled` + `lead_takeover=true` in metrics, merges only Lead’s completion path, does not leave half-merged worker branches as tip truth.

---

## 6. Integration rules

1. Workers merge **only** into the integration branch (`overnight/lead-integration` / future `integration/<app>`).  
2. Lead merges in documented order when two workers finish (assignment states merge preference).  
3. Lead reruns tests **after** each merge that could affect shared behavior.  
4. Workers never open integration→`master` PRs.  
5. After G6 of a completed functional package, Lead opens **per-feature** PR integration → `master` (D7).  
6. Squash worker WIP when merging if &gt;3 noise commits.  
7. Reject merge if writable-path contract violated.  

---

## 7. Worker performance metrics

Track per package and roll up weekly (CONTROL notes or `docs/delivery/WORKER-METRICS.md` later).

| Metric | Definition |
|--------|------------|
| **Accepted without rework** | Merged; Lead changed 0 lines of worker deliverable |
| **Accepted with rework** | Merged after Lead edits |
| **Rejected** | Not merged; discarded or restarted |
| **Stalled** | Hit stall threshold |
| **Lead takeover rate** | Takeovers / worker assignments |
| **Merge conflicts** | Conflicts requiring manual resolve at integration |
| **Post-integration defects** | Failures found in Lead re-test or G5 after merge attributable to worker slice |
| **Handoff overhead** | Lead minutes writing assignment + reviewing vs worker productive minutes (estimate OK) |

**Health targets (initial):**

| Metric | Target |
|--------|--------|
| Accepted without rework | ≥60% of assignments when workers used |
| Lead takeover rate | ≤25% |
| Merge conflicts | ≤1 per two-worker stage |
| Post-integration defects | 0 critical per package |
| Handoff overhead | &lt;30% of calendar time for that slice |

If targets miss for two packages in a row → bias harder to Lead-direct until root-caused.

---

## 8. Standard worker assignment template

Save as: `docs/overnight-runs/assignments/{package}-worker-{a|b}.md`  
(or `docs/delivery/assignments/` for non-overnight apps)

```markdown
# Worker assignment — {PACKAGE_ID} / worker-{a|b}

## Identity
- Backlog ID:
- Package:
- Worker lane: worker-a | worker-b
- Exact branch:
- Exact worktree path (Windows):
- Base tip SHA to branch from (Lead provides):
- Max wall time:

## Paths
### Writable (exclusive)
- …

### Read-only allowed
- …

### Prohibited (always includes)
- docs/overnight-runs/CONTROL.json
- docs/delivery/DEPLOYMENT-REGISTRY.json
- docs/deploy-checklists/*mike*
- docs/architecture/DELIVERY-SYSTEM-*
- Any path owned by the other worker or Lead’s concurrent write set
- …

## Bounded deliverable
{One paragraph — what exists when done}

## Acceptance criteria
- [ ] …
- [ ] …

## Required test commands
```
{exact commands}
```

## Expected result artifact
- Path:
- Must include: branch SHA, files touched, test output summary, blockers

## Stop conditions
- Hit prohibited path need → stop and report
- Product decision required → stop and report to Lead
- Stall / tool failure → report; do not invent alternate scope
- Hard stops: no PROD, no real sends, no credentials, no archive

## Merge preference
- Merge order hint for Lead:
- Conflicts: stop; do not force

## Out of scope
- CONTROL / capacity / registry / Mike sheets / closeout / promotion PR
```

---

## 9. Standard worker result template

Save as: `docs/overnight-runs/results/{package}-worker-{a|b}-result.md`

```markdown
# Worker result — {PACKAGE_ID} / worker-{a|b}

## Identity
- Branch:
- Worktree:
- Tip SHA:
- Started / finished:

## Deliverable status
- [ ] Complete within bounded scope
- [ ] Partial (describe)
- [ ] Blocked (stop condition)

## Files touched (must ⊆ writable)
| Path | Change |

## Tests run
| Command | Result |

## Result artifact path
…

## Stop / blockers
…

## Metrics self-report
- Expect Lead class: accepted | rework-likely | reject-likely
- Stall? yes/no
- Conflicts anticipated? yes/no

## Explicit non-actions
- Did not edit CONTROL / registry / Mike sheets / closeout: [x]
```

---

## 10. How this applies across the full V2 rebuild

Delivery System v2.0 (including this Lead/Worker model) applies to **every remaining** Shooting Challenge V2 workstream after the validation pilot, including:

| Workstream | Typical concurrency | Lead owns | Worker OK? |
|------------|---------------------|-----------|------------|
| Backlog features (C-*, V2-*) | 0–2 | Integration, UI gates, state | Yes if path-disjoint |
| Website packages | Often 1 worker on `web/**` mock while Lead does Airtable | Adapters policy, promo | Yes (`web/**` exclusive) |
| Schema / automation migrations | Usually 0; sometimes 1 on offline tests | Scripts + live smoke + Mike paste | Tests-only worker |
| DEV deployment (paste/smoke) | 0 | Mike sheet + verify | No (UI/state) |
| PROD promotion | 0 | Promotion package + Mike | No |
| Season rollover | 0–1 (docs/tests parallel) | Cutover plan + gates | Docs/tests only |
| App refactor reuse (other repos) | Same model | Same roles | Same templates |

**Pilot clarification:** The two-package pilot (117 + next consolidation) is a **validation period** for process metrics — **not** a scope cap. The operating model already **governs** the entire remaining V2 rebuild and is the intended reusable OS for Mike’s other Airtable/Vercel applications. Permanent “v2.0 adopted” label waits for pilot review PASS; **operating under v2.0 rules does not wait**.

---

## 11. Reuse across other applications

For each new Airtable/Vercel app:

1. Copy this Lead/Worker model + templates  
2. Create app CONTROL / DELIVERY-STATE + DEPLOYMENT-REGISTRY  
3. Keep Lead-direct default + max Lead+2  
4. Same hybrid Mike handoff + ChatGPT session pack  
5. Same hard stops  

Do not invent a looser worker model for greenfield apps — looser parallelism without exclusive paths is how Desktop v1 burned Lead time.

---

*End of Lead & Worker Agent Model.*
