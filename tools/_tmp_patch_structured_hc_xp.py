from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}")
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# 065 v10.8 — support canonical HC-only Structured Curriculum Homework XP.
# -----------------------------------------------------------------------------
p = Path("airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js")
s = p.read_text()

s = replace_once(s, "Last GitHub Update: 2026-09-04 (v10.7 SC-160 early/on-time/late timing)", "Last GitHub Update: 2026-09-08 (v10.8 Structured Curriculum HC-only XP)", "065 header date")
s = replace_once(s, " * Version: v10.7", " * Version: v10.8", "065 docblock version")
s = replace_once(s, " * Last Updated: 2026-09-04", " * Last Updated: 2026-09-08", "065 docblock date")
s = replace_once(
    s,
    " * VERSION HISTORY\n * - v10.7 (2026-09-04): SC-160 — early/on-time/late timing tracked; early and late",
    " * VERSION HISTORY\n * - v10.8 (2026-09-08): Structured Curriculum HC-only homework may award canonical Homework XP\n *   with zero Submission links when PHA/Enrollment/Week/WAS ownership is valid. Submission-backed\n *   homework remains exact-one-Submission. XP Event Submission topology is immutable across replay.\n * - v10.7 (2026-09-04): SC-160 — early/on-time/late timing tracked; early and late",
    "065 history",
)
s = replace_once(s, " * - Exact Enrollment, Week, Homework Completion, and Submission ownership required.", " * - Exact Enrollment, Week, Homework Completion, and Submission topology ownership required.\n *   Submission-backed HCs require exactly one Submission; Structured Curriculum HC-only HCs require zero.", "065 design ownership")
s = replace_once(s, " * - New XP also requires exactly one Submission link when no owned event exists yet.", " * - New XP permits exactly one Submission link (traditional path) or zero Submission links (canonical PHA-backed Structured Curriculum path).", "065 design new xp")
s = replace_once(s, '  version: "v10.7",', '  version: "v10.8",', "065 metadata version")
s = replace_once(s, '  versionDate: "2026-09-04",', '  versionDate: "2026-09-08",', "065 metadata date")
s = replace_once(s, '  lastUpdated: "2026-09-04",', '  lastUpdated: "2026-09-08",', "065 metadata updated")

s = replace_once(
    s,
    "  const submissionIds = linkedIds(xpEvent, xpEventsTable, CONFIG.xpEvents.submission);\n  if (submissionIds.length !== 1 || !ctx.subs.includes(submissionIds[0])) {\n    throw new Error(`XP Event ${xpEvent.id} Submission ownership mismatch.`);\n  }",
    "  const eventSubmissionIds = linkedIds(xpEvent, xpEventsTable, CONFIG.xpEvents.submission);\n  if (!sameIds(eventSubmissionIds, ctx.subs)) {\n    throw new Error(\n      `XP Event ${xpEvent.id} Submission topology mismatch. Expected [${ctx.subs.join(\",\")}], got [${eventSubmissionIds.join(\",\")}].`\n    );\n  }",
    "065 ownership topology",
)

s = replace_once(
    s,
    "  if (!submissionIds.length) throw new Error(`At least one Submission link is required.`);",
    "  if (submissionIds.length > 1) {\n    throw new Error(`Homework Completion may link at most one Submission; found ${submissionIds.length}.`);\n  }",
    "065 initial submission gate",
)

s = replace_once(
    s,
    "  if (submissionIds.length !== 1 && !xpEvent) {\n    throw new Error(`New Homework XP requires exactly one canonical Submission; found ${submissionIds.length}.`);\n  }",
    "  // v10.8: zero Submission links is valid only through the already-validated canonical PHA-backed HC path.\n  // One Submission remains the traditional topology; more than one is rejected above.",
    "065 positive submission gate",
)

s = replace_once(
    s,
    "    [CONFIG.xpEvents.submission]: linkedCell([\n      xpEvent ? linkedIds(xpEvent, xpEventsTable, CONFIG.xpEvents.submission)[0] : submissionIds[0],\n    ]),",
    "    [CONFIG.xpEvents.submission]: linkedCell(\n      xpEvent ? linkedIds(xpEvent, xpEventsTable, CONFIG.xpEvents.submission) : submissionIds\n    ),",
    "065 payload submission topology",
)

p.write_text(s)

# -----------------------------------------------------------------------------
# Structured Curriculum submit service — guarantee canonical WAS + HC link.
# -----------------------------------------------------------------------------
p = Path("web/lib/curriculum/submit-service.ts")
s = p.read_text()

s = replace_once(
    s,
    '  "Assignment Key"?: unknown;\n  Notes?: unknown;\n};',
    '  "Assignment Key"?: unknown;\n  "Weekly Athlete Summary Link"?: unknown;\n  Notes?: unknown;\n};',
    "submit HcFields WAS",
)

marker = "async function loadCompletionsByIds(\n"
helper = '''type WeeklySummaryFields = {\n  Enrollment?: unknown;\n  Week?: unknown;\n};\n\n/**\n * Structured Curriculum has no Daily Submission, but Homework XP 065 still requires\n * exactly one canonical WAS for Enrollment + assigned PHA Week. Find-or-create the\n * same identity used by 020/031, then link the HC directly. Never create a Submission.\n */\nasync function ensureCanonicalWeeklySummaryForCurriculum(input: {\n  enrollmentId: string;\n  weekId: string;\n  homeworkCompletionId: string;\n}): Promise<string> {\n  const response = await listAirtableRecords<WeeklySummaryFields>({\n    tableName: TABLES.weeklySummary.name,\n    filterByFormula: `AND(FIND('${escapeAirtableString(input.enrollmentId)}',ARRAYJOIN({Enrollment})),FIND('${escapeAirtableString(input.weekId)}',ARRAYJOIN({Week})))`,\n    fields: ["Enrollment", "Week"],\n    maxRecords: 3,\n    revalidateSeconds: 0,\n  });\n\n  const candidates = response.records.filter((row) => {\n    const enrollmentIds = linkedRecordIds(row.fields.Enrollment);\n    const weekIds = linkedRecordIds(row.fields.Week);\n    return (\n      enrollmentIds.length === 1 &&\n      enrollmentIds[0] === input.enrollmentId &&\n      weekIds.length === 1 &&\n      weekIds[0] === input.weekId\n    );\n  });\n\n  if (candidates.length > 1) {\n    throw Object.assign(\n      new Error(\n        `Multiple canonical Weekly Athlete Summaries for Enrollment ${input.enrollmentId} + Week ${input.weekId}.`,\n      ),\n      { code: "WAS_AMBIGUOUS" as const },\n    );\n  }\n\n  let weeklySummaryId = candidates[0]?.id ?? "";\n  if (!weeklySummaryId) {\n    const created = await createAirtableRecord({\n      tableName: TABLES.weeklySummary.name,\n      fields: {\n        Enrollment: [input.enrollmentId],\n        Week: [input.weekId],\n      },\n      typecast: true,\n    });\n    weeklySummaryId = created.id;\n  }\n\n  await updateAirtableRecord({\n    tableName: TABLES.homeworkCompletions.name,\n    recordId: input.homeworkCompletionId,\n    fields: { "Weekly Athlete Summary Link": [weeklySummaryId] },\n    typecast: true,\n  });\n\n  return weeklySummaryId;\n}\n\n'''
s = replace_once(s, marker, helper + marker, "submit WAS helper insertion")

anchor = '''    if (written.usedFallbackSource) {\n      logSubmit("source_system_fallback", {\n        enrollmentId: payload.enrollmentId,\n        assignmentKey: payload.assignmentKey,\n        homeworkCompletionId: written.id,\n      });\n    }\n\n    if (isNeedsRevision && priorAttempts.length > 0) {'''
replacement = '''    if (written.usedFallbackSource) {\n      logSubmit("source_system_fallback", {\n        enrollmentId: payload.enrollmentId,\n        assignmentKey: payload.assignmentKey,\n        homeworkCompletionId: written.id,\n      });\n    }\n\n    const weeklySummaryId = await ensureCanonicalWeeklySummaryForCurriculum({\n      enrollmentId: payload.enrollmentId,\n      weekId,\n      homeworkCompletionId: written.id,\n    });\n    logSubmit("weekly_summary_linked", {\n      enrollmentId: payload.enrollmentId,\n      assignmentKey: payload.assignmentKey,\n      homeworkCompletionId: written.id,\n      weeklySummaryId,\n      weekId,\n    });\n\n    if (isNeedsRevision && priorAttempts.length > 0) {'''
s = replace_once(s, anchor, replacement, "submit WAS call")

p.write_text(s)

# -----------------------------------------------------------------------------
# Permanent source-contract regression test.
# -----------------------------------------------------------------------------
test = Path("tests/automation-contracts/065-structured-hc-only-contract.test.js")
test.write_text(r'''const assert = require("node:assert/strict");\nconst fs = require("node:fs");\nconst path = require("node:path");\n\nconst root = path.resolve(__dirname, "../..");\nconst source065 = fs.readFileSync(\n  path.join(root, "airtable/automations/shooting-challenge/065-homework-review-and-xp-create-homework-xp-event.js"),\n  "utf8",\n);\nconst submit = fs.readFileSync(\n  path.join(root, "web/lib/curriculum/submit-service.ts"),\n  "utf8",\n);\n\nassert.match(source065, /version:\s*"v10\.8"/);\nassert.doesNotMatch(source065, /At least one Submission link is required/);\nassert.doesNotMatch(source065, /New Homework XP requires exactly one canonical Submission/);\nassert.match(source065, /Homework Completion may link at most one Submission/);\nassert.match(source065, /sameIds\(eventSubmissionIds, ctx\.subs\)/);\nassert.match(\n  source065,\n  /xpEvent \? linkedIds\(xpEvent, xpEventsTable, CONFIG\.xpEvents\.submission\) : submissionIds/,\n);\n\nassert.match(submit, /ensureCanonicalWeeklySummaryForCurriculum/);\nassert.match(submit, /tableName:\s*TABLES\.weeklySummary\.name/);\nassert.match(submit, /"Weekly Athlete Summary Link": \[weeklySummaryId\]/);\nassert.match(submit, /fields:\s*\{\s*Enrollment:\s*\[input\.enrollmentId\],\s*Week:\s*\[input\.weekId\]/s);\nassert.doesNotMatch(submit, /createAirtableRecord\([\s\S]{0,300}tableName:\s*TABLES\.submissions/);\n\nconsole.log("065 Structured Curriculum HC-only XP contract: PASS");\n'''.replace(/\\n/g, "\n"))

print("Structured HC-only XP patch applied")
