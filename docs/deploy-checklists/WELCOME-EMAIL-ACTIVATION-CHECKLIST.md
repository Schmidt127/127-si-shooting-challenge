# WELCOME email — participant activation checklist

**Purpose:** Gates that must pass before **non-test** Shooting Challenge participant welcome emails are enabled.  
**Integration reference:** [WELCOME-EMAIL-INTEGRATION.md](../communications-hub/WELCOME-EMAIL-INTEGRATION.md)  
**Last updated:** 2026-08-08

Do **not** enable participant-wide sends until every required row below is checked and evidenced.

---

## 1. Content and branding

| # | Gate | Owner | Evidence |
|---|------|-------|----------|
| 1.1 | Final welcome **copy** approved (subject, body, CTAs, legal/footer) | Mike | Approved doc or ticket link |
| 1.2 | **Branding** matches `BRAND_STANDARDS.md` + `APP_CONTEXT.md` (127 SI / Shooting Challenge accents) | Mike + Cursor | Side-by-side review screenshot |
| 1.3 | Season/program labels correct (school year, program instance name, not stale 2025–2026 text) | Mike | Sample render |
| 1.4 | Links verified (registration, daily submission, website, support contact) | Mike | Click-through log |

---

## 2. Hub template implementation

| # | Gate | Owner | Evidence |
|---|------|-------|----------|
| 2.1 | Communications Hub **WELCOME** template implements approved design (Hub-owned subject/HTML — not operator-supplied queue fields) | Hub operator | Hub template version id |
| 2.2 | Template review in **test mode** with allowlist recipient | Mike | Delivery record + rendered email screenshot |
| 2.3 | Parent + athlete **same email** dedupes to **one** Delivery (regression) | Operator | Hub Delivery count = 1 |
| 2.4 | Hub Event **source table** mapping populated for Shooting Challenge rows | Hub operator | Hub Event export |

---

## 3. Recipient, consent, and authorization

| # | Gate | Owner | Evidence |
|---|------|-------|----------|
| 3.1 | Recipient resolution documented (`Parent Email - Cleaned`, athlete email rules) | Cursor / Mike | Enrollment pipeline doc |
| 3.2 | Consent / registration terms cover transactional welcome email | Mike | Registration copy reference |
| 3.3 | Opt-out / suppression list reviewed (Hub + any Shooting Challenge flags) | Mike | Suppression audit |
| 3.4 | **Explicit written approval** to enable non-test participant sends | Mike | Dated approval in completion master or backlog |

---

## 4. Shooting Challenge automation readiness

| # | Gate | Owner | Evidence |
|---|------|-------|----------|
| 4.1 | **Automation 079** live in PROD; trigger conditions verified | Mike | Airtable automation screenshot |
| 4.2 | **079 script exported to GitHub** (recommended before production traffic) | Cursor | Commit SHA + file path |
| 4.3 | Email Handoff Queue field contract documented and matches live UI | Cursor | Integration doc + schema note |
| 4.4 | **Make.com welcome scenario remains OFF** | Mike | Make scenario status screenshot |
| 4.5 | **075** role clarified (build-only vs retired) — no competing send path | Mike | Decision recorded in §9M |

---

## 5. Controlled test (post-template)

Run [WELCOME-EMAIL-CONTROLLED-TEST-RUNBOOK.md](./WELCOME-EMAIL-CONTROLLED-TEST-RUNBOOK.md) after any template or 079 change.

| # | Gate | Pass criteria |
|---|------|---------------|
| 5.1 | Unique Handoff Key used | New key suffix documented |
| 5.2 | Queue → 079 → Hub Event → Delivery | Full chain in one run |
| 5.3 | Queue **Accepted** + Hub Delivery **`Sent`** | Intake **Accepted** alone is insufficient |
| 5.4 | Replay with **same** Handoff Key (after initial **Sent**) | No second Delivery |
| 5.5 | **Test Mode?** + allowlist honored | Only allowlisted inbox received mail |

Store evidence under `docs/testing/evidence/YYYY-MM-DD-welcome-hub/`.

---

## 6. Enable participant sends (explicit step)

Only after sections 1–5 pass:

| # | Action | Owner |
|---|--------|-------|
| 6.1 | Switch send authorization from test-only to participant traffic (per Hub + 079 contract) | Mike |
| 6.2 | Arm enrollment → queue → 079 path for real intake (if not already) | Mike |
| 6.3 | Monitor first **N** enrollments manually (recommend N ≥ 3) | Mike |
| 6.4 | Update `SHOOTING_CHALLENGE_COMPLETION_MASTER.md` §9M status | Cursor |

---

## 7. Post-send audit

| # | Check | When |
|---|-------|------|
| 7.1 | Hub Delivery records — terminal **`Sent`** + provider id; one per Handoff Key | Within 24h of first batch |
| 7.2 | No duplicate Deliveries per Handoff Key | Same window |
| 7.3 | Queue rows show **Accepted**; error rate acceptable | Same window |
| 7.4 | Opt-out / bounce handling verified | First week |
| 7.5 | `CHANGELOG.md` updated under `### Airtable` if production-impacting | At enable time |

---

## Rollback

If unintended sends occur:

1. Disable **079** trigger or stop arming Email Handoff Queue rows immediately.
2. Confirm Hub **Test Mode?** / allowlist re-enabled.
3. Do **not** bulk-delete Delivery audit records — use for forensics.
4. Document incident in completion master §9M.

**Do not** re-enable Make.com welcome scenario as rollback without explicit approval.
