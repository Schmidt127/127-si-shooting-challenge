from pathlib import Path

# Runtime assertions: source version and emitted version moved 2.5 -> 2.6.
p = Path('tools/testing/tests/test_057_runtime.mjs')
text = p.read_text()
text = text.replace('assert.match(SOURCE, /Version: 2\\.5/);', 'assert.match(SOURCE, /Version: 2\\.6/);', 1)
text = text.replace('/"version":"2\\.5"/.test(line)', '/"version":"2\\.6"/.test(line)', 1)
p.write_text(text)

# Canonical docs: distinguish GitHub target from still-live pre-cutover versions.
p = Path('docs/automation-index.md')
text = p.read_text()
old = '| **118** | Email — Schedule Weekly Summary Email Build | Sunday **5:00 AM** America/Denver | `118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js` (**v2.0** — arms build; does not send email) |'
new = '| **118** | Email — Schedule Weekly Summary Email Build | Sunday **5:00 AM** America/Denver | `118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js` (**GitHub v2.1; Live v2.0 pending SC-121 paste** — arms build; does not send email) |'
if old not in text: raise SystemExit('automation-index 118 row not found')
text = text.replace(old, new, 1)
old = '| **119** | Email — Schedule Weekly Summary Email Send | Sunday **10:00 AM** America/Denver | `119-…-schedule-weekly-summary-email-send.js` — arms send; does **not** send email |'
new = '| **119** | Email — Schedule Weekly Summary Email Send | Sunday **10:00 AM** America/Denver | `119-…-schedule-weekly-summary-email-send.js` (**GitHub v1.8; Live v1.7 pending SC-121 paste**) — arms send; does **not** send email |'
if old not in text: raise SystemExit('automation-index 119 row not found')
text = text.replace(old, new, 1)
p.write_text(text)

p = Path('airtable/schema/current/automation-trigger-map.md')
text = p.read_text()
old = '| 057 | Weekly Athlete Summary | When record matches conditions: `Perfect Week Calculation Queue? = 1` (Pending OR Recalc Needed) | `057-...-calculate-perfect-week-eligibility.js` (**v2.5** — SC-160 early HW + SC-152 Live Tested) | Perfect week flags |'
new = '| 057 | Weekly Athlete Summary | When record matches conditions: `Perfect Week Calculation Queue? = 1` (Pending OR Recalc Needed) | `057-...-calculate-perfect-week-eligibility.js` (**GitHub v2.6; Live v2.5 pending SC-121 paste** — partial terminal Week aware) | Perfect week flags |'
if old not in text: raise SystemExit('trigger-map 057 row not found')
text = text.replace(old, new, 1)
# 118 may be documented later in this file; update only the canonical script/version phrase if present.
text = text.replace('118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js` (**v2.0**)', '118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js` (**GitHub v2.1; Live v2.0 pending SC-121 paste**)', 1)
p.write_text(text)
