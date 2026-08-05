#!/usr/bin/env node
/**
 * Backfill Program Homework Assignments for Perfect Week CASE-01 week +
 * create satisfactory Homework Completions linked to junction records.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
function loadEnv() {
  for (const p of [resolve(ROOT, "web/.env.local"), resolve(ROOT, ".env.local"), resolve(ROOT, ".env")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE = "appn84sqPw03zEbTT";
const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

const CTX = {
  enrollment: "recCyFEPeATOVNlr9",
  week: "reci5GdxEC57vfoS3",
  was: "recKebuZ79QFTwivA",
  programInstance: "rec5mEM0YPqPqq0hZ",
  gradeBand: "reclWDQZzKbVBtdhG",
  hw1Library: "rechVLOeyEVIqmy2v", // Shot Tracker Usage
  hw2Library: "rec6WmXjpLtIWDERo", // Website Exploration
  phaTable: "Program Homework Assignments",
};

async function api(method, path, body) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${path}`, {
    method,
    headers: method === "GET" ? { Authorization: `Bearer ${TOKEN}` } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${text.slice(0, 500)}`);
  return json;
}

async function listPha(formula) {
  const params = new URLSearchParams({ pageSize: "50" });
  if (formula) params.set("filterByFormula", formula);
  return (await api("GET", `${encodeURIComponent(CTX.phaTable)}?${params}`)).records || [];
}

const evidence = { created: {}, tests: {} };

// --- Test 4 baseline: capture curriculum Week links before any edit ---
const cur1 = await api("GET", `${encodeURIComponent("FBC Curriculum - SYNC")}/${CTX.hw1Library}`);
const cur2 = await api("GET", `${encodeURIComponent("FBC Curriculum - SYNC")}/${CTX.hw2Library}`);
evidence.legacyWeekLinksBefore = {
  [CTX.hw1Library]: cur1.fields.Week,
  [CTX.hw2Library]: cur2.fields.Week,
};

async function ensurePha({ slot, libraryId, label }) {
  const existing = await listPha(
    `AND(FIND("${CTX.week}", ARRAYJOIN({Week}&"")), {Homework Slot}="${slot}", FIND("${libraryId}", ARRAYJOIN({Homework Assignment}&"")))`
  );
  if (existing.length) {
    const id = existing[0].id;
    await api("PATCH", `${encodeURIComponent(CTX.phaTable)}/${id}`, {
      fields: {
        "Program Homework Assignment": label,
        "Program Instance": [CTX.programInstance],
        "Grade Band": [CTX.gradeBand],
        "Active?": true,
      },
    });
    return { id, created: false, scheduleKey: existing[0].fields["Schedule Key"] };
  }

  const created = await api("POST", encodeURIComponent(CTX.phaTable), {
    fields: {
      "Program Homework Assignment": label,
      "Homework Assignment": [libraryId],
      "Program Instance": [CTX.programInstance],
      Week: [CTX.week],
      "Grade Band": [CTX.gradeBand],
      "Homework Slot": slot,
      "Active?": true,
    },
  });
  return {
    id: created.id,
    created: true,
    scheduleKey: created.fields["Schedule Key"],
  };
}

const pha1 = await ensurePha({
  slot: "HW1",
  libraryId: CTX.hw1Library,
  label: "HW1 | Shot Tracker Usage | PWTEST CASE-01",
});
const pha2 = await ensurePha({
  slot: "HW2",
  libraryId: CTX.hw2Library,
  label: "HW2 | Website Exploration | PWTEST CASE-01",
});
evidence.created.phaHw1 = pha1;
evidence.created.phaHw2 = pha2;

// Refresh Schedule Keys
await new Promise((r) => setTimeout(r, 1500));
const pha1Full = await api("GET", `${encodeURIComponent(CTX.phaTable)}/${pha1.id}`);
const pha2Full = await api("GET", `${encodeURIComponent(CTX.phaTable)}/${pha2.id}`);
evidence.created.phaHw1.scheduleKey = pha1Full.fields["Schedule Key"];
evidence.created.phaHw2.scheduleKey = pha2Full.fields["Schedule Key"];
evidence.created.phaHw1.display = pha1Full.fields["Program Homework Assignment Display"];
evidence.created.phaHw2.display = pha2Full.fields["Program Homework Assignment Display"];

// Test 2 — dedupe: create duplicate attempt and compare Schedule Key
const dupAttempt = await api("POST", encodeURIComponent(CTX.phaTable), {
  fields: {
    "Program Homework Assignment": "DUPLICATE AT HW1 — delete after key check",
    "Homework Assignment": [CTX.hw1Library],
    "Program Instance": [CTX.programInstance],
    Week: [CTX.week],
    "Grade Band": [CTX.gradeBand],
    "Homework Slot": "HW1",
    "Active?": false,
  },
});
await new Promise((r) => setTimeout(r, 1500));
const dupFull = await api("GET", `${encodeURIComponent(CTX.phaTable)}/${dupAttempt.id}`);
evidence.tests.dedupe = {
  originalKey: evidence.created.phaHw1.scheduleKey,
  duplicateId: dupAttempt.id,
  duplicateKey: dupFull.fields["Schedule Key"],
  keysMatch: evidence.created.phaHw1.scheduleKey === dupFull.fields["Schedule Key"],
};
// Soft-delete duplicate by leaving Active?=false; delete record to keep lean
await api("DELETE", `${encodeURIComponent(CTX.phaTable)}/${dupAttempt.id}`);
evidence.tests.dedupe.duplicateDeleted = true;

// Test 1 reuse — second Program Instance schedule of same library (use same PI week different? need another week)
// Create a PHA for same library on a different Week if available, else note blocked.
const weeks = await api(
  "GET",
  `${encodeURIComponent("Weeks")}?pageSize=3&fields%5B%5D=${encodeURIComponent("Week Name")}`
);
const otherWeek = (weeks.records || []).find((r) => r.id !== CTX.week);
if (otherWeek) {
  const reuse = await api("POST", encodeURIComponent(CTX.phaTable), {
    fields: {
      "Program Homework Assignment": `REUSE TEST | ${CTX.hw1Library} | ${otherWeek.id}`,
      "Homework Assignment": [CTX.hw1Library],
      "Program Instance": [CTX.programInstance],
      Week: [otherWeek.id],
      "Grade Band": [CTX.gradeBand],
      "Homework Slot": "HW1",
      "Active?": false,
    },
  });
  evidence.tests.reuse = {
    pass: true,
    libraryId: CTX.hw1Library,
    phaA: pha1.id,
    phaB: reuse.id,
    weekA: CTX.week,
    weekB: otherWeek.id,
    note: "Same library scheduled on two Weeks via two junction records; library Week field untouched.",
  };
  await api("DELETE", `${encodeURIComponent(CTX.phaTable)}/${reuse.id}`);
  evidence.tests.reuse.cleanupDeleted = reuse.id;
} else {
  evidence.tests.reuse = { pass: false, reason: "no alternate week found" };
}

// Assign WAS.Homework from PHA library IDs (033 behavior)
await api("PATCH", `${encodeURIComponent("Weekly Athlete Summary")}/${CTX.was}`, {
  fields: {
    Homework: [CTX.hw1Library, CTX.hw2Library],
  },
});

async function ensureHc({ slot, libraryId, phaId }) {
  const params = new URLSearchParams({
    pageSize: "20",
    filterByFormula: `AND(FIND("${CTX.enrollment}", ARRAYJOIN({Enrollment}&"")), FIND("${CTX.week}", ARRAYJOIN({Week}&"")), FIND("${libraryId}", ARRAYJOIN({Homework}&"")), OR({Asset Slot}="${slot}", {Item Slot}="${slot}"))`,
  });
  const existing = (await api("GET", `${encodeURIComponent("Homework Completions")}?${params}`))
    .records || [];
  const fields = {
    Enrollment: [CTX.enrollment],
    Week: [CTX.week],
    Homework: [libraryId],
    "Program Homework Assignment": [phaId],
    "Weekly Athlete Summary Link": [CTX.was],
    "Grade Band": [CTX.gradeBand],
    "Asset Slot": slot,
    "Item Slot": slot,
    "Satisfactory?": true,
    "Completion Status": "Satisfactory",
    "Review Complete": true,
  };
  if (existing.length) {
    const id = existing[0].id;
    await api("PATCH", `${encodeURIComponent("Homework Completions")}/${id}`, { fields });
    return { id, created: false };
  }
  const created = await api("POST", encodeURIComponent("Homework Completions"), { fields });
  return { id: created.id, created: true };
}

const hc1 = await ensureHc({ slot: "HW1", libraryId: CTX.hw1Library, phaId: pha1.id });
const hc2 = await ensureHc({ slot: "HW2", libraryId: CTX.hw2Library, phaId: pha2.id });
evidence.created.hcHw1 = hc1;
evidence.created.hcHw2 = hc2;

// Link HCs onto WAS Homework Completions Link (multi)
await api("PATCH", `${encodeURIComponent("Weekly Athlete Summary")}/${CTX.was}`, {
  fields: {
    "Homework Completions Link": [hc1.id, hc2.id],
  },
});

await new Promise((r) => setTimeout(r, 2000));

const was = await api("GET", `${encodeURIComponent("Weekly Athlete Summary")}/${CTX.was}`);
evidence.wasAfter = {
  homework: was.fields.Homework,
  homeworkAssignedCount: was.fields["Homework Assigned Count"],
  homeworkSatisfactoryCount: was.fields["Homework Satisfactory Count"],
  homeworkCompletionsLink: was.fields["Homework Completions Link"],
  pwHwAssigned: was.fields["Perfect Week Homework Assigned Count"],
  pwHwSatisfactory: was.fields["Perfect Week Homework Satisfactory Count"],
  pwHwMet: was.fields["Perfect Week Homework Requirement Met?"],
  automationStatus: was.fields["Perfect Week Automation Status"],
};

const cur1After = await api("GET", `${encodeURIComponent("FBC Curriculum - SYNC")}/${CTX.hw1Library}`);
const cur2After = await api("GET", `${encodeURIComponent("FBC Curriculum - SYNC")}/${CTX.hw2Library}`);
evidence.legacyWeekLinksAfter = {
  [CTX.hw1Library]: cur1After.fields.Week,
  [CTX.hw2Library]: cur2After.fields.Week,
};
evidence.tests.historicalSafety = {
  pass:
    JSON.stringify(evidence.legacyWeekLinksBefore) === JSON.stringify(evidence.legacyWeekLinksAfter),
};

evidence.tests.slotResolution = {
  pha1Slot: pha1Full.fields["Homework Slot"],
  pha2Slot: pha2Full.fields["Homework Slot"],
  pass:
    pha1Full.fields["Homework Slot"] === "HW1" && pha2Full.fields["Homework Slot"] === "HW2",
};

evidence.tests.completionLinkage = {
  hc1: (
    await api("GET", `${encodeURIComponent("Homework Completions")}/${hc1.id}`)
  ).fields,
  hc2: (
    await api("GET", `${encodeURIComponent("Homework Completions")}/${hc2.id}`)
  ).fields,
};

evidence.tests.perfectWeekHomeworkCounts = {
  assigned: evidence.wasAfter.homeworkAssignedCount,
  satisfactory: evidence.wasAfter.homeworkSatisfactoryCount,
  pass:
    evidence.wasAfter.homeworkAssignedCount === 2 &&
    evidence.wasAfter.homeworkSatisfactoryCount === 2,
  note: "Perfect Week Homework Requirement Met? is written by Automation 057 — do not run in this package.",
};

writeFileSync(
  resolve(ROOT, "docs/testing/homework-assignments/fixtures/_pha-backfill-proof.json"),
  JSON.stringify(evidence, null, 2)
);
console.log(JSON.stringify(evidence, null, 2));
