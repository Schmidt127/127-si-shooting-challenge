/*
Extension Script: Final Close-Out — In Amazon Cart Awards
System: 127 SI Shooting Challenge
Purpose:
  Read-only summary of end-of-season gift cards in Award Recipients with
  Award Status = In Amazon Cart (Post Challenge fulfillment truth).

Use before sending the public all-winners email or buying cards.

Schema gate: 20260629_045741
Version: v1.0
Default: read-only (no writes)
*/

// @ts-nocheck

const SAMPLE_LIMIT = 25;
const SCHEMA_SNAPSHOT = "20260629_045741";
const CART_STATUS = "in amazon cart";

const CONFIG = {
  scriptName: "audit-final-awards-cart-summary",
  version: "v1.0",
  schemaSnapshot: SCHEMA_SNAPSHOT,
  tables: {
    awardRecipients: "Award Recipients",
    awards: "Awards",
    weeks: "Weeks",
    enrollments: "Enrollments",
  },
  recipients: {
    enrollment: "Enrollment",
    award: "Award",
    week: "Week",
    status: "Award Status",
    amount: "Award Amount",
    athleteDisplay: "Athlete Name - Display",
    parentEmail: "Parent Email",
  },
  awards: {
    name: "Award Name",
    prizeValue: "Prize Value",
  },
};

function fieldExists(table, fieldName) {
  try {
    table.getField(fieldName);
    return true;
  } catch {
    return false;
  }
}

function getText(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return "";
  return String(record.getCellValueAsString(fieldName) || "").trim();
}

function getNumberish(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return 0;
  const raw = record.getCellValue(fieldName);
  const n = Number(typeof raw === "string" ? raw.replace(/[$,]/g, "") : raw);
  return Number.isFinite(n) ? n : 0;
}

function getFirstLinkedId(record, table, fieldName) {
  if (!fieldName || !fieldExists(table, fieldName)) return "";
  const raw = record.getCellValue(fieldName);
  if (!Array.isArray(raw) || !raw.length) return "";
  return raw[0]?.id || "";
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function main() {
  setOutputSafe?.("debugStep", "load_awards");
  const awardsTable = base.getTable(CONFIG.tables.awards);
  const awardMeta = new Map();
  const awardQuery = await awardsTable.selectRecordsAsync({
    fields: [CONFIG.awards.name, CONFIG.awards.prizeValue],
  });
  for (const rec of awardQuery.records) {
    awardMeta.set(rec.id, {
      name: getText(rec, awardsTable, CONFIG.awards.name),
      prizeValue: getNumberish(rec, awardsTable, CONFIG.awards.prizeValue),
    });
  }

  const weeksTable = base.getTable(CONFIG.tables.weeks);
  const weekLabelById = new Map();
  const weekQuery = await weeksTable.selectRecordsAsync({ fields: ["Week Name"] });
  for (const rec of weekQuery.records) {
    weekLabelById.set(
      rec.id,
      getText(rec, weeksTable, "Week Name") || ""
    );
  }

  setOutputSafe?.("debugStep", "load_cart_rows");
  const recipientsTable = base.getTable(CONFIG.tables.awardRecipients);
  const recipientQuery = await recipientsTable.selectRecordsAsync({
    fields: [
      CONFIG.recipients.enrollment,
      CONFIG.recipients.award,
      CONFIG.recipients.week,
      CONFIG.recipients.status,
      CONFIG.recipients.amount,
      CONFIG.recipients.athleteDisplay,
      CONFIG.recipients.parentEmail,
    ],
  });

  const cartRows = [];
  const byAward = new Map();
  let totalAmount = 0;

  for (const rec of recipientQuery.records) {
    const status = normalizeText(getText(rec, recipientsTable, CONFIG.recipients.status));
    if (status !== CART_STATUS) continue;

    const awardId = getFirstLinkedId(rec, recipientsTable, CONFIG.recipients.award);
    const meta = awardMeta.get(awardId) || { name: "(unknown)", prizeValue: 0 };
    const weekId = getFirstLinkedId(rec, recipientsTable, CONFIG.recipients.week);
    const amount =
      getNumberish(rec, recipientsTable, CONFIG.recipients.amount) || meta.prizeValue || 0;
    totalAmount += amount;

    const row = {
      recordId: rec.id,
      athlete: getText(rec, recipientsTable, CONFIG.recipients.athleteDisplay),
      parentEmail: getText(rec, recipientsTable, CONFIG.recipients.parentEmail),
      award: meta.name,
      week: weekLabelById.get(weekId) || "",
      amount,
    };
    cartRows.push(row);

    if (!byAward.has(meta.name)) byAward.set(meta.name, { count: 0, total: 0 });
    const bucket = byAward.get(meta.name);
    bucket.count += 1;
    bucket.total += amount;
  }

  const awardSummary = [...byAward.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([award, stats]) => ({
      award,
      count: stats.count,
      total: stats.total,
    }));

  const report = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    schemaSnapshot: SCHEMA_SNAPSHOT,
    dryRun: true,
    pass: cartRows.length > 0,
    summary: {
      cartRowCount: cartRows.length,
      estimatedGiftCardTotal: totalAmount,
      awardTypes: awardSummary.length,
    },
    byAward: awardSummary,
    sampleRows: cartRows.slice(0, SAMPLE_LIMIT),
    recommendedAction:
      "Use this list for Amazon cart fulfillment and generate_final_awards_email.py public broadcast.",
  };

  setOutputSafe?.("statusOut", "success");
  setOutputSafe?.("debugStep", "done");
  console.log("===== FINAL AWARDS CART SUMMARY =====");
  console.log(JSON.stringify(report, null, 2));
}

function setOutputSafe(key, value) {
  try {
    if (typeof output !== "undefined" && output?.set) output.set(key, value);
  } catch {
    // optional
  }
}

try {
  await main();
} catch (err) {
  setOutputSafe("statusOut", "error");
  setOutputSafe("errorOut", String(err?.message || err));
  throw err;
}
