# Hoop Challenges — Web Brand Guide

Reference for all UI work under `web/`. Update this file when brand decisions change.

## Brand hierarchy

| Level | Name | Usage |
|-------|------|--------|
| Hub | **Hoop Challenges** | `hoopchallenges.com` landing, program picker |
| Parent org | **127 Sports Intensity** | Subtitle, footer, trust line |
| Products | Shooting Challenge, Dribbling Challenge, Kids Ref Now | Each has its own path and nav shell |

## Voice & tone

- Professional, athletic, motivating — not childish or playful
- Direct labels: "Leaderboard", "Levels", "Live" — not cute nicknames
- Youth program: energetic but **never** cartoonish

## Visual principles

### Do

- Dark surfaces (`#0b1220` background, `#111827` cards)
- Orange accent (`#f97316`) for CTAs, rank highlights, active states
- Generous whitespace, strong typography hierarchy
- Subtle grid lines, soft glows, thin borders (`border-white/10`)
- Uppercase tracking on **small labels only** (e.g. `text-xs tracking-[0.2em]`)
- Geometric accents: lines, gradients, corner brackets — not illustrations
- Status chips: `Live`, `Coming Soon` (neutral slate for upcoming)

### Don't

- Emoji as icons (🏀 🥇 etc.) on hub or product chrome
- Cartoon mascots, clip art, or bubbly rounded "app store" illustration style
- Mixed product navigation on one bar
- Bright rainbow palettes or neon overload
- Comic Sans–style playfulness

## Color tokens

Defined in `app/globals.css` — use Tailwind theme names:

| Token | Use |
|-------|-----|
| `background` | Page base |
| `card` | Elevated panels |
| `foreground` | Primary text |
| `muted` | Secondary text |
| `accent` / `accent-soft` | CTAs, XP, highlights |
| `border` | Dividers |

## Typography

- **Sans:** Geist (via `font-sans`) — UI, headings, body
- **Mono:** Geist Mono (`font-mono`) — stats, XP, shot counts, ranks
- Headlines: bold, tight tracking; avoid all-caps on full titles

## Layout patterns

| Pattern | Where |
|---------|--------|
| Hub landing | `/` — no product nav |
| Product shell | `/shooting-challenge`, `/dribbling-challenge`, `/kids-ref-now` — own header + nav |
| Back link | One link: **All Programs** → `/` |

## Product URLs

```
/                      Hub
/shooting-challenge      Shooting app shell
/dribbling-challenge     Dribbling app shell (phased)
/kids-ref-now            Kids Ref Now shell (phased)
```

Legacy `/leaderboard` redirects to `/shooting-challenge/leaderboard`.

## Imagery

- Prefer typography and layout over stock photos for v1
- If photos are added later: real athletes/courts, high contrast, desaturated overlays
- School logos only when explicitly approved for public display

## When to update this doc

- New product added to hub
- Logo or color change
- Decision to allow emoji anywhere (default: no)
- New hub domain (e.g. 127sportsintensity.com)
