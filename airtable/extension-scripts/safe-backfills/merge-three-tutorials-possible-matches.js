/*
Extension Script: Merge three Tutorials → Tutorials & Assets (possible matches)
System: 127 SI Shooting Challenge
Backlog: C-026 (possible-match manual merge)
Purpose:
  Merge exactly three named Tutorials records into their matching
  Tutorials & Assets rows by exact normalized Name.

Records (exact normalized Name match):
  - Work Hard, It Pays
  - Refs Get it Right - NBA
  - Parent Motivation - Habits & Struggles

Rules:
  - Tutorials & Assets is canonical (target)
  - Never delete records
  - Never create new records
  - Never modify records outside these three matches
  - Copy only missing values from Tutorials into Tutorials & Assets
  - Preserve existing target values
  - Add missing source attachments without duplicating
  - Append source descriptions only when target description differs
  - If video links conflict: print both, skip that record (no writes)
    EXCEPT Parent Motivation - Habits & Struggles: keep target video
    (authoritative), continue other field merges, note conflict resolved
  - Resolve target primary Name dynamically (BOM-safe / field ID)
  - Write Legacy Tutorials Record ID = source record id (when empty or same)
  - Set Migration Status = Migrated - Review Needed on successful merge
  - Append resolved video note to existing Tutorial Migration Review Notes
    (update only; never create review rows)
  - Print full preview + all-three-ready report BEFORE CONFIRM MERGE prompt
  - Does not create automations, interfaces, views, or tables

Version: v1.1
Date Written: 2026-08-17
Last Updated: 2026-08-17
*/

// @ts-nocheck

const CONFIG = {
  scriptName: "merge-three-tutorials-possible-matches",
  displayName: "Merge 3 Tutorials possible matches → Tutorials & Assets",
  version: "v1.1",

  /**
   * Preview runs first and prints readiness for all three titles.
   * Writes only after user types CONFIRM MERGE, and only when all three are ready.
   * Set true to stop after preview (no confirmation prompt / no writes).
   */
  previewOnly: true,

  prod: {
    baseId: "appn84sqPw03zEbTT",
    tableIds: {
      source: "tbldfoVGdhqATi4MS", // Tutorials
      target: "tblDOTgsWfqPm18bw", // Tutorials & Assets
      report: "tblxualvnUsgcpu0z", // Tutorial Migration Review (update Notes only)
    },
    fieldIds: {
      targetPrimaryName: "fldduBizp8qAnAMJW",
    },
  },

  tables: {
    source: "Tutorials",
    target: "Tutorials & Assets",
    report: "Tutorial Migration Review",
  },

  /** Exact display titles; matching uses normalizeNameKey (BOM/trim/case/spaces). */
  mergeTitles: [
    "Work Hard, It Pays",
    "Refs Get it Right - NBA",
    "Parent Motivation - Habits & Struggles",
  ],

  /**
   * Per-title video conflict overrides.
   * keep_target_authoritative: never copy/overwrite Link to Video; continue other merges.
   */
  videoConflictOverrides: {
    "parent motivation - habits & struggles": {
      resolution: "keep_target_authoritative",
      authoritativeVideo:
        "https://drive.google.com/file/d/1x2ZIjLZ0zNl23UYCQiUuXzmgybidWZUL/view?usp=sharing",
      reviewNote:
        "Video conflict resolved: target video confirmed authoritative. Source Tutorials link was not applied.",
    },
  },

  report: {
    sourceId: "Source Tutorials Record ID",
    targetId: "Target Tutorials and Assets Record ID",
    notes: "Notes",
    name: "Name",
  },

  source: {
    name: "Name",
    video: "Link to Video",
    athlete: "Athlete",
    athleteHeadshot: "Athlete Headshot - Lkp",
    thumbnail: "Thumbnail",
    displayImage: "Website Image Resolved",
    tutorialType: "Tutorial Type",
    category: "Tutorial - Category",
    program: "Associated Program",
    brief: "Brief Description",
    detailed: "Detailed Description",
    publish: "OK to Publish on Softr",
    sortOrder: "Sort Order",
  },

  target: {
    primaryNameFieldId: "fldduBizp8qAnAMJW",
    nameCandidates: ["Name", "\uFEFFName"],
    video: "Link to Video",
    athlete: "Athlete",
    athleteHeadshot: "Athlete Headshot",
    thumbnail: "Thumbnail",
    displayImage: "Display Image",
    typeOfAsset: "Type of Asset",
    program: "Associated Program",
    brief: "Brief Descriptions",
    detailed: "Detailed Description",
    publish: "OK to Publish on Softr",
    sortOrder: "Sort Order",
    legacySourceId: "Legacy Tutorials Record ID",
    migrationStatus: "Migration Status",
  },

  values: {
    migrationStatus: "Migrated - Review Needed",
    confirmPhrase: "CONFIRM MERGE",
    descriptionSeparator: "\n\n---\nFrom Tutorials (source):\n",
  },

  mutation: {
    maxPerWindow: 15,
    windowMs: 1000,
    maxRetries: 6,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripBom(value) {
  return String(value ?? "").replace(/^\uFEFF/, "");
}

function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return stripBom(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string") return item;
        if (typeof item === "object" && item.name != null) return String(item.name);
        return String(item);
      })
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object" && value.name != null) return String(value.name);
  return String(value);
}

function normalizeNameKey(value) {
  return stripBom(asText(value))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeVideoKey(value) {
  let s = asText(value).trim();
  if (!s) return "";
  s = s.replace(/\s+/g, "");
  try {
    const u = new URL(s);
    u.hash = "";
    let path = u.pathname.replace(/\/+$/, "");
    if (path === "/") path = "";
    return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`.toLowerCase();
  } catch {
    return s.toLowerCase().replace(/\/+$/, "");
  }
}

function normalizeDescKey(value) {
  return asText(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeTypeLabel(value) {
  return asText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function richTextToPlain(value) {
  if (value == null) return "";
  if (typeof value === "string") return stripBom(value).trim();
  if (typeof value === "object") {
    try {
      return asText(value).trim();
    } catch {
      return "";
    }
  }
  return String(value).trim();
}

function selectNames(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string") return item.trim();
        if (typeof item === "object" && item.name != null) return String(item.name).trim();
        return String(item).trim();
      })
      .filter(Boolean);
  }
  if (typeof value === "object" && value.name != null) {
    return [String(value.name).trim()].filter(Boolean);
  }
  return [asText(value)].filter(Boolean);
}

function isPublished(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null || value === "") return false;
  const text = asText(value).toLowerCase();
  return text === "checked" || text === "true" || text === "yes" || text === "1";
}

function mapTutorialTypeToAssetType(values) {
  const names = selectNames(values);
  if (!names.length) return null;
  const map = {
    tutorial: "Tutorial",
    "shout out": "Shout Out",
    "fbc article book": "FBC Article Book",
    informational: "Informational",
  };
  for (const name of names) {
    const key = normalizeTypeLabel(name);
    if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
  }
  return null;
}

function fieldExists(table, fieldNameOrId) {
  try {
    table.getField(fieldNameOrId);
    return true;
  } catch {
    return false;
  }
}

function isWritableField(table, fieldNameOrId) {
  if (!fieldExists(table, fieldNameOrId)) return false;
  try {
    return table.getField(fieldNameOrId).isComputed !== true;
  } catch {
    return false;
  }
}

function getFieldType(table, fieldNameOrId) {
  if (!fieldExists(table, fieldNameOrId)) return "";
  try {
    return String(table.getField(fieldNameOrId).type || "");
  } catch {
    return "";
  }
}

function resolveFieldName(table, candidates) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  for (const candidate of list) {
    if (candidate && fieldExists(table, candidate)) {
      try {
        return table.getField(candidate).name;
      } catch {
        return candidate;
      }
    }
  }
  try {
    for (const field of table.fields || []) {
      const cleaned = stripBom(field.name);
      for (const candidate of list) {
        if (cleaned === stripBom(candidate)) return field.name;
      }
    }
  } catch {
    // ignore
  }
  return "";
}

function resolveTargetPrimaryNameField(table) {
  const expectedCleanName = "Name";
  const knownId = CONFIG.target.primaryNameFieldId;
  const asRef = (field, via) => ({
    id: field.id,
    name: field.name,
    cleanName: stripBom(field.name),
    writeKey: field.id,
    via,
  });

  if (knownId && fieldExists(table, knownId)) {
    try {
      const field = table.getField(knownId);
      if (stripBom(field.name) === expectedCleanName) {
        return asRef(field, "known_field_id");
      }
    } catch {
      // continue
    }
  }

  try {
    const primary = table.primaryField;
    if (primary && stripBom(primary.name) === expectedCleanName) {
      return asRef(primary, "table.primaryField");
    }
  } catch {
    // continue
  }

  try {
    for (const field of table.fields || []) {
      if (stripBom(field.name) === expectedCleanName) {
        return asRef(field, "bom_tolerant_scan");
      }
    }
  } catch {
    // continue
  }

  return null;
}

function getSelectChoices(table, fieldNameOrId) {
  if (!fieldExists(table, fieldNameOrId)) return [];
  try {
    const field = table.getField(fieldNameOrId);
    const choices =
      (field.options && field.options.choices) ||
      (field.config && field.config.options && field.config.options.choices) ||
      [];
    return Array.isArray(choices) ? choices : [];
  } catch {
    return [];
  }
}

function findSelectChoice(table, fieldNameOrId, optionName) {
  const wanted = String(optionName || "").trim();
  if (!wanted) return null;
  const choices = getSelectChoices(table, fieldNameOrId);
  const exact = choices.find((c) => String(c.name || "").trim() === wanted);
  if (exact) return exact;
  const wantedNorm = normalizeTypeLabel(wanted);
  return choices.find((c) => normalizeTypeLabel(c.name) === wantedNorm) || null;
}

function toSingleSelectValue(table, fieldNameOrId, optionName, skipped, fieldLabel) {
  const label = fieldLabel || fieldNameOrId;
  const match = findSelectChoice(table, fieldNameOrId, optionName);
  if (!match) {
    skipped.push({
      field: label,
      reason: "select_option_missing",
      value: optionName,
    });
    return null;
  }
  return { name: match.name };
}

function toMultiSelectValue(table, fieldNameOrId, optionNames, skipped, fieldLabel) {
  const label = fieldLabel || fieldNameOrId;
  const names = Array.isArray(optionNames) ? optionNames : [optionNames];
  const out = [];
  for (const name of names) {
    const match = findSelectChoice(table, fieldNameOrId, name);
    if (!match) {
      skipped.push({
        field: label,
        reason: "select_option_missing",
        value: name,
      });
      continue;
    }
    out.push({ name: match.name });
  }
  return out.length ? out : null;
}

function attachmentSummary(value) {
  if (!Array.isArray(value) || !value.length) {
    return { count: 0, items: [], ids: new Set(), keys: new Set() };
  }
  const items = [];
  const ids = new Set();
  const keys = new Set();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const id = asText(item.id);
    const filename = asText(item.filename || item.name);
    const url = asText(item.url);
    const key = `${filename.toLowerCase()}|${url.toLowerCase()}`;
    if (id) ids.add(id);
    if (filename || url) keys.add(key);
    items.push({ id, filename, url, raw: item });
  }
  return { count: items.length, items, ids, keys };
}

function isAttachmentDuplicate(summary, att) {
  const id = asText(att.id);
  const filename = asText(att.filename || att.name);
  const url = asText(att.url);
  if (id && summary.ids.has(id)) return true;
  const key = `${filename.toLowerCase()}|${url.toLowerCase()}`;
  if ((filename || url) && summary.keys.has(key)) return true;
  return false;
}

function buildMergedAttachments(targetValue, sourceValue) {
  const targetSummary = attachmentSummary(targetValue);
  const sourceSummary = attachmentSummary(sourceValue);
  const keep = targetSummary.items
    .filter((a) => a.id)
    .map((a) => ({ id: a.id }));
  const added = [];
  const skippedNoUrl = [];

  for (const att of sourceSummary.items) {
    if (isAttachmentDuplicate(targetSummary, att)) continue;
    if (!att.url) {
      skippedNoUrl.push(att.filename || att.id || "(unnamed)");
      continue;
    }
    const payload = { url: att.url };
    if (att.filename) payload.filename = att.filename;
    added.push(payload);
    // Prevent double-add within same merge
    targetSummary.ids.add(att.id || `new:${att.url}`);
    targetSummary.keys.add(`${(att.filename || "").toLowerCase()}|${att.url.toLowerCase()}`);
  }

  return {
    changed: added.length > 0,
    writeValue: added.length ? [...keep, ...added] : null,
    addedCount: added.length,
    keptCount: keep.length,
    skippedNoUrl,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMutationGate(maxPerWindow, windowMs) {
  const timestamps = [];
  async function waitTurn() {
    const now = Date.now();
    while (timestamps.length && now - timestamps[0] >= windowMs) {
      timestamps.shift();
    }
    if (timestamps.length >= maxPerWindow) {
      const waitMs = windowMs - (now - timestamps[0]) + 10;
      await sleep(Math.max(waitMs, 10));
      return waitTurn();
    }
    timestamps.push(Date.now());
  }
  return { waitTurn };
}

function isRateLimitError(err) {
  const msg = String(err?.message || err || "");
  return /15 mutations|every 1000ms|rate limit|429|too many requests/i.test(msg);
}

async function mutateWithRetry(gate, fn, maxRetries) {
  let attempt = 0;
  while (true) {
    await gate.waitTurn();
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (!isRateLimitError(err) || attempt > maxRetries) throw err;
      await sleep(CONFIG.mutation.windowMs * attempt);
    }
  }
}

function safeUnloadQuery(query) {
  if (!query) return;
  try {
    if (typeof query.unloadData === "function") query.unloadData();
  } catch {
    // ignore
  }
}

function previewValue(value, maxLen = 160) {
  if (value == null) return "(empty)";
  if (Array.isArray(value)) {
    if (!value.length) return "(empty array)";
    if (value[0] && typeof value[0] === "object" && (value[0].url || value[0].id || value[0].filename)) {
      return `[${value.length} attachment(s)]`;
    }
    if (value[0] && typeof value[0] === "object" && value[0].name != null) {
      return value.map((v) => v.name).join(", ");
    }
    return JSON.stringify(value).slice(0, maxLen);
  }
  if (typeof value === "object" && value.name != null) return String(value.name);
  if (typeof value === "boolean") return value ? "true" : "false";
  const text = asText(value);
  if (!text) return "(empty)";
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

// ---------------------------------------------------------------------------
// Field resolution + record projection
// ---------------------------------------------------------------------------

function resolveSourceFields(sourceTable) {
  const s = CONFIG.source;
  return {
    name: resolveFieldName(sourceTable, s.name),
    video: resolveFieldName(sourceTable, s.video),
    athlete: resolveFieldName(sourceTable, s.athlete),
    athleteHeadshot: resolveFieldName(sourceTable, s.athleteHeadshot),
    thumbnail: resolveFieldName(sourceTable, s.thumbnail),
    displayImage: resolveFieldName(sourceTable, s.displayImage),
    tutorialType: resolveFieldName(sourceTable, s.tutorialType),
    category: resolveFieldName(sourceTable, s.category),
    program: resolveFieldName(sourceTable, s.program),
    brief: resolveFieldName(sourceTable, s.brief),
    detailed: resolveFieldName(sourceTable, s.detailed),
    publish: resolveFieldName(sourceTable, s.publish),
    sortOrder: resolveFieldName(sourceTable, s.sortOrder),
  };
}

function resolveTargetFields(targetTable) {
  const t = CONFIG.target;
  const primary = resolveTargetPrimaryNameField(targetTable);
  return {
    primary,
    name: primary ? primary.name : resolveFieldName(targetTable, t.nameCandidates),
    nameWriteKey: primary ? primary.writeKey : resolveFieldName(targetTable, t.nameCandidates),
    video: resolveFieldName(targetTable, t.video),
    athlete: resolveFieldName(targetTable, t.athlete),
    athleteHeadshot: resolveFieldName(targetTable, t.athleteHeadshot),
    thumbnail: resolveFieldName(targetTable, t.thumbnail),
    displayImage: resolveFieldName(targetTable, t.displayImage),
    typeOfAsset: resolveFieldName(targetTable, t.typeOfAsset),
    program: resolveFieldName(targetTable, t.program),
    brief: resolveFieldName(targetTable, t.brief),
    detailed: resolveFieldName(targetTable, t.detailed),
    publish: resolveFieldName(targetTable, t.publish),
    sortOrder: resolveFieldName(targetTable, t.sortOrder),
    legacySourceId: resolveFieldName(targetTable, t.legacySourceId),
    migrationStatus: resolveFieldName(targetTable, t.migrationStatus),
  };
}

function projectSource(record, fields, table) {
  const get = (fieldName) => {
    if (!fieldName || !fieldExists(table, fieldName)) return null;
    try {
      return record.getCellValue(fieldName);
    } catch {
      return null;
    }
  };
  const getStr = (fieldName) => {
    if (!fieldName || !fieldExists(table, fieldName)) return "";
    try {
      return String(record.getCellValueAsString(fieldName) || "");
    } catch {
      return "";
    }
  };

  const nameRaw = getStr(fields.name);
  const videoRaw = richTextToPlain(get(fields.video)) || getStr(fields.video).trim();
  const brief = richTextToPlain(get(fields.brief)) || getStr(fields.brief).trim();
  const detailed = richTextToPlain(get(fields.detailed)) || getStr(fields.detailed).trim();
  const sortRaw = get(fields.sortOrder);
  const sortOrder = typeof sortRaw === "number" ? sortRaw : Number(sortRaw);
  const category = selectNames(get(fields.category));

  return {
    id: record.id,
    name: stripBom(nameRaw).trim(),
    nameKey: normalizeNameKey(nameRaw),
    videoRaw,
    videoKey: normalizeVideoKey(videoRaw),
    athlete: asText(get(fields.athlete) ?? getStr(fields.athlete)).trim(),
    types: selectNames(get(fields.tutorialType)),
    category,
    programs: selectNames(get(fields.program)),
    brief,
    detailed,
    published: isPublished(get(fields.publish)),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : null,
    attachments: {
      thumbnail: get(fields.thumbnail),
      headshot: get(fields.athleteHeadshot),
      display: get(fields.displayImage),
    },
  };
}

function projectTarget(record, fields, table) {
  const get = (fieldName) => {
    if (!fieldName || !fieldExists(table, fieldName)) return null;
    try {
      return record.getCellValue(fieldName);
    } catch {
      return null;
    }
  };
  const getStr = (fieldName) => {
    if (!fieldName || !fieldExists(table, fieldName)) return "";
    try {
      return String(record.getCellValueAsString(fieldName) || "");
    } catch {
      return "";
    }
  };

  const nameField = fields.name;
  const nameRaw = getStr(nameField);
  const videoRaw = richTextToPlain(get(fields.video)) || getStr(fields.video).trim();
  const brief = richTextToPlain(get(fields.brief)) || getStr(fields.brief).trim();
  const detailed = richTextToPlain(get(fields.detailed)) || getStr(fields.detailed).trim();
  const sortRaw = get(fields.sortOrder);
  const sortOrder = typeof sortRaw === "number" ? sortRaw : Number(sortRaw);
  const typeNames = selectNames(get(fields.typeOfAsset));
  const legacy = getStr(fields.legacySourceId).trim();
  const migrationStatus = selectNames(get(fields.migrationStatus))[0] || getStr(fields.migrationStatus).trim();

  return {
    id: record.id,
    name: stripBom(nameRaw).trim(),
    nameKey: normalizeNameKey(nameRaw),
    videoRaw,
    videoKey: normalizeVideoKey(videoRaw),
    athlete: asText(get(fields.athlete) ?? getStr(fields.athlete)).trim(),
    typeOfAsset: typeNames[0] || "",
    programs: selectNames(get(fields.program)),
    brief,
    detailed,
    published: isPublished(get(fields.publish)),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : null,
    legacySourceId: legacy,
    migrationStatus,
    raw: {
      video: get(fields.video),
      athlete: get(fields.athlete),
      typeOfAsset: get(fields.typeOfAsset),
      program: get(fields.program),
      brief: get(fields.brief),
      detailed: get(fields.detailed),
      publish: get(fields.publish),
      sortOrder: get(fields.sortOrder),
      thumbnail: get(fields.thumbnail),
      headshot: get(fields.athleteHeadshot),
      display: get(fields.displayImage),
      legacy: get(fields.legacySourceId),
      migrationStatus: get(fields.migrationStatus),
    },
  };
}

// ---------------------------------------------------------------------------
// Merge planning (no writes)
// ---------------------------------------------------------------------------

function planScalarMissing({
  label,
  targetField,
  targetTable,
  targetEmpty,
  sourceHas,
  buildWrite,
  conflictKeepTarget,
  skipped,
  planned,
  conflicts,
}) {
  if (!targetField || !isWritableField(targetTable, targetField)) {
    skipped.push({ field: label, reason: "target_field_missing_or_unwritable" });
    return;
  }
  if (!sourceHas) return;
  if (targetEmpty) {
    const writeValue = buildWrite();
    if (writeValue == null) return;
    planned.push({
      field: label,
      targetField,
      action: "fill_missing",
      writeValue,
      preview: previewValue(writeValue),
    });
    return;
  }
  if (conflictKeepTarget) {
    conflicts.push({
      field: label,
      reason: "target_has_different_value_preserved",
      action: "keep_target",
    });
  }
}

function planDescriptionMerge({
  label,
  targetField,
  targetTable,
  targetText,
  sourceText,
  planned,
  conflicts,
  skipped,
}) {
  if (!targetField || !isWritableField(targetTable, targetField)) {
    skipped.push({ field: label, reason: "target_field_missing_or_unwritable" });
    return;
  }
  if (!sourceText) return;

  if (!targetText) {
    planned.push({
      field: label,
      targetField,
      action: "fill_missing",
      writeValue: sourceText,
      preview: previewValue(sourceText),
    });
    return;
  }

  if (normalizeDescKey(targetText) === normalizeDescKey(sourceText)) {
    return;
  }

  // Different: append source; preserve target
  if (targetText.includes(sourceText) || normalizeDescKey(targetText).includes(normalizeDescKey(sourceText))) {
    conflicts.push({
      field: label,
      reason: "source_text_already_contained_in_target",
      action: "keep_target",
    });
    return;
  }

  const merged = `${targetText}${CONFIG.values.descriptionSeparator}${sourceText}`;
  planned.push({
    field: label,
    targetField,
    action: "append_different_source",
    writeValue: merged,
    preview: previewValue(merged, 220),
    note: "Target preserved; source appended",
  });
}

function planAttachmentMerge({
  label,
  targetField,
  targetTable,
  targetValue,
  sourceValue,
  planned,
  skipped,
}) {
  if (!targetField || !isWritableField(targetTable, targetField)) {
    skipped.push({ field: label, reason: "target_field_missing_or_unwritable" });
    return;
  }
  const merged = buildMergedAttachments(targetValue, sourceValue);
  if (merged.skippedNoUrl.length) {
    skipped.push({
      field: label,
      reason: "attachment_urls_unavailable_for_copy",
      value: merged.skippedNoUrl,
    });
  }
  if (!merged.changed || !merged.writeValue) return;
  planned.push({
    field: label,
    targetField,
    action: "add_missing_attachments",
    writeValue: merged.writeValue,
    preview: `keep ${merged.keptCount} + add ${merged.addedCount}`,
  });
}

function planMergePair(source, target, targetFields, targetTable, mergeTitle) {
  const planned = [];
  const conflicts = [];
  const skipped = [];
  const reviewNotes = [];
  let status = "ready";
  let stopReason = "";

  const titleKey = normalizeNameKey(mergeTitle || source.name);
  const videoOverride = CONFIG.videoConflictOverrides[titleKey] || null;

  // Category exists only on source — report, never invent schema
  if (source.category.length) {
    skipped.push({
      field: "Tutorial - Category",
      reason: "no_target_field",
      value: source.category,
    });
  }

  // Video handling
  const sourceVideo = source.videoRaw;
  const targetVideo = target.videoRaw;
  const videosConflict =
    Boolean(sourceVideo) && Boolean(targetVideo) && source.videoKey !== target.videoKey;

  if (videosConflict && videoOverride && videoOverride.resolution === "keep_target_authoritative") {
    const expectedKey = normalizeVideoKey(videoOverride.authoritativeVideo);
    const targetMatchesAuthoritative = target.videoKey === expectedKey;
    conflicts.push({
      field: "Link to Video",
      reason: "video_link_conflict_resolved",
      action: "keep_target_authoritative",
      sourceVideo,
      targetVideo,
      authoritativeVideo: videoOverride.authoritativeVideo,
      targetMatchesAuthoritative,
    });
    reviewNotes.push(
      [
        videoOverride.reviewNote,
        `Target (kept): ${targetVideo}`,
        `Source (not applied): ${sourceVideo}`,
        targetMatchesAuthoritative
          ? "Target video matches configured authoritative URL."
          : `WARNING: target video does not exactly match configured authoritative URL (${videoOverride.authoritativeVideo}). Target still preserved; not overwritten.`,
      ].join(" "),
    );
    // Do not copy or overwrite video — continue other merges.
  } else if (videosConflict) {
    status = "stopped_video_conflict";
    stopReason = "video_link_conflict";
    conflicts.push({
      field: "Link to Video",
      reason: "video_link_conflict",
      action: "manual_review_required",
      sourceVideo,
      targetVideo,
    });
    return { status, stopReason, planned, conflicts, skipped, reviewNotes, fieldsToWrite: {} };
  } else if (videoOverride && videoOverride.resolution === "keep_target_authoritative") {
    // Even without conflict, never pull source video onto this title.
    if (targetVideo) {
      skipped.push({
        field: "Link to Video",
        reason: "authoritative_target_preserved",
        value: targetVideo,
      });
    } else if (sourceVideo) {
      conflicts.push({
        field: "Link to Video",
        reason: "authoritative_target_empty_source_not_copied",
        action: "manual_review_required",
        sourceVideo,
        targetVideo: "",
      });
    }
  } else {
    planScalarMissing({
      label: "Link to Video",
      targetField: targetFields.video,
      targetTable,
      targetEmpty: !targetVideo,
      sourceHas: Boolean(sourceVideo),
      buildWrite: () => sourceVideo,
      conflictKeepTarget: false,
      skipped,
      planned,
      conflicts,
    });
  }

  // Type of Asset from Tutorial Type
  const mappedType = mapTutorialTypeToAssetType(source.types);
  planScalarMissing({
    label: "Type of Asset",
    targetField: targetFields.typeOfAsset,
    targetTable,
    targetEmpty: !target.typeOfAsset,
    sourceHas: Boolean(mappedType),
    buildWrite: () =>
      toSingleSelectValue(targetTable, targetFields.typeOfAsset, mappedType, skipped, "Type of Asset"),
    conflictKeepTarget:
      Boolean(target.typeOfAsset) &&
      Boolean(mappedType) &&
      normalizeTypeLabel(target.typeOfAsset) !== normalizeTypeLabel(mappedType),
    skipped,
    planned,
    conflicts,
  });

  // Associated Program — fill only when target empty
  planScalarMissing({
    label: "Associated Program",
    targetField: targetFields.program,
    targetTable,
    targetEmpty: !target.programs.length,
    sourceHas: source.programs.length > 0,
    buildWrite: () =>
      toMultiSelectValue(targetTable, targetFields.program, source.programs, skipped, "Associated Program"),
    conflictKeepTarget:
      target.programs.length > 0 &&
      source.programs.length > 0 &&
      normalizeNameKey(target.programs.slice().sort().join("|")) !==
        normalizeNameKey(source.programs.slice().sort().join("|")),
    skipped,
    planned,
    conflicts,
  });

  // Athlete
  planScalarMissing({
    label: "Athlete",
    targetField: targetFields.athlete,
    targetTable,
    targetEmpty: !target.athlete,
    sourceHas: Boolean(source.athlete),
    buildWrite: () => {
      const type = getFieldType(targetTable, targetFields.athlete);
      if (type === "singleSelect") {
        return toSingleSelectValue(targetTable, targetFields.athlete, source.athlete, skipped, "Athlete");
      }
      return source.athlete;
    },
    conflictKeepTarget:
      Boolean(target.athlete) &&
      Boolean(source.athlete) &&
      normalizeNameKey(target.athlete) !== normalizeNameKey(source.athlete),
    skipped,
    planned,
    conflicts,
  });

  // Publish — fill only when target unpublished and source published
  const publishType = getFieldType(targetTable, targetFields.publish);
  planScalarMissing({
    label: "OK to Publish on Softr",
    targetField: targetFields.publish,
    targetTable,
    targetEmpty: !target.published,
    sourceHas: source.published === true,
    buildWrite: () => {
      if (publishType === "checkbox") return true;
      if (publishType === "singleSelect") {
        return toSingleSelectValue(
          targetTable,
          targetFields.publish,
          "checked",
          skipped,
          "OK to Publish on Softr",
        );
      }
      skipped.push({ field: "OK to Publish on Softr", reason: "unsupported_publish_field_type", value: publishType });
      return null;
    },
    conflictKeepTarget: target.published && !source.published,
    skipped,
    planned,
    conflicts,
  });

  // Sort Order
  planScalarMissing({
    label: "Sort Order",
    targetField: targetFields.sortOrder,
    targetTable,
    targetEmpty: target.sortOrder == null,
    sourceHas: source.sortOrder != null,
    buildWrite: () => source.sortOrder,
    conflictKeepTarget:
      target.sortOrder != null && source.sortOrder != null && target.sortOrder !== source.sortOrder,
    skipped,
    planned,
    conflicts,
  });

  planDescriptionMerge({
    label: "Brief Descriptions",
    targetField: targetFields.brief,
    targetTable,
    targetText: target.brief,
    sourceText: source.brief,
    planned,
    conflicts,
    skipped,
  });

  planDescriptionMerge({
    label: "Detailed Description",
    targetField: targetFields.detailed,
    targetTable,
    targetText: target.detailed,
    sourceText: source.detailed,
    planned,
    conflicts,
    skipped,
  });

  planAttachmentMerge({
    label: "Thumbnail",
    targetField: targetFields.thumbnail,
    targetTable,
    targetValue: target.raw.thumbnail,
    sourceValue: source.attachments.thumbnail,
    planned,
    skipped,
  });

  planAttachmentMerge({
    label: "Athlete Headshot",
    targetField: targetFields.athleteHeadshot,
    targetTable,
    targetValue: target.raw.headshot,
    sourceValue: source.attachments.headshot,
    planned,
    skipped,
  });

  planAttachmentMerge({
    label: "Display Image",
    targetField: targetFields.displayImage,
    targetTable,
    targetValue: target.raw.display,
    sourceValue: source.attachments.display,
    planned,
    skipped,
  });

  // Legacy Tutorials Record ID
  if (!targetFields.legacySourceId || !isWritableField(targetTable, targetFields.legacySourceId)) {
    skipped.push({ field: "Legacy Tutorials Record ID", reason: "missing_or_unwritable" });
  } else if (!target.legacySourceId) {
    planned.push({
      field: "Legacy Tutorials Record ID",
      targetField: targetFields.legacySourceId,
      action: "fill_missing",
      writeValue: source.id,
      preview: source.id,
    });
  } else if (target.legacySourceId === source.id) {
    // already correct
  } else {
    conflicts.push({
      field: "Legacy Tutorials Record ID",
      reason: "target_has_different_legacy_id_preserved",
      action: "keep_target",
      targetValue: target.legacySourceId,
      sourceValue: source.id,
    });
  }

  // Migration Status — set on successful merge write
  if (!targetFields.migrationStatus || !isWritableField(targetTable, targetFields.migrationStatus)) {
    skipped.push({ field: "Migration Status", reason: "missing_or_unwritable" });
  } else if (normalizeNameKey(target.migrationStatus) !== normalizeNameKey(CONFIG.values.migrationStatus)) {
    const statusType = getFieldType(targetTable, targetFields.migrationStatus);
    let writeValue = CONFIG.values.migrationStatus;
    if (statusType === "singleSelect") {
      writeValue = toSingleSelectValue(
        targetTable,
        targetFields.migrationStatus,
        CONFIG.values.migrationStatus,
        skipped,
        "Migration Status",
      );
    }
    if (writeValue != null) {
      planned.push({
        field: "Migration Status",
        targetField: targetFields.migrationStatus,
        action: "set_status",
        writeValue,
        preview: CONFIG.values.migrationStatus,
      });
    }
  }

  const fieldsToWrite = {};
  for (const row of planned) {
    if (row.writeValue != null && row.targetField) {
      fieldsToWrite[row.targetField] = row.writeValue;
    }
  }

  if (!Object.keys(fieldsToWrite).length && !conflicts.some((c) => c.reason === "video_link_conflict")) {
    status = planned.length || conflicts.length || skipped.length || reviewNotes.length
      ? "ready_no_content_writes"
      : "noop";
  }

  return { status, stopReason, planned, conflicts, skipped, reviewNotes, fieldsToWrite };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  output.clear();
  console.log(`=== ${CONFIG.displayName} ${CONFIG.version} ===`);
  console.log("Canonical table: Tutorials & Assets");
  console.log("Source table: Tutorials");
  console.log("Never deletes / never creates / only these three Name matches.");
  console.log("");

  const baseId = base && base.id ? String(base.id) : "";
  if (baseId !== CONFIG.prod.baseId) {
    console.log(
      `WARNING: base.id=${baseId || "(unknown)"} — expected PROD ${CONFIG.prod.baseId}. Aborting.`,
    );
    output.text(`Aborted: wrong base (expected PROD ${CONFIG.prod.baseId}).`);
    return;
  }

  const sourceTable = base.getTable(CONFIG.tables.source);
  const targetTable = base.getTable(CONFIG.tables.target);

  if (sourceTable.id !== CONFIG.prod.tableIds.source) {
    output.text(`Aborted: Tutorials table id mismatch (${sourceTable.id}).`);
    return;
  }
  if (targetTable.id !== CONFIG.prod.tableIds.target) {
    output.text(`Aborted: Tutorials & Assets table id mismatch (${targetTable.id}).`);
    return;
  }

  const sourceFields = resolveSourceFields(sourceTable);
  const targetFields = resolveTargetFields(targetTable);

  if (!sourceFields.name) {
    output.text("Aborted: could not resolve Tutorials Name field.");
    return;
  }
  if (!targetFields.name || !targetFields.primary) {
    output.text(
      "Aborted: could not resolve Tutorials & Assets primary Name (expected BOM-safe Name / fldduBizp8qAnAMJW).",
    );
    return;
  }

  console.log("Field resolution:");
  console.log(
    JSON.stringify(
      {
        sourceName: sourceFields.name,
        targetName: targetFields.name,
        targetNameVia: targetFields.primary.via,
        targetNameWriteKey: targetFields.nameWriteKey,
        legacy: targetFields.legacySourceId || "(missing)",
        migrationStatus: targetFields.migrationStatus || "(missing)",
      },
      null,
      2,
    ),
  );
  console.log("");

  const wantedKeys = CONFIG.mergeTitles.map((t) => ({
    title: t,
    key: normalizeNameKey(t),
  }));

  const sourceQuery = await sourceTable.selectRecordsAsync({
    fields: [...new Set(Object.values(sourceFields).filter(Boolean))],
  });
  const targetFieldList = [
    targetFields.name,
    targetFields.nameWriteKey,
    targetFields.video,
    targetFields.athlete,
    targetFields.athleteHeadshot,
    targetFields.thumbnail,
    targetFields.displayImage,
    targetFields.typeOfAsset,
    targetFields.program,
    targetFields.brief,
    targetFields.detailed,
    targetFields.publish,
    targetFields.sortOrder,
    targetFields.legacySourceId,
    targetFields.migrationStatus,
  ].filter(Boolean);
  const targetQuery = await targetTable.selectRecordsAsync({
    fields: [...new Set(targetFieldList)],
  });

  const sourcesByKey = new Map();
  for (const record of sourceQuery.records) {
    const projected = projectSource(record, sourceFields, sourceTable);
    if (!projected.nameKey) continue;
    const list = sourcesByKey.get(projected.nameKey) || [];
    list.push(projected);
    sourcesByKey.set(projected.nameKey, list);
  }

  const targetsByKey = new Map();
  for (const record of targetQuery.records) {
    const projected = projectTarget(record, targetFields, targetTable);
    if (!projected.nameKey) continue;
    const list = targetsByKey.get(projected.nameKey) || [];
    list.push(projected);
    targetsByKey.set(projected.nameKey, list);
  }

  const pairPlans = [];

  for (const wanted of wantedKeys) {
    const sources = sourcesByKey.get(wanted.key) || [];
    const targets = targetsByKey.get(wanted.key) || [];
    const entry = {
      title: wanted.title,
      nameKey: wanted.key,
      sourceCount: sources.length,
      targetCount: targets.length,
      source: sources[0] || null,
      target: targets[0] || null,
      plan: null,
      error: "",
    };

    if (sources.length !== 1) {
      entry.error =
        sources.length === 0
          ? "SOURCE_NOT_FOUND"
          : `SOURCE_AMBIGUOUS (${sources.length} rows)`;
      pairPlans.push(entry);
      continue;
    }
    if (targets.length !== 1) {
      entry.error =
        targets.length === 0
          ? "TARGET_NOT_FOUND"
          : `TARGET_AMBIGUOUS (${targets.length} rows)`;
      pairPlans.push(entry);
      continue;
    }

    entry.plan = planMergePair(
      entry.source,
      entry.target,
      targetFields,
      targetTable,
      entry.title,
    );
    pairPlans.push(entry);
  }

  safeUnloadQuery(sourceQuery);
  safeUnloadQuery(targetQuery);

  // ---- PREVIEW ----
  console.log("========== COMPLETE PREVIEW (no writes yet) ==========");
  for (const pair of pairPlans) {
    console.log("");
    console.log(`--- ${pair.title} ---`);
    if (pair.error) {
      console.log(`STATUS: ERROR ${pair.error}`);
      console.log("READY: NO");
      continue;
    }
    console.log(`Source Tutorials: ${pair.source.id} | "${pair.source.name}"`);
    console.log(`Target Tutorials & Assets: ${pair.target.id} | "${pair.target.name}"`);
    console.log(`Plan status: ${pair.plan.status}`);
    if (pair.plan.stopReason) console.log(`Stop reason: ${pair.plan.stopReason}`);

    if (pair.plan.status === "stopped_video_conflict") {
      const vc = pair.plan.conflicts.find((c) => c.reason === "video_link_conflict");
      console.log("VIDEO CONFLICT — this record will NOT be written.");
      console.log(`  Source Link to Video: ${vc ? vc.sourceVideo : pair.source.videoRaw}`);
      console.log(`  Target Link to Video: ${vc ? vc.targetVideo : pair.target.videoRaw}`);
      console.log("READY: NO");
    } else {
      console.log("READY: YES");
    }

    const resolvedVideo = (pair.plan.conflicts || []).find(
      (c) => c.reason === "video_link_conflict_resolved",
    );
    if (resolvedVideo) {
      console.log("VIDEO CONFLICT RESOLVED — target video kept (authoritative); other merges continue.");
      console.log(`  Source Link to Video (not applied): ${resolvedVideo.sourceVideo}`);
      console.log(`  Target Link to Video (kept): ${resolvedVideo.targetVideo}`);
      console.log(`  Configured authoritative: ${resolvedVideo.authoritativeVideo}`);
      console.log(
        `  Target matches authoritative URL: ${resolvedVideo.targetMatchesAuthoritative ? "YES" : "NO (target still preserved)"}`,
      );
    }

    console.log("Planned field changes:");
    if (!pair.plan.planned.length) {
      console.log("  (none)");
    } else {
      for (const row of pair.plan.planned) {
        console.log(
          `  • ${row.field} [${row.action}] → ${row.preview}${row.note ? ` (${row.note})` : ""}`,
        );
      }
    }

    console.log("Conflicts:");
    if (!pair.plan.conflicts.length) {
      console.log("  (none)");
    } else {
      for (const c of pair.plan.conflicts) {
        console.log(`  • ${c.field}: ${c.reason} (${c.action})`);
        if (c.sourceVideo != null) console.log(`      source video: ${c.sourceVideo}`);
        if (c.targetVideo != null) console.log(`      target video: ${c.targetVideo}`);
        if (c.targetValue != null) console.log(`      target: ${c.targetValue}`);
        if (c.sourceValue != null) console.log(`      source: ${c.sourceValue}`);
      }
    }

    console.log("Migration review notes (will append to existing Tutorial Migration Review Notes only):");
    if (!(pair.plan.reviewNotes || []).length) {
      console.log("  (none)");
    } else {
      for (const note of pair.plan.reviewNotes) {
        console.log(`  • ${note}`);
      }
    }

    console.log("Skipped / notes:");
    if (!pair.plan.skipped.length) {
      console.log("  (none)");
    } else {
      for (const s of pair.plan.skipped) {
        console.log(`  • ${s.field}: ${s.reason}${s.value != null ? ` | ${JSON.stringify(s.value)}` : ""}`);
      }
    }
  }

  function isPairReady(pair) {
    return Boolean(
      !pair.error &&
        pair.plan &&
        pair.plan.status !== "stopped_video_conflict",
    );
  }

  const readyPairs = pairPlans.filter(isPairReady);
  const writablePairs = pairPlans.filter(
    (p) =>
      isPairReady(p) &&
      (Object.keys(p.plan.fieldsToWrite).length > 0 || (p.plan.reviewNotes || []).length > 0),
  );
  const stoppedPairs = pairPlans.filter(
    (p) => p.plan && p.plan.status === "stopped_video_conflict",
  );
  const errorPairs = pairPlans.filter((p) => p.error);
  const allThreeReady =
    pairPlans.length === CONFIG.mergeTitles.length && readyPairs.length === CONFIG.mergeTitles.length;

  console.log("");
  console.log("========== PREVIEW SUMMARY ==========");
  console.log(`Pairs requested: ${pairPlans.length}`);
  for (const pair of pairPlans) {
    console.log(`  - ${pair.title}: ${isPairReady(pair) ? "READY" : "NOT READY"}`);
  }
  console.log(`Ready count: ${readyPairs.length} / ${CONFIG.mergeTitles.length}`);
  console.log(`All three records ready: ${allThreeReady ? "YES" : "NO"}`);
  console.log(`Pairs with planned writes/notes: ${writablePairs.length}`);
  console.log(`Stopped (unresolved video conflict): ${stoppedPairs.length}`);
  console.log(`Errors (match): ${errorPairs.length}`);
  console.log(`previewOnly=${CONFIG.previewOnly}`);
  console.log("");

  if (!allThreeReady) {
    output.text(
      [
        "PREVIEW COMPLETE — NOT ALL THREE READY.",
        `Ready: ${readyPairs.length} / ${CONFIG.mergeTitles.length}.`,
        "Confirmation will not be requested. Fix match/video blockers, then re-run preview.",
        "No records were modified.",
      ].join("\n"),
    );
    return;
  }

  console.log("★ ALL THREE RECORDS ARE READY FOR MERGE ★");
  console.log("Target video for Parent Motivation is preserved when links differ.");
  console.log("");

  output.text(
    [
      "PREVIEW COMPLETE — ALL THREE RECORDS ARE READY.",
      `Work Hard, It Pays: READY`,
      `Refs Get it Right - NBA: READY`,
      `Parent Motivation - Habits & Struggles: READY (target video authoritative if conflict)`,
      CONFIG.previewOnly
        ? "previewOnly=true — stopping after preview. Set CONFIG.previewOnly=false to enable CONFIRM MERGE writes."
        : `Type exactly ${CONFIG.values.confirmPhrase} in the next prompt to apply writes. Anything else cancels.`,
    ].join("\n"),
  );

  if (CONFIG.previewOnly) {
    console.log("previewOnly=true — no confirmation prompt; no writes.");
    return;
  }

  const typed = await input.textAsync(
    `All three records are ready. Type ${CONFIG.values.confirmPhrase} to write ${writablePairs.length} update(s). Anything else cancels.`,
  );

  if (String(typed || "").trim() !== CONFIG.values.confirmPhrase) {
    console.log("");
    console.log(`Cancelled. Typed "${typed}" — expected exactly "${CONFIG.values.confirmPhrase}".`);
    console.log("No records were modified.");
    output.text("Cancelled — no writes.");
    return;
  }

  if (!writablePairs.length) {
    console.log("");
    console.log("Nothing to write (no planned field updates or review notes).");
    output.text("Confirmed, but no writable field updates were planned.");
    return;
  }

  // ---- WRITE ----
  console.log("");
  console.log("========== WRITING ==========");
  const gate = createMutationGate(CONFIG.mutation.maxPerWindow, CONFIG.mutation.windowMs);
  const writeResults = [];

  let reportTable = null;
  try {
    reportTable = base.getTable(CONFIG.tables.report);
    if (reportTable.id !== CONFIG.prod.tableIds.report) {
      console.log(
        `WARNING: Tutorial Migration Review id mismatch (${reportTable.id}); skipping Notes updates.`,
      );
      reportTable = null;
    }
  } catch {
    console.log("WARNING: Tutorial Migration Review table not found; skipping Notes updates.");
    reportTable = null;
  }

  const reportNotesField = reportTable
    ? resolveFieldName(reportTable, CONFIG.report.notes)
    : "";
  const reportSourceIdField = reportTable
    ? resolveFieldName(reportTable, CONFIG.report.sourceId)
    : "";
  const reportTargetIdField = reportTable
    ? resolveFieldName(reportTable, CONFIG.report.targetId)
    : "";

  let reportQuery = null;
  if (reportTable && reportNotesField && isWritableField(reportTable, reportNotesField)) {
    const reportFields = [reportNotesField, reportSourceIdField, reportTargetIdField].filter(Boolean);
    reportQuery = await reportTable.selectRecordsAsync({ fields: [...new Set(reportFields)] });
  }

  for (const pair of writablePairs) {
    const fields = pair.plan.fieldsToWrite;
    const fieldNames = Object.keys(fields);
    console.log(`Updating ${pair.target.id} (${pair.title}) — ${fieldNames.length} field(s)…`);

    try {
      if (fieldNames.length) {
        await mutateWithRetry(
          gate,
          () => targetTable.updateRecordAsync(pair.target.id, fields),
          CONFIG.mutation.maxRetries,
        );
      }

      let reviewNoteWrite = null;
      if (
        reportTable &&
        reportQuery &&
        reportNotesField &&
        (pair.plan.reviewNotes || []).length
      ) {
        const noteText = pair.plan.reviewNotes.join("\n");
        const match =
          reportQuery.records.find((r) => {
            const sid = reportSourceIdField
              ? String(r.getCellValueAsString(reportSourceIdField) || "").trim()
              : "";
            const tid = reportTargetIdField
              ? String(r.getCellValueAsString(reportTargetIdField) || "").trim()
              : "";
            return sid === pair.source.id || tid === pair.target.id;
          }) || null;

        if (!match) {
          reviewNoteWrite = {
            ok: false,
            reason: "no_existing_review_row (never creates)",
          };
          console.log("  Review Notes: no existing Tutorial Migration Review row — not creating.");
        } else {
          const existing = String(match.getCellValueAsString(reportNotesField) || "").trim();
          const already = existing.includes("target video confirmed authoritative");
          if (already) {
            reviewNoteWrite = { ok: true, reason: "notes_already_contain_resolution", recordId: match.id };
            console.log(`  Review Notes: already recorded on ${match.id}; left unchanged.`);
          } else {
            const mergedNotes = existing ? `${existing}\n\n${noteText}` : noteText;
            await mutateWithRetry(
              gate,
              () => reportTable.updateRecordAsync(match.id, { [reportNotesField]: mergedNotes }),
              CONFIG.mutation.maxRetries,
            );
            reviewNoteWrite = { ok: true, reason: "notes_appended", recordId: match.id };
            console.log(`  Review Notes: appended on existing review row ${match.id}.`);
          }
        }
      }

      writeResults.push({
        title: pair.title,
        targetId: pair.target.id,
        sourceId: pair.source.id,
        ok: true,
        changedFields: pair.plan.planned.map((p) => ({
          field: p.field,
          action: p.action,
          preview: p.preview,
        })),
        conflicts: pair.plan.conflicts,
        skipped: pair.plan.skipped,
        reviewNotes: pair.plan.reviewNotes || [],
        reviewNoteWrite,
      });
      console.log(`  OK — target fields written: ${fieldNames.length}.`);
    } catch (err) {
      writeResults.push({
        title: pair.title,
        targetId: pair.target.id,
        sourceId: pair.source.id,
        ok: false,
        error: String(err && err.message ? err.message : err),
        changedFields: [],
        conflicts: pair.plan.conflicts,
        skipped: pair.plan.skipped,
        reviewNotes: pair.plan.reviewNotes || [],
      });
      console.log(`  ERROR: ${err && err.message ? err.message : err}`);
    }
  }

  safeUnloadQuery(reportQuery);

  console.log("");
  console.log("========== WRITE RESULTS ==========");
  for (const result of writeResults) {
    console.log("");
    console.log(`--- ${result.title} ---`);
    console.log(`Target: ${result.targetId} | Source: ${result.sourceId}`);
    console.log(`Write OK: ${result.ok}`);
    if (!result.ok) {
      console.log(`Error: ${result.error}`);
    }
    console.log("Fields changed:");
    if (!result.changedFields.length) {
      console.log("  (none)");
    } else {
      for (const f of result.changedFields) {
        console.log(`  • ${f.field} [${f.action}] → ${f.preview}`);
      }
    }
    console.log("Conflicts:");
    if (!result.conflicts.length) {
      console.log("  (none)");
    } else {
      for (const c of result.conflicts) {
        console.log(`  • ${c.field}: ${c.reason}`);
      }
    }
    console.log("Review notes:");
    if (!(result.reviewNotes || []).length) {
      console.log("  (none)");
    } else {
      for (const n of result.reviewNotes) console.log(`  • ${n}`);
    }
    if (result.reviewNoteWrite) {
      console.log(`Review Notes write: ${JSON.stringify(result.reviewNoteWrite)}`);
    }
    console.log("Skipped:");
    if (!result.skipped.length) {
      console.log("  (none)");
    } else {
      for (const s of result.skipped) {
        console.log(`  • ${s.field}: ${s.reason}`);
      }
    }
  }

  // Also report non-written pairs after confirm
  for (const pair of pairPlans) {
    if (writablePairs.includes(pair)) continue;
    console.log("");
    console.log(`--- NOT WRITTEN: ${pair.title} ---`);
    if (pair.error) {
      console.log(`Reason: ${pair.error}`);
    } else if (pair.plan && pair.plan.status === "stopped_video_conflict") {
      const vc = pair.plan.conflicts.find((c) => c.reason === "video_link_conflict");
      console.log("Reason: video link conflict (manual review)");
      console.log(`  Source: ${vc ? vc.sourceVideo : ""}`);
      console.log(`  Target: ${vc ? vc.targetVideo : ""}`);
    } else {
      console.log(`Reason: ${pair.plan ? pair.plan.status : "unknown"} (no field updates)`);
      if (pair.plan) {
        console.log("Conflicts:");
        for (const c of pair.plan.conflicts) console.log(`  • ${c.field}: ${c.reason}`);
        console.log("Skipped:");
        for (const s of pair.plan.skipped) console.log(`  • ${s.field}: ${s.reason}`);
      }
    }
  }

  const okCount = writeResults.filter((r) => r.ok).length;
  console.log("");
  console.log(
    JSON.stringify(
      {
        script: CONFIG.scriptName,
        version: CONFIG.version,
        writtenOk: okCount,
        writtenFailed: writeResults.length - okCount,
        allThreeReady,
        stoppedVideoConflicts: stoppedPairs.map((p) => p.title),
        matchErrors: errorPairs.map((p) => ({ title: p.title, error: p.error })),
      },
      null,
      2,
    ),
  );

  output.text(
    [
      `Write finished. OK=${okCount} / attempted=${writeResults.length}.`,
      `Unresolved video conflicts: ${stoppedPairs.length}.`,
      "See console for every field changed and every conflict.",
      "No records deleted. No records created. Only matched target/review rows updated.",
    ].join("\n"),
  );
}

await main();
