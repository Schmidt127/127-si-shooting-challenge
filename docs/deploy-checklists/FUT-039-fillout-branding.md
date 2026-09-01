# FUT-039 — Fillout branding apply (operator checklist)

**Status:** Phase 3 ready — Mike decisions captured **2026-09-01**  
**Owner:** Mike (Fillout UI)  
**Brief:** [FUT-039-FILLOUT-BRANDING-BRIEF.md](../next-wave/fillout/FUT-039-FILLOUT-BRANDING-BRIEF.md)  
**CSS artifact:** [fillout-theme-sc-2026.css](../next-wave/fillout/fillout-theme-sc-2026.css)  
**Official selectors:** [FILLOUT-OFFICIAL-CSS-SELECTORS.md](../next-wave/fillout/FILLOUT-OFFICIAL-CSS-SELECTORS.md) — **use documented classes only**  
**Copy pack:** [FUT-039-FILLOUT-COPY-PACK.md](../next-wave/fillout/FUT-039-FILLOUT-COPY-PACK.md)  
**Inventory:** [FILLOUT-FORM-INVENTORY.md](../next-wave/fillout/FILLOUT-FORM-INVENTORY.md)

**Hard rules:** Visual/CSS only — do **not** rename, reorder, or hide form fields (especially Stripe payment). Do **not** change Airtable schema except the approved edit-submission formula update below.

---

## Mike decisions (locked)

| # | Decision | Answer |
|---|----------|--------|
| 1 | Theme strategy | **Option A** — one shared theme **“127 SI — Shooting Challenge 2026”** |
| 2 | CSS hosting | **One repo file** → paste into Fillout theme custom CSS |
| 3 | Logo source | **`web/public/brand/`** (`logo-v1-blue-orange.png` horizontal; `logo-circle-blue-orange.png` compact) |
| 4 | Who applies | **Mike in Fillout UI** |
| 5 | v1 forms | **Registration + daily + edit only** (HW17 deferred v2) |
| 6 | Edit submission URL | **Migrate** to custom domain (see § Edit URL migration) |
| 7 | Org default | **Per-form assignment** — do **not** set org-wide default |
| 8 | Header | **Logo + text only** (no banner image) |
| 9 | Typography | **Maven Pro only** (no Magistral until web license) |
| 10 | Confirmation | **Fillout ending** — link to `/shoot`; **no auto-redirect** |
| 11 | Timing | **Branding now** — before FUT-003 Make activation |
| 12 | FUT-034 follow-up | **Yes** — OMNI inventory of Fillout form titles for banned **Jr. Ref** short form |

---

## Prerequisites

- [ ] Fillout plan supports theme customization + custom CSS (Pro if using repo CSS file)
- [ ] Before screenshots saved → `docs/testing/evidence/fut-039/before/`
- [ ] F-ATT-01: note internal form IDs for registration, daily, edit
- [ ] F-ATT-05: confirmation copy + `/shoot` link on each v1 form (no redirect URL) — paste from [FUT-039-FILLOUT-COPY-PACK.md](../next-wave/fillout/FUT-039-FILLOUT-COPY-PACK.md) §5 attestation table

---

## Paste order (quick reference)

Apply in this order at desktop Fillout UI:

1. **Theme editor** — create **127 SI — Shooting Challenge 2026**; page background `#F2F2F2`, primary `#0034B7`, accent `#FF8B00`, text `#262626`, font **Maven Pro**, logo, header title + subhead ([copy pack §1](../next-wave/fillout/FUT-039-FILLOUT-COPY-PACK.md#1-theme-header-strings-all-v1-forms)).
2. **Advanced designer** (Starter+) — button shape, input style, padding, **back button position** (Fillout UI — not CSS).
3. **Registration only** — Stripe payment field → **payment page** theme (image, checkout title, CTA; optional receipt on ending). No documented CSS class for payment blocks — see [FILLOUT-OFFICIAL-CSS-SELECTORS.md](../next-wave/fillout/FILLOUT-OFFICIAL-CSS-SELECTORS.md).
4. **Custom CSS** — paste [fillout-theme-sc-2026.css](../next-wave/fillout/fillout-theme-sc-2026.css) (documented selectors only; `.fillout-live-mode` scoped).
5. **Confirmation copy** — paste ending title + body per form from [copy pack §2–§4](../next-wave/fillout/FUT-039-FILLOUT-COPY-PACK.md#2-player-registration--confirmation-ending); **redirect URL = none** on all v1 forms.
6. **Assign theme per form** — registration, daily, edit (do **not** set org default).
7. **F-ATT-05** — complete attestation table in copy pack §5 after Preview + Schmidt submits.

---

## Slice order

### 3a — Create theme + paste CSS

1. In Fillout, duplicate or create theme **“127 SI — Shooting Challenge 2026”**.
2. Theme editor: primary `#0034B7`, accent `#FF8B00`, background `#F2F2F2`, text `#262626`, font **Maven Pro**.
3. Upload horizontal logo from `web/public/brand/logo-v1-blue-orange.png`.
4. Paste contents of [fillout-theme-sc-2026.css](../next-wave/fillout/fillout-theme-sc-2026.css) into theme custom CSS.
5. Header: logo + title **127 Sports Intensity — Shooting Challenge**; subhead **Fairfield Basketball Club** if space allows.

### 3b — Registration (`shoot-playerregistration`)

- [ ] Assign shared theme to form (do **not** set org default).
- [ ] Stripe section: visual only — verify payment fields still visible.
- [ ] Confirmation ending: paste [copy pack §2](../next-wave/fillout/FUT-039-FILLOUT-COPY-PACK.md#2-player-registration--confirmation-ending) — link `https://www.fairfieldbasketballclub.com/shoot` (no redirect).
- [ ] Schmidt paid test enrollment **after** styling (FUT-003 smoke — Make may stay inactive).

### 3c — Daily (`shoot-dailysubmissions`)

- [ ] Assign shared theme.
- [ ] Confirmation ending: paste [copy pack §3](../next-wave/fillout/FUT-039-FILLOUT-COPY-PACK.md#3-daily-submissions--confirmation-ending) (no redirect; edit link note references receipt email formula field).
- [ ] Test HW1/HW2 PHA picker still submits.
- [ ] `node web/scripts/http-smoke.mjs` → 200 on daily URL.

### 3d — Edit submission + URL migration

**Target URL (proposed slug — confirm in Fillout UI):**

```text
https://forms.fairfieldbasketballclub.com/shoot-editsubmission?id={SubmissionRecordId}
```

1. In Fillout, add custom-domain slug **`shoot-editsubmission`** for form template `vNgeHardYcus` (same form, new host).
2. Assign shared theme.
3. Confirmation ending: paste [copy pack §4](../next-wave/fillout/FUT-039-FILLOUT-COPY-PACK.md#4-edit-submission--confirmation-ending) (no redirect).
4. Test prefill: open with `?id=rec…` on Schmidt test submission.
5. **Airtable (Production — Mike/OMNI):** update Submissions formula **Edit Submission - Parent**:

```text
"https://forms.fairfieldbasketballclub.com/shoot-editsubmission?id=" & RECORD_ID()
```

6. Verify daily receipt emails (**071/076**) still pull edit link from formula field (no hardcoded legacy URL in templates).

### 3e — Confirmations

- [ ] All three forms: paste endings from [FUT-039-FILLOUT-COPY-PACK.md](../next-wave/fillout/FUT-039-FILLOUT-COPY-PACK.md); Fillout ending only; `/shoot` link in copy; no redirect URL configured.
- [ ] Complete F-ATT-05 attestation table (copy pack §5).

### 3f — Inventory refresh

- [ ] Update [FILLOUT-FORM-INVENTORY.md](../next-wave/fillout/FILLOUT-FORM-INVENTORY.md) row #3 with final slug + F-ATT-01 IDs.
- [ ] **Do not** set org default theme (decision 7).

### 3g — FUT-034 title audit (OMNI)

- [ ] List all Fillout org form **titles**; flag any **Jr. Ref** short form → rename to **Jr. Referee Clinic** where public SC surfaces are affected.

---

## Validation

```bash
node web/scripts/http-smoke.mjs
python3 -m unittest discover -s tools/enrollment-season/tests -v
```

| # | Check | Pass |
|---|-------|------|
| T1 | Registration branded (logo, blue primary, Maven Pro) | |
| T2 | Paid registration → FUT-003 path (when tested) | |
| T3 | Daily form 200 + branded | |
| T4 | Daily HW1/HW2 selection | |
| T5 | Edit `?id=rec…` on **new** custom domain URL | |
| T6 | Confirmation shows `/shoot` link; no auto-redirect | |
| T7 | Mobile 375px — no horizontal scroll | |
| T8 | Stripe fields visible and submittable | |
| T10 | Chrome + Safari smoke | |

After screenshots → `docs/testing/evidence/fut-039/after/`

---

## Rollback

1. Fillout theme version history → restore pre-change theme.
2. Revert Airtable formula to legacy URL if migration fails:

```text
"https://form.fillout.com/t/vNgeHardYcus?id=" & RECORD_ID()
```

3. Document rollback in CHANGELOG under `### Docs`.

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Operator apply | Mike | | Fillout UI |
| Evidence | | | before/after screenshots |
| FUT-003 smoke | | | post-branding paid test |
