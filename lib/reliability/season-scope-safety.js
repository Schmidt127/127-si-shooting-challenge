/**
 * PKG-009 offline season-scope selection contracts.
 * Pure Node — no Airtable writes.
 */
"use strict";

function normalizeSchoolYear(value) {
  const year = String(value || "").trim();
  if (!/^\d{4}-\d{4}$/.test(year)) {
    return { ok: false, reason: "invalid_school_year_format", value: year };
  }
  const [start, end] = year.split("-").map(Number);
  if (end !== start + 1) {
    return { ok: false, reason: "school_year_span_not_one", value: year };
  }
  return { ok: true, value: year };
}

function resolveRegisteringProgramInstance(candidates) {
  const rows = Array.isArray(candidates) ? candidates : [];
  const registering = rows.filter(
    (row) =>
      row.program === "Shooting Challenge" &&
      row.status === "Registering" &&
      row.id &&
      String(row.id).startsWith("rec"),
  );

  if (registering.length === 0) {
    return { ok: false, reason: "no_registering_program_instance", count: 0 };
  }
  if (registering.length > 1) {
    return {
      ok: false,
      reason: "multiple_registering_program_instances",
      count: registering.length,
      ids: registering.map((row) => row.id),
    };
  }

  const selected = registering[0];
  const year = normalizeSchoolYear(selected.schoolYear);
  if (!year.ok) return { ok: false, reason: year.reason, programInstanceId: selected.id };

  const expectedName = `Shooting Challenge | ${year.value}`;
  if (selected.name !== expectedName) {
    return {
      ok: false,
      reason: "program_instance_name_mismatch",
      expectedName,
      actualName: selected.name || "",
      programInstanceId: selected.id,
    };
  }

  return {
    ok: true,
    programInstanceId: selected.id,
    schoolYear: year.value,
    name: selected.name,
  };
}

function resolveScopedEnrollment(enrollment, expected) {
  const programIds = Array.isArray(enrollment.programInstanceIds)
    ? enrollment.programInstanceIds.filter(Boolean)
    : [];
  const schoolYear = String(enrollment.schoolYear || "").trim();

  if (!enrollment.active) return { ok: false, reason: "enrollment_inactive" };
  if (programIds.length !== 1) {
    return { ok: false, reason: "enrollment_program_instance_cardinality", count: programIds.length };
  }
  if (!schoolYear) return { ok: false, reason: "enrollment_missing_school_year" };
  if (expected.programInstanceId && programIds[0] !== expected.programInstanceId) {
    return { ok: false, reason: "enrollment_wrong_program_instance" };
  }
  if (expected.schoolYear && schoolYear !== expected.schoolYear) {
    return { ok: false, reason: "enrollment_wrong_school_year" };
  }
  return { ok: true, programInstanceId: programIds[0], schoolYear };
}

function resolveWeekForDate(weeks, activityDate, programInstanceId) {
  const dateKey = String(activityDate || "").trim();
  const matches = (weeks || []).filter((week) => {
    if (!week.active) return false;
    if (week.programInstanceId !== programInstanceId) return false;
    return dateKey >= week.startDate && dateKey <= week.endDate;
  });

  if (matches.length === 0) {
    return { ok: false, reason: "no_week_for_activity_date", activityDate: dateKey };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      reason: "ambiguous_week_for_activity_date",
      activityDate: dateKey,
      weekIds: matches.map((week) => week.id),
    };
  }
  return { ok: true, weekId: matches[0].id, week: matches[0] };
}

function resolveActiveConfig(configRows, schoolYear) {
  const active = (configRows || []).filter((row) => row.active);
  if (active.length === 0) return { ok: false, reason: "no_active_config" };
  if (active.length > 1) {
    return {
      ok: false,
      reason: "multiple_active_configs",
      ids: active.map((row) => row.id),
    };
  }
  const selected = active[0];
  if (schoolYear && selected.schoolYear !== schoolYear) {
    return { ok: false, reason: "active_config_school_year_mismatch", expected: schoolYear };
  }
  return { ok: true, configId: selected.id, schoolYear: selected.schoolYear };
}

function auditSeasonReadiness({
  programInstances = [],
  configRows = [],
  weeks = [],
  enrollments = [],
}) {
  const findings = [];
  const add = (code, severity, detail) => findings.push({ code, severity, detail });

  const registering = resolveRegisteringProgramInstance(programInstances);
  if (!registering.ok) add("registering_program_instance", "error", registering);

  const config = resolveActiveConfig(configRows, registering.ok ? registering.schoolYear : null);
  if (!config.ok) add("active_config", "error", config);

  const byPi = new Map();
  for (const week of weeks) {
    if (!week.programInstanceId) {
      add("week_missing_program_instance", "error", { weekId: week.id });
      continue;
    }
    const key = week.programInstanceId;
    byPi.set(key, [...(byPi.get(key) || []), week]);
  }

  for (const [pi, piWeeks] of byPi.entries()) {
    const active = piWeeks.filter((week) => week.active);
    const overlaps = [];
    for (let i = 0; i < active.length; i += 1) {
      for (let j = i + 1; j < active.length; j += 1) {
        const a = active[i];
        const b = active[j];
        if (a.startDate <= b.endDate && b.startDate <= a.endDate) {
          overlaps.push([a.id, b.id]);
        }
      }
    }
    if (overlaps.length) add("week_overlap", "error", { programInstanceId: pi, overlaps });
  }

  const identity = new Map();
  for (const enrollment of enrollments) {
    if (!enrollment.active) continue;
    const athleteId = enrollment.athleteId;
    const pi = (enrollment.programInstanceIds || [])[0];
    const year = enrollment.schoolYear;
    if (!athleteId || !pi || !year) {
      add("enrollment_identity_incomplete", "error", { enrollmentId: enrollment.id });
      continue;
    }
    const key = `${athleteId}|${pi}|${year}`;
    identity.set(key, [...(identity.get(key) || []), enrollment.id]);
  }
  for (const [key, ids] of identity.entries()) {
    if (ids.length > 1) add("duplicate_active_enrollment_identity", "error", { key, ids });
  }

  return {
    audit: "PKG-009-season-readiness",
    readOnly: true,
    registering,
    config,
    counts: {
      programInstances: programInstances.length,
      weeks: weeks.length,
      enrollments: enrollments.length,
      findings: findings.length,
    },
    findings,
  };
}

module.exports = {
  normalizeSchoolYear,
  resolveRegisteringProgramInstance,
  resolveScopedEnrollment,
  resolveWeekForDate,
  resolveActiveConfig,
  auditSeasonReadiness,
};
