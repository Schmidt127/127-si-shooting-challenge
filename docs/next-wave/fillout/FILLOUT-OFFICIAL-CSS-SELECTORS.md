# Fillout — official custom CSS selectors (FUT-039)

**Authority:** Fillout Help — [Custom CSS](https://www.fillout.com/help/custom-css)  
**Rule:** Use **only** selectors in this table. Undocumented internal class names may change without notice.  
**Repo artifact:** [fillout-theme-sc-2026.css](./fillout-theme-sc-2026.css) uses this list exclusively.

Custom CSS is **shared across all forms using the same theme**. CSS can override theme settings — set colors/fonts in Theme editor first, then paste CSS.

**Apply path:** Form → **Theme** (upper left) → **Advanced designer** → **Add CSS** → **Apply CSS** → **Preview**.

---

## Layout and containers

| Selector | Targets |
|----------|---------|
| `.fillout-field-container` | Container for all fields on each page |

---

## Labels and text

| Selector | Targets |
|----------|---------|
| `.fillout-field-label` | Question labels |
| `.fillout-field-label p` | Label text inside labels |
| `.fillout-caption` | Field captions |
| `.fillout-caption p` | Caption text |
| `.fillout-required-asterisk` | Required-field asterisk |
| `.fillout-error-validation-message` | Validation error messages |

---

## Field types

| Selector | Targets |
|----------|---------|
| `.fillout-field-short-answer` | Short answer |
| `.fillout-field-long-answer` | Long answer / textarea |
| `.fillout-field-dropdown` | Dropdown |
| `.fillout-field-email` | Email |
| `.fillout-field-phone` | Phone |
| `.fillout-field-number` | Number |
| `.fillout-field-date` | Date picker |
| `.fillout-field-text` | Heading (Text) block |
| `.fillout-field-paragraph` | Paragraph block |
| `.fillout-field-button` | Next button wrapper (style `button` inside) |

---

## Buttons and navigation

| Selector | Targets |
|----------|---------|
| `.fillout-field-button button` | Next / submit button |
| `.fillout-back-button` | Back button |
| `.fillout-skip-button button` | Skip button |

---

## Other elements

| Selector | Targets |
|----------|---------|
| `.fillout-theme-logo` | Logo from theme |
| `.fillout-login-profile` | Profile icon on login forms |
| `input[type="text"]::placeholder` | Placeholder text |
| `.fillout-edit-mode` | Editor view only |
| `.fillout-live-mode` | Preview + published form only |

**Tip:** Prefix rules with `.fillout-live-mode` so editor chrome is unaffected (see repo CSS).

---

## CSS variables (top level in custom CSS)

| Variable | Controls |
|----------|----------|
| `--radio-size` | Radio button size (e.g. `48px`) |
| `--radio-dot-size` | Inner radio dot (e.g. `36px`) |

Set Fillout variables and 127 SI tokens together in `:root` at the top of the pasted CSS file.

---

## Not documented — use Theme editor instead

These are **not** in Fillout’s official list. Do **not** use in repo CSS:

| Avoid | Use instead |
|-------|-------------|
| `.fillout-form-container` | Theme → page background `#F2F2F2` |
| `.fillout-header` / `.fillout-form-header` | Theme header + `.fillout-theme-logo` border |
| `.fillout-button-primary` | `.fillout-field-button button` |
| `.fillout-field-content` | Field-type wrappers (`.fillout-field-email`, etc.) |
| `.fillout-field-payment` | Stripe **payment page** settings in form builder |

---

## Stripe / registration (FUT-003)

Payment layout is configured in the **Stripe payment field** (product image, checkout title, CTA, optional receipt on ending page). Custom CSS must **not** hide payment fields or iframes.

---

## Change log

| Date | Change |
|------|--------|
| 2026-09-01 | Initial selector reference for FUT-039 |
