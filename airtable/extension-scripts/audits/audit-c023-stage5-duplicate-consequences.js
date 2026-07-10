/*
Extension: audit-c023-stage5-duplicate-consequences
System: 127 SI Shooting Challenge
Purpose: Dry-run audit for C-023 Stage 5 consequence state on Submission Assets.
*/

/**
 * C-023 Stage 5 — Duplicate Consequence Audit
 *
 * Version: v1.0
 * Date Written: 2026-07-10
 * Last Updated: 2026-07-10
 *
 * PURPOSE
 * - Read Submission Assets with Asset Reuse Decision set.
 * - Report expected vs actual suppress/XP state for linked Video Feedback or Homework.
 * - Dry-run only unless CONFIRM_WRITE is checked (this audit does not write by default).
 *
 * INPUT
 * - filterAssetId (optional) — limit to one asset
 *
 * OUTPUTS
 * - statusOut, actionOut, errorOut, debugStep, findingsOut
 */

// @ts-nocheck

const CONFIG = {
  tables: {
    submissionAssets: "Submission Assets",
    videoFeedback: "Video Feedback",
    homeworkCompletions: "Homework Completions",
    xpEvents: "XP Events",
  },
  assetFields: {
    decision: "Asset Reuse Decision",
    resolutionApplied: "Duplicate Resolution Applied?",
    lastApplied: "Duplicate Resolution Last Applied Decision",
    videoFeedback: "Video Feedback",
    homeworkCompletions: "Homework Completions",
    uploadDestination: "Upload Destination",
  },
};

function cleanString(v) {
  return String(v ?? "").trim();
}

function getSelectName(v) {
  if (!v) return "";
  if (typeof v === "string") return cleanString(v);
  if (v.name) return cleanString(v.name);
  return "";
}

function firstLink(v) {
  if (!Array.isArray(v) || !v.length) return "";
  return cleanString(v[0]?.id || v[0]);
}

function setOutputSafe(k, v) {
  try {
    output.set(k, v ?? "");
  } catch (_e) {}
}

async function main() {
  setOutputSafe("debugStep", "start");
  setOutputSafe("statusOut", "success");
  setOutputSafe("actionOut", "audited");
  setOutputSafe("errorOut", "");

  const inputConfig = input.config();
  const filterAssetId = cleanString(inputConfig.filterAssetId);

  const assetsTable = base.getTable(CONFIG.tables.submissionAssets);
  const query = await assetsTable.selectRecordsAsync({
    fields: Object.values(CONFIG.assetFields),
  });

  const findings = [];

  for (const rec of query.records) {
    if (filterAssetId && rec.id !== filterAssetId) continue;
    const decision = getSelectName(rec.getCellValue(CONFIG.assetFields.decision));
    if (!decision) continue;

    const vf = firstLink(rec.getCellValue(CONFIG.assetFields.videoFeedback));
    const hw = firstLink(rec.getCellValue(CONFIG.assetFields.homeworkCompletions));
    const route = vf ? "video" : hw ? "homework" : "none";
    const activityId = vf || hw || "";
    const sourceKey = vf
      ? `VIDEO_SUBMISSION|${vf}`
      : hw
        ? `HOMEWORK_XP|${hw}`
        : "";

    let suppressOk = null;
    let xpOk = null;
    let xpActive = null;

    if (decision === "Confirmed Duplicate" && activityId) {
      if (route === "video") {
        const vfTable = base.getTable(CONFIG.tables.videoFeedback);
        const vfRec = (await vfTable.selectRecordsAsync({ recordIds: [activityId] })).getRecord(activityId);
        suppressOk = vfRec ? vfRec.getCellValue("Do Not Award XP?") === true : false;
      } else {
        const hwTable = base.getTable(CONFIG.tables.homeworkCompletions);
        const hwRec = (await hwTable.selectRecordsAsync({ recordIds: [activityId] })).getRecord(activityId);
        suppressOk = hwRec ? getSelectName(hwRec.getCellValue("Award Status")) === "Do Not Award" : false;
      }

      if (sourceKey) {
        const xpTable = base.getTable(CONFIG.tables.xpEvents);
        const xpQuery = await xpTable.selectRecordsAsync({
          fields: ["Source Key", "Active?", "Duplicate Status"],
        });
        const xp = xpQuery.records.find((r) => cleanString(r.getCellValue("Source Key")) === sourceKey);
        if (!xp) {
          xpOk = true;
          xpActive = false;
        } else {
          xpActive = xp.getCellValue("Active?") === true;
          xpOk = !xpActive;
        }
      }
    }

    findings.push({
      assetId: rec.id,
      decision,
      route,
      activityId,
      resolutionApplied: rec.getCellValue(CONFIG.assetFields.resolutionApplied) === true,
      lastApplied: cleanString(rec.getCellValue(CONFIG.assetFields.lastApplied)),
      suppressOk,
      xpOk,
      xpActive,
    });
  }

  setOutputSafe("findingsOut", JSON.stringify(findings));
  setOutputSafe("debugStep", "done");
  console.log(JSON.stringify({ audit: "c023-stage5", count: findings.length, findings }));
}

await main();
