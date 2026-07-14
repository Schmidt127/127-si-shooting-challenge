# DEV Execution and Promotion Model

**Status:** Active — applies to future V2 feature work after C-025 Effective→Formula postconversion (2026-07-14).  
**Authority:** Owner (Mike Schmidt).  
**Related:** [04-ai-development-standards.md](../v2/04-ai-development-standards.md) · [ENGINEERING_CONSTITUTION.md](../ENGINEERING_CONSTITUTION.md) · [AGENTS.md](../../AGENTS.md)

---

## Purpose

Increase completed feature output **without reducing correctness**.

Mike approves the **feature outcome once**. After that, Cursor and its agents may complete the entire feature in **DEV** without returning for permission on routine technical repairs, temporary test writes, formula adjustments, field scaffolding, or similar low-risk DEV details.

This model does **not** authorize uncontrolled PROD changes, archive edits, or real external communications.

**What must not weaken:**

- GitHub as source of truth for shippable automations/scripts
- Secret handling
- XP idempotency (one source → one XP Event)
- Audit / dry-run patterns for write extensions
- PROD promotion controls
- Archive protection

---

## 1. Environment model

| Environment | Purpose | Rules |
|-------------|---------|-------|
| **ARCHIVE** | Preserve completed 2025–26 season as historical evidence | No development, schema experimentation, automation rewrites, destructive cleanup, or new season data. **Read-only** except an explicitly approved historical repair. |
| **DEV** | Construction, experimentation, testing, feature completion | Disposable and breakable. Agents may create/modify/replace/rename/delete DEV-only fields when required by an approved feature; create/delete test records; repair formulas and scripts without returning for approval; rebuild failed DEV implementations; clean scaffolding after tests pass. Temporary breakage is acceptable. Final DEV state must be documented, tested, and coherent. |
| **PROD** | Future 2026–27 live system | No automatic promotion from DEV. Mike must approve promotion. Apply only a tested deployment package. Smoke-test after promotion. Record promotion in GitHub + CHANGELOG. No real family data or external sends until explicitly approved. |

---

## 2. Approval model

### Mike approves once

Business outcome, approved behavior, scope, acceptance criteria, external-impact restrictions, and definition of done.

### Do **not** stop for

- Minor field-name differences
- Failed test scripts that can be safely repaired
- Formula syntax adjustments
- Airtable API limitations
- Temporary test fixtures
- DEV-only scaffolding
- DEV field replacement
- DEV view creation or repair
- Test-record cleanup
- Technical choices that do **not** change the approved business rule

### Stop and ask Mike only when

1. A product or business-rule decision is required  
2. The implementation would materially change the approved feature behavior  
3. Real emails or texts may be sent  
4. A paid external service may be activated or incur meaningful cost  
5. Make.com, Fillout, Vercel, AWS, Twilio, or another external system may affect real users  
6. Historical archive data may be changed or deleted  
7. PROD promotion is ready  
8. Credentials, permissions, or secrets are missing  
9. A destructive change could affect data **outside DEV**  
10. The feature cannot be completed within the approved acceptance criteria  

---

## 3. Feature-based execution

Work on **one complete feature** at a time.

Every feature must begin with:

| Element | Required |
|---------|----------|
| Business outcome | What success looks like for athletes/parents/ops |
| Approved behavior | Locked product rules |
| Scope | In / out |
| Acceptance criteria | Testable checklist |
| External-impact restrictions | Email, Make, AWS, PROD, archive, etc. |
| Definition of done | DEV DoD (§4) |

### Roles (within Cursor)

| Role | Owns |
|------|------|
| **Lead** | Full feature through completion; integration; technical decisions that do not alter business rules; final verification; documentation; commit; consolidated report |
| **Agent A** | Implementation |
| **Agent B** | Testing, audits, failure analysis |

Agents must **not** separately return routine technical questions to Mike. The Lead resolves them when they do not alter the approved business rule.

Do **not** start the next feature merely because one agent finishes early. Use remaining capacity to strengthen tests, verify edge cases, improve deployment instructions, clean current-task scaffolding, or audit the completed feature.

---

## 4. Definition of done in DEV

A feature is complete in DEV when:

1. The approved user workflow works end to end  
2. Normal case passes  
3. Important failure/conflict case passes  
4. Duplicate XP, duplicate records, or duplicate sends are prevented where applicable  
5. Required formulas and automations work  
6. Test fixtures are restored or intentionally retained and labeled  
7. Temporary scaffolding is removed or explicitly documented  
8. Relevant regression tests pass  
9. GitHub contains the final implementation  
10. Local equals remote  
11. A PROD promotion manifest is prepared  
12. Remaining limitations are clearly stated  

Do **not** call a feature complete merely because its design, schema, or scripts exist.

---

## 5. Risk-based controls

### Low-risk DEV work — autonomous (after feature approval)

Examples: create or edit fields; repair formulas; change DEV field types; create or repair views; create test records; run test writes; rewrite failed test tools; replace unsuccessful DEV scaffolding; remove temporary fields created by the same feature after dependency checks; update scripts and documentation; commit and push.

### High-risk work — requires Mike approval

Examples: PROD promotion; archive modification; real parent/athlete communications; real XP or award changes outside controlled DEV fixtures; external webhook activation; paid service activation; public website cutover; Fillout production routing; Make production scenario activation; destructive deletion with uncertain dependencies; major business-rule changes.

---

## 6. DEV → PROD promotion

After a feature passes in DEV, prepare **one** promotion package:

1. Schema changes  
2. Exact formulas  
3. Automation scripts  
4. Trigger and input configuration  
5. Required Config values  
6. Data migrations  
7. Test results  
8. Rollback or repair procedure  
9. PROD smoke-test checklist  
10. Documentation and changelog changes  

Then **stop for Mike’s approval**.

After approval: apply to PROD → run smoke tests → confirm no unintended sends or duplicate records → commit deployment-state docs → confirm local equals remote.

---

## 7. Reporting model

### During a DEV feature

- Report only a genuine blocker, product decision, or external-impact risk  
- Do not ask Mike to approve routine engineering repairs  
- Do not create a new approval checkpoint for every field or script correction  

### At completion — one consolidated report

1. Feature outcome  
2. What works end to end  
3. DEV changes  
4. Tests and results  
5. Temporary items removed or retained  
6. Known limitations  
7. Files and commits  
8. PROD promotion package  
9. Decisions still needed  
10. Exact next recommended feature  

---

## 8. How this relates to other project rules

| Existing rule | Relationship |
|---------------|--------------|
| Five-phase workflow (Idea → Plan → Implement → Review → Close) | Unchanged. This model governs **how Phase 3 runs inside DEV** after Mike approves the feature. |
| OMNI-first (Mike’s Airtable credits) | Still prefer OMNI when **Mike** wants a quick in-base answer himself. Once a feature is **approved for Cursor Phase 3**, Cursor/Lead may implement DEV schema, formulas, and views **autonomously** without redirecting each repair to OMNI. |
| GitHub → paste for production automations | Unchanged. Ship scripts via repo; paste to Airtable after commit. DEV paste/testing of scripts belonging to the approved feature is autonomous. |
| Promotion documentation | Unchanged and **strengthened** — feature DoD requires a PROD promotion package before Mike promotion approval. |
| Overnight CONTROL hard blocks | Overnight runs still honor `CONTROL.json` and hard blocks for PROD/archive/credentials. **DEV schema/fixture work that is part of an authorized overnight feature package** is allowed under this model (Lead-direct); do not treat every DEV field create as a Mike stop. |
| Backlog ID + Phase 2 approval | Still required to **start** a feature. Not required again for each technical repair inside that feature. |

---

## 9. Feature brief template (start of every feature)

```text
Feature brief
Backlog ID:
Business outcome:
Approved behavior:
Scope (in):
Scope (out):
Acceptance criteria:
  - ...
External-impact restrictions:
  - No PROD
  - No archive writes
  - No real emails/texts
  - No Make/Vercel/AWS activation affecting real users
  - ...
Definition of done: per DEV Execution Model §4
Mike approval status: APPROVED / PENDING
```

Do **not** begin implementation until Mike confirms business outcome and acceptance criteria.
