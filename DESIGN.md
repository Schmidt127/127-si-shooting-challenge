# Design Context — 127 SI Shooting Challenge

<!-- impeccable:design-schema 1 -->

## Purpose

This document records the established visual system for approved UI work in the
Shooting Challenge web app. It guides composition and implementation; it does
not authorize changes to product behavior, data, routes, privacy boundaries, or
brand standards.

## Product Character

- Build a premium youth-basketball experience: professional, athletic,
  motivating, and trustworthy for parents, coaches, and schools.
- Make athlete progress, competition, earned accomplishments, and the next
  training action the first visual read.
- Keep public surfaces family-readable without turning them into an
  administrative dashboard.
- Prefer decisive editorial hierarchy, real program data, and practical
  training guidance over generic software-template patterns.

## Source Hierarchy

1. `BRAND_STANDARDS.md` — shared organization colors, type, logos, principles,
   and accessibility rules.
2. `APP_CONTEXT.md` — Shooting Challenge theme and product-specific accents.
3. `PRODUCT.md` — product audience, design direction, privacy, and anti-pattern
   commitments.
4. `web/app/globals.css` — implemented tokens and global primitives.
5. `web/docs/brand-guide.md` — web-specific implementation guidance.

When a lower source conflicts with a higher source, follow the higher source.
The landing repository owns the canonical shared brand document.

## Palette and Token Use

| Role | Token | Value | Use |
|---|---|---:|---|
| Brand blue | `--brand-blue` | `#0034B7` | Primary navigation, headings, trust blocks, table headers, section emphasis |
| Brand orange | `--brand-orange` | `#FF8B00` | Primary action, progress highlight, selected state, athlete-energy accent |
| Accessible orange text | `--accent-soft` | `#C96E00` | Orange emphasis on light surfaces |
| Charcoal | `--brand-charcoal` | `#262626` | Primary text on light surfaces |
| Light gray | `--brand-light-gray` | `#F2F2F2` | Page background and quiet alternation |
| Medium gray | `--brand-medium-gray` | `#C4C4C4` | Borders, dividers, restrained secondary UI |
| White | `--brand-white` | `#FFFFFF` | Cards, light surfaces, contrast text |
| Court navy | `--court-navy` | `#001A5C` | Isolated contrast moments only |
| Court tan | `--court-tan` | `#C4A574` | Restrained program support |
| Court gold | `--court-gold` | `#C9A227` | Level, award, or achievement emphasis |

- Blue and orange are always dominant; supporting colors are subordinate.
- Introduce a new color only for a defined semantic state, accessibility need,
  or intentional basketball-program emphasis. It must harmonize with the
  palette and never create a rainbow system.
- Use orange with charcoal text for primary CTAs on light surfaces. Use the
  readable soft-orange token for orange text on light backgrounds.
- Do not use color as the only expression of status or meaning.

## Typography

- Use Maven Pro for body copy, navigation, controls, forms, labels, and tables.
- Use Magistral only when a licensed web asset is available. Until then,
  `font-display` / Maven Pro 700–800 is the approved display treatment.
- Use `font-mono` or tabular figures for rank, XP, shots, levels, dates, and
  other comparison-driven numeric data.
- Display headlines are bold and slightly tight. Keep long headings in normal
  title case; reserve uppercase tracked text for short labels and eyebrows.
- A complementary font may serve a clear functional need only when the existing
  system cannot. It must not compete with Maven Pro or the brand display face.

## Layout, Spacing, and Shape

- Use the site container (`--site-max-width`: `72rem`) and responsive gutter
  (`1rem`, then `1.5rem` at small screens).
- Preserve compact, readable rhythm: the standard section cadence is
  `--site-section-y` `3.5rem` and `--site-section-y-lg` `4.5rem`.
- Use moderate radii: `6px`, `8px`, `12px`, or `16px`. Avoid pill-heavy
  composition and oversized rounded surfaces.
- Use subtle shadows for surface separation, not elevation theater. Prefer
  borders and hierarchy to stacked shadows.
- The primary hierarchy is: organization and program identity → page title →
  current athlete/program action → real content and supporting detail.

## Light Theme and Contrast

- Default to light-gray page backgrounds, white cards, and charcoal text.
- Navy, blue, and dark contrast surfaces are reserved for meaningful heroes,
  progress/scoreboard moments, achievements, and public-display headers.
- Do not wrap a full page in dark chrome or convert the application to a dark
  theme without explicit approval.
- Court lines and shot arcs are subtle supporting motifs. They should frame a
  meaningful contrast moment, never substitute for content or readability.

## Navigation and Page Hierarchy

- Keep the Shooting Challenge product shell isolated under `/shoot`; do not
  mix navigation from other products into this app.
- Preserve the shared header: brand route, product identity, program
  navigation, and a clear leaderboard action.
- Keep the page hierarchy direct: eyebrow → `h1` → concise purpose/context →
  primary action → content sections.
- Use a contrast hero for competition, progress, achievement, or film-room
  moments. Use a light hero for calm instructional and catalog contexts.
- Make the next meaningful athlete action visible without burying parent
  clarity or real program information.

## Component Patterns

### Cards and surfaces

- Use white or lightly tinted surfaces with restrained borders and moderate
  radii.
- Give cards a distinct job: action, current progress, useful content, or real
  comparison. Do not build uniform card farms to fill space.
- Use a lead-and-supporting composition when a page needs emphasis, instead of
  giving every item equal visual weight.
- Keep feature iconography functional and restrained; no emoji or cartoon
  illustration style.

### Scoreboards and tables

- Use scoreboard styling only for real rank, XP, level, shots, milestones,
  streaks, or achievements.
- Desktop tables use `.sc-table`: blue header, readable rows, tabular numeric
  columns, and horizontal scroll when necessary.
- On small screens, replace dense table rows with clear, semantic card
  summaries rather than compressing unreadable columns.

### CTAs and links

- Primary action: orange CTA with charcoal text, at least 44px tall.
- Primary structural action: blue button with white text.
- On blue/navy surfaces, use high-contrast white-outline secondary actions.
- Inline text links remain underlined and distinguishable beyond color.
- Do not create several competing primary CTAs in one visual region.

## Imagery, Iconography, and Motion

- Use only approved in-repo assets or data-provided images. Do not invent asset
  paths, remote URLs, testimonials, athlete statistics, or school claims.
- Preserve logo aspect ratio; do not recolor, crop, filter, outline, or
  recreate logo marks.
- Meaningful images require descriptive alt text. Decorative backgrounds and
  motifs use empty or hidden semantics.
- Favor athletic photography, training film, court geometry, and actual athlete
  progress over generic stock-SaaS imagery.
- Motion is short and quiet: it may establish presence or hierarchy, but never
  delay content, distract from a task, or simulate progress.
- Respect `prefers-reduced-motion`; never make hover the only way to discover
  an action.

## Mobile and Accessibility

- Design mobile-first for athletes and families using phones.
- Maintain logical heading order, semantic landmarks, lists, and tables.
- Keep touch targets at least 44px where interactive.
- Preserve visible orange focus indicators and keyboard access for all
  controls, links, menus, and cards.
- Use sufficient text contrast on every surface. Pair statuses with text or
  icons, not color alone.
- Maintain stable image aspect ratios, responsive grids, and intentional
  horizontal scrolling for data tables instead of page-level overflow.

## Explicit Anti-Patterns

- Generic SaaS dashboards, card grids, feature grids, and floating widget
  clusters with no information-hierarchy reason.
- AI slop: decoration, copy, metrics, imagery, or interaction patterns that
  exist only to make a page appear designed.
- Full dark theme, neon/glow-heavy treatment, glassmorphism, heavy gradients,
  oversized shadows, or unnecessary animation.
- Excessive pills, chip clusters, rounded-card repetition, decorative
  scoreboards, or per-product rainbow palettes.
- Emoji, cartoon mascots, clip art, distorted logos, or unapproved typefaces.
- Any design that obscures actual program data, weakens parent trust, or
  exposes private athlete or operational information.

## Implementation References

- Tokens and utilities: `web/app/globals.css`
- Shell and navigation: `web/components/layout/product-shell.tsx`,
  `web/components/site/site-header.tsx`
- Hero and sections: `web/components/site/page-hero.tsx`,
  `web/components/site/site-section.tsx`
- Buttons and metrics: `web/components/ui/button.tsx`,
  `web/components/ui/stat-tile.tsx`
- Data presentation: `web/components/leaderboard/leaderboard-table.tsx`
