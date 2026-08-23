#!/usr/bin/env node
/**
 * Authorized repair for enrollment rec93mAfo5jKqP3g5 (Perfect Week Testing).
 * Implements 010 / 059 contracts via REST API — idempotent, scoped records only.
 *
 * Usage:
 *   node tools/testing/repair_perfect_week_testing.mjs           # dry-run
 *   node tools/testing/repair_perfect_week_testing.mjs --live    # write
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ENR = "rec93mAfo5jKqP3g5";
const LIVE = process.argv.includes("--live");
const OUT = "/opt/cursor/artifacts/repair-perfect-week-testing-results.json";

const SUBMISSION_IDS = [
  "rec4AeA9WXY2q4alp",
  "recVFz2knPNMhWQb3",
  "reciMAjPxI0ip8EeM",
  "rectqcHMxn2dO1ino",
  "recPj3RCFcF4dIlkL",
];
const UNLOCK_IDS = [
  "rec6pqSjHUQnNuTwA",
  "rec8fxijfrFpDb735",
  "recAbvJNqnvPHoiHc",
  "recb9R8gxACeSumwF",
  "recbU9E1wVyIXQJOE",
];
const HOMEWORK_ID = "recbPYfZlM7aC9HWg";
const VIDEO_IDS = ["recOLCnsllrQeHV2U", "recQxyQ42GHEdgTUD", "reczj08p8suk5sOpJ"];

function loadEnv() {
  for (const p of [
    resolve(ROOT, "web/.env.local"),
    resolve(ROOT, ".env.local"),
    resolve(ROOT, ".env"),
  ]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}

loadEnv();
const TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE = process.env.AIRTABLE_BASE_ID || "appn84sqPw03zEbTT";
if (!TOKEN) {
  console.error("Missing AIRTABLE_API_TOKEN");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function api(method, path, body) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = JSON.parse(text);
  if (!res.ok) throw new Error(`${method} ${path}: ${text.slice(0, 800)}`);
  return data;
}

async function get(table, id) {
  return api("GET", `${encodeURIComponent(table)}/${id}`);
}

async function listByFormula(table, formula, fields = []) {
  const params = new URLSearchParams({
    filterByFormula: formula,
    pageSize: "100",
  });
  fields.forEach((f) => params.append("fields[]", f));
  const data = await api("GET", `${encodeURIComponent(table)}?${params}`);
  return data.records || [];
}

function first(arr) {
  return Array.isArray(arr) ? arr[0] : undefined;
}

function formatMilestoneReasonPublic(percent, tier, shotCount) {
  let reason = "Shot milestone reached";
  if (percent && tier) {
    reason = `Shot milestone reached: ${percent}% ${tier} milestone`;
  } else if (percent) {
    reason = `Shot milestone reached: ${percent}% milestone`;
  }
  if (shotCount) {
    const n = Number(shotCount);
    if (Number.isFinite(n) && n > 0) {
      reason += ` — ${n.toLocaleString("en-US")} shots`;
    }
  }
  if (!reason.endsWith(".")) reason += ".";
  return reason;
}

const results = [];

function logResult(row) {
  results.push(row);
  console.log(JSON.stringify(row));
}

async function findXpBySourceKey(sourceKey) {
  const rows = await listByFormula("XP Events", `{Source Key}='${sourceKey}'`, ["Source Key", "Active?"]);
  return rows;
}

async function repairSubmission(submissionId, shootingBaseXp) {
  const prevXpId = null;
  const sub = await get("Submissions", submissionId);
  const f = sub.fields || {};
  const enrollmentId = first(f.Enrollment);
  const weekId = first(f.Week);
  const wasId = first(f["Weekly Athlete Summary"]);
  const activityDate = f["Activity Date"];
  const sourceKey = `SUBMISSION_XP|${submissionId}`;

  if (enrollmentId !== ENR) {
    return logResult({
      recordId: submissionId,
      recordType: "submission",
      activityDate,
      previousXpEventId: first(f["XP Events"]) || null,
      finalXpEventId: null,
      xpBucket: null,
      xpAmount: null,
      active: null,
      duplicateStatus: null,
      sourceKey,
      action: "skipped",
      skipReason: `Enrollment mismatch: ${enrollmentId}`,
    });
  }

  const existing = await findXpBySourceKey(sourceKey);
  if (existing.length > 1) {
    return logResult({
      recordId: submissionId,
      recordType: "submission",
      activityDate,
      previousXpEventId: first(f["XP Events"]) || null,
      finalXpEventId: null,
      xpBucket: "Shooting Base",
      xpAmount: shootingBaseXp,
      active: null,
      duplicateStatus: null,
      sourceKey,
      action: "skipped",
      skipReason: `Ambiguous existing XP: ${existing.map((r) => r.id).join(",")}`,
    });
  }

  let xpEventId = existing[0]?.id || null;
  let action = "skipped";

  if (!xpEventId && LIVE) {
    const createBody = {
      records: [
        {
          fields: {
            Enrollment: [enrollmentId],
            Submission: [submissionId],
            Week: weekId ? [weekId] : undefined,
            "Weekly Athlete Summary": wasId ? [wasId] : undefined,
            "XP Source": "Submission Base",
            "XP Bucket": "Shooting Base",
            "XP Points": shootingBaseXp,
            "Active?": true,
            "Source Key": sourceKey,
            "XP Activity Date": activityDate,
            "XP Activity Date Source": "Submission Activity Date",
            "XP Reason Public": "Shooting submission completed.",
            "XP Reason Debug": `Repair script (010 contract). Submission: ${submissionId}. Source Key: ${sourceKey}. XP Points: ${shootingBaseXp}.`,
            Processed: true,
            "Award Mode": "Automatic",
          },
        },
      ],
    };
    const created = await api("POST", encodeURIComponent("XP Events"), createBody);
    xpEventId = created.records[0].id;
    action = "created";
  } else if (xpEventId) {
    action = "reused";
    if (LIVE && existing[0].fields["Active?"] !== true) {
      await api("PATCH", `${encodeURIComponent("XP Events")}/${xpEventId}`, {
        fields: { "Active?": true },
      });
      action = "updated";
    }
  } else {
    action = "would_create";
  }

  if (LIVE && xpEventId) {
    const linkedXp = Array.isArray(f["XP Events"]) ? f["XP Events"] : [];
    const merged = [...new Set([...linkedXp, xpEventId])];
    await api("PATCH", `${encodeURIComponent("Submissions")}/${submissionId}`, {
      fields: {
        "XP Events": merged,
        "XP Award Status": "Awarded",
      },
    });
    await api("PATCH", `${encodeURIComponent("Enrollments")}/${ENR}`, {
      fields: { "Run Shot Milestone Check?": true },
    });
  }

  const xpRow = xpEventId ? await get("XP Events", xpEventId) : null;
  logResult({
    recordId: submissionId,
    recordType: "submission",
    activityDate,
    previousXpEventId: first(f["XP Events"]) || null,
    finalXpEventId: xpEventId,
    xpBucket: "Shooting Base",
    xpAmount: shootingBaseXp,
    active: xpRow?.fields?.["Active?"] ?? null,
    duplicateStatus: xpRow?.fields?.["Duplicate Status"] ?? null,
    sourceKey,
    action: LIVE ? action : action === "would_create" ? "dry_run_create" : action,
    skipReason: null,
  });
}

async function repairMilestoneUnlock(unlockId) {
  const unlock = await get("Athlete Achievement Unlocks", unlockId);
  const uf = unlock.fields || {};
  const enrollmentId = first(uf.Enrollment);
  const weekId = first(uf.Week);
  const wasId = first(uf["Weekly Athlete Summary"]);
  const shotMilestoneId = first(uf["Shot Milestone"]);
  const sourceKey = uf["Milestone Source Key"];
  const activityDate = uf["Milestone Activity Date"];
  const awardStatus = uf["XP Award Status"];

  if (enrollmentId !== ENR) {
    return logResult({
      recordId: unlockId,
      recordType: "milestone_unlock",
      activityDate,
      previousXpEventId: first(uf["XP Events"]) || null,
      finalXpEventId: null,
      xpBucket: null,
      xpAmount: null,
      active: null,
      duplicateStatus: null,
      sourceKey,
      action: "skipped",
      skipReason: `Enrollment mismatch: ${enrollmentId}`,
    });
  }

  if (awardStatus !== "Pending") {
    return logResult({
      recordId: unlockId,
      recordType: "milestone_unlock",
      activityDate,
      previousXpEventId: first(uf["XP Events"]) || null,
      finalXpEventId: first(uf["XP Events"]) || null,
      xpBucket: "Shot Milestone",
      xpAmount: uf["XP Awarded"] ?? null,
      active: null,
      duplicateStatus: null,
      sourceKey,
      action: "skipped",
      skipReason: `XP Award Status is ${awardStatus}, not Pending`,
    });
  }

  if (!shotMilestoneId || !sourceKey || !activityDate) {
    return logResult({
      recordId: unlockId,
      recordType: "milestone_unlock",
      activityDate,
      previousXpEventId: first(uf["XP Events"]) || null,
      finalXpEventId: null,
      xpBucket: null,
      xpAmount: null,
      active: null,
      duplicateStatus: null,
      sourceKey,
      action: "skipped",
      skipReason: "Missing Shot Milestone, Source Key, or Milestone Activity Date",
    });
  }

  const milestone = await get("Shot Milestones", shotMilestoneId);
  const mf = milestone.fields || {};
  const xpAmount = mf["Points Awarded"] || 0;
  const milestoneLabel = mf["Milestone Label"] || "";
  const milestonePercent = mf["Milestone Percent"];
  const milestoneTier = mf["Milestone Tier"];
  const milestoneShotCount = mf["Milestone Shot Count"];

  if (!xpAmount || xpAmount <= 0) {
    return logResult({
      recordId: unlockId,
      recordType: "milestone_unlock",
      activityDate,
      previousXpEventId: first(uf["XP Events"]) || null,
      finalXpEventId: null,
      xpBucket: "Shot Milestone",
      xpAmount: null,
      active: null,
      duplicateStatus: null,
      sourceKey,
      action: "skipped",
      skipReason: "Shot Milestone Points Awarded is missing or zero",
    });
  }

  const existing = await findXpBySourceKey(sourceKey);
  if (existing.length > 1) {
    return logResult({
      recordId: unlockId,
      recordType: "milestone_unlock",
      activityDate,
      previousXpEventId: first(uf["XP Events"]) || null,
      finalXpEventId: null,
      xpBucket: "Shot Milestone",
      xpAmount: xpAmount,
      active: null,
      duplicateStatus: null,
      sourceKey,
      action: "skipped",
      skipReason: `Ambiguous XP: ${existing.map((r) => r.id).join(",")}`,
    });
  }

  let xpEventId = existing[0]?.id || first(uf["XP Events"]) || null;
  let action = "skipped";

  const reasonPublic = formatMilestoneReasonPublic(
    milestonePercent,
    milestoneTier,
    milestoneShotCount,
  );
  const reasonDebug = [
    "Created by repair script (059 v3.6 contract).",
    "Type: Shot Milestone",
    `Enrollment ID: ${enrollmentId}`,
    `Shot Milestone ID: ${shotMilestoneId}`,
    `Milestone Label: ${milestoneLabel}`,
    `XP Points: ${xpAmount}`,
    `Source Key: ${sourceKey}`,
    `XP Activity Date: ${activityDate}`,
  ].join("\n");

  if (!xpEventId && LIVE) {
    const recheck = await findXpBySourceKey(sourceKey);
    if (recheck.length > 0) {
      xpEventId = recheck[0].id;
      action = "reused";
    } else {
      const created = await api("POST", encodeURIComponent("XP Events"), {
        records: [
          {
            fields: {
              Enrollment: [enrollmentId],
              Week: weekId ? [weekId] : undefined,
              "Weekly Athlete Summary": wasId ? [wasId] : undefined,
              "Achievement Unlock": [unlockId],
              "Shot Milestones": [shotMilestoneId],
              "XP Source": "Shot Milestone",
              "XP Bucket": "Shot Milestone",
              "XP Points": xpAmount,
              "Active?": true,
              "Source Key": sourceKey,
              "XP Activity Date": activityDate,
              "XP Activity Date Source": "Shot Milestone Activity Date",
              "XP Reason Public": reasonPublic,
              "XP Reason Debug": reasonDebug,
              Processed: true,
              "Award Mode": "Automatic",
              "Awarded At": new Date().toISOString(),
            },
          },
        ],
      });
      xpEventId = created.records[0].id;
      action = "created";
    }
  } else if (xpEventId) {
    action = "reused";
    if (LIVE && existing[0] && existing[0].fields["Active?"] !== true) {
      await api("PATCH", `${encodeURIComponent("XP Events")}/${xpEventId}`, {
        fields: { "Active?": true },
      });
      action = "updated";
    }
  } else {
    action = "dry_run_create";
  }

  if (LIVE && xpEventId) {
    await api("PATCH", `${encodeURIComponent("Athlete Achievement Unlocks")}/${unlockId}`, {
      fields: {
        "XP Events": [xpEventId],
        "XP Award Status": "Awarded",
        "XP Awarded": xpAmount,
      },
    });
  }

  const xpRow = xpEventId ? await get("XP Events", xpEventId) : null;
  logResult({
    recordId: unlockId,
    recordType: "milestone_unlock",
    activityDate,
    previousXpEventId: first(uf["XP Events"]) || null,
    finalXpEventId: xpEventId,
    xpBucket: "Shot Milestone",
    xpAmount: xpAmount,
    active: xpRow?.fields?.["Active?"] ?? null,
    duplicateStatus: xpRow?.fields?.["Duplicate Status"] ?? null,
    sourceKey,
    action: LIVE ? action : action,
    skipReason: null,
  });
}

async function inspectHomework() {
  const hw = await get("Homework Completions", HOMEWORK_ID);
  const f = hw.fields || {};
  const enrollmentId = first(f.Enrollment);
  const signature = f["Homework XP Current Signature"] || "";
  const totalXp = f["Total Homework XP Awarded"] || 0;
  const awardStatus = f["Award Status"] || "Pending";
  const reviewCalculated = f["Review Status - Calculated"] || "";
  const reconcileNeeded = f["Homework XP Reconciliation Needed?"];

  const sat = signature.includes("SAT=1");
  const review = signature.includes("REVIEW=1");
  const feedback = signature.includes("FEEDBACK=1");

  let skipReason = null;
  if (enrollmentId !== ENR) skipReason = `Enrollment mismatch: ${enrollmentId}`;
  else if (!sat) skipReason = "Not satisfactory (SAT=0 in Homework XP Current Signature)";
  else if (!review) skipReason = "Review not complete (REVIEW=0)";
  else if (!feedback) skipReason = "No coach feedback (FEEDBACK=0)";
  else if (!(totalXp > 0)) skipReason = `Total Homework XP Awarded is ${totalXp}`;
  else if (reviewCalculated === "Not Reviewed")
    skipReason = "Review Status - Calculated is Not Reviewed";

  logResult({
    recordId: HOMEWORK_ID,
    recordType: "homework",
    activityDate: f["Submission Date"] || null,
    previousXpEventId: first(f["XP Events"]) || null,
    finalXpEventId: first(f["XP Events"]) || null,
    xpBucket: skipReason ? null : "Homework Completion",
    xpAmount: totalXp,
    active: null,
    duplicateStatus: null,
    sourceKey: `HOMEWORK_XP|${HOMEWORK_ID}`,
    action: skipReason ? "skipped" : "would_award",
    skipReason,
    notes: { awardStatus, reconcileNeeded, reviewCalculated },
  });
}

async function inspectVideo(videoId) {
  const v = await get("Video Feedback", videoId);
  const f = v.fields || {};
  const enrollmentId = first(f.Enrollment);
  const totalXp = f["Total Video XP Awarded"] || 0;
  const feedbackPosted = f["Feedback Posted?"] === true;
  const ready = f["Ready for XP Automation?"] === true;
  const doNotAward = f["Do Not Award XP?"] === true;
  const active = f["Active?"] === true;

  let skipReason = null;
  if (enrollmentId !== ENR) skipReason = `Enrollment mismatch: ${enrollmentId}`;
  else if (!active) skipReason = "Video Feedback Active? is false";
  else if (!feedbackPosted) skipReason = "Feedback Posted? is not checked";
  else if (doNotAward) skipReason = "Do Not Award XP? is checked";
  else if (ready === false) skipReason = "Ready for XP Automation? is not checked";
  else if (!(totalXp > 0)) skipReason = `Total Video XP Awarded is ${totalXp}`;

  logResult({
    recordId: videoId,
    recordType: "video_feedback",
    activityDate: f["XP Activity Date"] || f["Feedback Posted At"] || null,
    previousXpEventId: first(f["XP Events"]) || null,
    finalXpEventId: first(f["XP Events"]) || null,
    xpBucket: skipReason ? null : "Video Feedback",
    xpAmount: totalXp,
    active: null,
    duplicateStatus: null,
    sourceKey: `VIDEO_SUBMISSION|${videoId}`,
    action: skipReason ? "skipped" : "would_award",
    skipReason,
  });
}

async function main() {
  const rules = await listByFormula(
    "XP Reward Rules",
    "AND({Rule Key}='SHOOTING_BASE',{Active?}=1)",
    ["XP Amount"],
  );
  if (rules.length !== 1) throw new Error(`Expected 1 SHOOTING_BASE rule, got ${rules.length}`);
  const shootingBaseXp = rules[0].fields["XP Amount"];
  if (!shootingBaseXp || shootingBaseXp <= 0) throw new Error("Invalid SHOOTING_BASE amount");

  console.log(`Mode: ${LIVE ? "LIVE" : "DRY_RUN"} | Enrollment: ${ENR}`);

  for (const id of SUBMISSION_IDS) await repairSubmission(id, shootingBaseXp);
  for (const id of UNLOCK_IDS) await repairMilestoneUnlock(id);
  await inspectHomework();
  for (const id of VIDEO_IDS) await inspectVideo(id);

  const summary = {
    ranAt: new Date().toISOString(),
    live: LIVE,
    enrollmentId: ENR,
    results,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${OUT}`);
  console.log(
    JSON.stringify({
      created: results.filter((r) => r.action === "created").length,
      reused: results.filter((r) => r.action === "reused").length,
      skipped: results.filter((r) => r.action === "skipped").length,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
