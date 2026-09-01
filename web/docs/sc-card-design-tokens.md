# SC card design tokens (FUT-043)

Canonical web tokens live in [`app/globals.css`](../app/globals.css). Hub transactional emails mirror numeric values in `communications/emails/lib/card-tokens.js` (`SC_CARD` export).

## Token table

| Token | CSS variable | Value | Hub mirror (`SC_CARD`) | Use |
|-------|--------------|-------|------------------------|-----|
| Corner radius | `--sc-card-radius` | `0.75rem` (12px) | `radius: "12px"` | Panels, list shells, homework rows, email InfoCard |
| Inset radius | `--sc-card-radius-sm` | `0.5rem` (8px) | `radiusSm: "8px"` | Achievement inset rows, compact tiles |
| Border | `--sc-card-border-color` | `#d8d8d8` (`--border`) | `borderColor` | Default 1px outline |
| Background | `--sc-card-bg` | `#ffffff` (`--card`) | `bg` | Card surface |
| Shadow | `--sc-card-shadow` | `--site-shadow-sm` | `shadow` | Elevated panels / standalone rows |
| Row padding X | `--sc-card-padding-x` | `1rem` | — (use `paddingRow`) | Game log / XP rows (mobile) |
| Row padding X (sm+) | `--sc-card-padding-x-md` | `1.25rem` | `paddingRow` | Game log / XP rows (desktop) |
| Row padding Y | `--sc-card-row-padding-y` | `0.75rem` | — | List row vertical rhythm |
| Panel padding | `--sc-card-panel-padding` | `1.25rem` | `paddingPanel` | Dashboard panels, email shells |
| Panel padding (sm+) | `--sc-card-panel-padding-md` | `1.5rem` | — | Responsive panel padding |
| Section title size | `--sc-card-section-title-size` | `1.25rem` | `sectionTitleSize: "18px"` | Homework / Game log / XP section headings |
| Section title weight | `--sc-card-section-title-weight` | `700` | `sectionTitleWeight: "800"` | Section headings (email slightly heavier for clients) |
| Card heading size | `--sc-card-heading-size` | `1rem` | `headingSize: "16px"` | In-card titles |
| Card heading weight | `--sc-card-heading-weight` | `600` | `headingWeight: "700"` | In-card titles |
| Eyebrow size | `--sc-card-eyebrow-size` | `0.6875rem` (11px) | `eyebrowSize: "11px"` | XP ledger, Game log, Homework labels |
| Eyebrow tracking | `--sc-card-eyebrow-tracking` | `0.22em` | `eyebrowTracking: "0.22em"` | Uppercase section labels |
| Accent background | `--sc-card-accent-bg` | orange 7% wash | `bgAccent: "#FFF7ED"` | Accent panels / email accent cards |
| Accent border | `--sc-card-accent-border` | orange 30% mix | `borderColorAccent` | Accent outline |
| Blue tint background | `--sc-card-blue-bg` | blue 5% wash | `bgBlue: "#F5F8FF"` | Weekly summary / blue panels |
| Blue tint border | `--sc-card-blue-border` | blue 25% mix | `borderColorBlue` | Blue-accent outline |

## Web usage

Import helpers from `@/components/ui/sc-card`:

- `scCardStandalone()` — homework assignment rows
- `ScCardList` + `ScCardRowItem` — Game Log and XP activity
- `ScCardSectionHeader` — shared section eyebrow + title
- `scCardEmpty()` — dashed empty states
- `scCardPanel()` / `catalogPanelClass()` — dashboard panels

## Email usage

```js
import { scCardShellStyle, scCardHeadingStyle, SC_CARD } from "../lib/card-tokens.js";
```

Inline styles only (email clients); keep numeric values aligned with the table above when changing either side.

## Related

- FUT-043 deploy checklist: [`docs/deploy-checklists/FUT-043-card-design-system.md`](../../docs/deploy-checklists/FUT-043-card-design-system.md)
- Brand foundation: [`BRAND_STANDARDS.md`](../../BRAND_STANDARDS.md)
- FUT-042 owns coach feedback quotation inner styling — do not change here.
