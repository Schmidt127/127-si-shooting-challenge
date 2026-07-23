# Master Update Proposal — Enrollment & Season (SC-060 … SC-069, SC-146)

**Do not mark any item Complete.**  
**Do not edit** `docs/SHOOTING_CHALLENGE_COMPLETION_MASTER.md` from this package — apply only after Mike review.

**Evidence roots:**

- `docs/online-agents/enrollment-season/`  
- `tools/enrollment-season/`  
- `tests/fixtures/enrollment-season/`  
- Offline tests: `python3 -m unittest discover -s tools/enrollment-season/tests -v` → **18 OK** (2026-07-23)

---

## Proposed status changes

| ID | Current (master) | Proposed | Rationale | Remaining PROD / Fillout work |
|----|------------------|----------|-----------|-------------------------------|
| SC-060 | Planned | **Built in Repository** | Fillout contract schema/docs + offline enrollment validator + fixtures | Live Fillout validation tighten; 001 paste drift check; Athletes hygiene in PROD |
| SC-061 | Planned | **Built in Repository** | New/returning spec + fixtures/tests mirroring 001 | Live PROD proof on Schmidt + one sibling/returning case |
| SC-062 | Planned | **Built in Repository** | Sibling handling spec + fixtures/tests; no Family table | Live sibling parent-email routing test |
| SC-063 | Planned | **Built in Repository** | Email validation rules in contract + validator FAIL paths | Fillout email rules ON; bounce SOP still open |
| SC-064 | Planned | **Built in Repository** | Season date contract + Denver boundary tests | Wire intake-open into Fillout/web gate; Weeks flags if authorized |
| SC-065 | Planned | **Built in Repository** | Weeks seed spec + template + read-only validator | Manually seed real Weeks in PROD with approved dates |
| SC-066 | Decision Needed | **Decision Needed** (unchanged) | Early-bird modeled as Mike decision only | Mike choose keep/drop early-bird |
| SC-067 | Deferred | **Deferred** (unchanged) | Out of scope; referenced only | Future Program Instance wave |
| SC-068 | Built in Repository | **Built in Repository** (retain; enrich evidence) | Active? consumer audit + offline guard contract; **no script edits** | PPE create/backfill; paste guards; resolve 072/118/119 Schmidt hard-exclude conflict |
| SC-069 | Planned | **Built in Repository** | Schmidt enrollment contract aligned to Active?=true + public visibility | Live proof matrix across XP/email/standings still needed |
| SC-146 | Deferred | **Deferred** (unchanged) | Enrollment reopen checklist portion documented | Still blocked on season ready + SC-135 dry-run; Mike decides when to reopen |

---

## Explicit non-proposals

- Do **not** propose Complete for any enrollment item.  
- Do **not** propose creating a Schmidt standings exclusion view/field.  
- Do **not** propose automating Week creation.  
- Do **not** change SC-067 off Deferred.

---

## Dashboard delta (if proposals accepted)

| Bucket | Delta |
|--------|-------|
| Planned | −7 (SC-060–065, SC-069) |
| Built in Repository | +7 |
| Decision Needed | unchanged (SC-066) |
| Deferred | unchanged (SC-067, SC-146) |
