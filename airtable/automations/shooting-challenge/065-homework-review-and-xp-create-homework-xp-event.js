/* GitHub source of truth — omit this line only when pasting into Airtable. */
/************************************************************************************************
 * 065 - Homework Review and XP - Create or Reconcile Homework XP Event
 * Version: v10.1 | Date Written: 2026-06-06 | Last Updated: 2026-08-12
 *
 * One Homework Completion = one HOMEWORK_XP|<Homework Completion ID> XP Event.
 * Creates, replays, repairs, deactivates, or reactivates that exact canonical row.
 * Validates PHA-first identity when Program Homework Assignment exists.
 * Requires exactly one canonical Weekly Athlete Summary before any positive award or reactivation.
 * Ineligible corrections deactivate an owned event without requiring a Weekly Athlete Summary.
 *
 * TRIGGER: Homework XP Reconciliation Needed? = 1. The formula compares the current
 * local/linked eligibility signature with Last Homework XP Reconciled Signature.
 * INPUT: recordId. OUTPUTS: statusOut, actionOut, errorOut, debugStep, xpEventIdOut,
 * sourceKeyOut, weeklySummaryIdOut, xpEventDeactivatedOut, homeworkWritebackWarningOut.
 ************************************************************************************************/
// @ts-nocheck
const SOURCE_KEY_CONTRACT = { sourceKeyPrefix: "HOMEWORK_XP|" };
const SCRIPT = {
  scriptName:
    "065 - Homework Review and XP - Create or Reconcile Homework XP Event",
  version: "v10.1",
};
const C = {
  t: {
    hc: "Homework Completions",
    xp: "XP Events",
    was: "Weekly Athlete Summary",
    pha: "Program Homework Assignments",
    enr: "Enrollments",
  },
  h: {
    enr: "Enrollment",
    hw: "Homework",
    week: "Week",
    was: "Weekly Athlete Summary Link",
    subs: "Submissions - Linked",
    pha: "Program Homework Assignment",
    slot: "Item Slot",
    sat: "Satisfactory?",
    review: "Review Complete",
    feedback: "Coach Feedback",
    total: "Total Homework XP Awarded",
    award: "Award Status",
    events: "XP Events",
    key: "Homework Completion Key",
    error: "Automation Error",
    currentSignature: "Homework XP Current Signature",
    lastSignature: "Last Homework XP Reconciled Signature",
    reconcileNeeded: "Homework XP Reconciliation Needed?",
  },
  p: {
    active: "Active?",
    hw: "Homework Assignment",
    week: "Week",
    pi: "Program Instance",
    slot: "Homework Slot",
  },
  e: { pi: "Program Instance", active: "Active?" },
  w: { enr: "Enrollment", week: "Week" },
  x: {
    enr: "Enrollment",
    week: "Week",
    was: "Weekly Athlete Summary",
    sub: "Submission",
    hc: "Homework Completion",
    bucket: "XP Bucket",
    source: "XP Source",
    points: "XP Points",
    key: "Source Key",
    active: "Active?",
    processed: "Processed",
    reason: "XP Reason Public",
    debug: "XP Reason Debug",
  },
  v: {
    pending: "Pending",
    awarded: "Awarded",
    bucket: "Homework Completion",
    source: "Homework Completion",
    prefix: "HOMEWORK_XP|",
  },
};
let hcT, xpT, wasT, phaT, enrT;
const cache = new Map();
function out(k, v) {
  try {
    output.set(k, v);
  } catch {}
}
function fld(t, n) {
  const k = `${t.name}:${n}`;
  if (cache.has(k)) return cache.get(k);
  let f = null;
  try {
    f = t.getField(n);
  } catch {}
  cache.set(k, f);
  return f;
}
function req(t, n) {
  if (!fld(t, n)) throw new Error(`Missing required field: ${t.name} -> ${n}`);
}
function writable(t, n) {
  const f = fld(t, n);
  return (
    !!f &&
    !f.isComputed &&
    !new Set([
      "formula",
      "rollup",
      "lookup",
      "multipleLookupValues",
      "count",
      "createdTime",
      "lastModifiedTime",
      "autoNumber",
      "button",
      "externalSyncSource",
    ]).has(f.type)
  );
}
function raw(r, t, n) {
  return r && fld(t, n) ? r.getCellValue(n) : null;
}
function text(r, t, n) {
  return r && fld(t, n) ? String(r.getCellValueAsString(n) || "").trim() : "";
}
function ids(r, t, n) {
  const v = raw(r, t, n);
  return Array.isArray(v) ? v.map((x) => x?.id).filter(Boolean) : [];
}
function yes(r, t, n) {
  const v = raw(r, t, n);
  return (
    v === true ||
    v === 1 ||
    ["true", "1", "yes", "checked", "active"].includes(
      String(v?.name ?? v ?? "")
        .trim()
        .toLowerCase(),
    )
  );
}
function num(r, t, n) {
  const v = raw(r, t, n);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const x = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(x) ? x : 0;
}
function link(a) {
  return [...new Set(a)].map((id) => ({ id }));
}
function same(a, b) {
  return (
    a.length === b.length &&
    [...a].sort().every((x, i) => x === [...b].sort()[i])
  );
}
function choice(t, n, value) {
  const f = fld(t, n);
  if (f?.type !== "singleSelect") return value;
  const m = f.options?.choices?.find(
    (x) => x.name.trim().toLowerCase() === value.toLowerCase(),
  );
  if (!m) throw new Error(`Missing option ${value}: ${t.name} -> ${n}`);
  return { id: m.id };
}
function key(id) {
  return `${C.v.prefix}${id}`;
}
async function update(t, id, fields) {
  const f = {};
  for (const [k, v] of Object.entries(fields))
    if (writable(t, k) && v !== undefined) f[k] = v;
  if (Object.keys(f).length) await t.updateRecordAsync(id, f);
  return Object.keys(f);
}
async function best(t, id, f) {
  try {
    return await update(t, id, f);
  } catch (e) {
    console.log("Best-effort writeback failed", String(e));
    return null;
  }
}
function finish(status, action, d = {}) {
  for (const [k, v] of Object.entries({
    statusOut: status,
    actionOut: action,
    errorOut: d.error || "",
    debugStep: d.step || "",
    xpEventIdOut: d.xpId || "",
    sourceKeyOut: d.key || "",
    weeklySummaryIdOut: d.wasId || "",
    xpEventDeactivatedOut: d.deactivated || false,
    homeworkWritebackWarningOut: d.warning || "",
  }))
    out(k, v);
  console.log(
    JSON.stringify({
      automation: SCRIPT.scriptName,
      version: SCRIPT.version,
      statusOut: status,
      actionOut: action,
      ...d,
    }),
  );
}
function matches(records, id, k) {
  return records.filter(
    (x) => ids(x, xpT, C.x.hc).includes(id) || text(x, xpT, C.x.key) === k,
  );
}
function assertOwned(x, c) {
  if (text(x, xpT, C.x.key) !== c.key)
    throw new Error(`XP Event ${x.id} Source Key mismatch.`);
  if (!same(ids(x, xpT, C.x.hc), [c.id]))
    throw new Error(`XP Event ${x.id} Homework Completion ownership mismatch.`);
  if (!same(ids(x, xpT, C.x.enr), [c.enr]))
    throw new Error(`XP Event ${x.id} Enrollment ownership mismatch.`);
  if (!same(ids(x, xpT, C.x.week), [c.week]))
    throw new Error(`XP Event ${x.id} Week ownership mismatch.`);
  const s = ids(x, xpT, C.x.sub);
  if (s.length !== 1 || !c.subs.includes(s[0]))
    throw new Error(`XP Event ${x.id} Submission ownership mismatch.`);
  if (num(x, xpT, C.x.points) !== c.total)
    throw new Error(`XP Event ${x.id} points mismatch.`);
}
async function canonicalWasCandidates(enr, week) {
  const q = await wasT.selectRecordsAsync({ fields: [C.w.enr, C.w.week] });
  return q.records.filter(
    (r) =>
      same(ids(r, wasT, C.w.enr), [enr]) &&
      same(ids(r, wasT, C.w.week), [week]),
  );
}
async function requireCanonicalWas(enr, week) {
  const candidates = await canonicalWasCandidates(enr, week);
  if (!candidates.length)
    throw new Error(
      `No canonical Weekly Athlete Summary exists for Enrollment ${enr} + Week ${week}; positive Homework XP is blocked.`,
    );
  if (candidates.length !== 1)
    throw new Error(
      `Multiple canonical Weekly Athlete Summaries for Enrollment ${enr} + Week ${week}; Needs Review: ${candidates.map((x) => x.id).join(", ")}`,
    );
  return candidates[0].id;
}
async function pause(ms) {
  if (typeof setTimeout !== "function") return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
async function settleAndAcknowledge(id, xpId, expectedActive) {
  // These bounded re-reads only wait for Airtable's formula consistency inside
  // this invocation. They are not scheduled polling or another automation slot.
  let settled = "";
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const fresh = await hcT.selectRecordAsync(id);
    const current = text(fresh, hcT, C.h.currentSignature);
    const eventState = expectedActive ? "|ACTIVE|KEY=" : "|INACTIVE|KEY=";
    if (!xpId || (current.includes(xpId) && current.includes(eventState))) {
      settled = current;
      break;
    }
    await pause(200);
  }
  if (!settled)
    throw new Error(
      `Homework XP formula did not settle to the post-write XP Event state; reconciliation remains unacknowledged.`,
    );
  await update(hcT, id, { [C.h.lastSignature]: settled });
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const fresh = await hcT.selectRecordAsync(id);
    if (!yes(fresh, hcT, C.h.reconcileNeeded)) return settled;
    await pause(100);
  }
  throw new Error(
    `Homework XP reconciliation acknowledgement did not clear the formula trigger.`,
  );
}
async function validatePha(hc, enr, week) {
  const e = await enrT.selectRecordAsync(enr);
  if (!e || !yes(e, enrT, C.e.active))
    return { eligible: false, reason: `Enrollment ${enr} is missing or inactive.` };
  if (!fld(hcT, C.h.pha))
    return {
      eligible: true,
      reason: "PHA field unavailable; legacy completion identity only.",
    };
  const pids = ids(hc, hcT, C.h.pha);
  if (pids.length !== 1)
    return {
      eligible: false,
      reason: `Program Homework Assignment must contain exactly one link; found ${pids.length}.`,
    };
  const p = await phaT.selectRecordAsync(pids[0]);
  if (!p || !yes(p, phaT, C.p.active))
    return {
      eligible: false,
      reason: `Program Homework Assignment ${pids[0]} is missing or inactive.`,
    };
  if (!same(ids(p, phaT, C.p.hw), ids(hc, hcT, C.h.hw)))
    return { eligible: false, reason: `PHA Homework ownership mismatch.` };
  if (!same(ids(p, phaT, C.p.week), [week]))
    return { eligible: false, reason: `PHA Week ownership mismatch.` };
  if (text(p, phaT, C.p.slot) !== text(hc, hcT, C.h.slot))
    return { eligible: false, reason: `PHA Homework Slot ownership mismatch.` };
  if (!same(ids(p, phaT, C.p.pi), ids(e, enrT, C.e.pi)))
    return {
      eligible: false,
      reason: `PHA Program Instance does not match Enrollment.`,
    };
  return { eligible: true, reason: "" };
}
async function main() {
  let step = "input";
  const id = String(input.config().recordId || "").trim();
  if (!id.startsWith("rec")) throw new Error(`Invalid recordId: ${id}`);
  const k = key(id);
  hcT = base.getTable(C.t.hc);
  xpT = base.getTable(C.t.xp);
  wasT = base.getTable(C.t.was);
  phaT = base.getTable(C.t.pha);
  enrT = base.getTable(C.t.enr);
  [
    C.h.enr,
    C.h.hw,
    C.h.week,
    C.h.subs,
    C.h.sat,
    C.h.review,
    C.h.feedback,
    C.h.total,
    C.h.award,
    C.h.events,
    C.h.key,
    C.h.slot,
    C.h.currentSignature,
    C.h.lastSignature,
    C.h.reconcileNeeded,
  ].forEach((n) => req(hcT, n));
  [
    C.x.enr,
    C.x.week,
    C.x.was,
    C.x.sub,
    C.x.hc,
    C.x.bucket,
    C.x.source,
    C.x.points,
    C.x.key,
    C.x.active,
  ].forEach((n) => req(xpT, n));
  step = "load";
  const hc = await hcT.selectRecordAsync(id);
  if (!hc) throw new Error(`Homework Completion not found: ${id}`);
  const enrs = ids(hc, hcT, C.h.enr),
    hws = ids(hc, hcT, C.h.hw),
    weeks = ids(hc, hcT, C.h.week),
    subs = ids(hc, hcT, C.h.subs),
    linked = ids(hc, hcT, C.h.events);
  if (enrs.length !== 1)
    throw new Error(
      `Enrollment must contain exactly one link; found ${enrs.length}.`,
    );
  if (hws.length !== 1)
    throw new Error(
      `Homework must contain exactly one link; found ${hws.length}.`,
    );
  if (weeks.length !== 1)
    throw new Error(
      `Week must contain exactly one link; found ${weeks.length}.`,
    );
  if (!subs.length)
    throw new Error(`At least one Submission link is required.`);
  if (linked.length > 1)
    throw new Error(`Multiple linked XP Events: ${linked.join(", ")}`);
  if (!text(hc, hcT, C.h.key))
    throw new Error(`Homework Completion Key is blank.`);
  const signatureAtStart = text(hc, hcT, C.h.currentSignature);
  if (!signatureAtStart)
    throw new Error(`Homework XP Current Signature is blank.`);
  const sat = yes(hc, hcT, C.h.sat),
    review = yes(hc, hcT, C.h.review),
    feedback = Boolean(text(hc, hcT, C.h.feedback)),
    reviewEligible = sat && review && feedback,
    total = num(hc, hcT, C.h.total),
    ctx = { id, key: k, enr: enrs[0], week: weeks[0], subs, total };
  step = "find";
  let q = await xpT.selectRecordsAsync({
      fields: Object.values(C.x).filter((n) => fld(xpT, n)),
    }),
    m = matches(q.records, id, k);
  if (m.length > 1)
    throw new Error(
      `Duplicate exact Homework XP Events: ${m.map((x) => x.id).join(", ")}`,
    );
  let xp = m[0] || null;
  if (linked.length === 1 && (!xp || xp.id !== linked[0]))
    throw new Error(`Linked XP Event does not match exact identity.`);
  if (xp) assertOwned(xp, ctx);
  const linkedEligibility = await validatePha(hc, enrs[0], weeks[0]);
  const eligible = reviewEligible && linkedEligibility.eligible;
  if (!xp && reviewEligible && !linkedEligibility.eligible)
    throw new Error(`New Homework XP blocked: ${linkedEligibility.reason}`);
  if (!eligible) {
    if (xp) {
      await update(xpT, xp.id, { [C.x.active]: false });
    }
    const w = await best(hcT, id, {
      [C.h.award]: choice(hcT, C.h.award, C.v.pending),
      ...(xp ? { [C.h.events]: link([xp.id]) } : {}),
    });
    await settleAndAcknowledge(id, xp?.id || "", false);
    return finish("skipped", "reconciled_ineligible", {
      step,
      key: k,
      xpId: xp?.id || "",
      deactivated: Boolean(xp),
      warning:
        w === null ? "Homework writeback failed after XP correction." : "",
      eligibilityReason: linkedEligibility.eligible
        ? "Review eligibility withdrawn."
        : linkedEligibility.reason,
    });
  }
  if (!(total > 0))
    throw new Error(`Total Homework XP Awarded must be positive.`);
  if (subs.length !== 1 && !xp)
    throw new Error(
      `New Homework XP requires exactly one canonical Submission; found ${subs.length}.`,
    );
  const was = await requireCanonicalWas(enrs[0], weeks[0]);
  if (xp) {
    assertOwned(xp, ctx);
  }
  const payload = {
    [C.x.enr]: link(enrs),
    [C.x.week]: link(weeks),
    [C.x.hc]: link([id]),
    [C.x.sub]: link([xp ? ids(xp, xpT, C.x.sub)[0] : subs[0]]),
    [C.x.bucket]: choice(xpT, C.x.bucket, C.v.bucket),
    [C.x.source]: choice(xpT, C.x.source, C.v.source),
    [C.x.points]: total,
    [C.x.key]: k,
    [C.x.active]: true,
    [C.x.processed]: true,
    [C.x.reason]: "Homework completed.",
    [C.x.debug]: `Canonical Homework XP ${k}`,
  };
  payload[C.x.was] = link([was]);
  step = "last-chance recheck";
  q = await xpT.selectRecordsAsync({
    fields: [
      C.x.key,
      C.x.hc,
      C.x.enr,
      C.x.week,
      C.x.sub,
      C.x.points,
      C.x.active,
      C.x.was,
      C.x.source,
      C.x.bucket,
    ],
  });
  m = matches(q.records, id, k);
  if (m.length > 1)
    throw new Error(`Duplicate exact XP Events during recheck.`);
  if (xp && (!m[0] || m[0].id !== xp.id))
    throw new Error(`Canonical XP Event changed during recheck.`);
  if (m[0]) {
    xp = m[0];
    assertOwned(xp, ctx);
  }
  step = "write";
  if (xp) await update(xpT, xp.id, payload);
  else xp = { id: await xpT.createRecordAsync(payload) };
  const w = await best(hcT, id, {
    [C.h.events]: link([xp.id]),
    [C.h.award]: choice(hcT, C.h.award, C.v.awarded),
    [C.h.error]: "",
  });
  await settleAndAcknowledge(id, xp.id, true);
  finish("success", m[0] ? "reused_after_recheck" : "created_or_reactivated", {
    step,
    key: k,
    xpId: xp.id,
    wasId: was,
    warning: w === null ? "XP completed but Homework writeback failed." : "",
  });
}
try {
  await main();
} catch (e) {
  const m = e instanceof Error ? e.message : String(e);
  finish("error", "error", { error: m });
  throw e;
}
