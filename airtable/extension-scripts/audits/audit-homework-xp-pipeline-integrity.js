/* Read-only PKG-007 authoritative Homework XP ownership/reversal audit. */
// @ts-nocheck
const C = {
  t: {
    hc: "Homework Completions",
    xp: "XP Events",
    was: "Weekly Athlete Summary",
    enr: "Enrollments",
    pha: "Program Homework Assignments",
  },
  h: {
    enr: "Enrollment",
    hw: "Homework",
    week: "Week",
    was: "Weekly Athlete Summary Link",
    subs: "Submissions - Linked",
    sat: "Satisfactory?",
    review: "Review Complete",
    feedback: "Coach Feedback",
    total: "Total Homework XP Awarded",
    award: "Award Status",
    events: "XP Events",
    pha: "Program Homework Assignment",
    slot: "Item Slot",
    currentSignature: "Homework XP Current Signature",
    lastSignature: "Last Homework XP Reconciled Signature",
    reconcileNeeded: "Homework XP Reconciliation Needed?",
  },
  x: {
    key: "Source Key",
    hc: "Homework Completion",
    enr: "Enrollment",
    week: "Week",
    was: "Weekly Athlete Summary",
    sub: "Submission",
    points: "XP Points",
    active: "Active?",
    source: "XP Source",
    bucket: "XP Bucket",
  },
  e: {
    active: "Active?",
    pi: "Program Instance",
  },
  p: {
    active: "Active?",
    hw: "Homework Assignment",
    week: "Week",
    pi: "Program Instance",
    slot: "Homework Slot",
  },
  w: { enr: "Enrollment", week: "Week" },
  prefix: "HOMEWORK_XP|",
};
function f(t, n) {
  try {
    return t.getField(n);
  } catch {
    return null;
  }
}
function raw(r, t, n) {
  return f(t, n) ? r.getCellValue(n) : null;
}
function text(r, t, n) {
  return f(t, n) ? String(r.getCellValueAsString(n) || "").trim() : "";
}
function ids(r, t, n) {
  const v = raw(r, t, n);
  return Array.isArray(v) ? v.map((x) => x?.id).filter(Boolean) : [];
}
function yes(r, t, n) {
  const v = raw(r, t, n);
  return v === true || v === 1 || String(v ?? "").toLowerCase() === "true";
}
function num(r, t, n) {
  const v = raw(r, t, n);
  return typeof v === "number"
    ? v
    : Number(String(v ?? 0).replace(/,/g, "")) || 0;
}
function same(a, b) {
  return (
    a.length === b.length &&
    [...a].sort().every((x, i) => x === [...b].sort()[i])
  );
}
async function main() {
  const hcT = base.getTable(C.t.hc),
    xpT = base.getTable(C.t.xp),
    wasT = base.getTable(C.t.was),
    enrT = base.getTable(C.t.enr),
    phaT = base.getTable(C.t.pha);
  const [hq, xq, wq, eq, pq] = await Promise.all([
    hcT.selectRecordsAsync({
      fields: Object.values(C.h).filter((n) => f(hcT, n)),
    }),
    xpT.selectRecordsAsync({
      fields: Object.values(C.x).filter((n) => f(xpT, n)),
    }),
    wasT.selectRecordsAsync({ fields: [C.w.enr, C.w.week] }),
    enrT.selectRecordsAsync({
      fields: Object.values(C.e).filter((n) => f(enrT, n)),
    }),
    phaT.selectRecordsAsync({
      fields: Object.values(C.p).filter((n) => f(phaT, n)),
    }),
  ]);
  const wi = new Map();
  for (const w of wq.records) {
    const e = ids(w, wasT, C.w.enr),
      k = ids(w, wasT, C.w.week);
    if (e.length === 1 && k.length === 1) {
      const x = `${e[0]}|${k[0]}`;
      wi.set(x, [...(wi.get(x) || []), w.id]);
    }
  }
  const issues = [];
  const hcIds = new Set(hq.records.map((r) => r.id));
  for (const x of xq.records) {
    const sk = text(x, xpT, C.x.key);
    if (
      sk.startsWith(C.prefix) &&
      !ids(x, xpT, C.x.hc).some((id) => hcIds.has(id))
    )
      issues.push({
        type: "orphan_homework_xp",
        xpEventId: x.id,
        sourceKey: sk,
      });
    else if (
      (sk.startsWith("HOMEWORK_COMPLETION|") || /HOMEWORK/i.test(sk)) &&
      !sk.startsWith(C.prefix)
    )
      issues.push({
        type: "legacy_or_unknown_homework_prefix",
        xpEventId: x.id,
        sourceKey: sk,
      });
  }
  for (const h of hq.records) {
    const key = `${C.prefix}${h.id}`,
      enr = ids(h, hcT, C.h.enr),
      week = ids(h, hcT, C.h.week),
      subs = ids(h, hcT, C.h.subs),
      linked = ids(h, hcT, C.h.events),
      eligible =
        yes(h, hcT, C.h.sat) &&
        yes(h, hcT, C.h.review) &&
        Boolean(text(h, hcT, C.h.feedback)),
      total = num(h, hcT, C.h.total),
      canonical =
        enr.length === 1 && week.length === 1
          ? wi.get(`${enr[0]}|${week[0]}`) || []
          : [];
    const enrollment = enr.length === 1 ? eq.getRecord(enr[0]) : null;
    const phaIds = f(hcT, C.h.pha) ? ids(h, hcT, C.h.pha) : [];
    const pha = phaIds.length === 1 ? pq.getRecord(phaIds[0]) : null;
    const linkedEligible =
      Boolean(enrollment && yes(enrollment, enrT, C.e.active)) &&
      (!f(hcT, C.h.pha) ||
        Boolean(
          pha &&
            yes(pha, phaT, C.p.active) &&
            same(ids(pha, phaT, C.p.hw), ids(h, hcT, C.h.hw)) &&
            same(ids(pha, phaT, C.p.week), week) &&
            text(pha, phaT, C.p.slot) === text(h, hcT, C.h.slot) &&
            same(ids(pha, phaT, C.p.pi), ids(enrollment, enrT, C.e.pi)),
        ));
    if (!linkedEligible)
      issues.push({
        type: "inactive_or_invalid_enrollment_pha",
        homeworkCompletionId: h.id,
        enrollmentIds: enr,
        phaIds,
      });
    const signatureStale =
      text(h, hcT, C.h.currentSignature) !==
      text(h, hcT, C.h.lastSignature);
    if (f(hcT, C.h.reconcileNeeded) && signatureStale !== yes(h, hcT, C.h.reconcileNeeded))
      issues.push({
        type: "reconciliation_signature_formula_mismatch",
        homeworkCompletionId: h.id,
      });
    const exact = xq.records.filter(
      (x) =>
        text(x, xpT, C.x.key) === key || ids(x, xpT, C.x.hc).includes(h.id),
    );
    if (!canonical.length)
      issues.push({
        type: "zero_canonical_was",
        homeworkCompletionId: h.id,
        enrollmentId: enr[0] || "",
        weekId: week[0] || "",
      });
    else if (canonical.length > 1)
      issues.push({
        type: "multiple_canonical_was_candidates",
        homeworkCompletionId: h.id,
        enrollmentId: enr[0] || "",
        weekId: week[0] || "",
        weeklySummaryIds: canonical,
      });
    if (exact.length !== 1 && eligible)
      issues.push({
        type: exact.length ? "duplicate_exact_event" : "missing_exact_event",
        homeworkCompletionId: h.id,
        xpEventIds: exact.map((x) => x.id),
      });
    if (exact.length > 1 && !eligible)
      issues.push({
        type: "duplicate_exact_event_ineligible",
        homeworkCompletionId: h.id,
        xpEventIds: exact.map((x) => x.id),
      });
    for (const x of exact) {
      const p = [];
      if (text(x, xpT, C.x.key) !== key) p.push("Source Key");
      if (!same(ids(x, xpT, C.x.hc), [h.id])) p.push("Homework Completion");
      if (enr.length !== 1 || !same(ids(x, xpT, C.x.enr), enr))
        p.push("Enrollment");
      if (week.length !== 1 || !same(ids(x, xpT, C.x.week), week))
        p.push("Week");
      const xs = ids(x, xpT, C.x.sub);
      if (xs.length !== 1 || !subs.includes(xs[0])) p.push("Submission");
      const ws = ids(x, xpT, C.x.was);
      if (!ws.length) p.push("blank event WAS");
      else if (ws.length > 1) p.push("multiple event WAS links");
      else if (canonical.length === 1 && ws[0] !== canonical[0])
        p.push("wrong event WAS");
      if (num(x, xpT, C.x.points) !== total) p.push("XP Points");
      if (text(x, xpT, C.x.source) !== "Homework Completion")
        p.push("XP Source");
      if (text(x, xpT, C.x.bucket) !== "Homework Completion")
        p.push("XP Bucket");
      if (eligible && linkedEligible && !yes(x, xpT, C.x.active))
        p.push("inactive eligible event");
      if ((!eligible || !linkedEligible) && yes(x, xpT, C.x.active))
        p.push("active ineligible event");
      if (p.length)
        issues.push({
          type: "ownership_or_state_mismatch",
          homeworkCompletionId: h.id,
          xpEventId: x.id,
          problems: p,
        });
    }
    if (linked.length > 1)
      issues.push({
        type: "multiple_linked_events",
        homeworkCompletionId: h.id,
        xpEventIds: linked,
      });
  }
  console.log(
    JSON.stringify(
      {
        script: "audit-homework-xp-pipeline-integrity",
        version: "v1.0",
        dryRun: true,
        checked: hq.records.length,
        issueCount: issues.length,
        issues: issues.slice(0, 100),
      },
      null,
      2,
    ),
  );
}
await main();
