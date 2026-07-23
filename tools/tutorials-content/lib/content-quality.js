"use strict";

const {
  asText,
  normalizeTitle,
  normalizeUrl,
  asStringArray,
  isPublished,
  attachmentIds,
} = require("./normalize");

const INTERNAL_LANGUAGE =
  /\b(rec[a-zA-Z0-9]{10,}|fld[a-zA-Z0-9]{10,}|tbl[a-zA-Z0-9]{10,}|TODO\b|FIXME\b|do not publish|internal only|airtable|softr admin|test record)\b/i;

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const RULES = [
  "title_present",
  "description_present",
  "usable_instructions",
  "grade_band_present",
  "valid_media_url",
  "publish_status",
  "sort_order",
  "accessible_link_text",
  "no_internal_only_language",
  "no_athlete_email_or_private_data",
  "no_broken_asset_reference",
  "no_duplicate_public_item",
  "appropriate_age_labeling",
];

function getField(record, ...keys) {
  const fields = record.fields || record;
  for (const key of keys) {
    if (fields[key] != null && fields[key] !== "") return fields[key];
  }
  return undefined;
}

function evaluateRecord(record, context = {}) {
  const title = asText(getField(record, "Name", "title", "Display Title"));
  const brief = asText(getField(record, "Brief Description", "Brief Descriptions", "Short Description"));
  const detailed = asText(
    getField(record, "Detailed Description", "Athlete Instructions", "instructions", "description"),
  );
  const rationale = asText(getField(record, "Assignment Rationale", "Parent Description"));
  const instructions = detailed || rationale;
  const gradeBand = asText(getField(record, "Grade Band", "Age Appropriate", "Grade Band Label"));
  const mediaUrl = normalizeUrl(getField(record, "Link to Video", "Public URL", "URL", "videoUrl"));
  const rawUrl = asText(getField(record, "Link to Video", "Public URL", "URL", "videoUrl"));
  const published = isPublished(getField(record, "OK to Publish on Softr", "Published?", "published"));
  const sortOrderRaw = getField(record, "Sort Order", "sortOrder");
  const sortOrder =
    sortOrderRaw == null || sortOrderRaw === "" ? null : Number(sortOrderRaw);
  const attachments = [
    ...attachmentIds(getField(record, "Thumbnail")),
    ...attachmentIds(getField(record, "Website Image Resolved", "Display Image")),
    ...attachmentIds(getField(record, "Athlete Headshot - Lkp", "Athlete Headshot")),
  ];
  const brokenRefs = asStringArray(getField(record, "brokenAssetRefs", "brokenAttachments"));
  const athlete = asText(getField(record, "Athlete"));
  const category = asText(getField(record, "Tutorial - Category", "Category Label", "category"));
  const combinedText = [title, brief, detailed, rationale, athlete, category].join("\n");

  const duplicatePublicIds = new Set(context.duplicatePublicIds || []);
  const id = record.id || record.recordId || "";

  /** @type {Record<string, {pass: boolean, severity: string, detail: string}>} */
  const results = {};

  results.title_present = {
    pass: Boolean(normalizeTitle(title)),
    severity: "error",
    detail: normalizeTitle(title) ? "title ok" : "missing title",
  };

  results.description_present = {
    pass: Boolean(brief || detailed),
    severity: published ? "error" : "warn",
    detail: brief || detailed ? "description ok" : "missing brief and detailed description",
  };

  results.usable_instructions = {
    pass: Boolean(instructions && instructions.trim().length >= 20),
    severity: published ? "warn" : "info",
    detail: instructions ? "instructions present" : "no usable instructions/detailed copy",
  };

  // Tutorials tables do not currently have Grade Band; rule is advisory unless field exists.
  const gradeBandFieldPresent =
    getField(record, "Grade Band", "Age Appropriate", "Grade Band Label") !== undefined ||
    context.requireGradeBand === true;
  results.grade_band_present = {
    pass: gradeBandFieldPresent ? Boolean(gradeBand) : true,
    severity: gradeBandFieldPresent ? "warn" : "info",
    detail: gradeBandFieldPresent
      ? gradeBand
        ? `grade band: ${gradeBand}`
        : "grade band field present but empty"
      : "grade band not in Tutorials schema — skipped",
  };

  const urlLooksPresent = Boolean(rawUrl.trim());
  results.valid_media_url = {
    pass: !urlLooksPresent || Boolean(mediaUrl),
    severity: published ? "error" : "warn",
    detail: !urlLooksPresent
      ? "blank URL"
      : mediaUrl
        ? "valid http(s) URL"
        : "URL present but not valid http(s)",
  };

  results.publish_status = {
    pass: typeof published === "boolean",
    severity: "info",
    detail: published ? "published" : "unpublished",
  };

  results.sort_order = {
    pass: sortOrder == null || Number.isFinite(sortOrder),
    severity: "warn",
    detail:
      sortOrder == null
        ? "sort order blank (defaults to 0 in migration map)"
        : Number.isFinite(sortOrder)
          ? `sort order ${sortOrder}`
          : "sort order not numeric",
  };

  const accessible =
    Boolean(normalizeTitle(title)) &&
    !/^https?:\/\//i.test(title.trim()) &&
    !/^click here$/i.test(title.trim());
  results.accessible_link_text = {
    pass: accessible,
    severity: published ? "error" : "warn",
    detail: accessible ? "title usable as link text" : "title missing or non-accessible link text",
  };

  results.no_internal_only_language = {
    pass: !INTERNAL_LANGUAGE.test(combinedText),
    severity: published ? "error" : "warn",
    detail: INTERNAL_LANGUAGE.test(combinedText)
      ? "internal-only language detected"
      : "no internal-only language detected",
  };

  const hasEmail = EMAIL_RE.test(combinedText) || EMAIL_RE.test(athlete);
  results.no_athlete_email_or_private_data = {
    pass: !hasEmail,
    severity: "error",
    detail: hasEmail ? "email or private data pattern detected" : "no email/private pattern detected",
  };

  const claimsAttachments = Boolean(getField(record, "Thumbnail", "Display Image", "Website Image Resolved"));
  results.no_broken_asset_reference = {
    pass: brokenRefs.length === 0 && (!claimsAttachments || attachments.length > 0 || !published),
    severity: published ? "error" : "warn",
    detail:
      brokenRefs.length > 0
        ? `broken refs: ${brokenRefs.join(",")}`
        : "no broken asset refs flagged",
  };

  results.no_duplicate_public_item = {
    pass: !(published && duplicatePublicIds.has(id)),
    severity: published ? "error" : "info",
    detail:
      published && duplicatePublicIds.has(id)
        ? "published duplicate of another public item"
        : "not flagged as duplicate public item",
  };

  const ageLabel = gradeBand || asText(getField(record, "Age Appropriate"));
  const ageOk =
    !ageLabel ||
    /^(k-?2|1-3|3-4|4-6|5-6|7-8|9-12|k|\d{1,2})$/i.test(ageLabel.replace(/\s+/g, "")) ||
    /grade/i.test(ageLabel);
  results.appropriate_age_labeling = {
    pass: ageOk,
    severity: ageLabel ? "warn" : "info",
    detail: ageLabel ? (ageOk ? `age label ok: ${ageLabel}` : `unexpected age label: ${ageLabel}`) : "no age label",
  };

  const failed = RULES.filter((rule) => !results[rule].pass);
  const errors = failed.filter((rule) => results[rule].severity === "error");
  const warnings = failed.filter((rule) => results[rule].severity === "warn");

  return {
    id,
    title,
    published,
    mediaUrl,
    pass: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    failedRules: failed,
    results,
  };
}

function validateRecords(records, context = {}) {
  const evaluations = records.map((record) => evaluateRecord(record, context));
  return {
    generatedAt: new Date().toISOString(),
    rules: RULES,
    summary: {
      recordCount: evaluations.length,
      passCount: evaluations.filter((e) => e.pass).length,
      failCount: evaluations.filter((e) => !e.pass).length,
      publishedFailCount: evaluations.filter((e) => e.published && !e.pass).length,
    },
    records: evaluations,
  };
}

module.exports = {
  RULES,
  evaluateRecord,
  validateRecords,
};
