/*
Extension Script: Audit Field Coverage Report
System: 127 SI Shooting Challenge
Purpose:
  Reports fill rates for canonical pipeline fields across key tables.
  After audit+backfill passes, low-fill fields are candidates for legacy
  cleanup or "not used in current architecture".

Default: read-only (no writes)

Interpretation:
  - High fill on counted/active rows = field is live in production
  - Zero fill after backfills = strong candidate for DELETE/LEGACY review
  - Partial fill = historical gap or optional field (investigate before delete)
*/

// @ts-nocheck

const SAMPLE_EMPTY_RECORDS = 5;

const CONFIG = {
  profiles: [
    {
      profileId: "counted_submissions",
      table: "Submissions",
      filterField: "Count This Submission?",
      filterEquals: 1,
      fields: [
        "Enrollment",
        "Week",
        "Activity Date",
        "Weekly Athlete Summary",
        "XP Events",
        "XP Award Status",
        "Submission Assets",
        "Homework Name 1",
        "Homework Name 2",
        "Duplicate Key",
        "Submission Key",
      ],
    },
    {
      profileId: "homework_completions",
      table: "Homework Completions",
      fields: [
        "Enrollment",
        "Week",
        "Homework",
        "Submissions - Linked",
        "Submission Assets",
        "Asset Slot",
        "Upload Status",
        "Writeback Complete?",
        "Google Drive File URL",
        "Grade Band",
        "Weekly Athlete Summary Link",
        "Review Complete",
        "Satisfactory?",
        "Award Status",
        "XP Events",
        "Coach Feedback",
        "Homework Completion Key",
      ],
    },
    {
      profileId: "submission_assets_homework",
      table: "Submission Assets",
      filterField: "Upload Destination",
      filterText: "Homework Completions",
      fields: [
        "Submission - Linked",
        "Enrollment - Linked",
        "Asset Purpose",
        "Asset Slot",
        "Airtable Attachment",
        "Google Drive File URL",
        "Upload Status",
        "Homework Completions",
        "Send to Make Trigger",
        "Original File Name",
      ],
    },
    {
      profileId: "xp_events",
      table: "XP Events",
      fields: [
        "Enrollment",
        "Week",
        "Weekly Athlete Summary",
        "Submission",
        "Homework Completion",
        "Video Feedback",
        "Source Key",
        "XP Points",
        "XP Bucket",
        "XP Source",
        "Active?",
      ],
    },
    {
      profileId: "weekly_athlete_summary",
      table: "Weekly Athlete Summary",
      fields: [
        "Enrollment",
        "Week",
        "Grade Band",
        "Summary Key",
        "Summary Calculation Status",
        "Homework Completions Link",
        "Submissions Link",
        "XP Events",
        "Send to Make?",
        "Email Sent?",
      ],
    },
  ],
};

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function isFilled(record, table, fieldName) {
  if (!fieldExists(table, fieldName)) return null;

  const field = table.getField(fieldName);
  const raw = record.getCellValue(fieldName);

  if (raw === null || raw === undefined) return false;

  switch (field.type) {
    case "singleLineText":
    case "multilineText":
    case "richText":
    case "email":
    case "url":
    case "phoneNumber":
      return String(raw).trim().length > 0;
    case "number":
    case "currency":
    case "percent":
    case "rating":
    case "duration":
      return true;
    case "checkbox":
      return raw === true;
    case "singleSelect":
      return Boolean(raw?.name);
    case "multipleSelects":
      return Array.isArray(raw) && raw.length > 0;
    case "multipleRecordLinks":
    case "singleRecordLink":
      return Array.isArray(raw) ? raw.length > 0 : Boolean(raw?.id);
    case "multipleAttachments":
      return Array.isArray(raw) && raw.length > 0;
    case "date":
    case "dateTime":
      return Boolean(raw);
    default:
      return String(record.getCellValueAsString(fieldName) || "").trim().length > 0;
  }
}

function passesFilter(record, table, profile) {
  if (profile.filterField && profile.filterEquals !== undefined) {
    if (!fieldExists(table, profile.filterField)) return true;
    const raw = record.getCellValue(profile.filterField);
    const num = typeof raw === "number" ? raw : Number(record.getCellValueAsString(profile.filterField));
    return num === profile.filterEquals;
  }

  if (profile.filterField && profile.filterText) {
    if (!fieldExists(table, profile.filterField)) return true;
    return String(record.getCellValueAsString(profile.filterField) || "").trim() === profile.filterText;
  }

  return true;
}

async function main() {
  const profilesOut = [];

  for (const profile of CONFIG.profiles) {
    const table = base.getTable(profile.table);
    const existingFields = profile.fields.filter(name => fieldExists(table, name));
    const missingFieldDefs = profile.fields.filter(name => !fieldExists(table, name));

    const query = await table.selectRecordsAsync({ fields: existingFields });
    const scoped = query.records.filter(record => passesFilter(record, table, profile));

    const fieldStats = [];

    for (const fieldName of existingFields) {
      let filled = 0;
      const emptySample = [];

      for (const record of scoped) {
        const filledState = isFilled(record, table, fieldName);
        if (filledState === true) {
          filled += 1;
        } else if (filledState === false && emptySample.length < SAMPLE_EMPTY_RECORDS) {
          emptySample.push(record.id);
        }
      }

      const total = scoped.length;
      const fillRate = total > 0 ? Math.round((filled / total) * 1000) / 10 : 0;

      fieldStats.push({
        field: fieldName,
        filledCount: filled,
        emptyCount: total - filled,
        fillRatePercent: fillRate,
        emptySampleRecordIds: emptySample,
        legacyCandidate: total > 0 && filled === 0,
      });
    }

    profilesOut.push({
      profileId: profile.profileId,
      table: profile.table,
      recordsInScope: scoped.length,
      missingFieldDefinitions: missingFieldDefs,
      fieldStats: fieldStats.sort((a, b) => a.fillRatePercent - b.fillRatePercent),
      likelyUnusedFields: fieldStats.filter(row => row.legacyCandidate).map(row => row.field),
    });
  }

  const report = {
    script: "audit-field-coverage-report",
    dryRun: true,
    note: "Fields with 0% fill after backfills are legacy/unused candidates — confirm in automations before delete.",
    profiles: profilesOut,
  };

  console.log("===== FIELD COVERAGE REPORT =====");
  console.log(JSON.stringify(report, null, 2));
}

await main();
