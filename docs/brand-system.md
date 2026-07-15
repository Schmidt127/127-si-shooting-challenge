> **Authority notice:** Root [`BRAND_STANDARDS.md`](../BRAND_STANDARDS.md) is authoritative for current shared branding (Version 1.0). The Landing Hub repository (`Schmidt127/hoopchallenges-landing`) is the canonical source of truth for shared brand standards. This file may retain useful repository-specific implementation notes; do not treat it as overriding root `BRAND_STANDARDS.md`.

# Hoop Challenges  -  Brand System

Canonical visual identity for **all** Hoop Challenges repos (landing + every app).  
Source kit: **127_SI_Brand_Kit** (Patrick Liddell). Web assets: `web/public/brand/`.

## Hierarchy

| Level | Name | Usage |
|-------|------|--------|
| Site | **Hoop Challenges** | Landing at www.hoopchallenges.com |
| Parent | **127 Sports Intensity** | Logo, footer, org line |
| Apps | Shooting Challenge, Dribble Challenge, etc. | Own path + app nav |

## Colors

| Name | Hex | CSS token | Use |
|------|-----|-----------|-----|
| Primary Blue | `#0034B7` | `--brand-blue` | Headers, nav accents |
| Primary Orange | `#FF8B00` | `--brand-orange` / `--accent` | CTAs, live badges |
| Dark | `#262626` | `--brand-dark` | Text on light surfaces |
| Light Gray | `#C4C4C4` | `--brand-gray` | Borders |
| Off White | `#F2F2F2` | `--brand-light` | Light sections |

**Dark UI default:** background `#0A0A0A`, white headlines, gray body. Blue and orange are accents only.

## Typography

| Role | Font | Web |
|------|------|-----|
| Display | Magistral (licensed) | **Maven Pro 700-800** until web Magistral files |
| Body / UI | Maven Pro | `next/font/google` in `app/layout.tsx` |
| Stats | Tabular nums | `font-mono` or Maven Pro |

## Logos

| Asset | Path | Use |
|-------|------|-----|
| Circle stamp | `/brand/logo-circle-blue-orange.png` | Compact nav, favicon |
| Horizontal V1 | `/brand/logo-v1-blue-orange.png` | Hero, wide headers |

Constants: `lib/brand.ts` â†' `BRAND_LOGOS`

## Buttons

| Type | Style |
|------|--------|
| Primary CTA | `bg-brand-orange`, white text, `rounded-xl`, hover brightness |
| Secondary | `border border-white/12`, transparent, hover `bg-white/[0.04]` |
| Nav link | `text-muted`, hover `text-foreground`, `rounded-lg` |

## Cards

- `rounded-2xl`, `border border-white/[0.08]`, `bg-card`
- Live/featured: `border-brand-orange/25`, top gradient line
- Feature chips: `text-[11px]`, subtle border `white/[0.06]`

## Headers (app shells)

Every app includes:

1. **Home** link â†' `NEXT_PUBLIC_LANDING_URL` or `https://www.hoopchallenges.com`
2. 127 SI logo (horizontal, compact)
3. App name + app-specific nav row
4. Dark ambient background with subtle blue blur

Implement via `ProductShell` / `AppShell` in each app's `web/components/layout/`.

## Footer

Landing: org name + text links to each app path.  
Apps: minimal  -  home link in header is required; full footer optional.

## Icons

- Thin white line art in blue circles (brand kit)
- No emoji as UI icons

## Spacing

- Page max width: `max-w-6xl`, horizontal `px-4 sm:px-6`
- Section gaps: `mt-16`-`mt-20` between major blocks
- Card padding: `p-6 sm:p-8`

## Naming

| Public path | App name |
|-------------|----------|
| `/shoot` | Shooting Challenge |
| `/dribble` | Dribble Challenge |
| `/bracket` | Bracket Renderer |
| `/refclinic` | JR REF Clinics |
| `/rankings` | State Rankings |

## Shared UI code

**Recommendation:** Duplicate small layout/brand components per repo (landing + each app) rather than a shared npm package  -  keeps repos independent and Cursor-friendly. Copy from `hoopchallenges-landing/web/components/brand/` when scaffolding new apps. Keep this doc as the source of truth for tokens in `app/globals.css`.

## Don't

- Subdomains for apps (use path routing)
- Mixed app navigation in one shell
- Off-palette colors without reason
- Stretch or recolor logos
