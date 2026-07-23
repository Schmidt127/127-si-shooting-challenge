# Identity Matching Audit

**SC items:** SC-060, SC-061, SC-062, SC-063  
**Authority script:** Automation **001** v5.1  
**Helper (read-only):** `tools/enrollment-season/identity_matching.py`  
**Fixtures/tests:** `tests/fixtures/enrollment-season/identity-cases.json` · `tools/enrollment-season/tests/test_identity_matching.py`

---

## Intended identity hierarchy

| Priority | Method | Result |
|----------|--------|--------|
| 1 | Enrollment.`Athlete` already linked | Reuse link; activate Athlete |
| 2 | Athletes.`Athlete Match Key` exact equals script key | Match |
| 3 | Normalized First + Last + Parent Email | Match |
| 4 | Last-chance re-query (race guard) | Match if appeared |
| 5 | No match | **Create** new Athlete |

**Match key:**

```text
normalizeEmail(parentEmail) + "|" + normalizeText(firstName) + "|" + normalizeText(lastName)
```

Normalization: trim, lowercase, collapse whitespace; email strips angles/quotes/trailing punctuation.

**Not in hierarchy:** athlete email, school, grade, phone, fuzzy spelling, phonetic match, Family table.

**Hard rule for this package:** Do **not** invent a destructive automatic merge.

---

## Scenario matrix

| Scenario | Intended behavior | 001 actual | Risk |
|----------|-------------------|------------|------|
| Exact returning athlete | Match existing Athlete; new Enrollment | Match key / components | Low |
| Same name, same parent | Match that Athlete | Match | Low (siblings distinguished by first name) |
| Same name, different parent | Distinct Athlete (create) | Create | Medium — true duplicate only if same child, different guardian email |
| Changed athlete email | Still match on parent+name | Match (email ignored) | Low for identity; Enrollment email may differ |
| Changed parent email | **New Athlete** under current rules | Create | **High** — orphaned history on old Athlete |
| Spelling differences | No fuzzy match → create | Create | **High** — duplicate Athletes |
| Whitespace / capitalization | Normalize → match | Match | Low |
| Sibling shared parent email | Separate Athletes (different first names) | Match each sibling key | Low |
| Duplicate form submission | If same Enrollment linked → already-linked; if new Enrollment → may rematch same Athlete | Partial | Medium — duplicate Enrollments possible |
| Athlete enrolled another season | Match Athlete; create new Enrollment | Match; no season gate | Medium — ops must set School Year/Program Instance |
| Multiple current Enrollments | Warn only (helper); 001 still links | Links / creates Enrollment | **High** for 023 ambiguity |
| Missing athlete email | Allowed | Allowed | Low |
| Missing parent email | Skip | Skip | Blocks intake (correct) |

---

## Identity risks (confirmed from repo)

1. **Parent email is the identity anchor.** Changing it creates a second Athlete with no automatic link to prior XP/history.  
2. **No spelling / nickname reconciliation.** Ops must merge manually if ever needed.  
3. **Athlete email is not identity.** Useful for athlete-facing comms later; irrelevant to 001.  
4. **No season uniqueness in 001.** Duplicate current-season Enrollments are possible; 023 refuses to guess when multiple Active enrollments match.  
5. **No Family table.** Sibling handling is denormalized Parent Email on each Enrollment (acceptable; Family table is future option only).

---

## Recommended operator actions (non-destructive)

| Situation | Action |
|-----------|--------|
| Suspected duplicate Athletes | Audit with helper; **manual** link/merge decision by Mike — no auto-merge script in this package |
| Parent email correction | Update both Athlete + Enrollment intentionally; do not re-submit Fillout as “new” |
| Duplicate season Enrollment | Keep one Active?; inactivate/void the other |
| Sibling enrollments | Expected; verify distinct first names + shared parent email |

---

## Test coverage

All scenarios above are encoded in `identity-cases.json` and asserted by `test_identity_matching.py` (offline, deterministic, no Airtable writes).
