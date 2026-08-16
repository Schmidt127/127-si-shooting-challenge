# PKG-038 — Rollback plan

**Scope:** Automations **053**, **054**, **059**, **066** only  
**Principle:** Restore prior **script version and trigger configuration** — never delete data.

---

## What rollback is

| Allowed | Forbidden |
|---------|-----------|
| Turn affected automation **OFF** | Delete XP Events |
| Paste **captured pre-PKG-038** script body | Delete Athlete Achievement Unlocks |
| Restore trigger fields / watched fields from baseline screenshot | Delete Streak Occurrences |
| Re-enable prior known-good version | Delete Submissions or Enrollments |
| Preserve all test evidence (runs, audit JSON) | Mass-clear `Source Key` fields |
| Re-run read-only audit | Paste obsolete repo version without Mike approval |

---

## Per-automation rollback targets

Capture these **before** any PKG-038 paste (editor version string + exported script if possible):

| Automation | Likely rollback version (last attested PROD) | Rollback packet |
|------------|-----------------------------------------------|-----------------|
| 053 | **v5.3** (or whatever editor shows pre-paste) | Saved export / git tag at capture SHA |
| 054 | **v5.6** | Saved export |
| 059 | **v3.5** | Saved export |
| 066 | **v3.5** | Saved export |

**If pre-paste capture missing:** turn automations **OFF** and stop — do not guess a rollback script. Fetch Mike-approved historical export from `docs/prod-completion/` evidence or prior automation history.

---

## Rollback sequence

1. **Stop testing** — do not continue correction/restoration steps.
2. Turn **OFF** in reverse dependency order: **059 → 066 → 054 → 053**.
3. Leave **010**, **041**, **042** unchanged unless separate incident.
4. Paste rollback script for each affected automation (059, 066, 054, 053).
5. Restore each trigger configuration from baseline documentation.
6. Turn **ON** only automations that were ON before PKG-038 (if returning to known-good).
7. Run `audit-achievement-xp-pipeline-integrity.js` (read-only); save JSON.
8. Record final ON/OFF state in evidence checklist.

---

## Data created during a failed test

| Situation | Action |
|-----------|--------|
| New `STREAK_XP` during failed first-create test | Leave record; set `Active?` false via **054** rollback behavior or manual inactive if automation OFF — **do not delete** |
| New milestone unlock during failed test | Leave; set `Active?` false on unlock — **do not delete** |
| Duplicate Source Key detected | **Stop** — do not enable; investigate with audit samples; no bulk delete |
| Submission Base XP accidentally duplicated | **010** incident — not PKG-038 rollback; follow PKG-006R packet |

Inactive historical rows are acceptable. Deletion is not.

---

## Partial rollback (one automation failure)

| Failed automation | Turn OFF | Others |
|-------------------|----------|--------|
| 053 | 053 only | Keep 054/066/059 OFF until 053 fixed or rolled back |
| 054 | 054 (+ consider 053 OFF to prevent orphan Ready states) | 066/059 independent but keep OFF during streak incident |
| 066 | 066 | 059 OFF until 066 stable |
| 059 | 059 | Unlocks may sit Pending — acceptable |

Never roll back **010** as part of PKG-038.

---

## Re-attempt criteria

After rollback and audit:

1. Root cause documented (trigger, version, data ambiguity).
2. Blocker from [PKG-038-DO-NOT-PROCEED-GATE.md](./PKG-038-DO-NOT-PROCEED-GATE.md) resolved.
3. Mike approves second paste attempt.
4. Fresh before-state evidence captured.

---

## Post-rollback changelog

If rollback occurs in Production, Mike or Cursor adds a line under `CHANGELOG.md` → `### Airtable` describing versions restored and that PKG-038 proof remains incomplete.
