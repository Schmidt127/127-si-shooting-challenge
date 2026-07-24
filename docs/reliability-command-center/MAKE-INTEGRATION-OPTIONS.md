# Future Make.com integration options

**Status:** Designed (optional — not required for RCC v1)

RCC v1 is repository-side. Make remains the email sender for WAS via **Weekly Athlete Summary - Bulk Email - May 18**.

## Options (none installed by this work)

### Option 1 — Status webhook into findings log (future)

Make Live writeback success/failure posts a sanitized event to a future `RCC Findings` table or logging endpoint.

**Pros:** Near-real-time handoff visibility  
**Cons:** New Make modules + secrets; must not duplicate Sent? writers  
**Recommendation:** Only after Interface + findings table approved

### Option 2 — Read-only Make error branch tagging

On Gmail/module failure, set `Weekly Email Error` (if Make already can) and leave Sent? unchecked.

**Pros:** Uses existing WAS error field  
**Cons:** Confirm no conflict with 074 error writes  
**Recommendation:** Document in Make blueprint notes before enabling

### Option 3 — No Make changes (current recommendation)

Continue exporting WAS/XP slices periodically and running:

```bash
node tools/reliability-command-center/cli.js --input export.json --output report/
```

**Pros:** Zero live risk; matches DEV-first / no-agent-deploy rules  
**Cons:** Not continuous  
**Recommendation:** **Use this for v1**

## Explicit non-changes

- Do not create a second weekly email Make scenario
- Do not move writeback ownership away from Make Live branch
- Do not have 074 mark `Weekly Email Sent?`
