/*
Extension Script: Migrate Tutorials → Tutorials & Assets (audit + safe create)
System: 127 SI Shooting Challenge
Backlog: C-026 (direction override — see DECISION CONFLICT below)
Purpose:
  Preview and safely stage migration of Tutorials rows into Tutorials & Assets
  without deleting Tutorials, without overwriting existing target rows, and
  without merging overlaps automatically.

DECISION CONFLICT (read before write mode):
  Repo backlog C-026 + Online Agent 8 docs currently recommend KEEP Tutorials
  (web-canonical at /tutorials, /shoutouts, /articles) and retire Tutorials & Assets.
  This script implements Mike's requested reverse direction:
    SOURCE = Tutorials → TARGET TO KEEP = Tutorials & Assets
  Do NOT repoint web/automations/interfaces until Mike approves the review report
  AND explicitly reverses or updates C-026.

Safety:
  - Never deletes Tutorials table or any Tutorials / linked asset records
  - Never updates/overwrites existing Tutorials & Assets content fields
  - Never merges HIGH_CONFIDENCE / POSSIBLE overlaps — report only
  - Write mode only:
      * creates NO_MATCH_CREATE target rows (when prerequisites exist)
      * creates/updates Tutorial Migration Review rows
  - DRY_RUN defaults true; CONFIRM_WRITE must be true for writes
  - Idempotent: skips creates when Legacy Tutorials Record ID already present

Prerequisites (script reports; does not create schema):
  On Tutorials & Assets:
    - Legacy Tutorials Record ID (single line text)
    - Migration Status (single select or text; option "Migrated - Review Needed")
  Table: Tutorial Migration Review with fields listed in CONFIG.report

Version: v1.2
Date Written: 2026-08-17
Last Updated: 2026-08-17

v1.2:
  - Multi-select writes use [{name}] ; single-select writes use {name}
  - Validate select options before write; skip missing options into Notes
  - Throttle mutations (max 15 / 1000ms) with rate-limit retry
  - Lock runtime to PROD base/table IDs; remove stale Production wording from output
v1.1:
  - Guard unloadData (Extension QueryResult may not support it)
  - Resolve Tutorials & Assets primary Name by stable field ID (BOM-safe); never create Name
  - Hard preflight before WRITE for legacy ID, migration status, and review table/fields
*/

// @ts-nocheck

const DRY_RUN = true;
const CONFIRM_WRITE = false;
const BATCH_LIMIT = 25;
const WRITE_CREATES = true;
const WRITE_REPORT = true;
/** Airtable scripting limit: 15 mutations / 1000ms */
const MAX_MUTATIONS_PER_WINDOW = 15;
const MUTATION_WINDOW_MS = 1000;
const MUTATION_MAX_RETRIES = 6;

const CLASSIFICATION = {
  HIGH: "HIGH_CONFIDENCE_MATCH",
  POSSIBLE: "POSSIBLE_MATCH_REVIEW",
  CREATE: "NO_MATCH_CREATE",
  MISSING: "MISSING_REQUIRED_DATA",
};

const CONFIG = {
  scriptName: "migrate-tutorials-into-tutorials-and-assets",
  displayName: "Migrate Tutorials → Tutorials & Assets (safe preview)",
  version: "v1.2",

  // PROD only — script refuses WRITE (and warns on DRY_RUN) if base.id mismatches.
  prod: {
    baseId: "appn84sqPw03zEbTT",
    baseNameContains: "SHOOTING CHALLENGE",
    tableIds: {
      source: "tbldfoVGdhqATi4MS", // Tutorials
      target: "tblDOTgsWfqPm18bw", // Tutorials & Assets
      report: "tblxualvnUsgcpu0z", // Tutorial Migration Review
    },
    fieldIds: {
      targetPrimaryName: "fldduBizp8qAnAMJW",
      targetLegacySourceId: "fldiO6p003sUoSvQf",
      targetMigrationStatus: "fldBq01kq7mm6FmvK",
    },
  },

  // Confirmed PROD dry-run baseline — do not invent a second Name field.
  lastDryRunBaseline: {
    date: "2026-08-17",
    highConfidenceMatches: 28,
    possibleMatches: 3,
    noMatchCreate: 1,
    sourceRecords: 32,
    targetRecords: 32,
    unmatchedCreateName: "Shooting Challenge Information Poster",
  },

  tables: {
    source: "Tutorials",
    target: "Tutorials & Assets",
    report: "Tutorial Migration Review",
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
    // Primary Name carries an invisible BOM in schema exports ("\uFEFFName").
    // Prefer this stable field ID for reads/writes — never create a duplicate Name field.
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
    assignmentRationale: "Assignment Rationale",
    publish: "OK to Publish on Softr",
    sortOrder: "Sort Order",
    legacySourceId: "Legacy Tutorials Record ID",
    migrationStatus: "Migration Status",
  },

  report: {
    sourceId: "Source Tutorials Record ID",
    targetId: "Target Tutorials and Assets Record ID",
    classification: "Match Classification",
    confidence: "Confidence Score",
    reasons: "Match Reasons",
    conflicts: "Conflicting Fields",
    sourceName: "Source Name",
    targetName: "Target Name",
    sourceVideo: "Source Video Link",
    targetVideo: "Target Video Link",
    sourceAttachments: "Source Attachments",
    targetAttachments: "Target Attachments",
    linkedAssets: "Linked Asset Summary",
    reviewDecision: "Review Decision",
    reviewed: "Reviewed?",
    finalAction: "Final Action",
    notes: "Notes",
    // Primary on report table — helpful for browsing
    name: "Name",
  },

  values: {
    migrationStatusCreated: "Migrated - Review Needed",
    reviewDecisionPending: "Pending Review",
    finalActionReviewNeeded: "Review Needed",
    recommendedHigh: "Keep target; do not auto-merge. Confirm duplicate then archive/ignore source after cutover.",
    recommendedPossible: "Manual review required. Decide merge / keep both / delete target duplicate — script will not merge.",
    recommendedCreate: "Create new Tutorials & Assets row from source (compatible fields only).",
    recommendedMissing: "Fill required source Name (and preferably Link to Video) before create.",
  },

  thresholds: {
    highMinScore: 70,
    possibleMinScore: 35,
    nearNameMin: 0.88,
  },
};

// ---------------------------------------------------------------------------
// Helpers (offline tests extract everything above async function main)
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
  if (typeof value === "object") {
    if (value.name != null) return stripBom(String(value.name));
    if (value.url != null) return stripBom(String(value.url));
  }
  return stripBom(String(value));
}

function normalizeName(value) {
  return asText(value)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function extractUrls(value) {
  const text = asText(value);
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) || [];
  return matches.map((url) => url.replace(/[),.;]+$/g, ""));
}

function canonicalizeMediaUrl(rawUrl) {
  const raw = String(rawUrl || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    // YouTube
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] || "";
      return id ? `youtube:${id}` : "";
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      let id = url.searchParams.get("v") || "";
      if (!id && url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] || "";
      if (!id && url.pathname.startsWith("/shorts/")) id = url.pathname.split("/")[2] || "";
      return id ? `youtube:${id}` : "";
    }

    // Vimeo
    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = parts.find((p) => /^\d+$/.test(p)) || "";
      return id ? `vimeo:${id}` : "";
    }

    // Google Drive file
    if (host === "drive.google.com") {
      const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
      if (fileMatch) return `drive:${fileMatch[1]}`;
      const openId = url.searchParams.get("id");
      if (openId) return `drive:${openId}`;
    }

    // Google Docs / Sheets / Slides
    if (host === "docs.google.com") {
      const docMatch = url.pathname.match(/\/(document|spreadsheets|presentation)\/d\/([^/]+)/);
      if (docMatch) return `gdoc:${docMatch[1]}:${docMatch[2]}`;
    }

    // Adobe InDesign online
    if (host === "indd.adobe.com") {
      const id = url.pathname.replace(/\/+$/, "").split("/").pop() || "";
      return id ? `indd:${id}` : "";
    }

    url.hash = "";
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "usp",
    ].forEach((key) => url.searchParams.delete(key));
    const pathname = url.pathname.replace(/\/+$/, "") || "";
    const query = url.searchParams.toString();
    return `${url.protocol}//${host}${pathname}${query ? `?${query}` : ""}`;
  } catch {
    return "";
  }
}

function normalizeVideoLink(value) {
  const first = extractUrls(value)[0] || asText(value).trim();
  return canonicalizeMediaUrl(first);
}

function richTextToPlain(value) {
  if (value == null) return "";
  if (typeof value === "string") return stripBom(value).trim();
  // Airtable rich text cell values are often already strings in scripting;
  // if object, fall back to JSON-ish plain extraction.
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
  if (typeof value === "object" && value.name != null) return [String(value.name).trim()].filter(Boolean);
  return [asText(value)].filter(Boolean);
}

function normalizeTypeLabel(value) {
  return asText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function mapTutorialTypeToAssetType(values) {
  const names = selectNames(values);
  if (!names.length) return null;
  // Target Type of Asset is singleSelect — take first mappable.
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

function isPublished(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null || value === "") return false;
  const text = asText(value).toLowerCase();
  return text === "checked" || text === "true" || text === "yes" || text === "1";
}

function attachmentSummary(value) {
  if (!Array.isArray(value) || !value.length) {
    return { count: 0, filenames: [], ids: [], copyPayload: [] };
  }
  const filenames = [];
  const ids = [];
  const copyPayload = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const filename = asText(item.filename || item.name);
    const id = asText(item.id);
    const url = asText(item.url);
    if (filename) filenames.push(filename);
    if (id) ids.push(id);
    // Airtable scripting can re-ingest attachments via URL when present.
    if (url) copyPayload.push({ url, filename: filename || undefined });
  }
  return { count: value.length, filenames, ids, copyPayload };
}

function diceCoefficient(a, b) {
  const x = String(a || "");
  const y = String(b || "");
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return x === y ? 1 : 0;
  const bigrams = new Map();
  for (let i = 0; i < x.length - 1; i += 1) {
    const gram = x.slice(i, i + 2);
    bigrams.set(gram, (bigrams.get(gram) || 0) + 1);
  }
  let intersection = 0;
  for (let i = 0; i < y.length - 1; i += 1) {
    const gram = y.slice(i, i + 2);
    const count = bigrams.get(gram) || 0;
    if (count > 0) {
      bigrams.set(gram, count - 1);
      intersection += 1;
    }
  }
  return (2 * intersection) / (x.length - 1 + (y.length - 1));
}

function tokenOverlapRatio(a, b) {
  const aTokens = String(a || "")
    .split(" ")
    .filter((t) => t.length > 1);
  const bTokens = String(b || "")
    .split(" ")
    .filter((t) => t.length > 1);
  if (!aTokens.length || !bTokens.length) return 0;
  const bSet = new Set(bTokens);
  const hit = aTokens.filter((t) => bSet.has(t)).length;
  return hit / Math.max(aTokens.length, bTokens.length);
}

function nameSimilarityScore(a, b) {
  const exact = Boolean(a && b && a === b);
  if (exact) return { exact: true, similarity: 1, contained: false, tokenOverlap: 1 };
  const similarity = diceCoefficient(a, b);
  const contained =
    Boolean(a && b) &&
    a.length >= 8 &&
    b.length >= 8 &&
    (a.includes(b) || b.includes(a));
  const tokenOverlap = tokenOverlapRatio(a, b);
  return { exact: false, similarity, contained, tokenOverlap };
}

function fieldExists(table, fieldNameOrId) {
  if (!fieldNameOrId) return false;
  try {
    table.getField(fieldNameOrId);
    return true;
  } catch {
    return false;
  }
}

function resolveField(table, candidates) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  for (const name of list) {
    if (fieldExists(table, name)) return name;
  }
  // BOM-tolerant scan — returns the live field.name (may include BOM), never creates fields.
  try {
    for (const field of table.fields || []) {
      const cleaned = stripBom(field.name);
      for (const candidate of list) {
        if (cleaned === stripBom(candidate)) return field.name;
      }
    }
  } catch {
    // table.fields may be unavailable in some contexts
  }
  return "";
}

/**
 * Resolve Tutorials & Assets primary Name for reads/writes.
 * Prefer stable field ID so BOM in the display name cannot break writes.
 * Never creates a field.
 */
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

  // 1) Confirmed schema field ID
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

  // 2) Table primary field when it is Name (BOM-tolerant)
  try {
    const primary = table.primaryField;
    if (primary && stripBom(primary.name) === expectedCleanName) {
      return asRef(primary, "table.primaryField");
    }
  } catch {
    // continue
  }

  // 3) Scan existing fields only — do not getField("Name") in a way that implies a second field
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

function safeUnloadQuery(query) {
  if (!query) return false;
  try {
    if (typeof query.unloadData === "function") {
      query.unloadData();
      return true;
    }
  } catch {
    // Extension QueryResult variants may throw or omit unloadData — ignore.
  }
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMutationGate(maxPerWindow = MAX_MUTATIONS_PER_WINDOW, windowMs = MUTATION_WINDOW_MS) {
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
  return { waitTurn, timestamps };
}

function isRateLimitError(err) {
  const msg = String(err?.message || err || "");
  return /15 mutations|every 1000ms|rate limit|429|too many requests/i.test(msg);
}

async function mutateWithRetry(gate, fn, { maxRetries = MUTATION_MAX_RETRIES } = {}) {
  let attempt = 0;
  while (true) {
    await gate.waitTurn();
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (!isRateLimitError(err) || attempt > maxRetries) throw err;
      // Back off a full window (or more) before retrying.
      await sleep(MUTATION_WINDOW_MS * attempt);
    }
  }
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
  return (
    choices.find((c) => normalizeTypeLabel(c.name) === wantedNorm) || null
  );
}

/**
 * Airtable scripting single-select write shape: { name: "Option" } (or { id }).
 * Skips and records Notes when the option is missing.
 */
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

/**
 * Airtable scripting multi-select write shape: [{ name: "A" }, { name: "B" }].
 * Omits unknown options and records them in skipped/Notes.
 */
function toMultiSelectValue(table, fieldNameOrId, optionNames, skipped, fieldLabel) {
  const label = fieldLabel || fieldNameOrId;
  const names = Array.isArray(optionNames) ? optionNames : [optionNames];
  const out = [];
  for (const raw of names) {
    const match = findSelectChoice(table, fieldNameOrId, raw);
    if (!match) {
      skipped.push({
        field: label,
        reason: "select_option_missing",
        value: raw,
      });
      continue;
    }
    out.push({ name: match.name });
  }
  return out.length ? out : null;
}

function formatSkippedNotes(skipped) {
  if (!skipped || !skipped.length) return "";
  return `skipped_fields:${skipped
    .map((s) => `${s.field}:${s.reason}${s.value != null ? `=${JSON.stringify(s.value)}` : ""}`)
    .join("; ")}`;
}

function getConfiguredTable(key) {
  const id = CONFIG.prod.tableIds[key];
  const name = CONFIG.tables[key];
  if (id) {
    try {
      return base.getTable(id);
    } catch {
      // fall through to name
    }
  }
  return base.getTable(name);
}

function assertProdBaseContext() {
  const failures = [];
  const baseId = base && base.id ? String(base.id) : "";
  if (!baseId) {
    failures.push({
      code: "missing_base_id",
      message: "Could not read base.id — refuse to assume environment.",
    });
  } else if (baseId !== CONFIG.prod.baseId) {
    failures.push({
      code: "wrong_base",
      message: `This script is locked to PROD base ${CONFIG.prod.baseId}. Current base.id=${baseId}. Do not run WRITE here.`,
    });
  }
  return { ok: failures.length === 0, failures, baseId };
}

/**
 * WRITE preflight: required writable fields + review table must exist.
 * DRY_RUN still classifies matches when preflight fails; WRITE must abort.
 */
function buildWritePreflight({
  targetTable,
  reportTable,
  reportTableError,
  targetPrimaryName,
  missingReportFields,
  baseCheck,
}) {
  const failures = [];

  if (baseCheck && !baseCheck.ok) {
    failures.push(...baseCheck.failures);
  }

  if (!targetPrimaryName || !targetPrimaryName.id) {
    failures.push({
      code: "missing_target_primary_name",
      message:
        "Could not resolve Tutorials & Assets primary Name field (expected BOM-safe Name / fldduBizp8qAnAMJW). Do not create a duplicate Name field — fix the existing primary.",
    });
  } else if (!isWritableField(targetTable, targetPrimaryName.writeKey)) {
    failures.push({
      code: "target_primary_name_not_writable",
      message: `Primary Name field ${targetPrimaryName.id} is not writable.`,
    });
  }

  if (!isWritableField(targetTable, CONFIG.target.legacySourceId)) {
    failures.push({
      code: "missing_legacy_tutorials_record_id",
      message: `Create writable field "${CONFIG.target.legacySourceId}" on "${CONFIG.tables.target}" before WRITE.`,
    });
  }

  if (!isWritableField(targetTable, CONFIG.target.migrationStatus)) {
    failures.push({
      code: "missing_migration_status",
      message: `Create writable field "${CONFIG.target.migrationStatus}" on "${CONFIG.tables.target}" before WRITE.`,
    });
  }

  if (!reportTable) {
    failures.push({
      code: "missing_report_table",
      message:
        reportTableError ||
        `Create table "${CONFIG.tables.report}" with required review fields before WRITE.`,
    });
  } else if (missingReportFields && missingReportFields.length) {
    failures.push({
      code: "missing_report_fields",
      message: `Table "${CONFIG.tables.report}" is missing required fields: ${missingReportFields.join(", ")}`,
      missingFields: missingReportFields.slice(),
    });
  }

  return {
    ok: failures.length === 0,
    failures,
    requiredForWrite: [
      CONFIG.target.legacySourceId,
      CONFIG.target.migrationStatus,
      CONFIG.tables.report,
      ...Object.values(CONFIG.report).filter((v) => v !== "Name"),
    ],
    baseId: baseCheck ? baseCheck.baseId : null,
    expectedProdBaseId: CONFIG.prod.baseId,
  };
}

function compatibleTypePair(sourceType, targetType) {
  if (!sourceType || !targetType) return false;
  if (sourceType === targetType) return true;
  const textish = new Set([
    "singleLineText",
    "multilineText",
    "richText",
    "email",
    "phoneNumber",
    "url",
  ]);
  if (textish.has(sourceType) && textish.has(targetType)) return true;
  if (sourceType === "checkbox" && targetType === "singleSelect") return true;
  if (sourceType === "multipleSelects" && targetType === "singleSelect") return true;
  if (sourceType === "singleLineText" && targetType === "singleSelect") return true;
  if (sourceType === "multipleAttachments" && targetType === "multipleAttachments") return true;
  if (sourceType === "number" && targetType === "number") return true;
  return false;
}

function buildSchemaComparison(sourceTable, targetTable) {
  const sourceFields = [...sourceTable.fields].map((f) => ({
    name: stripBom(f.name),
    type: f.type,
    rawName: f.name,
  }));
  const targetFields = [...targetTable.fields].map((f) => ({
    name: stripBom(f.name),
    type: f.type,
    rawName: f.name,
  }));

  const targetByName = new Map(targetFields.map((f) => [f.name, f]));
  const conceptualMap = [
    { concept: "Name", source: CONFIG.source.name, targetCandidates: CONFIG.target.nameCandidates },
    { concept: "Link to Video", source: CONFIG.source.video, targetCandidates: [CONFIG.target.video] },
    { concept: "Sort Order", source: CONFIG.source.sortOrder, targetCandidates: [CONFIG.target.sortOrder] },
    { concept: "Type", source: CONFIG.source.tutorialType, targetCandidates: [CONFIG.target.typeOfAsset] },
    { concept: "Associated Program", source: CONFIG.source.program, targetCandidates: [CONFIG.target.program] },
    { concept: "Brief Description", source: CONFIG.source.brief, targetCandidates: [CONFIG.target.brief] },
    { concept: "Detailed Description", source: CONFIG.source.detailed, targetCandidates: [CONFIG.target.detailed] },
    { concept: "Athlete", source: CONFIG.source.athlete, targetCandidates: [CONFIG.target.athlete] },
    {
      concept: "Athlete Headshot",
      source: CONFIG.source.athleteHeadshot,
      targetCandidates: [CONFIG.target.athleteHeadshot],
    },
    { concept: "Thumbnail", source: CONFIG.source.thumbnail, targetCandidates: [CONFIG.target.thumbnail] },
    {
      concept: "Display Image",
      source: CONFIG.source.displayImage,
      targetCandidates: [CONFIG.target.displayImage],
    },
    { concept: "Publish", source: CONFIG.source.publish, targetCandidates: [CONFIG.target.publish] },
    { concept: "Category", source: CONFIG.source.category, targetCandidates: [] },
  ];

  const targetPrimaryName = resolveTargetPrimaryNameField(targetTable);

  const mapping = [];
  const cannotCopy = [];
  const manualMapping = [];

  for (const row of conceptualMap) {
    const sourceExists = fieldExists(sourceTable, row.source);
    let targetName = "";
    let targetFieldId = null;
    if (row.concept === "Name" && targetPrimaryName) {
      targetName = targetPrimaryName.name;
      targetFieldId = targetPrimaryName.id;
    } else if (row.targetCandidates.length) {
      targetName = resolveField(targetTable, row.targetCandidates);
    }
    const sourceType = sourceExists ? getFieldType(sourceTable, row.source) : "";
    const targetType = targetName
      ? getFieldType(targetTable, targetFieldId || targetName)
      : "";

    if (!sourceExists) {
      mapping.push({
        concept: row.concept,
        status: "source_missing",
        sourceField: row.source,
        targetField: targetName || null,
        targetFieldId,
      });
      continue;
    }

    if (!targetName) {
      cannotCopy.push({
        concept: row.concept,
        sourceField: row.source,
        sourceType,
        reason: "no_compatible_target_field",
      });
      mapping.push({
        concept: row.concept,
        status: "cannot_copy",
        sourceField: row.source,
        targetField: null,
        targetFieldId: null,
        reason: "no_compatible_target_field",
      });
      continue;
    }

    const autoOk = compatibleTypePair(sourceType, targetType);
    const needsManual =
      (row.concept === "Type" && sourceType === "multipleSelects" && targetType === "singleSelect") ||
      (row.concept === "Athlete" && targetType === "singleSelect") ||
      (row.concept === "Publish" && sourceType === "checkbox" && targetType === "singleSelect") ||
      ((row.concept === "Brief Description" || row.concept === "Detailed Description") &&
        sourceType !== targetType);

    if (!autoOk) {
      cannotCopy.push({
        concept: row.concept,
        sourceField: row.source,
        sourceType,
        targetField: targetName,
        targetFieldId,
        targetType,
        reason: "incompatible_types",
      });
      mapping.push({
        concept: row.concept,
        status: "cannot_copy",
        sourceField: row.source,
        targetField: targetName,
        targetFieldId,
        sourceType,
        targetType,
        reason: "incompatible_types",
      });
      continue;
    }

    if (needsManual) {
      manualMapping.push({
        concept: row.concept,
        sourceField: row.source,
        sourceType,
        targetField: targetName,
        targetFieldId,
        targetType,
        note:
          row.concept === "Type"
            ? "Map Tutorial Type multi-select → first Type of Asset single-select (Shout - Out → Shout Out)"
            : row.concept === "Athlete"
              ? "Target Athlete is hardcoded single-select; only copy when exact option exists"
              : row.concept === "Publish"
                ? "Checkbox true → singleSelect 'checked'"
                : "richText/multiline conversion — copy plain text",
      });
    }

    mapping.push({
      concept: row.concept,
      status: needsManual ? "manual_transform" : "compatible",
      sourceField: row.source,
      targetField: targetName,
      targetFieldId,
      sourceType,
      targetType,
      writeKey: row.concept === "Name" && targetPrimaryName ? targetPrimaryName.writeKey : targetName,
    });
  }

  // Target-only fields
  const sourceNames = new Set(sourceFields.map((f) => f.name));
  const targetOnly = targetFields
    .filter((f) => !sourceNames.has(f.name) && !["Legacy Tutorials Record ID", "Migration Status"].includes(f.name))
    .map((f) => ({ name: f.name, type: f.type }));

  const prerequisites = {
    legacyTutorialsRecordId: isWritableField(targetTable, CONFIG.target.legacySourceId),
    migrationStatus: isWritableField(targetTable, CONFIG.target.migrationStatus),
    targetNameField: targetPrimaryName
      ? {
          id: targetPrimaryName.id,
          name: targetPrimaryName.name,
          cleanName: targetPrimaryName.cleanName,
          writeKey: targetPrimaryName.writeKey,
          via: targetPrimaryName.via,
        }
      : null,
    notes: [],
  };
  if (!prerequisites.legacyTutorialsRecordId) {
    prerequisites.notes.push(
      `Create writable field "${CONFIG.target.legacySourceId}" on "${CONFIG.tables.target}" before write mode creates.`,
    );
  }
  if (!prerequisites.migrationStatus) {
    prerequisites.notes.push(
      `Create writable field "${CONFIG.target.migrationStatus}" on "${CONFIG.tables.target}" (recommended option: "${CONFIG.values.migrationStatusCreated}").`,
    );
  }
  if (!prerequisites.targetNameField) {
    prerequisites.notes.push(
      `Could not resolve target primary Name (expected id ${CONFIG.target.primaryNameFieldId}). Do not create a duplicate Name field.`,
    );
  }

  return {
    sourceTable: CONFIG.tables.source,
    targetTable: CONFIG.tables.target,
    sourceFieldCount: sourceFields.length,
    targetFieldCount: targetFields.length,
    sourceLinkFieldCount: sourceFields.filter((f) => f.type === "multipleRecordLinks").length,
    targetLinkFieldCount: targetFields.filter((f) => f.type === "multipleRecordLinks").length,
    targetPrimaryName,
    mapping,
    cannotCopy,
    manualMapping,
    targetOnly,
    prerequisites,
  };
}

function projectSourceRecord(record, fieldNames) {
  const name = asText(record.getCellValue(fieldNames.name));
  const videoRaw = record.getCellValue(fieldNames.video);
  const videoText = asText(videoRaw);
  const attachments = {
    thumbnail: attachmentSummary(record.getCellValue(fieldNames.thumbnail)),
    headshot: attachmentSummary(record.getCellValue(fieldNames.athleteHeadshot)),
    display: attachmentSummary(record.getCellValue(fieldNames.displayImage)),
  };
  return {
    id: record.id,
    name,
    normalizedName: normalizeName(name),
    videoRaw: videoText,
    videoKey: normalizeVideoLink(videoRaw),
    athlete: asText(record.getCellValue(fieldNames.athlete)),
    types: selectNames(record.getCellValue(fieldNames.tutorialType)),
    categories: selectNames(record.getCellValue(fieldNames.category)),
    programs: selectNames(record.getCellValue(fieldNames.program)),
    brief: richTextToPlain(record.getCellValue(fieldNames.brief)),
    detailed: richTextToPlain(record.getCellValue(fieldNames.detailed)),
    published: isPublished(record.getCellValue(fieldNames.publish)),
    sortOrder: record.getCellValue(fieldNames.sortOrder),
    attachments,
    attachmentCount:
      attachments.thumbnail.count + attachments.headshot.count + attachments.display.count,
    raw: record,
  };
}

function projectTargetRecord(record, fieldNames) {
  const name = asText(record.getCellValue(fieldNames.name));
  const videoRaw = record.getCellValue(fieldNames.video);
  const videoText = asText(videoRaw);
  const attachments = {
    thumbnail: attachmentSummary(record.getCellValue(fieldNames.thumbnail)),
    headshot: attachmentSummary(record.getCellValue(fieldNames.athleteHeadshot)),
    display: attachmentSummary(record.getCellValue(fieldNames.displayImage)),
  };
  const legacyId = fieldNames.legacySourceId
    ? asText(record.getCellValue(fieldNames.legacySourceId))
    : "";
  return {
    id: record.id,
    name,
    normalizedName: normalizeName(name),
    videoRaw: videoText,
    videoKey: normalizeVideoLink(videoRaw),
    athlete: asText(record.getCellValue(fieldNames.athlete)),
    types: selectNames(record.getCellValue(fieldNames.typeOfAsset)),
    categories: [],
    programs: selectNames(record.getCellValue(fieldNames.program)),
    brief: richTextToPlain(record.getCellValue(fieldNames.brief)),
    detailed: richTextToPlain(record.getCellValue(fieldNames.detailed)),
    published: isPublished(record.getCellValue(fieldNames.publish)),
    sortOrder: record.getCellValue(fieldNames.sortOrder),
    attachments,
    attachmentCount:
      attachments.thumbnail.count + attachments.headshot.count + attachments.display.count,
    legacySourceId: legacyId,
    raw: record,
  };
}

function findConflicts(source, target) {
  const conflicts = [];
  if (source.normalizedName && target.normalizedName && source.normalizedName !== target.normalizedName) {
    conflicts.push("Name");
  }
  if (source.videoKey && target.videoKey && source.videoKey !== target.videoKey) {
    conflicts.push("Link to Video");
  }
  if (source.brief && target.brief && source.brief !== target.brief) conflicts.push("Brief Description");
  if (source.detailed && target.detailed && source.detailed !== target.detailed) {
    conflicts.push("Detailed Description");
  }
  if (source.published !== target.published) conflicts.push("OK to Publish on Softr");
  if (source.athlete && target.athlete && source.athlete !== target.athlete) conflicts.push("Athlete");
  if (source.programs.length && target.programs.length) {
    const a = [...source.programs].map(normalizeTypeLabel).sort().join("|");
    const b = [...target.programs].map(normalizeTypeLabel).sort().join("|");
    if (a !== b) conflicts.push("Associated Program");
  }
  const sourceTypeKey = source.types.map(normalizeTypeLabel).sort().join("|");
  const targetTypeKey = target.types.map(normalizeTypeLabel).sort().join("|");
  if (sourceTypeKey && targetTypeKey && sourceTypeKey !== targetTypeKey) conflicts.push("Type");
  return conflicts;
}

function scoreMatch(source, target) {
  const reasons = [];
  let score = 0;

  const nameMeta = nameSimilarityScore(source.normalizedName, target.normalizedName);
  const nameExact = nameMeta.exact;
  const nameSimilarity = Math.max(nameMeta.similarity, nameMeta.contained ? 0.9 : 0, nameMeta.tokenOverlap);
  const videoExact = Boolean(source.videoKey && target.videoKey && source.videoKey === target.videoKey);

  if (nameExact) {
    reasons.push("exact_or_near_exact_name");
    score += 40;
  } else if (nameMeta.contained || nameSimilarity >= CONFIG.thresholds.nearNameMin) {
    reasons.push(
      nameMeta.contained
        ? "contained_name_match"
        : `near_name_similarity:${nameSimilarity.toFixed(2)}`,
    );
    score += 32;
  } else if (nameMeta.tokenOverlap >= 0.5 || nameMeta.similarity >= 0.72) {
    reasons.push(
      `fuzzy_name_similarity:${Math.max(nameMeta.similarity, nameMeta.tokenOverlap).toFixed(2)}`,
    );
    score += 20;
  }

  if (videoExact) {
    reasons.push("exact_or_normalized_video_link");
    score += 45;
  }

  if (source.programs.length && target.programs.length) {
    const overlap = source.programs.some((p) =>
      target.programs.some((t) => normalizeTypeLabel(p) === normalizeTypeLabel(t)),
    );
    if (overlap) {
      reasons.push("matching_associated_program");
      score += 6;
    }
  }

  if (source.types.length && target.types.length) {
    const overlap = source.types.some((p) =>
      target.types.some((t) => normalizeTypeLabel(p) === normalizeTypeLabel(t)),
    );
    if (overlap) {
      reasons.push("matching_type");
      score += 6;
    }
  }

  if (source.categories.length && target.categories.length) {
    const overlap = source.categories.some((p) =>
      target.categories.some((t) => normalizeTypeLabel(p) === normalizeTypeLabel(t)),
    );
    if (overlap) {
      reasons.push("matching_category");
      score += 6;
    }
  }

  const conflicts = findConflicts(source, target);
  if (conflicts.length) reasons.push(`conflicts:${conflicts.join("|")}`);

  let classification = null;
  let recommendedAction = "";

  if (!source.normalizedName) {
    classification = CLASSIFICATION.MISSING;
    recommendedAction = CONFIG.values.recommendedMissing;
  } else   if (score >= CONFIG.thresholds.highMinScore && (nameExact || videoExact)) {
    // High confidence still never auto-merges.
    classification = CLASSIFICATION.HIGH;
    recommendedAction = CONFIG.values.recommendedHigh;
  } else if (videoExact && score >= 45) {
    // Normalized video identity alone is enough for high-confidence review (titles may differ).
    classification = CLASSIFICATION.HIGH;
    reasons.push("normalized_video_identity_high_confidence");
    recommendedAction = CONFIG.values.recommendedHigh;
  } else if (nameExact && !source.videoKey && !target.videoKey) {
    // Exact title with no video on either side — treat as high-confidence catalog overlap for review.
    classification = CLASSIFICATION.HIGH;
    reasons.push("exact_name_both_missing_video");
    score = Math.max(score, 70);
    recommendedAction = CONFIG.values.recommendedHigh;
  } else if (score >= CONFIG.thresholds.possibleMinScore) {
    classification = CLASSIFICATION.POSSIBLE;
    recommendedAction = CONFIG.values.recommendedPossible;
  } else if (
    nameExact &&
    source.videoKey &&
    target.videoKey &&
    source.videoKey !== target.videoKey
  ) {
    // Same name, different video — always review.
    classification = CLASSIFICATION.POSSIBLE;
    reasons.push("duplicate_name_different_video");
    recommendedAction = CONFIG.values.recommendedPossible;
  } else {
    classification = null; // caller treats as no match
  }

  return {
    score,
    confidence: Math.min(1, score / 100),
    reasons,
    conflicts,
    classification,
    recommendedAction,
    nameSimilarity,
    nameExact,
    videoExact,
  };
}

function classifySourceAgainstTargets(source, targets) {
  if (!source.normalizedName) {
    return {
      classification: CLASSIFICATION.MISSING,
      confidence: 0,
      score: 0,
      reasons: ["missing_name"],
      conflicts: [],
      recommendedAction: CONFIG.values.recommendedMissing,
      bestTarget: null,
      linkedAssetSummary: "none (both tables have 0 multipleRecordLinks fields in live PROD schema)",
    };
  }

  let best = null;
  for (const target of targets) {
    const result = scoreMatch(source, target);
    if (!result.classification) continue;
    if (!best || result.score > best.score) {
      best = { target, ...result };
    }
  }

  if (!best) {
    return {
      classification: CLASSIFICATION.CREATE,
      confidence: 0,
      score: 0,
      reasons: ["no_likely_match"],
      conflicts: [],
      recommendedAction: CONFIG.values.recommendedCreate,
      bestTarget: null,
      linkedAssetSummary: "none (no link fields on Tutorials or Tutorials & Assets)",
    };
  }

  return {
    classification: best.classification,
    confidence: best.confidence,
    score: best.score,
    reasons: best.reasons,
    conflicts: best.conflicts,
    recommendedAction: best.recommendedAction,
    bestTarget: best.target,
    linkedAssetSummary: "none (no link fields on Tutorials or Tutorials & Assets)",
  };
}

function buildCreateFields(source, targetFieldNames, targetTable) {
  const fields = {};
  const skipped = [];
  const nameField = targetFieldNames.name;
  if (nameField && isWritableField(targetTable, nameField)) {
    fields[nameField] = source.name;
  } else {
    skipped.push({ field: "Name", reason: "target_name_unwritable" });
  }

  if (targetFieldNames.video && isWritableField(targetTable, targetFieldNames.video)) {
    if (source.videoRaw) fields[targetFieldNames.video] = source.videoRaw;
  }

  if (targetFieldNames.sortOrder && isWritableField(targetTable, targetFieldNames.sortOrder)) {
    if (typeof source.sortOrder === "number") fields[targetFieldNames.sortOrder] = source.sortOrder;
  }

  if (targetFieldNames.program && isWritableField(targetTable, targetFieldNames.program)) {
    if (source.programs.length) {
      const multi = toMultiSelectValue(
        targetTable,
        targetFieldNames.program,
        source.programs,
        skipped,
        "Associated Program",
      );
      if (multi) fields[targetFieldNames.program] = multi;
    }
  }

  if (targetFieldNames.brief && isWritableField(targetTable, targetFieldNames.brief)) {
    if (source.brief) fields[targetFieldNames.brief] = source.brief;
  }

  if (targetFieldNames.detailed && isWritableField(targetTable, targetFieldNames.detailed)) {
    if (source.detailed) fields[targetFieldNames.detailed] = source.detailed;
  }

  if (targetFieldNames.typeOfAsset && isWritableField(targetTable, targetFieldNames.typeOfAsset)) {
    const mapped = mapTutorialTypeToAssetType(source.types);
    if (mapped) {
      const single = toSingleSelectValue(
        targetTable,
        targetFieldNames.typeOfAsset,
        mapped,
        skipped,
        "Type of Asset",
      );
      if (single) fields[targetFieldNames.typeOfAsset] = single;
    } else if (source.types.length) {
      skipped.push({ field: "Type of Asset", reason: "unmapped_tutorial_type", value: source.types });
    }
  }

  if (targetFieldNames.athlete && isWritableField(targetTable, targetFieldNames.athlete)) {
    if (source.athlete) {
      const single = toSingleSelectValue(
        targetTable,
        targetFieldNames.athlete,
        source.athlete,
        skipped,
        "Athlete",
      );
      if (single) fields[targetFieldNames.athlete] = single;
    }
  }

  if (targetFieldNames.publish && isWritableField(targetTable, targetFieldNames.publish)) {
    const publishType = getFieldType(targetTable, targetFieldNames.publish);
    if (publishType === "checkbox") {
      fields[targetFieldNames.publish] = source.published === true;
    } else if (publishType === "singleSelect" && source.published) {
      const single = toSingleSelectValue(
        targetTable,
        targetFieldNames.publish,
        "checked",
        skipped,
        "OK to Publish on Softr",
      );
      if (single) fields[targetFieldNames.publish] = single;
    }
  }

  // Attachments — copy via URL payload when available
  const attachmentPairs = [
    [targetFieldNames.thumbnail, source.attachments.thumbnail],
    [targetFieldNames.athleteHeadshot, source.attachments.headshot],
    [targetFieldNames.displayImage, source.attachments.display],
  ];
  for (const [fieldName, summary] of attachmentPairs) {
    if (!fieldName || !isWritableField(targetTable, fieldName)) continue;
    if (summary.copyPayload.length) {
      fields[fieldName] = summary.copyPayload;
    } else if (summary.count > 0) {
      skipped.push({ field: fieldName, reason: "attachment_urls_unavailable_for_copy" });
    }
  }

  if (targetFieldNames.legacySourceId && isWritableField(targetTable, targetFieldNames.legacySourceId)) {
    fields[targetFieldNames.legacySourceId] = source.id;
  } else {
    skipped.push({ field: CONFIG.target.legacySourceId, reason: "missing_or_unwritable" });
  }

  if (targetFieldNames.migrationStatus && isWritableField(targetTable, targetFieldNames.migrationStatus)) {
    const statusType = getFieldType(targetTable, targetFieldNames.migrationStatus);
    if (statusType === "singleSelect") {
      const single = toSingleSelectValue(
        targetTable,
        targetFieldNames.migrationStatus,
        CONFIG.values.migrationStatusCreated,
        skipped,
        "Migration Status",
      );
      if (single) fields[targetFieldNames.migrationStatus] = single;
    } else if (statusType === "singleLineText" || statusType === "multilineText") {
      fields[targetFieldNames.migrationStatus] = CONFIG.values.migrationStatusCreated;
    } else {
      skipped.push({
        field: CONFIG.target.migrationStatus,
        reason: "unsupported_migration_status_type",
        value: statusType,
      });
    }
  } else {
    skipped.push({ field: CONFIG.target.migrationStatus, reason: "missing_or_unwritable" });
  }

  if (source.categories.length) {
    skipped.push({
      field: CONFIG.source.category,
      reason: "no_target_category_field",
      value: source.categories,
    });
  }

  return { fields, skipped };
}

function formatAttachmentCell(summaryBundle) {
  const parts = [];
  for (const [label, summary] of Object.entries(summaryBundle)) {
    if (summary.count) parts.push(`${label}:${summary.count}[${summary.filenames.join("; ")}]`);
  }
  return parts.join(" | ") || "(none)";
}

function buildReportFields(decision, reportFieldNames, reportTable) {
  const target = decision.bestTarget;
  const fields = {};
  const skipped = [];

  const setText = (key, value) => {
    const fieldName = reportFieldNames[key];
    if (!fieldName || value == null || value === "") return;
    fields[fieldName] = value;
  };

  const setSingleSelect = (key, optionName) => {
    const fieldName = reportFieldNames[key];
    if (!fieldName || !optionName) return;
    if (!reportTable) {
      // Offline / missing table — still emit correct shape for tests.
      fields[fieldName] = { name: optionName };
      return;
    }
    const single = toSingleSelectValue(reportTable, fieldName, optionName, skipped, fieldName);
    if (single) fields[fieldName] = single;
  };

  // Primary Name for browsing
  if (reportFieldNames.name) {
    const label = decision.source.name || decision.source.id || "Migration review";
    fields[reportFieldNames.name] = label;
  }

  setText("sourceId", decision.source.id);
  setText("targetId", target ? target.id : decision.createdTargetId || "");
  setSingleSelect("classification", decision.classification);
  if (reportFieldNames.confidence) {
    fields[reportFieldNames.confidence] = Number(decision.confidence.toFixed(3));
  }
  setText("reasons", (decision.reasons || []).join("; "));
  setText("conflicts", (decision.conflicts || []).join("; "));
  setText("sourceName", decision.source.name);
  setText("targetName", target ? target.name : "");
  setText("sourceVideo", decision.source.videoRaw);
  setText("targetVideo", target ? target.videoRaw : "");
  setText("sourceAttachments", formatAttachmentCell(decision.source.attachments));
  setText(
    "targetAttachments",
    target ? formatAttachmentCell(target.attachments) : "",
  );
  setText("linkedAssets", decision.linkedAssetSummary);
  setSingleSelect("reviewDecision", CONFIG.values.reviewDecisionPending);
  setSingleSelect("finalAction", CONFIG.values.finalActionReviewNeeded);
  if (reportFieldNames.reviewed) {
    fields[reportFieldNames.reviewed] = false;
  }

  const noteParts = [
    decision.notes || "",
    decision.recommendedAction || "",
    formatSkippedNotes(skipped),
  ].filter(Boolean);
  setText("notes", noteParts.join(" | "));

  return { fields, skipped };
}

function summarizeDecisions(decisions) {
  const counts = {
    HIGH_CONFIDENCE_MATCH: 0,
    POSSIBLE_MATCH_REVIEW: 0,
    NO_MATCH_CREATE: 0,
    MISSING_REQUIRED_DATA: 0,
  };
  for (const d of decisions) {
    counts[d.classification] = (counts[d.classification] || 0) + 1;
  }
  return counts;
}

function planWrites({
  decisions,
  alreadyMigratedSourceIds,
  existingReportBySourceId,
  canCreateTargets,
  canWriteReport,
}) {
  const creates = [];
  const reportCreates = [];
  const reportUpdates = [];
  const skippedCreates = [];
  const skippedReports = [];

  for (const decision of decisions) {
    const sourceId = decision.source.id;

    if (
      decision.classification === CLASSIFICATION.HIGH ||
      decision.classification === CLASSIFICATION.POSSIBLE ||
      decision.classification === CLASSIFICATION.MISSING
    ) {
      if (!canWriteReport) {
        skippedReports.push({ sourceId, reason: "report_table_or_fields_missing" });
      } else if (existingReportBySourceId.has(sourceId)) {
        reportUpdates.push({
          reportRecordId: existingReportBySourceId.get(sourceId),
          decision,
        });
      } else {
        reportCreates.push(decision);
      }
      continue;
    }

    // NO_MATCH_CREATE
    if (alreadyMigratedSourceIds.has(sourceId)) {
      skippedCreates.push({ sourceId, reason: "already_migrated_legacy_id_present" });
      // Still ensure report row exists for audit trail
      if (canWriteReport) {
        if (existingReportBySourceId.has(sourceId)) {
          reportUpdates.push({
            reportRecordId: existingReportBySourceId.get(sourceId),
            decision: {
              ...decision,
              notes: "Idempotent skip: target already has Legacy Tutorials Record ID",
            },
          });
        } else {
          reportCreates.push({
            ...decision,
            notes: "Idempotent skip: target already has Legacy Tutorials Record ID",
          });
        }
      }
      continue;
    }

    if (!canCreateTargets) {
      skippedCreates.push({
        sourceId,
        reason: "missing_legacy_id_or_migration_status_or_name_field",
      });
    } else {
      creates.push(decision);
    }

    if (canWriteReport) {
      if (existingReportBySourceId.has(sourceId)) {
        reportUpdates.push({
          reportRecordId: existingReportBySourceId.get(sourceId),
          decision,
        });
      } else {
        reportCreates.push(decision);
      }
    } else {
      skippedReports.push({ sourceId, reason: "report_table_or_fields_missing" });
    }
  }

  return { creates, reportCreates, reportUpdates, skippedCreates, skippedReports };
}

// ---------------------------------------------------------------------------
// Main (Airtable Scripting Extension)
// ---------------------------------------------------------------------------

async function main() {
  const writesEnabled = DRY_RUN === false && CONFIRM_WRITE === true;
  const baseCheck = assertProdBaseContext();

  const sourceTable = getConfiguredTable("source");
  const targetTable = getConfiguredTable("target");

  let reportTable = null;
  let reportTableError = "";
  try {
    reportTable = getConfiguredTable("report");
  } catch (err) {
    reportTableError = `Table "${CONFIG.tables.report}" (${CONFIG.prod.tableIds.report}) not found — create it before write mode can log reviews.`;
  }

  const schemaComparison = buildSchemaComparison(sourceTable, targetTable);
  const targetPrimaryName =
    schemaComparison.targetPrimaryName || resolveTargetPrimaryNameField(targetTable);

  const sourceFieldNames = {
    name: CONFIG.source.name,
    video: CONFIG.source.video,
    athlete: CONFIG.source.athlete,
    athleteHeadshot: CONFIG.source.athleteHeadshot,
    thumbnail: CONFIG.source.thumbnail,
    displayImage: CONFIG.source.displayImage,
    tutorialType: CONFIG.source.tutorialType,
    category: CONFIG.source.category,
    program: CONFIG.source.program,
    brief: CONFIG.source.brief,
    detailed: CONFIG.source.detailed,
    publish: CONFIG.source.publish,
    sortOrder: CONFIG.source.sortOrder,
  };

  // Use field ID for primary Name reads/writes (BOM-safe). Never invent a second Name field.
  const targetFieldNames = {
    name: targetPrimaryName ? targetPrimaryName.writeKey : "",
    nameMeta: targetPrimaryName,
    video: CONFIG.target.video,
    athlete: CONFIG.target.athlete,
    athleteHeadshot: CONFIG.target.athleteHeadshot,
    thumbnail: CONFIG.target.thumbnail,
    displayImage: CONFIG.target.displayImage,
    typeOfAsset: CONFIG.target.typeOfAsset,
    program: CONFIG.target.program,
    brief: CONFIG.target.brief,
    detailed: CONFIG.target.detailed,
    assignmentRationale: CONFIG.target.assignmentRationale,
    publish: CONFIG.target.publish,
    sortOrder: CONFIG.target.sortOrder,
    legacySourceId: fieldExists(targetTable, CONFIG.target.legacySourceId)
      ? CONFIG.target.legacySourceId
      : fieldExists(targetTable, CONFIG.prod.fieldIds.targetLegacySourceId)
        ? CONFIG.prod.fieldIds.targetLegacySourceId
        : "",
    migrationStatus: fieldExists(targetTable, CONFIG.target.migrationStatus)
      ? CONFIG.target.migrationStatus
      : fieldExists(targetTable, CONFIG.prod.fieldIds.targetMigrationStatus)
        ? CONFIG.prod.fieldIds.targetMigrationStatus
        : "",
  };

  const reportFieldNames = {};
  const missingReportFields = [];
  if (reportTable) {
    for (const [key, name] of Object.entries(CONFIG.report)) {
      if (fieldExists(reportTable, name)) reportFieldNames[key] = name;
      else if (key !== "name") missingReportFields.push(name);
    }
  } else {
    missingReportFields.push(...Object.values(CONFIG.report).filter((n) => n !== "Name"));
  }

  const preflight = buildWritePreflight({
    targetTable,
    reportTable,
    reportTableError,
    targetPrimaryName,
    missingReportFields: reportTable
      ? missingReportFields
      : Object.values(CONFIG.report).filter((n) => n !== "Name"),
    baseCheck,
  });

  const sourceSelectFields = Object.values(sourceFieldNames).filter((n) => fieldExists(sourceTable, n));
  const targetSelectFields = Object.values(targetFieldNames)
    .filter((v) => typeof v === "string" && v)
    .filter((n) => fieldExists(targetTable, n));

  const sourceQuery = await sourceTable.selectRecordsAsync({ fields: sourceSelectFields });
  const targetQuery = await targetTable.selectRecordsAsync({ fields: targetSelectFields });

  const sources = sourceQuery.records.map((r) => projectSourceRecord(r, sourceFieldNames));
  const targets = targetQuery.records.map((r) => projectTargetRecord(r, targetFieldNames));

  const alreadyMigratedSourceIds = new Set(
    targets.map((t) => t.legacySourceId).filter((id) => id && String(id).startsWith("rec")),
  );

  const existingReportBySourceId = new Map();
  if (reportTable && reportFieldNames.sourceId) {
    const reportQuery = await reportTable.selectRecordsAsync({
      fields: Object.values(reportFieldNames),
    });
    for (const row of reportQuery.records) {
      const sourceId = asText(row.getCellValue(reportFieldNames.sourceId));
      if (sourceId) existingReportBySourceId.set(sourceId, row.id);
    }
    safeUnloadQuery(reportQuery);
  }

  const decisions = sources.map((source) => {
    const match = classifySourceAgainstTargets(source, targets);
    return {
      source,
      ...match,
      notes: "",
    };
  });

  const classificationCounts = summarizeDecisions(decisions);

  const canCreateTargets = preflight.ok;
  const canWriteReport = preflight.ok;

  const plan = planWrites({
    decisions,
    alreadyMigratedSourceIds,
    existingReportBySourceId,
    canCreateTargets,
    canWriteReport,
  });

  const samples = {
    HIGH_CONFIDENCE_MATCH: [],
    POSSIBLE_MATCH_REVIEW: [],
    NO_MATCH_CREATE: [],
    MISSING_REQUIRED_DATA: [],
  };
  for (const d of decisions) {
    const bucket = samples[d.classification];
    if (!bucket || bucket.length >= 8) continue;
    bucket.push({
      sourceId: d.source.id,
      targetId: d.bestTarget ? d.bestTarget.id : null,
      sourceName: d.source.name,
      targetName: d.bestTarget ? d.bestTarget.name : null,
      sourceVideo: d.source.videoRaw,
      targetVideo: d.bestTarget ? d.bestTarget.videoRaw : null,
      confidence: Number(d.confidence.toFixed(3)),
      score: d.score,
      reasons: d.reasons,
      conflicts: d.conflicts,
      recommendedAction: d.recommendedAction,
      sourceAttachments: formatAttachmentCell(d.source.attachments),
      targetAttachments: d.bestTarget ? formatAttachmentCell(d.bestTarget.attachments) : "",
      linkedAssetSummary: d.linkedAssetSummary,
    });
  }

  const writeResults = {
    targetCreatesAttempted: 0,
    targetCreatesSucceeded: 0,
    targetCreatesFailed: [],
    reportCreatesAttempted: 0,
    reportCreatesSucceeded: 0,
    reportUpdatesAttempted: 0,
    reportUpdatesSucceeded: 0,
    reportFailures: [],
    abortedForPreflight: false,
    rateLimitRetries: 0,
    mutationsAttempted: 0,
  };

  const mutationGate = createMutationGate(MAX_MUTATIONS_PER_WINDOW, MUTATION_WINDOW_MS);
  const trackedMutate = async (fn) => {
    writeResults.mutationsAttempted += 1;
    try {
      return await mutateWithRetry(mutationGate, fn);
    } catch (err) {
      if (isRateLimitError(err)) writeResults.rateLimitRetries += 1;
      throw err;
    }
  };

  // WRITE requires preflight.ok — never write when schema prerequisites are missing.
  if (writesEnabled && !preflight.ok) {
    writeResults.abortedForPreflight = true;
  } else if (writesEnabled && preflight.ok) {
    // Creates first (batch-limited) — only NO_MATCH_CREATE (e.g. Shooting Challenge Information Poster)
    if (WRITE_CREATES) {
      for (const decision of plan.creates.slice(0, BATCH_LIMIT)) {
        writeResults.targetCreatesAttempted += 1;
        const built = buildCreateFields(decision.source, targetFieldNames, targetTable);
        try {
          const createdId = await trackedMutate(() => targetTable.createRecordAsync(built.fields));
          writeResults.targetCreatesSucceeded += 1;
          decision.createdTargetId = createdId;
          decision.notes = [
            decision.notes,
            `created_target:${createdId}`,
            formatSkippedNotes(built.skipped),
          ]
            .filter(Boolean)
            .join(" | ");
          alreadyMigratedSourceIds.add(decision.source.id);
        } catch (err) {
          writeResults.targetCreatesFailed.push({
            sourceId: decision.source.id,
            error: String(err?.message || err),
          });
        }
      }
    }

    if (WRITE_REPORT) {
      const reportCreateBatch = plan.reportCreates.slice(0, BATCH_LIMIT);
      for (const decision of reportCreateBatch) {
        writeResults.reportCreatesAttempted += 1;
        if (decision.createdTargetId && !decision.bestTarget) {
          decision.bestTarget = {
            id: decision.createdTargetId,
            name: decision.source.name,
            videoRaw: "",
            attachments: {
              thumbnail: attachmentSummary([]),
              headshot: attachmentSummary([]),
              display: attachmentSummary([]),
            },
          };
        } else if (decision.createdTargetId) {
          decision.notes = [decision.notes, `linked_new_target:${decision.createdTargetId}`]
            .filter(Boolean)
            .join(" | ");
        }
        const builtReport = buildReportFields(decision, reportFieldNames, reportTable);
        const fields = builtReport.fields;
        if (decision.createdTargetId && reportFieldNames.targetId) {
          fields[reportFieldNames.targetId] = decision.createdTargetId;
        }
        try {
          await trackedMutate(() => reportTable.createRecordAsync(fields));
          writeResults.reportCreatesSucceeded += 1;
        } catch (err) {
          writeResults.reportFailures.push({
            sourceId: decision.source.id,
            action: "create",
            error: String(err?.message || err),
          });
        }
      }

      const reportUpdateBatch = plan.reportUpdates.slice(
        0,
        Math.max(0, BATCH_LIMIT - reportCreateBatch.length),
      );
      for (const item of reportUpdateBatch) {
        writeResults.reportUpdatesAttempted += 1;
        const builtReport = buildReportFields(item.decision, reportFieldNames, reportTable);
        const fields = builtReport.fields;
        if (item.decision.createdTargetId && reportFieldNames.targetId) {
          fields[reportFieldNames.targetId] = item.decision.createdTargetId;
        }
        try {
          await trackedMutate(() =>
            reportTable.updateRecordAsync(item.reportRecordId, fields),
          );
          writeResults.reportUpdatesSucceeded += 1;
        } catch (err) {
          writeResults.reportFailures.push({
            sourceId: item.decision.source.id,
            action: "update",
            reportRecordId: item.reportRecordId,
            error: String(err?.message || err),
          });
        }
      }
    }
  }

  const couldNotMigrate = [
    ...decisions
      .filter((d) => d.classification === CLASSIFICATION.MISSING)
      .map((d) => ({ sourceId: d.source.id, name: d.source.name, reason: "MISSING_REQUIRED_DATA" })),
    ...plan.skippedCreates,
    ...writeResults.targetCreatesFailed,
  ];

  const nextSteps = [
    "Confirm C-026 direction: this script migrates Tutorials → Tutorials & Assets, which reverses the current backlog/web-canonical recommendation.",
    `PROD base required: ${CONFIG.prod.baseId}. Tables: Tutorials ${CONFIG.prod.tableIds.source}, Tutorials & Assets ${CONFIG.prod.tableIds.target}, Tutorial Migration Review ${CONFIG.prod.tableIds.report}.`,
    `Create missing target fields if needed: "${CONFIG.target.legacySourceId}", "${CONFIG.target.migrationStatus}".`,
    `Create table "${CONFIG.tables.report}" with the fields listed in CONFIG.report${missingReportFields.length ? ` (missing: ${missingReportFields.join(", ")})` : ""}.`,
    `Primary Name writes use field ID ${CONFIG.target.primaryNameFieldId} (BOM-safe) — do not create a duplicate Name field.`,
    "Run this script with DRY_RUN=true on PROD; save JSON output. Confirm preflight.ok and counts 28/3/1.",
    "Review HIGH_CONFIDENCE_MATCH and POSSIBLE_MATCH_REVIEW rows — decide merge/keep/ignore manually (script never merges).",
    "Set DRY_RUN=false and CONFIRM_WRITE=true only after preflight.ok is true (creates NO_MATCH_CREATE + report rows only; throttled ≤15 mutations/sec).",
    "Expected unmatched create: Shooting Challenge Information Poster.",
    "Re-run until remaining NO_MATCH_CREATE is 0 and report covers all overlaps.",
    "Do NOT delete/rename Tutorials. Do NOT change web/automations/interfaces until Mike approves.",
    "After cutover approval: update web queries, views, Softr/interfaces, then retire Tutorials only after dependency proof.",
  ];

  if (reportTableError) nextSteps.unshift(reportTableError);
  nextSteps.unshift(...schemaComparison.prerequisites.notes);
  if (!preflight.ok) {
    nextSteps.unshift(
      `PREFLIGHT FAILED (${preflight.failures.length}): ${preflight.failures.map((f) => f.code).join(", ")} — WRITE is blocked until fixed.`,
    );
  }

  const remainingCreates = Math.max(
    0,
    classificationCounts.NO_MATCH_CREATE - writeResults.targetCreatesSucceeded,
  );

  const output = {
    automation: CONFIG.scriptName,
    version: CONFIG.version,
    mode: writesEnabled ? (preflight.ok ? "WRITE" : "WRITE_ABORTED_PREFLIGHT") : "DRY_RUN",
    environment: {
      expectedProdBaseId: CONFIG.prod.baseId,
      currentBaseId: baseCheck.baseId || null,
      prodBaseOk: baseCheck.ok,
      tableIds: CONFIG.prod.tableIds,
    },
    flags: {
      DRY_RUN,
      CONFIRM_WRITE,
      BATCH_LIMIT,
      WRITE_CREATES,
      WRITE_REPORT,
      MAX_MUTATIONS_PER_WINDOW,
      MUTATION_WINDOW_MS,
    },
    decisionConflict:
      "C-026 / Agent 8 currently keep Tutorials (web-canonical). This run uses SOURCE=Tutorials TARGET=Tutorials & Assets per Mike request.",
    lastDryRunBaseline: CONFIG.lastDryRunBaseline,
    fullReport: {
      highConfidenceMatches: classificationCounts.HIGH_CONFIDENCE_MATCH,
      possibleMatches: classificationCounts.POSSIBLE_MATCH_REVIEW,
      noMatchCreate: classificationCounts.NO_MATCH_CREATE,
      missingRequiredData: classificationCounts.MISSING_REQUIRED_DATA,
      expectedFromLastDryRun: CONFIG.lastDryRunBaseline,
    },
    schemaComparison,
    fieldMapping: schemaComparison.mapping,
    targetPrimaryNameResolved: targetPrimaryName,
    preflight,
    prerequisites: {
      ...schemaComparison.prerequisites,
      reportTablePresent: Boolean(reportTable),
      reportTableError: reportTableError || null,
      missingReportFields,
      canCreateTargets,
      canWriteReport,
      preflightOk: preflight.ok,
    },
    counts: {
      sourceRecords: sources.length,
      targetRecords: targets.length,
      exactOrHighConfidenceMatches: classificationCounts.HIGH_CONFIDENCE_MATCH,
      possibleMatches: classificationCounts.POSSIBLE_MATCH_REVIEW,
      newTargetRecordsWouldCreate: classificationCounts.NO_MATCH_CREATE,
      newTargetRecordsCreatedThisRun: writeResults.targetCreatesSucceeded,
      manualReviewNeeded:
        classificationCounts.HIGH_CONFIDENCE_MATCH + classificationCounts.POSSIBLE_MATCH_REVIEW,
      missingRequiredData: classificationCounts.MISSING_REQUIRED_DATA,
      alreadyMigratedByLegacyId: alreadyMigratedSourceIds.size,
      remainingCreatesEstimate: remainingCreates,
    },
    classificationCounts,
    recordsThatCouldNotMigrate: couldNotMigrate,
    linkedRecordsRequiringLaterRepair: [
      {
        note:
          "PROD schema shows 0 multipleRecordLinks on both Tutorials and Tutorials & Assets — no Airtable linked assets to move. External Softr/web/interface bindings still need later repair after cutover approval.",
      },
      {
        note:
          "Tutorial - Category exists only on Tutorials; values cannot land on Tutorials & Assets without a new field.",
      },
    ],
    plan: {
      createsQueued: plan.creates.length,
      reportCreatesQueued: plan.reportCreates.length,
      reportUpdatesQueued: plan.reportUpdates.length,
      skippedCreates: plan.skippedCreates,
      skippedReports: plan.skippedReports.slice(0, 20),
      unmatchedCreateNames: plan.creates.map((d) => d.source.name),
    },
    writeResults,
    samples,
    nextStepsBeforeRetiringTutorials: nextSteps,
    safetyReminder: [
      "Tutorials table was not deleted or renamed.",
      "Existing Tutorials & Assets rows were not overwritten.",
      "Overlaps were not merged.",
      "App references / automations / interfaces / code were not modified.",
      "No createFieldAsync / createTableAsync — BOM Name is resolved by field ID only.",
      "Select writes use {name} / [{name}] with option validation; mutations throttled to 15/sec.",
    ],
  };

  console.log(JSON.stringify(output, null, 2));
  safeUnloadQuery(sourceQuery);
  safeUnloadQuery(targetQuery);
}

await main();
