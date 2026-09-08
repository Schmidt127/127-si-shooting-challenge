from pathlib import Path

root = Path('.')
p = root / 'airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js'
text = p.read_text()

def rep(old, new, count=1):
    global text
    actual = text.count(old)
    if actual < count:
        raise SystemExit(f'missing expected pattern ({actual} < {count}): {old[:120]!r}')
    text = text.replace(old, new, count)

rep(' * Version: 2.5\n * Date written: 2026-05-30\n * Last updated: 2026-09-04\n',
    ' * Version: 2.6\n * Date written: 2026-05-30\n * Last updated: 2026-09-08\n')
rep(' * Version 2.5 updates (SC-160 early / assigned-week homework timing):\n',
    ' * Version 2.6 updates (SC-121 terminal partial Week boundary):\n'
    ' * - Required official shooting dates derive from the linked Week Start Date through End Date inclusive.\n'
    ' * - Normal seven-day Weeks are unchanged; the partial terminal Week requires only its actual official dates.\n'
    ' * - Daily shot pace remains 1/7 of Weekly Goal Shots Target, so a shortened terminal Week does not raise the per-day minimum.\n'
    ' * - Week spans outside 1-7 calendar days fail closed.\n'
    ' *\n'
    ' * Version 2.5 updates (SC-160 early / assigned-week homework timing):\n')
rep(' * 1. Athlete must have one qualifying shooting submission day for each official day\n *    of the linked Week, Sunday through Saturday. Qualifying submissions must be\n',
    ' * 1. Athlete must have one qualifying shooting submission day for each official day\n *    from the linked Week Start Date through End Date. Normal Weeks are Sunday-Saturday;\n *    the terminal challenge Week may be partial. Qualifying submissions must be\n')
rep('  requiredDailyCount: 7,\n',
    '  // Normal-week daily pace divisor. Official required date count comes from Week Start/End.\n  requiredDailyCount: 7,\n')
rep('function buildRequiredWeekDates(startDateKey) {\n  const dates = [];\n  for (let i = 0; i < CONFIG.requiredDailyCount; i += 1) {\n    dates.push(addDaysToDateKey(startDateKey, i));\n  }\n  return dates;\n}\n',
    'function buildRequiredWeekDates(startDateKey, endDateKey) {\n'
    '  const start = String(startDateKey || "").trim();\n'
    '  const end = String(endDateKey || "").trim();\n'
    '  if (!start || !end || end < start) return [];\n'
    '  const dates = [];\n'
    '  let current = start;\n'
    '  for (let i = 0; i < CONFIG.requiredDailyCount; i += 1) {\n'
    '    dates.push(current);\n'
    '    if (current === end) return dates;\n'
    '    current = addDaysToDateKey(current, 1);\n'
    '    if (!current) return [];\n'
    '  }\n'
    '  return [];\n'
    '}\n')
rep('  if (!weekStartDateKey) {\n', '  if (!weekStartDateKey || !weekEndDateKey) {\n')
rep('      [CONFIG.weeklyFields.dailyDetail]: "Missing Week Start Date.",\n',
    '      [CONFIG.weeklyFields.dailyDetail]: "Missing Week Start Date or End Date.",\n')
rep('      [CONFIG.weeklyFields.automationError]: "Missing Weeks -> Start Date.",\n',
    '      [CONFIG.weeklyFields.automationError]: "Missing Weeks -> Start Date or End Date.",\n')
rep('  const requiredDateKeys = buildRequiredWeekDates(weekStartDateKey);\n  const requiredDateSet = new Set(requiredDateKeys);\n',
    '  const requiredDateKeys = buildRequiredWeekDates(weekStartDateKey, weekEndDateKey);\n'
    '  if (requiredDateKeys.length === 0) {\n'
    '    throw new Error(`Linked Week must span 1-${CONFIG.requiredDailyCount} official calendar days; got ${weekStartDateKey} through ${weekEndDateKey}.`);\n'
    '  }\n'
    '  const requiredDateSet = new Set(requiredDateKeys);\n')
rep('  dailyDetailLines.push(`Official week: ${requiredDateKeys[0]} through ${requiredDateKeys[6]}`);\n',
    '  dailyDetailLines.push(`Official week: ${requiredDateKeys[0]} through ${requiredDateKeys[requiredDateKeys.length - 1]}`);\n')
rep('  dailyDetailLines.push(`Passing official days: ${passingDays.length}/7`);\n',
    '  dailyDetailLines.push(`Passing official days: ${passingDays.length}/${requiredDateKeys.length}`);\n')
rep('    dailyDetailLines.push("PASS: All seven official Sunday-Saturday dates met the grace-period daily shooting requirement.");\n',
    '    dailyDetailLines.push(`PASS: All ${requiredDateKeys.length} official Week dates met the grace-period daily shooting requirement.`);\n')
text = text.replace('version: "2.5"', 'version: "2.6"')
p.write_text(text)

marker = '/***************************************************************************************************\n * 057 - Achievements'
idx = text.find(marker)
if idx < 0:
    raise SystemExit('057 paste marker missing')
(root / 'docs/deploy-checklists/057-v2.6-PASTE.txt').write_text(text[idx:])

t = root / 'tools/testing/tests/test_paste_bundle_integrity.mjs'
ttext = t.read_text()
ttext = ttext.replace('id: "057",\n    version: "2.5",', 'id: "057",\n    version: "2.6",', 1)
ttext = ttext.replace('paste: "docs/deploy-checklists/057-v2.5-PASTE.txt",', 'paste: "docs/deploy-checklists/057-v2.6-PASTE.txt",', 1)
ttext = ttext.replace('"Version: 2.5",', '"Version: 2.6",', 1)
needle = '      "Perfect Week Automation Status",\n'
if needle not in ttext:
    raise SystemExit('paste test insertion marker missing')
ttext = ttext.replace(needle, needle + '      "terminal partial Week",\n', 1)
t.write_text(ttext)

test_path = root / 'tests/challenge-year/sc-121-season-boundary.test.js'
test_path.write_text(r'''#!/usr/bin/env node
"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { resolveWeekForActivityDate } = require("../../lib/challenge-year");
function test(name, fn) { try { fn(); console.log(`ok - ${name}`); } catch (error) { console.error(`FAIL - ${name}`); throw error; } }
const weeks = [
  { id: "rech8lgJkNMStWh9A", displayLabel: "Week 9", weekKey: "2026-2027|Week 9", challengeYear: "2026-2027", startDate: "2027-06-27", endDate: "2027-06-30", active: true },
  { id: "recsWuPMbRH0W5aRU", displayLabel: "Post-Challenge", weekKey: "2026-2027|Post-Challenge", challengeYear: "2026-2027", startDate: "2027-07-01", endDate: "2027-07-03", active: true },
];
function resolve(activityDate) { return resolveWeekForActivityDate({ activityDate, weeks, challengeYear: "2026-2027", timezone: "America/Denver" }); }
test("June 30 resolves to Week 9", () => { const r = resolve("2027-06-30"); assert.equal(r.ok, true); assert.equal(r.week.displayLabel, "Week 9"); });
test("July 1 resolves to Post-Challenge", () => { const r = resolve("2027-07-01"); assert.equal(r.ok, true); assert.equal(r.week.displayLabel, "Post-Challenge"); });
test("Automation 005 uses inclusive Program-Instance-scoped Week matching", () => {
  const body = fs.readFileSync(path.join(__dirname, "../../airtable/automations/shooting-challenge/005-submission-intake-and-asset-creation-assign-week-to-submission-homework-first.js"), "utf8");
  assert.ok(body.includes("activityDateKey >= start && activityDateKey <= end"));
  assert.ok(body.includes("pi === programInstanceId"));
});
test("057 v2.6 derives official dates from Week Start and End", () => {
  const body = fs.readFileSync(path.join(__dirname, "../../airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js"), "utf8");
  assert.ok(body.includes("Version: 2.6"));
  assert.ok(body.includes("buildRequiredWeekDates(weekStartDateKey, weekEndDateKey)"));
  assert.ok(body.includes("requiredDateKeys[requiredDateKeys.length - 1]"));
  assert.ok(body.includes("Passing official days: ${passingDays.length}/${requiredDateKeys.length}"));
  assert.ok(!body.includes("requiredDateKeys[6]"));
});
test("057 preserves normal 1/7 daily shot pace in partial terminal Week", () => {
  const body = fs.readFileSync(path.join(__dirname, "../../airtable/automations/shooting-challenge/057-achievements-and-milestones-calculate-perfect-week-eligibility.js"), "utf8");
  assert.ok(body.includes("dailyMinimum = Math.ceil(weeklyGoal / CONFIG.requiredDailyCount)"));
  assert.ok(body.includes("requiredDailyCount: 7"));
});
test("Week 9 and Post-Challenge are contiguous", () => { assert.equal(weeks[0].endDate, "2027-06-30"); assert.equal(weeks[1].startDate, "2027-07-01"); });
console.log("SC-121 season boundary contracts: PASS");
''')

r = root / 'tools/testing/run-agent4-suite.js'
rtext = r.read_text()
marker2 = '  { name: "challenge-year-engine", args: ["tests/challenge-year/challenge-year-engine.test.js"] },\n'
if marker2 not in rtext:
    raise SystemExit('run-agent4 insertion marker missing')
rtext = rtext.replace(marker2, marker2 + '  { name: "sc-121-season-boundary", args: ["tests/challenge-year/sc-121-season-boundary.test.js"] },\n', 1)
r.write_text(rtext)
