# FUT-039 — Fillout copy pack (paste-ready)

**Status:** Phase 3 artifact — Mike pastes into Fillout UI at desktop  
**Date:** 2026-09-01  
**Theme:** **127 SI — Shooting Challenge 2026**  
**Brief:** [FUT-039-FILLOUT-BRANDING-BRIEF.md](./FUT-039-FILLOUT-BRANDING-BRIEF.md)  
**Checklist:** [FUT-039-fillout-branding.md](../../deploy-checklists/FUT-039-fillout-branding.md)  
**CSS:** [fillout-theme-sc-2026.css](./fillout-theme-sc-2026.css)

**Mike decisions applied:** Logo + text header only · Maven Pro · Fillout ending (no auto-redirect) · `/shoot` link in copy · v1 forms: registration, daily, edit.

---

## 1. Theme header strings (all v1 forms)

Paste into Fillout **Theme** → header / title fields (same shared theme on all three forms).

| Field | Paste value |
|-------|-------------|
| **Title** | 127 Sports Intensity — Shooting Challenge |
| **Subhead** | Fairfield Basketball Club |

**Logo:** Upload `web/public/brand/logo-v1-blue-orange.png` (horizontal) in theme editor. Use circle variant only if Fillout crops horizontal on mobile.

---

## 2. Player registration — confirmation ending

**Form:** `shoot-playerregistration`  
**URL:** `https://forms.fairfieldbasketballclub.com/shoot-playerregistration`  
**Fillout setting:** Custom ending screen · **Redirect URL = none**

### Ending title

You're registered for the Shooting Challenge

### Ending body (paste as one ending block)

Thank you for enrolling with Fairfield Basketball Club. We received your registration and payment details for the 127 Sports Intensity Shooting Challenge.

**What happens next**

- You will receive a welcome email at the parent address you provided (check spam if it does not arrive within a few minutes).
- When daily logging opens for the season, use the same athlete and parent emails to submit each day's shots, makes, and homework.
- Track progress, XP, levels, and homework at the Shooting Challenge site:

**https://www.fairfieldbasketballclub.com/shoot**

Questions before the season starts? Reply to any 127 Sports Intensity email or contact Coach Mike through Fairfield Basketball Club.

---

## 3. Daily submissions — confirmation ending

**Form:** `shoot-dailysubmissions`  
**URL:** `https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions`  
**Fillout setting:** Custom ending screen · **Redirect URL = none**

### Ending title

Today's submission is in

### Ending body (paste as one ending block)

We logged today's Shooting Challenge activity for your athlete. Coach Mike's system will process shots, homework attachments, and XP on the backend — you do not need to submit again for the same date.

**What happens next**

- A daily receipt email goes to the parent address on file (usually within a few minutes).
- That email includes XP earned, streak status, homework progress, and a **personal edit link** if you need to fix today's entry. The edit link is generated automatically — it is not on this confirmation screen.
- View the full program hub anytime:

**https://www.fairfieldbasketballclub.com/shoot**

Need to correct something later? Use the edit link in your receipt email, or open **Submit Today's Activity** again only if Coach Mike has asked you to resubmit for a new date.

---

## 4. Edit submission — confirmation ending

**Form:** `shoot-editsubmission` (custom domain; template `vNgeHardYcus`)  
**URL pattern:** `https://forms.fairfieldbasketballclub.com/shoot-editsubmission?id={SubmissionRecordId}`  
**Fillout setting:** Custom ending screen · **Redirect URL = none**

### Ending title

Your update is saved

### Ending body (paste as one ending block)

Your changes to this Shooting Challenge submission are saved. Coach Mike's automations will re-process shots, homework, and XP from the updated entry.

**What happens next**

- If you changed numbers or attachments for today, watch for an updated daily receipt email at the parent address on file.
- You can close this tab — there is no separate confirmation to click.
- Return to the program hub:

**https://www.fairfieldbasketballclub.com/shoot**

If something still looks wrong after a few minutes, use the edit link from your latest daily receipt email or contact Coach Mike through Fairfield Basketball Club.

---

## 5. F-ATT-05 attestation (Mike fills after paste)

Record in Fillout UI and check off in [FUT-039-fillout-branding.md](../../deploy-checklists/FUT-039-fillout-branding.md).

| Form | Public URL | Ending type | Redirect URL | `/shoot` link in copy? | Ending pasted from this pack? | Date verified |
|------|------------|-------------|--------------|------------------------|-------------------------------|---------------|
| Player registration | `https://forms.fairfieldbasketballclub.com/shoot-playerregistration` | Fillout ending | **none** | | | |
| Daily submissions | `https://forms.fairfieldbasketballclub.com/shoot-dailysubmissions` | Fillout ending | **none** | | | |
| Edit submission | `https://forms.fairfieldbasketballclub.com/shoot-editsubmission?id=…` | Fillout ending | **none** | | | |

**Hard rule:** Do **not** set a post-submit redirect URL on any v1 form (Mike decision #10).

---

## 6. Paste order quick reference

1. **Theme editor** — colors, Maven Pro, logo, title + subhead (§1).  
2. **Custom CSS** — paste [fillout-theme-sc-2026.css](./fillout-theme-sc-2026.css).  
3. **Confirmation copy** — §2–§4 ending screens per form.  
4. **Assign theme** — per form only (not org default).  
5. **F-ATT-05** — complete §5 after Preview + one Schmidt submit per form.

---

## Change log

| Date | Change |
|------|--------|
| 2026-09-01 | Initial paste-ready copy pack (FUT-039 Phase 3) |
