from pathlib import Path

ROOT = Path('airtable/automations/shooting-challenge')


def patch(path, replacements):
    p = ROOT / path
    text = p.read_text()
    for old, new in replacements:
        if old not in text:
            raise SystemExit(f'{path}: missing pattern: {old[:140]!r}')
        text = text.replace(old, new, 1)
    p.write_text(text)

helper = r'''
function latestCompletedChallengeEndKey(endKeys, todayKey) {
  const today = String(todayKey || "").trim();
  if (!today) return "";
  const eligible = [...new Set((endKeys || []).map((v) => String(v || "").trim()).filter((v) => v && v < today))];
  eligible.sort();
  return eligible.length ? eligible[eligible.length - 1] : "";
}

function isPostChallengeWeek(record) {
  const identity = `${text(record, CONFIG.weeks.weekKey)} ${text(record, CONFIG.weeks.weekCode)}`.trim();
  return /post[\s_-]*challenge/i.test(identity) || /^post\b/i.test(identity);
}
'''

patch('118-email-notifications-and-external-handoffs-schedule-weekly-summary-email-build.js', [
    (' * Version: v2.0\n * Date Written: 2026-07-16\n * Last Updated: 2026-08-13\n',
     ' * Version: v2.1\n * Date Written: 2026-07-16\n * Last Updated: 2026-09-08\n'),
    (' * VERSION HISTORY\n * - v2.0 (2026-08-13):',
     ' * VERSION HISTORY\n * - v2.1 (2026-09-08 / SC-121): Target the latest active non-Post-Challenge Week that has actually ended in America/Denver, instead of assuming every Week ends Saturday. This preserves normal Sunday behavior and correctly selects partial terminal Week 9 (Jun 27-Jun 30, 2027) on the Jul 4 scheduler run.\n * - v2.0 (2026-08-13):'),
    ('  version: "v2.0",', '  version: "v2.1",'),
    ('function dateKeyFromCell(value) {', 'function dateKeyFromCell(value) {'),
    ('\nasync function main() {', helper + '\nasync function main() {'),
    ('  const targetEndKey = priorSaturdayKeyDenver();\n  const weekFields = safeFields(weeksTable, Object.values(CONFIG.weeks));',
     '  const weekFields = safeFields(weeksTable, Object.values(CONFIG.weeks));'),
    ('  const endDateMatches = [];\n  for (const w of weeksQuery.records) {\n    const endKey = text(w, CONFIG.weeks.weekEndKey) || dateKeyFromCell(cell(w, CONFIG.weeks.endDate));\n    if (endKey === targetEndKey) {\n      endDateMatches.push(w);\n    }\n  }\n\n  let targetCandidates = endDateMatches.filter((w) => weekIsActive(w));\n  if (targetCandidates.length === 0) {\n    targetCandidates = endDateMatches;\n  }',
     '  const todayKey = dateKeyFromCell(new Date());\n  const eligibleWeeks = weeksQuery.records.filter((w) => weekIsActive(w) && !isPostChallengeWeek(w));\n  const eligibleEndKeys = eligibleWeeks.map((w) =>\n    text(w, CONFIG.weeks.weekEndKey) || dateKeyFromCell(cell(w, CONFIG.weeks.endDate))\n  );\n  const targetEndKey = latestCompletedChallengeEndKey(eligibleEndKeys, todayKey);\n  const targetCandidates = eligibleWeeks.filter((w) => {\n    const endKey = text(w, CONFIG.weeks.weekEndKey) || dateKeyFromCell(cell(w, CONFIG.weeks.endDate));\n    return endKey === targetEndKey;\n  });'),
    (' * - Resolve prior ended Week (Saturday just ended at Sunday 05:00 Denver).',
     ' * - Resolve the latest active non-Post-Challenge Week whose End Date is before today in Denver.'),
    (' * - Scheduled date key = prior Saturday Week End (America/Denver).',
     ' * - Scheduled Week End key = latest completed active non-Post-Challenge Week (America/Denver).'),
])

patch('119-email-notifications-and-external-handoffs-schedule-weekly-summary-email-send.js', [
    (' * Version: v1.7\n * Date Written: 2026-07-16\n * Last Updated: 2026-08-06\n',
     ' * Version: v1.8\n * Date Written: 2026-07-16\n * Last Updated: 2026-09-08\n'),
    (' * VERSION HISTORY\n * - v1.7 (2026-08-06):',
     ' * VERSION HISTORY\n * - v1.8 (2026-09-08 / SC-121): Match 118 v2.1 by targeting the latest active non-Post-Challenge Week that has actually ended in America/Denver, so partial terminal Week 9 is not skipped.\n * - v1.7 (2026-08-06):'),
    ('  version: "v1.7",', '  version: "v1.8",'),
    ('  versionDate: "2026-08-06",\n  lastUpdated: "2026-08-06",',
     '  versionDate: "2026-09-08",\n  lastUpdated: "2026-09-08",'),
    ('    weekEndKey: "Week End Key",\n    weekCode: "Week Code",',
     '    weekEndKey: "Week End Key",\n    weekKey: "Week Key",\n    weekCode: "Week Code",'),
    ('\nfunction weeklyEmailEventId(enrollmentId, weekId) {', helper + '\nfunction weeklyEmailEventId(enrollmentId, weekId) {'),
    ('  const targetEndKey = priorSaturdayKeyDenver();\n  let weeksQuery = null;',
     '  let weeksQuery = null;'),
    ('  const endDateMatches = [];\n  for (const w of weeksQuery.records) {\n    const endKey = text(w, CONFIG.weeks.weekEndKey) || dateKeyFromCell(cell(w, CONFIG.weeks.endDate));\n    if (endKey === targetEndKey) {\n      endDateMatches.push(w);\n    }\n  }\n\n  let targetCandidates = endDateMatches.filter((w) => weekIsActive(w));\n  if (targetCandidates.length === 0) {\n    targetCandidates = endDateMatches;\n  }',
     '  const todayKey = dateKeyFromCell(new Date());\n  const eligibleWeeks = weeksQuery.records.filter((w) => weekIsActive(w) && !isPostChallengeWeek(w));\n  const eligibleEndKeys = eligibleWeeks.map((w) =>\n    text(w, CONFIG.weeks.weekEndKey) || dateKeyFromCell(cell(w, CONFIG.weeks.endDate))\n  );\n  const targetEndKey = latestCompletedChallengeEndKey(eligibleEndKeys, todayKey);\n  const targetCandidates = eligibleWeeks.filter((w) => {\n    const endKey = text(w, CONFIG.weeks.weekEndKey) || dateKeyFromCell(cell(w, CONFIG.weeks.endDate));\n    return endKey === targetEndKey;\n  });'),
    (' * - Resolve prior ended Week (same Saturday-end rule as 118).',
     ' * - Resolve the latest active non-Post-Challenge Week whose End Date is before today in Denver (same rule as 118).'),
    (' * - Scheduled date key = prior Saturday Week End (America/Denver).',
     ' * - Scheduled Week End key = latest completed active non-Post-Challenge Week (America/Denver).'),
])
