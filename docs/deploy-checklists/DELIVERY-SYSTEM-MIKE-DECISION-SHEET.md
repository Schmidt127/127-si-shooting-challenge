# Mike decision sheet — Delivery System v2.0

**Date:** 2026-07-15  
**Type:** Process / architecture (no Airtable or app code changes in this package)  
**Evidence pack:**  
- `docs/architecture/DELIVERY-SYSTEM-CURRENT-STATE-REVIEW.md`  
- `docs/architecture/DELIVERY-SYSTEM-V2-PROPOSAL.md`  
- `docs/architecture/DELIVERY-SYSTEM-ROLE-MATRIX.md`  
- `docs/architecture/DELIVERY-SYSTEM-TEST-GATES.md`  
- `docs/architecture/DELIVERY-SYSTEM-HANDOFF-TEMPLATE.md`  
- `docs/architecture/DELIVERY-SYSTEM-STATE-MODEL.md`

**Cursor reply when done:** `Delivery System v2.0 decisions: <comma-separated IDs>`  
Example: `Delivery System v2.0 decisions: D1-yes, D2-yes, D3-lead2, D4-same-commit, D5-defer-registry`

---

## Snapshot for Mike (from review)

| | |
|--|--|
| **Top strengths** | Hard PROD/send stops; rollback folders; live DEV no-send smokes; capacity OFF≠delete; CONTROL tip tracking |
| **Top weaknesses** | Manual paste/deploy gap; stale multi-docs; tip-sync noise; worker stalls → Lead rewrite; ~256 commits off `master` |
| **Now** | S29 complete; capacity **45/5**; next product gate still **117 OFF** paste/activation when you choose |

---

## Decisions

### D1 — Adopt Delivery System v2.0 as the operating model going forward?

| Option | Meaning |
|--------|---------|
| **yes** | Use v2.0 docs as process authority alongside Constitution / doc 04 |
| **pilot** | Apply only to next 2 packages (e.g. 117 + next consolidation) |
| **no** | Keep Desktop v1 overnight habits as-is |

**Recommend:** **pilot** then **yes**.

Your choice: ________

---

### D2 — Mike-facing handoffs: one 9-field sheet only?

| Option | Meaning |
|--------|---------|
| **yes** | Cursor must not send long chat paste runbooks; only HANDOFF-TEMPLATE sheets |
| **hybrid** | Sheet + short morning tip linking sheet |
| **no** | Keep current verbose multi-doc style |

**Recommend:** **hybrid**.

Your choice: ________

---

### D3 — Agent concurrency default?

| Option | Meaning |
|--------|---------|
| **lead-only** | Lead-direct default; workers rare |
| **lead2** | Lead + max 2 workers when paths disjoint |
| **lead4** | Keep up to 4 overnight workers |

**Recommend:** **lead2** (matches S27/S29 practice after stalls).

Your choice: ________

---

### D4 — CONTROL tip-sync policy?

| Option | Meaning |
|--------|---------|
| **same-commit** | Update CONTROL SHA in the feature/closeout commit (no standalone tip-sync) |
| **allow-tip-sync** | Keep separate `docs: tip-sync CONTROL` commits |
| **lagging-pointer** | CONTROL sha may lag tip by design; stop claiming strict match |

**Recommend:** **same-commit**.

Your choice: ________

---

### D5 — Automation Deployment Registry in DEV?

| Option | Meaning |
|--------|---------|
| **yes-now** | Create DEV table/rows: automation #, version, content SHA, pasted-at (Cursor schema + Mike maintain ON/OFF) |
| **json-only** | Repo JSON registry updated on closeout (no Airtable table yet) |
| **defer** | Rely on post-paste smoke only for now |

**Recommend:** **json-only** immediately; **yes-now** when convenient.

Your choice: ________

---

### D6 — Strip live queue from `PROJECT_STATE.md`?

| Option | Meaning |
|--------|---------|
| **yes** | PROJECT_STATE = bases/URLs/env only; CONTROL = live tip |
| **no** | Keep dual live snapshots |

**Recommend:** **yes**.

Your choice: ________

---

### D7 — Integration branch → `master` cadence?

| Option | Meaning |
|--------|---------|
| **weekly-pr** | Squash/merge PR from integration to master weekly |
| **per-feature** | PR after each G6 close |
| **ad-hoc** | Only when you ask |

**Recommend:** **weekly-pr** (reduce 256-commit drift).

Your choice: ________

---

### D8 — Website work while unused in prod?

| Option | Meaning |
|--------|---------|
| **mock-default** | Agents use mock Airtable adapters; live DEV optional per backlog |
| **live-dev-ok** | Live DEV adapters allowed freely |
| **pause-web** | Stop website packages until Airtable V2 more done |

**Recommend:** **mock-default**.

Your choice: ________

---

### D9 — ChatGPT session pack mandatory?

| Option | Meaning |
|--------|---------|
| **yes** | Every ChatGPT session starts with CONTROL next_action + sheet path + hard stops + “no invented paths” |
| **optional** | As today |

**Recommend:** **yes**.

Your choice: ________

---

### D10 — Pursue browser automation for Airtable paste later?

| Option | Meaning |
|--------|---------|
| **research** | Cursor may research feasibility (no enable) |
| **build-pilot** | Authorize a DEV-only paste bot experiment |
| **never** | Mike paste forever; invest in orchestrators instead |

**Recommend:** **research** now; **never** until API exists, unless paste volume stays painful.

Your choice: ________

---

## Not decisions (informational)

- No PROD / Make / AWS / Vercel setting changes in this package.  
- 117 remains OFF until you use its activation sheet.  
- Phase E consolidations remain analysis-only until you authorize.

---

## Suggested immediate process changes (no decision required to start soft adoption)

1. Use 9-field handoff template for next Mike gate  
2. Cap workers at 2  
3. Prefer Lead-direct when work is not path-disjoint  
4. Stop asking Mike for Meta-API-capable DEV schema under approved briefs  
5. Keep rollback + blank-webhook smoke discipline  

Tooling/API later: paste-verify script, registry, automation management API if Airtable ships it.

---

*End of decision sheet.*
