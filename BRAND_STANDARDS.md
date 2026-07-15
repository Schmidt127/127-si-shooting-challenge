Brand Standards Version: 1.0
Last Updated: 2026-07-15
Canonical Source: Schmidt127/hoopchallenges-landing/BRAND_STANDARDS.md

# 127 Sports Intensity - Brand Standards

Shared visual identity for **all** Hoop Challenges / 127 Sports Intensity application repositories.

The Landing Hub repository (`Schmidt127/hoopchallenges-landing`) is the **official source of truth** for shared brand standards. Leaf repositories keep a synchronized copy of this file.

Parent organization: **127 Sports Intensity**  
Public site: **Hoop Challenges** (`https://hoopchallenges.com/`)  
Source kit: **127_SI_Brand_Kit** (Patrick Liddell)

This file is the **canonical shared brand foundation**. App-specific accents and layout rules live in `APP_CONTEXT.md` for each repository. Do not let one app's theme overwrite another app's theme.

---

## Official colors

| Name | Hex | Typical use |
|------|-----|-------------|
| Brand blue | `#0034B7` | Nav, section accents, primary CTAs, headings |
| Brand orange | `#FF8B00` | Highlights, hover, selected states, secondary accents |
| Charcoal | `#262626` | Primary text |
| Light gray | `#F2F2F2` | Page backgrounds, alternating sections |
| Medium gray | `#C4C4C4` | Dividers, borders, secondary UI |
| White | `#FFFFFF` | Cards, surfaces, text on blue |

Blue and orange remain the **dominant organization colors**. Program-specific accents in `APP_CONTEXT.md` are secondary and restrained.

---

## Typography

| Role | Font | Notes |
|------|------|--------|
| Major branded headings | **Magistral** | Use when licensed and available in the project |
| Body, navigation, buttons, forms, labels, tables | **Maven Pro** | Default UI typeface |

### Approved substitutions

- If Magistral is **not** licensed or not available in the repo, use **Maven Pro 700-800** for display headings.
- Do **not** add unlicensed font files to any repository.
- Prefer `next/font/google` (or existing project font loading) for Maven Pro.
- Stats / numeric columns may use tabular nums via `font-mono` or Maven Pro with tabular figures.

Do not invent alternate brand typefaces.

---

## Logo rules

| Variant | Use |
|---------|-----|
| **Circular** (blue-and-orange) | Compact navigation, favicon, tight headers |
| **Horizontal** | Wide headers and footers |
| **Stacked** | Centered promotional placements |
| **White logo** | Only on dark backgrounds |

### Hard rules

- Do not stretch, recolor, crop, recreate, filter, or distort logos.
- Do not invent S3 paths or remote asset URLs.
- Search existing repo assets first (often under `web/public/brand/`).
- Prefer constants such as `lib/brand.ts` / `BRAND_LOGOS` when present.
- Preserve aspect ratios.

If a required logo variant is missing, **report it** - do not invent a substitute path.

---

## Shared visual principles

- **Primarily light interfaces** unless `APP_CONTEXT.md` explicitly requires otherwise.
- Clear hierarchy: brand -> app name -> page title -> content.
- Moderate border radii (typical range ~6-16px).
- Compact but readable spacing.
- Accessible contrast on text and controls.
- Visible focus states for keyboard users.
- Responsive layouts (desktop and mobile).

### Avoid

- Excessive pills / chip clusters
- Neon effects and heavy glow
- Glassmorphism
- Heavy or decorative gradients as the main visual idea
- Oversized shadows
- Unnecessary animation
- Off-palette dominant colors that overpower blue/orange

Motion, when used, should create presence and hierarchy - not noise.

---

## Accessibility

- Logical heading order (`h1` -> `h2` -> ...)
- Descriptive alt text for meaningful images; empty alt for decorative images
- Full keyboard navigation
- Visible focus indicators
- Semantic HTML
- Semantic tables for tabular data
- Touch-friendly controls on mobile
- Do **not** rely only on color for status (pair color with text or icon)
- Test mobile layouts before finishing UI work

---

## Asset rules

1. Search existing assets in the current repository first.
2. Do not invent URLs or placeholder CDN paths.
3. Do not leave placeholder assets in production routes.
4. Verify `basePath` behavior for images, icons, PDFs, documents, and downloads.
5. Preserve aspect ratios.
6. Report missing or broken assets instead of guessing.

---

## Relationship to other brand docs

Some repositories still contain older copies such as `docs/brand-system.md` or `web/docs/brand-guide.md`. Those may hold **implementation details** (tokens, component paths, kit notes).

- Shared colors, typography, logos, and principles -> **this file**
- App theme accents and product rules -> **`APP_CONTEXT.md`**
- If an older doc contradicts this file on shared standards, **prefer this file** and note the conflict in your report

---

## Do not

- Subdomains for leaf apps (use path routing under hoopchallenges.com)
- Mixed multi-app navigation shells inside a leaf app
- Treat the landing hub as the source of leaf-app business logic
- Copy one program's dark/light or accent system wholesale into another program
