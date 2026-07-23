# Sibling Handling Spec

**SC item:** SC-062  
**Fixtures:** `tests/fixtures/enrollment-season/sibling-cases.json`  
**Family table:** **Not required** for current season — future architecture option only (SC-067 adjacent).

---

## Model (current schema)

| Layer | Where data lives |
|-------|------------------|
| Family | **Not a table** — implied by shared Parent Email (+ parent name fields) |
| Athlete | One Athlete per child identity (parent email + first + last) |
| Enrollment | One Enrollment per athlete per season intake |

Schema snapshot confirms: Athletes has no Parent record link; Parent Email is denormalized on Athletes and Enrollments.

---

## Shared-family behaviors

| Scenario | Intended result |
|----------|-----------------|
| Shared parent email | Allowed and expected |
| Separate athlete emails | Allowed; each Enrollment stores its own Athlete Email |
| One athlete without email | Allowed; parent email remains identity + confirmation route |
| Two siblings same day | Two Athletes + two Enrollments; 001 last-chance re-query reduces race duplicate Athletes |
| Parent confirmation routing | Welcome/weekly/daily packages use **Enrollment.Parent Email** — siblings share inbox, separate packages |
| Duplicate parent records | None — there is no Parent table to duplicate |
| Family-level vs athlete-level | Parent contact = family-level denormalized; Grade/School/XP = athlete/enrollment-level |

---

## Risks

1. Parent updates email on only one sibling’s Enrollment → identity drift vs Athlete.Parent Email.  
2. Typo in one sibling’s last name → extra Athlete.  
3. Email automations must not assume one Enrollment per parent email.

---

## Future option (not in this package)

Introduce a Family / Guardians table only if multi-guardian, multi-address, or billing complexity demands it. **Do not block SC-060–069 on that redesign.**
