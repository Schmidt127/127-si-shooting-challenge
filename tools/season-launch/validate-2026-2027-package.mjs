#!/usr/bin/env node
/**
 * Offline validator for docs/challenge-year/generated/2026-2027 season package.
 * Does not call Airtable — validates repository artifacts only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateWeekPlan } from "../../lib/challenge-year/week-generator.js";
import { validateWeekPlan } from "../../lib/challenge-year/week-validator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const PKG = path.join(ROOT, "docs/challenge-year/generated/2026-2027");

function readJson(rel) {
  const p = path.join(PKG, rel);
  if (!fs.existsSync(p)) return { ok: false, error: `missing ${rel}` };
  try {
    return { ok: true, data: JSON.parse(fs.readFileSync(p, "utf8")) };
  } catch (e) {
    return { ok: false, error: `invalid JSON ${rel}: ${e.message}` };
  }
}

function fail(code, message, extra = {}) {
  return { severity: "FAIL", code, message, ...extra };
}
function warn(code, message, extra = {}) {
  return { severity: "WARN", code, message, ...extra };
}
function pass(code, message, extra = {}) {
  return { severity: "PASS", code, message, ...extra };
}

function checkRequiredFiles() {
  const required = [
    "season-manifest.json",
    "program-instance.json",
    "challenge-config.json",
    "weeks-prod-as-installed.json",
    "week-record-id-map.json",
    "xp-reward-rules-summary.json",
    "level-gate-rules-status.json",
    "zoom-config.json",
    "feature-switches.json",
    "fillout-field-mappings.json",
  ];
  const findings = [];
  for (const f of required) {
  const p = path.join(PKG, f);
    if (!fs.existsSync(p)) findings.push(fail("missing_file", `Required package file missing: ${f}`));
    else findings.push(pass("file_present", f));
  }
  return findings;
}

function checkManifest(manifest) {
  const findings = [];
  const ids = manifest?.recordIds || {};
  const requiredIds = ["programInstanceId", "configId", "schoolYear"];
  for (const k of requiredIds) {
    if (!ids[k]) findings.push(fail("manifest_missing_id", `season-manifest recordIds.${k} required`));
    else findings.push(pass("manifest_id", ids[k], { field: k }));
  }
  if (manifest?.schoolYear !== "2026-2027") {
    findings.push(fail("wrong_school_year", `Expected 2026-2027, got ${manifest?.schoolYear}`));
  }
  return findings;
}

function denverDateKeyFromIso(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

function checkProdWeeks(weeksJson) {
  const findings = [];
  const weeks = weeksJson?.weeks || [];
  if (!weeks.length) return [fail("no_weeks", "weeks-prod-as-installed.json has no weeks")];

  const byLabel = new Map();
  for (const w of weeks) {
    const start = denverDateKeyFromIso(w.startDateIso);
    const end = denverDateKeyFromIso(w.endDateIso);
    if (start && end && start > end) {
      findings.push(fail("week_start_after_end", `${w.weekName}: start ${start} > end ${end}`));
    }
    for (const other of weeks) {
      if (other.recordId === w.recordId) continue;
      const oStart = denverDateKeyFromIso(other.startDateIso);
      const oEnd = denverDateKeyFromIso(other.endDateIso);
      if (!start || !end || !oStart || !oEnd) continue;
      const overlap = start <= oEnd && oStart <= end;
      if (overlap) {
        findings.push(
          warn("week_overlap", `${w.weekName} (${w.recordId}) overlaps ${other.weekName} (${other.recordId})`, {
            a: { start, end },
            b: { start: oStart, end: oEnd },
          })
        );
      }
    }
    byLabel.set(w.weekName, w);
  }

  const expectedLabels = ["Early Bird", "Week 1", "Post-Challenge"];
  for (const label of expectedLabels) {
    if (![...byLabel.keys()].some((k) => k === label || k?.includes(label))) {
      findings.push(warn("missing_week_label", `PROD weeks missing expected label: ${label}`));
    }
  }

  const pwtest = weeks.find((w) => (w.weekKey || "").includes("PWTEST"));
  if (pwtest) {
    findings.push(
      warn("pwtest_overlap_risk", `PWTEST week ${pwtest.recordId} still present — deactivate before launch`, {
        overlapsEarlyBird: true,
      })
    );
  }

  return findings;
}

function checkCanonicalPlan(manifest) {
  const target = manifest?.canonicalWeekPlan || {};
  const plan = generateWeekPlan({
    challengeYear: "2026-2027",
    weekZeroStart: target.weekZeroStart || "2027-04-25",
    regularWeeks: target.regularWeeks || 9,
    challengeEndDate: target.challengeEndDate || "2027-06-30",
    configRecordId: manifest?.recordIds?.configId,
  });
  const findings = [];
  if (!plan.ok) {
    findings.push(fail("canonical_plan_invalid", plan.error?.message || "generateWeekPlan failed"));
    return findings;
  }
  findings.push(pass("canonical_plan_valid", `${plan.weeks.length} weeks generated`));

  const prod = readJson("weeks-prod-as-installed.json");
  if (!prod.ok) return findings;

  const prodRegular = (prod.data.weeks || []).filter((w) => /^Week \d+/.test(w.weekName));
  const canonRegular = plan.weeks.filter((w) => w.weekType === "regular");
  if (prodRegular.length !== canonRegular.length) {
    findings.push(
      warn("regular_week_count_mismatch", `PROD has ${prodRegular.length} numbered weeks; canonical target has ${canonRegular.length}`, {
        recommendation: "Mike: align Challenge Week Count on Config + PROD Week rows",
      })
    );
  }
  return findings;
}

function checkXpRules(xp) {
  const findings = [];
  const rules = xp?.rules || [];
  const video = rules.find((r) => r.ruleKey === "VIDEO_SUBMISSION");
  if (!video) findings.push(fail("missing_video_rule", "VIDEO_SUBMISSION rule missing"));
  else if (video.xpAmount !== 25) {
    findings.push(warn("video_xp_value", `VIDEO_SUBMISSION is ${video.xpAmount} XP (snapshot expects 25; SC-022 notes 1-vs-25 conflict elsewhere)`));
  } else findings.push(pass("video_xp_25", "VIDEO_SUBMISSION = 25 XP"));

  const dupKeys = new Set();
  for (const r of rules) {
    if (!r.ruleKey) findings.push(fail("rule_missing_key", `Rule ${r.id} missing ruleKey`));
    else if (dupKeys.has(r.ruleKey)) findings.push(fail("duplicate_rule_key", r.ruleKey));
    else dupKeys.add(r.ruleKey);
  }
  return findings;
}

function checkLevelGates(gates) {
  const findings = [];
  const rows = gates?.ruleSets || {};
  const y2027 = rows["2026-2027"];
  if (!y2027 || !y2027.count) {
    findings.push(
      warn("level_gates_2026_2027_missing", "No Level Gate Rules with School Year / Rule Set 2026-2027 in package — PROD may still use 2025-2026 gates via 043 global Rule Key", {
        decisionRequired: "Mike must approve 2026-2027 gate numbers before load",
      })
    );
  } else {
    findings.push(pass("level_gates_present", `${y2027.count} gates for 2026-2027`));
  }
  return findings;
}

function checkZoomConfig(zoom, config) {
  const findings = [];
  const sparse = zoom?.prodSnapshotNote?.includes("sparse");
  if (sparse) {
    findings.push(
      warn("zoom_config_sparse", "2026-2027 Config lacks full Zoom/recording fields populated on 2025-2026 row — copy from prior year or set explicitly before recording season", {
        configId: config?.recordId,
      })
    );
  }
  if (zoom?.recordingApprovalEmailEnabled === false) {
    findings.push(warn("zoom_approval_email_off", "Recording Approval Email Enabled = No on 2026-2027 Config snapshot"));
  }
  return findings;
}

function summarize(findings) {
  const failN = findings.filter((f) => f.severity === "FAIL").length;
  const warnN = findings.filter((f) => f.severity === "WARN").length;
  const passN = findings.filter((f) => f.severity === "PASS").length;
  let overall = "PASS";
  if (failN) overall = "FAIL";
  else if (warnN) overall = "PASS WITH WARNINGS";
  return { overall, failN, warnN, passN, findings };
}

function main() {
  const all = [];
  all.push(...checkRequiredFiles());

  const manifestR = readJson("season-manifest.json");
  if (manifestR.ok) all.push(...checkManifest(manifestR.data));

  const weeksR = readJson("weeks-prod-as-installed.json");
  if (weeksR.ok) all.push(...checkProdWeeks(weeksR.data));

  if (manifestR.ok) all.push(...checkCanonicalPlan(manifestR.data));

  const xpR = readJson("xp-reward-rules-summary.json");
  if (xpR.ok) all.push(...checkXpRules(xpR.data));

  const gatesR = readJson("level-gate-rules-status.json");
  if (gatesR.ok) all.push(...checkLevelGates(gatesR.data));

  const zoomR = readJson("zoom-config.json");
  const configR = readJson("challenge-config.json");
  if (zoomR.ok) all.push(...checkZoomConfig(zoomR.data, configR.ok ? configR.data : {}));

  const report = summarize(all);
  const outPath = path.join(PKG, "validation-report.json");
  const payload = {
    validatedAt: new Date().toISOString(),
    packagePath: "docs/challenge-year/generated/2026-2027",
    ...report,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify({ overall: report.overall, failN: report.failN, warnN: report.warnN, passN: report.passN, outPath }, null, 2));
  process.exit(report.overall === "FAIL" ? 1 : 0);
}

main();
