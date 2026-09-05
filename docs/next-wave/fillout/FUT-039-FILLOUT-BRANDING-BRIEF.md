# FUT-039 — Fillout.com Branding and CSS Consistency

**Status:** **Phase 3 ready** — Mike decisions captured **2026-09-01**; apply via [FUT-039-fillout-branding.md](../../deploy-checklists/FUT-039-fillout-branding.md) (Mike in Fillout UI)  
**Canonical ID:** **FUT-039**  
**Date:** 2026-09-01  
**Decisions locked:** 2026-09-01 (Mike)  
**Base SHA:** `e9e3bbd8` (`origin/master`)  
**Related:** FUT-003 (Stripe payment writeback) · FUT-029 (deferred grade-band homework platform / intake adapter — not Fillout-primary; see plan) · FUT-034 (Jr. Referee Clinic naming — **COMPLETE** landing/docs; Fillout titles optional follow-up) · FUT-035 (landing royal blue — **COMPLETE**) · SC-060 (enrollment validation) · SC-146 (reopen daily intake) · [FILLOUT-FORM-INVENTORY.md](./FILLOUT-FORM-INVENTORY.md) · [BRAND_STANDARDS.md](../../../BRAND_STANDARDS.md) · [127-SI-MASTER-FUTURE-WORK-LIST.md](../../127-SI-MASTER-FUTURE-WORK-LIST.md) § FUT-039

---

## 1. Problem statement

Shooting Challenge parent and athlete intake runs through **Fillout** forms on the **`forms.fairfieldbasketballclub.com`** custom domain (plus one legacy **`form.fillout.com`** edit URL). These surfaces are the first branded touchpoint after the `/shoot` homepage CTAs ([`web/lib/registration.ts`](../../../web/lib/registration.ts)) but **lack a documented, consistent 127 Sports Intensity / Fairfield Basketball Club treatment** aligned with:

- Shared brand foundation ([`BRAND_STANDARDS.md`](../../../BRAND_STANDARDS.md)) — royal blue `#0034B7`, orange `#FF8B00`, Maven Pro body type  
- Landing royal-blue refresh (**FUT-035 COMPLETE** in `hoopchallenges-landing`)  
- Email header pattern already used in daily/weekly templates (blue bar + orange accent rule)

**FUT-039 owns:** planning, form inventory, theme/CSS strategy, risk boundaries, and Phase 3 slices — **not** live Fillout edits in Phase 2.

**Hard rules (from Master Future Work List):**

- **Do not break** FUT-003 paid Stripe → Make → `Payment Transactions` writeback.  
- **Do not break** SC-060 enrollment field contract / validation ([`FILLOUT-ENROLLMENT-CONTRACT.md`](../../online-agents/enrollment-season/FILLOUT-ENROLLMENT-CONTRACT.md)).  
- **Do not change** Airtable schema, automation scripts, or `/shoot` web deploy as part of branding work.  
- **Coordinate** with FUT-029 — if any future Fillout homework surfaces remain as optional fallback, inherit the same theme; primary athlete homework intake is the deferred in-app **Homework Intake Adapter** ([plan](../homework-pipeline/FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md)).

**Non-goals for this brief:** FUT-029 form creation, C-009 HW17 attachment schema, Fillout field mapping changes, SC-146 intake reopen, Make scenario activation, custom domain DNS changes, Jr. Referee Clinic product forms (`127-si-jr-ref` repo).

---

## 2. Form inventory (summary)

Full table: **[FILLOUT-FORM-INVENTORY.md](./FILLOUT-FORM-INVENTORY.md)** — **12 rows** inventoried from repo evidence.

### 2.1 Confirmed public URLs (repo)

| Form | URL | v1 |
|------|-----|-----|
| Player registration | `https://forms.fairfieldbasketballclub.com/shoot-playerregistration` | **Y** |
| Daily submissions | `https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions` | **Y** |
| Edit submission (parent) | `https://form.fillout.com/t/vNgeHardYcus?id={rec…}` | **Y** |

### 2.2 Known but URL-incomplete in repo

| Form | Evidence | v1 |
|------|----------|-----|
| HW17 Final Reflection Quiz | [`lib/homework-contracts/quiz-path.js`](../../../lib/homework-contracts/quiz-path.js), automation **067** | **N** (v2) |
| FUT-029 per-assignment homework (historical Fillout idea) | [`FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md`](../homework-pipeline/FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md) (superseded) · [`FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md`](../homework-pipeline/FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md) | **N** |
| Test / ETF clones | SC-001, season launch docs | **N** |

### 2.3 Integration-only (not Fillout URLs)

- Airtable view **Homework Record Picker View on FILLOUT.COM** — PHA choice wiring for daily form homework slots ([`HOMEWORK-FILLOUT-INTEGRATION.md`](../../prod-completion/2026-08-09/HOMEWORK-FILLOUT-INTEGRATION.md)).  
- Airtable view **Fillout.com Form Info ONLY** — operator metadata.

**Gap:** Live Fillout org form list and internal form IDs remain **Mike UI attestation** (F-ATT-01, proposed F-ATT-07). Phase 3 must not guess undocumented mappings ([`fillout-season-routing.contract.json`](../../challenge-year/fillout-season-routing.contract.json)).

---

## 3. Current vs target brand alignment

### 3.1 Target tokens (canonical)

From [`BRAND_STANDARDS.md`](../../../BRAND_STANDARDS.md) and [`web/lib/brand.ts`](../../../web/lib/brand.ts):

| Token | Hex | Fillout theme mapping (target) |
|-------|-----|--------------------------------|
| Brand blue | `#0034B7` | Primary buttons, header bar, links, focus ring |
| Brand orange | `#FF8B00` | Header accent rule, hover/selected, secondary CTA |
| Charcoal | `#262626` | Question + answer text |
| Light gray | `#F2F2F2` | Page background |
| Medium gray | `#C4C4C4` | Field borders, dividers |
| White | `#FFFFFF` | Question card / input backgrounds |

**Typography:** Maven Pro (Google Fonts in Fillout theme or `@font-face` via custom CSS). Magistral **not** assumed in Fillout until licensed web files exist — match `/shoot` fallback (Maven Pro 700–800 for display headings).

**Logo:** Horizontal blue-orange lockup for form header; circle variant for compact mobile — sources in [`BRAND_LOGOS`](../../../web/lib/brand.ts) / Hub email CDN ([`communications/emails/lib/brand.js`](../../../communications/emails/lib/brand.js)). **Do not invent URLs** — upload from approved kit or Hub-hosted PNG.

**Program identification copy (target):**

- Header: **127 Sports Intensity — Shooting Challenge** (or approved season line)  
- Subhead: **Fairfield Basketball Club** where space allows  
- Footer / confirmation: link to `https://www.fairfieldbasketballclub.com/shoot`  
- **FUT-034:** Never **Jr. Ref** on any public SC form title — use **Jr. Referee Clinic** only on cross-program surfaces if shown.

### 3.2 Reference implementations already on-brand (repo)

| Surface | Pattern | Use as Fillout reference |
|---------|---------|--------------------------|
| Daily email HTML (**076**) | `#0034B7` header + 5px `#FF8B00` bottom border, Maven Pro, `#F2F2F2` page | Header + confirmation screens |
| `/shoot` registration gateway | Branded CTAs linking to Fillout | CTA label copy only — form interior is Fillout-owned |
| Landing post-FUT-035 | Royal blue header (not navy) | Align form header blue with landing `#0034B7`, not legacy navy `#0B1F4A` |
| Hub email brand | Logo URL + tagline “Education • Athletics • Confidence” | Optional confirmation banner |

### 3.3 Current state (observed / inferred — not live UI audited)

| Element | Likely current gap | Target |
|---------|-------------------|--------|
| Header | Default Fillout theme / inconsistent logo | Branded header image or theme logo + program title |
| Primary buttons | Generic theme primary | `#0034B7` fill, white text, ~8–12px radius |
| Accent | May not use orange rule | Orange 4–6px bottom border on header (email parity) |
| Page background | White or default gray | `#F2F2F2` outer, white inner card |
| Confirmation | Generic Fillout ending | Custom ending: thank-you + link to `/shoot` + season-appropriate copy |
| Edit submission URL | Legacy `form.fillout.com` | Custom subdomain slug if Fillout supports same form (Mike decision) |
| Stripe block | Functional but unstyled | Match fields/buttons; **no field rename** |
| Mobile | Unknown | Touch-friendly controls, readable 16px+ body |

**Phase 2 note:** No agent live-screenshot audit was performed — Mike/OMNI should capture before/after screenshots in Phase 3 promotion folder.

---

## 4. Fillout theming capabilities and constraints

Research source: [Fillout Help — Styling](https://www.fillout.com/help/styling), [Themes](https://www.fillout.com/help/themes), [Advanced designer](https://www.fillout.com/help/advanced-designer), [Custom CSS](https://www.fillout.com/help/custom-css), [FAQs](https://www.fillout.com/help/faqs) (retrieved 2026-09-01).

### 4.1 What Fillout supports

| Capability | Scope | Plan note (Fillout docs) |
|------------|-------|--------------------------|
| **Theme editor** | Colors, fonts, logo, layout, background image | Starter+ for theme customization |
| **Org default theme** | New forms inherit org default | Reduces drift — **recommended v1 lever** |
| **Shared theme across forms** | Forms using the **same theme** share custom CSS | Critical for one CSS host strategy |
| **Advanced designer** | Button shape, input style, padding, animations | Starter+ |
| **Custom CSS** | `.fillout-field-*` classes, CSS variables (`--radio-size`, etc.) | **Pro+**; applied per theme |
| **Custom fonts** | Google library upload or `@font-face` in custom code | Upload supported |
| **Custom domain** | `forms.fairfieldbasketballclub.com` already in use | DNS already operational for SC |
| **Custom favicon + link preview** | Browser tab / share cards | Upload logo |
| **Remove Fillout branding** | Ending page “Made with Fillout” | Paid plans |
| **Custom ending / redirect** | Post-submit screen or URL | Per form — keep copy consistent |
| **Multi-column / table layouts** | Complex homework UIs (future FUT-029) | Supported |

### 4.2 Constraints and risks

| Constraint | Implication for FUT-039 |
|------------|-------------------------|
| Custom CSS is **per theme**, not per form | Changing org theme affects **all forms** on that theme — use staging theme + clone forms for DEV proof |
| Internal class names may change | Prefer documented `.fillout-*` classes only |
| Stripe / payment fields | Visual-only CSS — **never** hide, rename, or reorder payment fields tied to FUT-003 webhook |
| Airtable linked-record widgets | Homework PHA pickers styled generically; wrong styling must not break choice submission |
| Login profile icon | Can hide via `.fillout-login-profile` if login forms used |
| Plan gating | Confirm org plan includes **Pro** (custom CSS) before promising CSS-heavy design |
| Cross-program org | If Jr. Ref / other programs share Fillout org, org default theme affects them — **Mike decision** on separate themes vs workspaces |
| No git deployment path | Theme lives in Fillout UI — repo stores **CSS artifact + checklist**, not auto-deploy |
| Preview vs live | Test in Fillout Preview + one Schmidt submission per form after apply |

### 4.3 Recommended technical approach (brief recommendation — not Mike decision)

**Option A — Org shared theme + repo CSS artifact (recommended default)**

1. Create/update one Fillout theme **“127 SI — Shooting Challenge 2026”**.  
2. Set as org default for new SC forms.  
3. Store canonical custom CSS in repo: `docs/next-wave/fillout/fillout-theme-sc-2026.css` (Phase 3).  
4. Apply theme to forms #1–#3 in inventory; clone theme for test forms.

**Option B — Per-form themes**

Duplicate theme per form for isolated rollout. Higher maintenance; use only if Stripe form needs divergent layout.

**Option C — Theme + minimal custom CSS**

Use Fillout theme editor for 90% (colors, logo, font); CSS only for header orange rule and confirmation spacing.

**Comparison:**

| Criterion | A Shared | B Per-form | C Minimal CSS |
|-----------|----------|------------|---------------|
| Consistency | **High** | Medium | High |
| FUT-029 reuse | **High** | Low | Medium |
| FUT-003 regression surface | One test matrix | Per form | **Lowest** |
| Rollback | Revert one theme | Multiple | Easy |

---

## 5. v1 scope recommendation

**In scope (Phase 3 first wave):**

1. **Player registration** — including Stripe payment section styling (visual only).  
2. **Daily submissions** — prepare before SC-146 reopen.  
3. **Edit submission parent** (`vNgeHardYcus`) — match theme; evaluate custom-domain alias.  
4. **Org theme artifact** in repo + operator checklist.  
5. **Confirmation / thank-you screens** for #1–#3 — copy + link to `/shoot`.

**Deferred (v2 or sibling backlog):**

| Item | Reason |
|------|--------|
| HW17 quiz form | C-009 / **067** path in flux; URL not in repo |
| FUT-029 homework (deferred in-app) | Not authorized; if any Fillout fallback is later authorized, inherit theme |
| SC-019 learning forms | Not live |
| Test form clones | Apply prod theme after prod validated |
| FUT-034 Fillout title audit | Optional; separate OMNI pass for Jr. Ref naming |

**Sequencing vs season gates:**

| Gate | Branding implication |
|------|---------------------|
| SC-060 | After CSS apply, re-run enrollment contract validator + one Schmidt enrollment |
| FUT-003 | After registration restyle, re-run paid Make test (scenario inactive OK) |
| SC-146 | Daily form branding **before** public reopen |
| SC-135 | Submission dry-run independent — but branded daily form should not change field keys |

---

## 6. Risk matrix

| ID | Risk | Related | Likelihood | Impact | Mitigation |
|----|------|---------|------------|--------|------------|
| R1 | Stripe webhook field mismatch after CSS/layout change | FUT-003 | Low | **Critical** | Visual-only changes; no field rename/reorder; post-apply paid test enrollment |
| R2 | Enrollment mapping broken (hidden fields, School Year default) | SC-060 | Low | **Critical** | No logic edits in branding slice; screenshot hidden fields before/after; contract validator |
| R3 | Homework PHA picker fails or shows stale choices | FUT-029 / 005 | Low | High | Do not change linked-record field keys; test HW1/HW2 selection after theme apply |
| R4 | Edit submission prefill `?id=` broken | Daily ops | Low | High | Do not change URL parameter or form ID without Airtable formula update |
| R5 | Org theme accidentally restyles non-SC forms | FUT-034 / other programs | Medium | Medium | Mike confirms org structure; use dedicated SC theme before setting org default |
| R6 | Custom CSS breaks on Fillout platform update | All forms | Medium | Medium | Prefer theme editor + documented classes; pin CSS artifact version in repo |
| R7 | Mobile layout regression | Parent UX | Medium | Medium | Test iPhone + Android widths; Fillout preview + Playwright external URL smoke (existing http-smoke) |
| R8 | Accessibility contrast failure | Brand | Low | Medium | Verify `#0034B7` on white and white on blue for buttons; orange as accent not sole status indicator |
| R9 | Legacy `form.fillout.com` URL in emails after domain migration | 076 emails | Medium | Low | Coordinate URL change with formula + email template audit if slug moves |
| R10 | HW17 restyle during C-009 attachment work | C-009 / 067 | Medium | Medium | **Exclude HW17 from v1** |

---

## 7. Phase 3 implementation slices

**Prerequisites:** Mike decisions §8 (**locked 2026-09-01**); Fillout Pro plan confirmed for custom CSS; F-ATT-01/05/07 attestations; before/after screenshot folder.

| Slice | Scope | Deliverables |
|-------|-------|--------------|
| **3a — Theme spec + CSS artifact** | Token doc + `fillout-theme-sc-2026.css` stub | Repo file; Fillout theme duplicate “SC-DEV” |
| **3b — Registration form** | Apply theme to `shoot-playerregistration` | Screenshots; FUT-003 smoke note in checklist |
| **3c — Daily submission form** | Apply theme to `shoot-dailysubmissions` | HW1/HW2 picker smoke; http-smoke still 200 |
| **3d — Edit submission form** | Theme on `vNgeHardYcus`; custom URL `shoot-editsubmission` | Update Submissions **Edit Submission - Parent** formula (Mike decision #6) |
| **3e — Confirmation screens** | Custom endings aligned with email copy | F-ATT-05 answers documented |
| **3f — Org default + docs** | Set org default theme; update inventory IDs | FILLOUT-FORM-INVENTORY.md refresh |
| **3g — FUT-029 handoff** | Theme name + CSS path if any Fillout homework fallback is later authorized | Cross-link to FUT-029 plan |
| **3h — Promotion** | `docs/deploy-checklists/FUT-039-fillout-branding.md` | Mike sign-off; CHANGELOG |

**Order:** **3a → 3b → 3c → 3d → 3e → 3f**; **3g** parallel documentation; **3h** last.

**Dependency graph:**

```
Mike decisions (§11) ──► 3a theme artifact
3a ──► 3b registration (+ FUT-003 smoke)
3b ──► 3c daily (+ SC-146 readiness)
3c ──► 3d edit URL
3b–3d ──► 3e confirmations
3f org default ──► FUT-029 inherits theme (3g)
3h promotion after Schmidt proofs
```

---

## 8. Mike decisions (locked 2026-09-01)

| # | Question | Decision |
|---|----------|----------|
| 1 | Theme strategy | **Option A** — one shared theme **“127 SI — Shooting Challenge 2026”** (§4.3) |
| 2 | CSS hosting | **Single repo file** — [fillout-theme-sc-2026.css](./fillout-theme-sc-2026.css) pasted into Fillout theme |
| 3 | Logo asset source | **`web/public/brand/`** — `logo-v1-blue-orange.png` (horizontal), `logo-circle-blue-orange.png` (compact) |
| 4 | Form ownership | **Mike** applies theme in Fillout UI |
| 5 | v1 form list | **Yes** — registration + daily + edit only; HW17 deferred v2 |
| 6 | Edit submission URL | **Migrate** to custom domain — proposed slug `shoot-editsubmission` → `https://forms.fairfieldbasketballclub.com/shoot-editsubmission?id={rec…}`; update Submissions **Edit Submission - Parent** formula (see deploy checklist) |
| 7 | Org default theme | **Per-form assignment only** — do **not** set org-wide default (R5 mitigation) |
| 8 | Header layout | **Logo + text only** — no banner image |
| 9 | Magistral in Fillout | **Maven Pro only** until web font license confirmed |
| 10 | Confirmation redirect | **Fillout ending** with `/shoot` link in copy — **no auto-redirect** |
| 11 | Timing | **Branding now** — before FUT-003 Make activation |
| 12 | FUT-034 follow-up | **Yes** — OMNI inventory of Fillout form titles for banned **Jr. Ref** short form |

**Operator checklist:** [FUT-039-fillout-branding.md](../../deploy-checklists/FUT-039-fillout-branding.md)

**Count: 12 decisions — all resolved.**

---

## 9. PKG / promotion requirements

### 9.1 PKG gates

| Package | FUT-039 interaction |
|---------|---------------------|
| **PKG-004** | **Not required** for CSS-only work — no Airtable schema |
| **FUT-003** | Promotion checklist must include post-branding paid webhook smoke |
| **SC-060 / SC-146** | Enrollment + daily reopen checklists reference branding completion |
| **FUT-029** | Deferred in-app platform; any optional Fillout fallback **inherits** theme; no duplicate brand system |

### 9.2 Promotion artifacts (Phase 3)

| Artifact | Path (provisional) |
|----------|-------------------|
| Operator checklist | `docs/deploy-checklists/FUT-039-fillout-branding.md` |
| CSS artifact | `docs/next-wave/fillout/fillout-theme-sc-2026.css` |
| Before/after evidence | `docs/testing/evidence/fut-039/` |
| Form inventory update | [FILLOUT-FORM-INVENTORY.md](./FILLOUT-FORM-INVENTORY.md) |
| CHANGELOG | `### Docs` entry on brief merge; Fillout section when Mike applies live |

### 9.3 Official promotion documentation

Per [doc 04 § Official promotion documentation](../../v2/04-ai-development-standards.md#official-promotion-documentation-required): live Fillout theme changes are **not official** until checklist exists with Mike sign-off, screenshot evidence, and rollback steps (restore prior theme export / Fillout version history).

**Rollback:** Fillout theme version history + pre-change screenshots ([`ROLLBACK-CHECKLIST.md`](../../challenge-year/ROLLBACK-CHECKLIST.md) § Fillout).

**Validation after apply:**

```bash
# External URL health (no auth)
node web/scripts/http-smoke.mjs

# Enrollment contract offline (payload shape — not visual)
python3 -m unittest discover -s tools/enrollment-season/tests -v
```

Plus one Schmidt Fillout submission per form + FUT-003 Make manual test when payment styling touched.

---

## 10. Test matrix (Phase 3)

| # | Scenario | Expected |
|---|----------|----------|
| T1 | Registration form loads branded theme | Logo, `#0034B7` primary, Maven Pro |
| T2 | Paid registration → Make FUT-003 path | Payment Transaction created; no duplicate on replay |
| T3 | Daily form loads; http-smoke 200 | URLs unchanged |
| T4 | Daily form HW1/HW2 PHA selection | 005/020 path unchanged on Schmidt test |
| T5 | Edit submission `?id=rec…` prefill | Existing submission editable |
| T6 | Confirmation screen copy + link | `/shoot` link works |
| T7 | Mobile 375px width | No horizontal scroll; tappable buttons |
| T8 | Stripe section visible and submittable | No CSS `display:none` on payment fields |
| T9 | Fillout branding footer removed (if licensed) | No “Made with Fillout” on ending |
| T10 | Cross-browser smoke | Chrome + Safari |

---

## 11. References

- Form inventory: [FILLOUT-FORM-INVENTORY.md](./FILLOUT-FORM-INVENTORY.md)  
- Brand standards: [BRAND_STANDARDS.md](../../../BRAND_STANDARDS.md)  
- Web brand tokens: [`web/lib/brand.ts`](../../../web/lib/brand.ts)  
- Registration URLs: [`web/lib/registration.ts`](../../../web/lib/registration.ts)  
- Enrollment contract: [FILLOUT-ENROLLMENT-CONTRACT.md](../../online-agents/enrollment-season/FILLOUT-ENROLLMENT-CONTRACT.md)  
- Season activation: [FILLOUT-SEASON-ACTIVATION.md](../../challenge-year/FILLOUT-SEASON-ACTIVATION.md)  
- FUT-003 payment: [FUT-003-fillout-stripe-payment-writeback.md](../../deploy-checklists/FUT-003-fillout-stripe-payment-writeback.md)  
- FUT-029 homework: [FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md](../homework-pipeline/FUT-029-GRADE-BAND-HOMEWORK-PLATFORM-PLAN.md) (canonical) · historical Fillout brief [FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md](../homework-pipeline/FUT-029-HYBRID-FILLOUT-HOMEWORK-BRIEF.md)  
- Homework Fillout integration: [HOMEWORK-FILLOUT-INTEGRATION.md](../../prod-completion/2026-08-09/HOMEWORK-FILLOUT-INTEGRATION.md)  
- Production smoke runbook: [PRODUCTION-SMOKE-RUNBOOK.md](../../testing/PRODUCTION-SMOKE-RUNBOOK.md)  
- Fillout custom CSS docs: https://www.fillout.com/help/custom-css  
- Fillout styling docs: https://www.fillout.com/help/styling  

---

## 12. Change log

| Date | Change |
|------|--------|
| 2026-09-01 | Phase 2 brief + inventory (FUT-039) |
| 2026-09-01 | Mike decisions locked; Phase 3 checklist + CSS artifact |
