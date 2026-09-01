# FUT-040 — Automatic S3 Migration for Homework, Video Feedback, and Registration Headshots

**Status:** Brief ready (Phase 2) — **do not implement** orchestration code, schema changes, AWS apply, or Airtable paste from this document alone  
**Canonical ID:** **FUT-040**  
**Date:** 2026-09-01  
**Base SHA:** `7aa44416` (`origin/master`)  
**Branch:** `cursor/fut-040-s3-migration-brief-e772`  
**Related:** **FUT-010** (intake SA attachment cleanup worker — built; dry-run 2026-08-30 **0 eligible**) · FUT-007 (HEADSHOT naming) · FUT-009 (bucket structure + corrected-video workflow — **brief ready:** [FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md](../aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md)) · SC-094 · SC-095 · SC-096 · SC-099 · SC-100 (deferred broader Drive/attachment retirement) · [FUT-010-intake-attachment-cleanup.md](../../deploy-checklists/FUT-010-intake-attachment-cleanup.md) · [127-SI-MASTER-FUTURE-WORK-LIST.md](../../127-SI-MASTER-FUTURE-WORK-LIST.md) § FUT-040 · [CURRENT-TRUTH.md](../../CURRENT-TRUTH.md)

---

## 1. Problem statement

The Shooting Challenge stores large binary files in Airtable attachments for homework intake, video feedback intake, and registration headshots. Durable application storage is **private S3** (`shooting-challenge-assets`) with **Lambda viewer** links for homework/video review (SC-094–SC-099, SC-150). Airtable attachments are **transient intake copies** once S3 writeback is verified.

**Today:**

| Path | Upload to S3 | Verified writeback | Attachment cleanup |
|------|--------------|-------------------|-------------------|
| Homework-route **Submission Assets** | **070a** → Make → Lambda (`homework_completion`) | **070c**-style writeback fields on SA | **FUT-010** worker (built; Production dry-run **0 eligible**) |
| Video-route **Submission Assets** | **070b** → Make → Lambda (`video_feedback`) | **070c** verify + writeback | **FUT-010** worker |
| Registration **headshots** | **Not automated** — `Asset Purpose = Registration Headshot` maps to `Upload Destination = Ignore` on SA; no **070** route | No S3 fields on Enrollment today | No worker |

**FUT-010** solves the **delete-after-verify** step for homework/video **Submission Assets** that already completed the **070a/b/c** upload pipeline. It is a **controlled cleanup worker**, not a migration orchestrator.

**FUT-040** adds:

1. **Automatic migration orchestration** — discover → copy → verify → writeback → delete attachment, in strict order.  
2. **Registration headshots** — third approved category (Fillout / enrollment intake).  
3. **Explicit status and audit fields** — migration state machine, verification outcomes, errors, retry metadata.

**Hard rules (from Master Future Work List):**

- Copy to S3 → verify object exists → verify authorized link works → preserve S3 URL → delete Airtable attachment **only after** verification.  
- **Never** delete S3 objects. **Never** delete Airtable records.  
- **Never** enable a public S3 bucket (Section E policy).  
- Scope is **only** the three categories below unless separately approved.

**Non-goals for this brief:** Google Drive retirement (SC-100 deferred), `Homework Completions.Airtable Attachment` legacy cleanup, Fillout form changes, corrected-video rename workflow (FUT-009), future AWS filename convention rollout (FUT-007 implementation).

---

## 2. Relationship to FUT-010 — worker vs orchestrator

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FUT-040 ORCHESTRATOR (Phase 3 — not built)                              │
│                                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌───────┐ │
│  │ Discover │ → │ Copy S3  │ → │ Verify   │ → │ Writeback│ → │ Delete│ │
│  │ eligible │   │ (if need)│   │ gates    │   │ metadata │   │ attach│ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   └───┬───┘ │
│       │              │               │              │             │     │
│       │         070a/b path      HeadObject +    Storage Key,     │     │
│       │         OR direct        URL probe       Canonical URL,   │     │
│       │         headshot copy                    Reviewer URL     │     │
└───────┼──────────────┼───────────────┼──────────────┼─────────────┼─────┘
        │              │               │              │             │
        │    Already Uploaded + writeback complete? │             │
        │              └──────── skip copy ──────────┘             │
        │                                                          ▼
        │                              ┌──────────────────────────────────┐
        └─────────────────────────────►│ FUT-010 WORKER (built)           │
                                         │ lib/intake-attachment-cleanup/ │
                                         │ fut_010_intake_attachment_       │
                                         │   cleanup.py + extension         │
                                         │ DELETE STAGE ONLY                │
                                         └──────────────────────────────────┘
```

| Role | Owner | Responsibility |
|------|-------|----------------|
| **Orchestrator** | FUT-040 | Category routing, discovery queue, copy when S3 empty, verification gates, writeback, status/audit fields, scheduling/triggers |
| **Cleanup worker** | FUT-010 | Fail-closed delete of `Submission Assets.Airtable Attachment` when SA row already `Uploaded` + writeback complete + S3 verified |

**Brief recommendation (not a Mike decision):** Keep **FUT-010 CLI + extension** as a **supervised backfill / reconcile tool** for operators. Embed the **same shared verification contract** (`lib/intake-attachment-cleanup/` today; propose `lib/s3-migration/` wrapper in Phase 3) inside the orchestrator for the delete stage on SA rows. Do **not** shell out to the Python CLI from automations — import shared JS helpers (extension pattern) or call a single Lambda/CLI worker with structured JSON.

**FUT-010 remains valid and unchanged** until FUT-040 orchestrator is live and Mike approves switching Production cleanup authority. FUT-040 does not reopen FUT-010 acceptance criteria.

---

## 3. Scope boundaries

### 3.1 In scope (only these categories)

| # | Category | Primary table(s) | Intake / upload path today | FUT-040 adds |
|---|----------|------------------|---------------------------|--------------|
| 1 | **Homework files** | **Submission Assets** (`Upload Destination = Homework Completions`) | **070a** + Lambda writeback | Orchestrated end-to-end; reconcile rows stuck with attachment after `Uploaded` |
| 2 | **Video feedback files** | **Submission Assets** (`Upload Destination = Video Feedback`) | **070b** + **070c** + Lambda writeback | Same |
| 3 | **Registration headshots** | **Enrollments** (see §6) ± **Submission Assets** staging (`Asset Purpose = Registration Headshot`) | No **070** route; SA formula sets `Upload Destination = Ignore` | Copy + verify + writeback + clear attachment on Mike-selected source field |

### 3.2 Out of scope (explicit)

| Item | Reason | Track elsewhere |
|------|--------|-----------------|
| `Homework Completions.Airtable Attachment` | Legacy v3.6 direct attachment; HC reads SA lookups after upload | FUT-010 promotion doc; SC-100 |
| Google Drive IDs/URLs on SA/VF | Drive retirement is separate | SC-100 (deferred) |
| `Submission Assets` with `Asset Purpose` other than HW1/HW2/Video/Registration Headshot | Not approved categories | New backlog ID |
| **Tutorials and Assets**.`Athlete Headshot` | Catalog/marketing media, not registration intake | Separate if needed |
| **Athletes** table headshot field | **No attachment field exists** on Athletes today (11 fields — identity only) | §6 Option B only if Mike adds field |
| S3 `DeleteObject` | Hard prohibition | — |
| Airtable record `DELETE` | Hard prohibition | — |
| Public bucket / anonymous S3 reads | Rejected policy | SC-096; SC-150 private viewer |
| Automatic deletion without verification | Fail-closed | FUT-010 contract |
| Make upload engine rewrite | **070a/b** remain upload hot path for HW/video | C-013 |

### 3.3 Overlap with SC items

| SC ID | Relevance to FUT-040 |
|-------|---------------------|
| **SC-094** | Video on program-owned S3 — orchestrator must not second-write |
| **SC-095** | Homework on S3 via **070a** — orchestrator defers to existing upload when `alreadyUploadedCanonical` |
| **SC-096** | Canonical HTTPS URL is private identity; verification uses HeadObject + expected 403/401 on anonymous canonical GET |
| **SC-099** | **070c** writeback verification contract is the SA writeback source of truth |
| **SC-100** | Broader attachment/Drive retirement — FUT-040 is a **narrow, category-gated** subset |

---

## 4. Pipeline stages

Strict ordering — **no stage may be skipped**; failure stops before destructive steps.

### Stage 0 — Discover

**Input:** Views or formula filters per category (disposable DEV first).

**Homework / video SA candidates:**

| Condition | Action |
|-----------|--------|
| `Airtable Attachment` non-empty AND `Upload Status = Uploaded` AND writeback complete | Route to **FUT-010 delete stage** (copy skipped) |
| `Airtable Attachment` non-empty AND upload incomplete / uncertain | Route to **070a/b** if eligible, else **failed** with audit (do not delete) |
| Attachment empty AND S3 populated | `skipped_already_migrated` |
| Attachment empty AND S3 empty | Out of scope / no-op |

**Headshot candidates (pending Mike source field — §6):**

| Condition | Action |
|-----------|--------|
| Source attachment non-empty AND no `Headshot Storage Key` (or equivalent) | Queue for copy |
| Source attachment non-empty AND S3 key present AND verification passed | Queue for attachment clear only |
| Source attachment empty AND S3 URL present | `skipped_already_migrated` |

**Outputs:** `migrationStatus = pending`, queue record id, category, source attachment id(s), idempotency key (§5.3).

### Stage 1 — Copy to S3

**Homework / video:** Prefer existing **070a/b** pipeline when row is `Pending Link` + trigger eligible. Orchestrator **must not** duplicate-upload when `alreadyUploadedCanonical` (Canonical URL or `Uploaded` + Storage Key) — same guard as **070a/b**.

**Headshots:** Requires new copy path (Lambda route or orchestrator worker) — **070** does not run today for `Registration Headshot`. Naming should align with **FUT-007** pattern when implemented: `YYYYMMDD_HEADSHOT_LastName_FirstName_Profile` under `shooting-challenge/` prefix.

**On success:** `migrationStatus = copied`, persist provisional Storage Key.

**On failure:** `migrationStatus = failed`, populate `Migration Error`, retain attachment.

### Stage 2 — Verify object exists

**Checks (fail-closed — undefined = fail):**

1. `s3:HeadObject` on `shooting-challenge-assets` at Storage Key — must return 200.  
2. Storage Key matches `^shooting-challenge/` (FUT-010 contract).  
3. SHA-256 hash match when source hash available (align SC-097 / **070c**).

**On success:** `verificationStatus = passed` (internal); may remain `migrationStatus = copied` until link check completes.

**On failure:** `verificationStatus = failed`; **do not writeback or delete**.

### Stage 3 — Verify link works (authorized access)

| Category | Link under test | Pass criteria |
|----------|-----------------|---------------|
| **Video** | **Reviewer File URL** (Lambda viewer) | `classifySecureVideoUrl` → `valid_lambda_viewer` (FUT-010) |
| **Homework** | **Reviewer File URL** or approved homework review URL | HTTP 200/302 via authorized probe (SC-150 pattern) |
| **Headshot** | **Mike decision required** (§8 #4) — Lambda viewer vs presigned URL vs web proxy | Defined per selected access pattern; must work for `/shoot` leaderboard + public profile consumers |

**Canonical File URL:** Anonymous GET expects **403/401** (private bucket). Canonical reachability ≠ public access.

**On success:** `migrationStatus = verified`, `Migration Verified At` set.

### Stage 4 — Writeback (preserve S3 URL)

**Submission Assets (HW/video):** Write only if fields blank or orchestrator is authoritative pass — **never overwrite** divergent Storage Key without Mike-approved reconcile mode. Fields per FUT-010 / **070c**:

- `Storage Key`, `Canonical File URL`, `Upload Status = Uploaded`, `Uploaded At`, `File Content Hash`, `File Hash Algorithm`, `Writeback Complete?` (formula-driven), `Upload Error` blank, `Reviewer File URL` (+ token) for video/homework as today.

**Enrollments (headshots — provisional field names):**

- `Headshot Storage Key`, `Headshot Canonical URL`, optional `Headshot Reviewer URL` / public display URL per §7.  
- Do **not** remove `Athlete Headshot` attachment until Stage 3 passes.

**Idempotency:** Re-run writeback when values already match → `skipped_idempotent`.

### Stage 5 — Delete Airtable attachment

**Permitted write (SA — from FUT-010):**

```json
{ "fields": { "Airtable Attachment": [] } }
```

**Headshots:** Clear Mike-selected source attachment field only (likely `Enrollments.Athlete Headshot` → `[]`).

**Gates (all required):**

- `migrationStatus = verified`  
- `verificationStatus = passed`  
- Explicit orchestrator `CONFIRM_DELETE` / production feature flag (mirror FUT-010 `--confirm-delete`)  
- `Send to Make Trigger` unchecked (SA)  
- Formula attestation for SA (FUT-010 Mike attestation)  

**On success:** `migrationStatus = attachment_cleared`.

**Never:** S3 delete, record delete, clear attachment when verification incomplete.

---

## 5. Verification gates, idempotency, retry, and exceptions

### 5.1 Fail-closed contract (inherit FUT-010)

From `lib/intake-attachment-cleanup/intake-attachment-cleanup.js`:

- `s3ObjectExists === true` **required** — `false` or `undefined` → skip delete.  
- `canonicalUrlReachable === true` **required** for SA cleanup path.  
- Video: `valid_lambda_viewer` on Reviewer File URL.  
- Uncertain upload statuses (`Pending Link`, `Processing`, `Ready`, `Error`, `No File`) → retain attachment.

Orchestrator **extends** this with migration-state gates; it must not weaken FUT-010.

### 5.2 Idempotency keys (proposed)

| Category | Source Key pattern | Prevents |
|----------|-------------------|----------|
| Homework SA | `S3_MIGRATION|SA|{recordId}` | Double copy / double delete |
| Video SA | `S3_MIGRATION|SA|{recordId}` | Same |
| Headshot | `S3_MIGRATION|HS|{enrollmentId}` or `|{athleteId}|{season}` | Per-enrollment duplicate upload |

Store in `Migration Source Key` (§6). Re-run with same key + `attachment_cleared` → no-op.

### 5.3 Retry and exception handling

| Failure class | Retry | Human queue |
|---------------|-------|-------------|
| Transient AWS (503, timeout) | Exponential backoff, max 3 | After max → `failed` + `Migration Error` |
| HeadObject 404 after copy | **No auto-retry** — investigate | Required |
| Invalid Storage Key format | No retry | Reconcile report |
| Reviewer URL invalid | No delete | Fix Lambda/token; re-verify |
| Airtable 429 | Backoff | Extension/CLI batch limits |
| Partial writeback | Fail-closed — attachment retained | Reconcile mode |

**Exception queue:** Airtable interface view `Migration — Failed / Needs Review` (Phase 3).

**Reconcile mode:** Operator-only; mirrors FUT-010 `reconcile` filter — only rows matching strict post-verify criteria.

---

## 6. Status and audit field proposals

**Do not create in Production until PKG-004 ownership matrix approved.**

### 6.1 Submission Assets (extend existing upload audit)

| Field (provisional) | Type | Writer | Purpose |
|---------------------|------|--------|---------|
| **Migration Status** | singleSelect | Orchestrator | `pending` · `copying` · `copied` · `verified` · `attachment_cleared` · `failed` · `skipped` |
| **Migration Verification Status** | singleSelect | Orchestrator | `pending` · `passed` · `failed` |
| **Migration Error** | longText | Orchestrator | Last failure message + code |
| **Migration Verified At** | dateTime | Orchestrator | When Stage 3 passed |
| **Migration Source Key** | singleLineText | Orchestrator | Idempotency (§5.2) |
| **Migration Last Run At** | dateTime | Orchestrator | Audit |
| **Migration Run Count** | number | Orchestrator | Retry tracking |

Existing SA fields (**Upload Status**, **Upload Error**, **Writeback Complete?**, etc.) remain authoritative for **070** pipeline; Migration Status is **orthogonal** — cleanup may be `attachment_cleared` while Upload Status stays `Uploaded`.

### 6.2 Enrollments (headshots — provisional)

| Field (provisional) | Type | Writer | Purpose |
|---------------------|------|--------|---------|
| **Headshot Migration Status** | singleSelect | Orchestrator | Same enum as §6.1 |
| **Headshot Storage Key** | singleLineText | Orchestrator | S3 key under `shooting-challenge/` |
| **Headshot Canonical URL** | url | Orchestrator | Private canonical |
| **Headshot Display URL** | url | Orchestrator | Authorized URL for web (pattern TBD §7) |
| **Headshot Migration Error** | longText | Orchestrator | Failure detail |
| **Headshot Migration Verified At** | dateTime | Orchestrator | Verification timestamp |
| **Headshot Migration Source Key** | singleLineText | Orchestrator | Idempotency |

**Existing:** `Athlete Headshot` (`multipleAttachments`, `fldyR7IYFX9CY34XK` in prod-20260831 snapshot) — **delete target** after verify.

### 6.3 Logging (operator + evidence)

Per record: record id, category, attachment filename, Storage Key, HeadObject result, URL probe result, writeback diff, delete result, skip reason. JSON artifacts under `tools/airtable/_preview/fut-040-*` and `docs/testing/evidence/fut-040/`.

---

## 7. Headshot source field / table options (Mike decision required)

**Do not invent Mike's choice.** Present options from current schema (`prod-20260831-fut002-batch1`).

### Current schema facts

| Location | Field | Type | Web / ops consumers |
|----------|-------|------|---------------------|
| **Enrollments** | **Athlete Headshot** | `multipleAttachments` | **Yes** — `web/lib/data/leaderboard.ts`, `public-athlete-profile.ts`, dashboard |
| **Athletes** | *(none)* | — | Identity-only table (11 fields); AGENTS.md: use Enrollments for operating workflow |
| **Submission Assets** | **Airtable Attachment** + `Asset Purpose = Registration Headshot` | attachments + singleSelect | Intake staging; **Upload Destination** formula → **Ignore** (no **070** upload) |
| **Tutorials and Assets** | **Athlete Headshot** | `multipleAttachments` | Tutorial catalog — **out of FUT-040 scope** |

### Option A — **Enrollments.Athlete Headshot** (brief default)

| Pros | Cons |
|------|------|
| Matches all current `/shoot` consumers | Season-scoped — re-registration may re-upload |
| Field already exists | Fillout may land on SA first — needs copy-to-Enrollment step |
| Aligns with "Enrollments = operating record" | |

**Orchestrator flow:** If Fillout writes SA `Registration Headshot` → copy to S3 → writeback Enrollment headshot URL fields → clear **both** SA and Enrollment attachments when Mike confirms dual-source policy.

### Option B — **Athletes** table new headshot field

| Pros | Cons |
|------|------|
| Cross-season identity photo | **Requires new schema** (PKG-004); Athletes table intentionally minimal |
| Single photo per person | Enrollment/web loaders must change to read Athletes |

### Option C — **Submission Assets only** (staging)

| Pros | Cons |
|------|------|
| Matches Fillout asset intake pattern | Web does **not** read SA for headshots today |
| | Would require new Enrollment lookup + web loader changes anyway |

### Option D — **Hybrid SA staging → Enrollment canonical**

Registration intake creates SA with `Registration Headshot`; orchestrator promotes to S3 + Enrollment URL fields; SA attachment cleared; Enrollment attachment cleared last.

**Brief recommendation (not Mike decision):** **Option D** if Fillout continues to use SA intake; **Option A** alone if Fillout writes directly to Enrollment.

---

## 8. FUT-010 CLI as worker vs embedded worker

| Approach | Pros | Cons |
|----------|------|------|
| **A — Keep FUT-010 CLI separate; orchestrator embeds shared library only** | Supervised operator tool preserved; dry-run/reconcile unchanged; single verification contract | Two entry points to maintain |
| **B — FUT-010 CLI invoked as subprocess from orchestrator** | Reuses CLI flags | Fragile in Airtable automation sandbox; poor error surfaces |
| **C — Retire FUT-010 CLI after orchestrator live** | One tool | Loses supervised reconcile/backfill — **not recommended** |

**Recommendation:** **Option A.** Phase 3 extracts shared module `lib/s3-migration/`:

- `evaluateMigrationEligibility()` — category + stage  
- Re-export FUT-010 delete eligibility for SA  
- `planMigrationAction()` — discover output  

`tools/airtable/fut_010_intake_attachment_cleanup.py` remains for Mike-supervised Production apply. New `tools/airtable/fut_040_s3_migration_orchestrator.py` handles full pipeline + headshots. Extension `fut-040-*` for in-base batch with `DRY_RUN` default.

---

## 9. Lambda viewer applicability by asset type

| Asset type | Lambda viewer (`127si-upload-asset` / SC-150) | Verification approach | Web consumption after migration |
|------------|-----------------------------------------------|----------------------|--------------------------------|
| **Video feedback** | **Required** — Reviewer File URL | `valid_lambda_viewer` + token preserved | Coach/parent review links unchanged |
| **Homework** | **Applicable** — homework route uses same Lambda upload engine | Reviewer URL or canonical probe per SC-009/SC-150 | HC linked SA lookups |
| **Registration headshot** | **Not applicable today** — no headshot Lambda route in `ALLOW_ROUTE_KEYS` | **Mike decision:** (1) new Lambda `headshot` route with tokenized viewer, (2) CloudFront signed URL, (3) server-side web proxy reading private S3, (4) keep Airtable CDN URL until web Phase 2 | Leaderboard + public profile need **stable authorized URL** — today they read Airtable attachment CDN URLs |

**Constraint:** Public anonymous S3 remains **rejected**. Headshot migration **blocks on** display URL strategy — cannot clear Enrollment attachment until `/shoot` loaders can resolve headshot from S3-backed field.

**Cross-reference:** FUT-007 `HEADSHOT` naming is forward-looking; FUT-009 bucket layout options (including `shooting-challenge/headshots/` prefix) are in [FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md](../aws-media/FUT-009-AWS-STORAGE-STRUCTURE-BRIEF.md) §4 / §6.

---

## 10. Phase 3 implementation slices (ordered)

**Prerequisites:** Mike decisions §11; PKG-004 field ownership; DEV schema; FUT-010 formula attestation path understood.

| Slice | Scope | Deliverables |
|-------|-------|--------------|
| **3a — Contract + discovery** | `lib/s3-migration/` pure helpers; idempotency keys; category enum | Unit tests; discovery JSON schema; no Production writes |
| **3b — Schema (PKG-004)** | SA + Enrollment migration fields (§6) | Schema notes; ownership matrix row; DEV paste checklist |
| **3c — SA copy path integration** | Wire discover → **070a/b** when upload incomplete; skip when uploaded | DEV disposable HW + video fixtures; no duplicate S3 |
| **3d — SA verify + writeback + FUT-010 delete** | Orchestrator delete stage calling shared FUT-010 contract | Extend FUT-010 tests; migration status transitions |
| **3e — Headshot copy + verify** | Lambda route or worker **(pending Mike URL strategy)** | HEADSHOT key layout per FUT-007; Enrollment writeback |
| **3f — Headshot web loaders** | `leaderboard.ts`, `public-athlete-profile.ts`, `athlete-dashboard.ts` | Read `Headshot Display URL` with Airtable attachment fallback during transition |
| **3g — Trigger / schedule** | Automation, scheduled CLI, or Make scenario — **(Mike decision §11 #9)** | Rate limits; batch caps; DRY_RUN default |
| **3h — Reconcile + operator UI** | Failed queue view; extension script | Reconcile report like FUT-010 |
| **3i — Promotion** | `docs/deploy-checklists/FUT-040-*`; DEV → Mike → PROD | CHANGELOG; evidence archive |

**Order:** **3a → 3b → 3c → 3d** (SA path, reuses FUT-010) before **3e → 3f** (headshots). **3g** only after dry-run proof on DEV.

---

## 11. Test matrix (non-prod / disposable records)

Run on **DEV** with disposable enrollments per high-autonomy disposable-data mode. **No Production attachment delete from agents.**

### 11.1 Fixtures

| Fixture ID | Category | Setup |
|------------|----------|-------|
| **HW-MIG-01** | Homework SA | Attachment present, force through **070a** upload, writeback complete |
| **VID-MIG-01** | Video SA | Same via **070b** + **070c** |
| **HS-MIG-01** | Headshot | Enrollment with `Athlete Headshot` attachment, no S3 fields |
| **HS-MIG-02** | Headshot | SA `Registration Headshot` + linked Enrollment |

### 11.2 Cases

| # | Scenario | Expected |
|---|----------|----------|
| T1 | Happy path HW — full pipeline | S3 object exists; Reviewer URL works; attachment cleared; SA row intact |
| T2 | Happy path video | Lambda viewer valid; **070c** fields unchanged; attachment cleared |
| T3 | Happy path headshot | S3 + display URL work on `/shoot` profile + leaderboard; Enrollment attachment cleared |
| T4 | Copy fails (mock 500) | `migrationStatus = failed`; attachment retained; no S3 delete |
| T5 | HeadObject 404 after copy | `verificationStatus = failed`; attachment retained |
| T6 | Invalid Reviewer URL (video) | Fail-closed; no delete |
| T7 | Already uploaded SA — skip copy | FUT-010 delete path only; idempotent re-run → `skipped_already_empty` |
| T8 | `Send to Make Trigger` checked | Skip delete |
| T9 | Re-run full orchestrator on cleared row | No duplicate S3 object; no error |
| T10 | Reconcile mode batch | Only eligible rows; JSON report matches FUT-010 shape |
| T11 | Headshot web fallback | When `Headshot Display URL` blank, fall back to attachment; when populated, use S3-backed URL |
| T12 | Wrong category (Submission Photo) | `skipped` — not in scope |

### 11.3 Regression guards

- **070a/b** `alreadyUploadedCanonical` — re-trigger does not duplicate upload (T7).  
- **022** / **020** / **013** — child links intact after attachment clear.  
- XP Events unchanged (no XP automation in migration path).

---

## 12. Open decisions for Mike

1. **Headshot source of truth:** Option A / B / C / D (§7)?  
2. **Dual attachment clear:** If SA staging + Enrollment both hold headshot, clear one or both?  
3. **Headshot display URL strategy:** Lambda viewer vs signed URL vs web proxy (§9)?  
4. **FUT-010 relationship:** Confirm **Option A** — keep CLI as supervised tool + embedded library (§8)?  
5. **Automatic vs supervised delete:** Enable orchestrator auto-delete on DEV only first, or remain operator-gated like FUT-010 `--confirm-delete` for Production?  
6. **Trigger mechanism:** New automation script vs scheduled CLI vs Make scenario (§10 3g)?  
7. **Legacy SA rows:** Production dry-run showed Storage Key format failures — migrate keys first or exclude legacy rows from orchestrator v1?  
8. **FUT-007 naming:** Activate `HEADSHOT` filename pattern in orchestrator v1 or defer to FUT-007 implementation?  
9. **Enrollment vs SA headshot for Fillout:** Where does registration intake write today / at 2027 launch?  
10. **Web cutover:** Hard switch to S3 URL fields or indefinite attachment fallback (§11 T11)?  
11. **PKG-004 priority:** Unblock schema fields (§6) before any DEV paste?

**Count: 11 open decisions.**

---

## 13. PKG / promotion doc requirements

### 13.1 PKG-004 (blocked — required before schema)

Same gate as FUT-038. Before Production schema:

1. Field ownership matrix row for each §6 field (writer = orchestrator automation vs CLI only).  
2. One authoritative Storage Key writer per record (orchestrator vs **070** Lambda).  
3. Dedupe via `Migration Source Key` — document collision with XP Source Keys (orthogonal).  
4. DEV paste + disposable proof before Mike Production paste.

### 13.2 Promotion deliverables (Phase 3 close)

| Artifact | Path (provisional) |
|----------|-------------------|
| Operator checklist | `docs/deploy-checklists/FUT-040-automatic-s3-migration.md` |
| DEV proof evidence | `docs/testing/evidence/fut-040/` |
| Mike attestation | Formula safety (extend FUT-010 attestation for headshot consumers) |
| AWS | No bucket policy change to public; confirm `s3:HeadObject` + Put for orchestrator role |
| Paste order | Schema → DEV orchestrator dry-run → pilot single record → batch → web loader deploy |
| CHANGELOG | `### Airtable` + `### Docs` |

### 13.3 FUT-010 coordination

- Complete FUT-010 supervised apply **or** explicitly defer in favor of FUT-040 orchestrator slice **3d** — document in promotion doc.  
- Cross-link: [FUT-010-intake-attachment-cleanup.md](../../deploy-checklists/FUT-010-intake-attachment-cleanup.md) → this brief.

---

## 14. References

- FUT-010 worker: `lib/intake-attachment-cleanup/intake-attachment-cleanup.js`  
- FUT-010 CLI: `tools/airtable/fut_010_intake_attachment_cleanup.py`  
- Upload writeback contract: `airtable/automations/shooting-challenge/lib/upload-make-lambda-response.js`  
- Automations **070a/b/c**: [automation-index.md](../../automation-index.md)  
- Web headshot consumers: `web/lib/data/leaderboard.ts`, `web/lib/data/public-athlete-profile.ts`  
- Schema snapshot: `airtable/schema/snapshots/prod-20260831-fut002-batch1/`  
- FUT-010 dry-run evidence: [FUT-010-DRY-RUN-2026-08-30-R3.md](../../testing/evidence/FUT-010-DRY-RUN-2026-08-30-R3.md)  

---

*End of FUT-040 Phase 2 architecture brief.*
