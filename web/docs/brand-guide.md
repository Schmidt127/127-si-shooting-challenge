# 127 Sports Intensity — Web Brand Guide

Sourced from **127_SI_Brand_Kit** (Patrick Liddell). Update this file when the kit changes.

**Source assets (local):** `Desktop/Branding Kit (1)/`  
**Web assets:** `web/public/brand/`

---

## Brand hierarchy

| Level | Name | Usage |
|-------|------|--------|
| Hub | **Hoop Challenges** | `hoopchallenges.com` program picker |
| Parent brand | **127 Sports Intensity** | Logo, footer, org line |
| Products | Shooting Challenge, Dribbling Challenge, JR Referee Clinics | Own path + nav shell |

---

## Official color palette

| Name | Hex | Web token | Use |
|------|-----|-----------|-----|
| Primary Blue | `#0034B7` | `--brand-blue` | Headers, nav bars, trust blocks |
| Primary Orange | `#FF8B00` | `--brand-orange` / `--accent` | CTAs, highlights, XP accents |
| Charcoal | `#262626` | `--brand-charcoal` / `--brand-dark` | Text on light surfaces |
| Medium Gray | `#C4C4C4` | `--brand-medium-gray` / `--brand-gray` | Borders, secondary UI |
| Light Gray | `#F2F2F2` | `--brand-light-gray` / `--brand-light` | Light section backgrounds |
| White | `#FFFFFF` | `--brand-white` | Text on dark, light surfaces |

**Program supporting (Shooting Challenge only, subordinate):** `--court-navy` `#001A5C`, `--court-tan` `#C4A574`, `--court-gold` `#C9A227`.

**Base UI (Shooting Challenge):** Primarily light — page background `#F2F2F2`, cards/surfaces `#FFFFFF`, charcoal text `#262626`. Blue and orange are dominant accents. Dark navy contrast panels (`--court-navy` / `.sc-contrast`) are allowed only for isolated heroes, statistic moments, achievements, and public-display scoreboard headers — never as full-page chrome.

---

## Typography

| Role | Font | Web implementation |
|------|------|-------------------|
| Display / headlines | **Magistral** (brand kit) | **Substitution:** Maven Pro 800 via `.font-display` — no Magistral `.woff`/`.ttf` in repo; do not invent CDN URLs |
| Body / UI / nav / forms / tables | **Maven Pro** | `next/font/google` in `app/layout.tsx` (`--font-maven-pro`) |

- Headlines: bold, slightly tracked; avoid all-caps on long titles  
- Stats (XP, rank, shots): `font-mono` (Geist Mono) or Maven Pro tabular nums  
- Constants: `BRAND_TYPOGRAPHY` in `lib/brand.ts`  

---

## Logo (primary — production)

These are the **main logos** used across 127 Sports Intensity:

| Asset | Local path | Source URL |
|-------|------------|------------|
| **Circle stamp** | `/brand/logo-circle-blue-orange.png` | [BlueOrangeCircleLogo.png](https://make-021891587263-us-east-2-an.s3.us-east-2.amazonaws.com/BlueOrangeCircleLogo.png) |
| **Horizontal V1** | `/brand/logo-v1-blue-orange.png` | [Logo_V1_Blue_Orange.png](https://make-021891587263-us-east-2-an.s3.us-east-2.amazonaws.com/Logo_V1_Blue_Orange.png) |

| When to use | Logo |
|-------------|------|
| Hub hero, wide headers | **Horizontal V1** |
| Compact nav, footer, favicon | **Circle stamp** |

Code constants: `lib/brand.ts` → `BRAND_LOGOS`

**Kit archive (additional variants):** `Desktop/Branding Kit (1)/Logos (1)/`

- Do not stretch, recolor, or add effects to the logo  
- Minimum clear space: height of the orange circle in the mark  
- Logos are designed for both light and dark bands — prefer light page chrome; use white/contrast logos only on navy or brand-blue contrast panels  

---

## Iconography (from brand kit)

- **Style:** Thin white line art in blue circles — professional, not cartoon  
- **Kit categories:** Golf, Basketball, Practice, Tournaments, Competitions, Challenges, Field Trips, Education, Contact, FAQs  
- **Web:** Do not use emoji as UI icons. Use SVG line icons or typography-only cards until custom icons are exported from the kit  

---

## Patterns

- Geometric line patterns (`Pattern_1`–`Pattern_5` in kit) may be used as **subtle backgrounds** (low opacity)  
- Do not overpower content  

---

## Voice & tone

- Professional, athletic, motivating  
- Youth program: energetic, never childish  
- Direct labels: Leaderboard, Levels, Live  

---

## Layout rules (Hoop Challenges web)

| Pattern | Where |
|---------|--------|
| Landing hub | `hoopchallenges-landing` at https://www.hoopchallenges.com |
| Shooting Challenge shell | `/shoot` (`basePath`; all catalog pages share `ProductShell` nav) |
| Back link | **Hoop Challenges** → landing URL (`NEXT_PUBLIC_LANDING_URL`) |

---

## Contact (from brand kit — public-facing only when intended)

| Field | Value |
|-------|--------|
| Coordinator | Mike Schmidt |
| Phone | 406.590.2677 |
| Web | fairfieldeagles.com |
| Email | mschmidt@fairfield.k12.mt.us |

Do not publish personal email on youth-facing pages unless explicitly approved.

---

## Don't

- Emoji as icons on hub or product chrome  
- Cartoon mascots or clip art  
- Mixed product navigation  
- Off-palette oranges/blues without reason  

---

## Adding assets to the repo

1. Copy approved PNG/SVG from `Branding Kit (1)/` → `web/public/brand/`  
2. Note filename and usage in this doc  
3. Prefer **Blue + Orange** logo on dark UI  

---

## Related

- Cursor rule: `.cursor/rules/web-ui-brand.mdc`  
- CSS tokens: `app/globals.css`  
