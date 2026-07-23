"use strict";

/**
 * Normalization helpers for read-only tutorial content audits.
 * No network calls. No Airtable writes.
 */

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
        if (typeof item === "object" && item.name) return String(item.name);
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

function normalizeTitle(value) {
  return asText(value)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
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

function normalizeUrl(value) {
  const raw = extractUrls(value)[0] || asText(value).trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    url.hash = "";
    // Drop common tracking params; keep path/query identity otherwise.
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach(
      (key) => url.searchParams.delete(key),
    );
    let host = url.hostname.toLowerCase().replace(/^www\./, "");
    let pathname = url.pathname.replace(/\/+$/, "") || "";
    const query = url.searchParams.toString();
    return `${url.protocol}//${host}${pathname}${query ? `?${query}` : ""}`;
  } catch {
    return "";
  }
}

function normalizeVideoUrl(value) {
  return normalizeUrl(value);
}

function asStringArray(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string") return item.trim();
        if (typeof item === "object" && item.name) return String(item.name).trim();
        return String(item).trim();
      })
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,|;]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [asText(value)].filter(Boolean);
}

function normalizeGradeBand(value) {
  const text = asText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
  return text;
}

function attachmentIds(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      return String(item.id || item.attachmentId || "").trim();
    })
    .filter(Boolean);
}

function contentHash(record) {
  if (record && typeof record.contentHash === "string" && record.contentHash.trim()) {
    return record.contentHash.trim().toLowerCase();
  }
  if (record && record.fields && typeof record.fields.contentHash === "string") {
    return record.fields.contentHash.trim().toLowerCase();
  }
  return "";
}

function isPublished(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null || value === "") return false;
  const text = asText(value).toLowerCase();
  return text === "checked" || text === "true" || text === "yes" || text === "1";
}

function mapAssetTypeToTutorialType(value) {
  const raw = asText(value).trim();
  const map = {
    Tutorial: "Tutorial",
    "Shout Out": "Shout - Out",
    "Shout - Out": "Shout - Out",
    "FBC Article Book": "FBC Article Book",
  };
  if (Object.prototype.hasOwnProperty.call(map, raw)) return map[raw];
  return null;
}

module.exports = {
  stripBom,
  asText,
  normalizeTitle,
  extractUrls,
  normalizeUrl,
  normalizeVideoUrl,
  asStringArray,
  normalizeGradeBand,
  attachmentIds,
  contentHash,
  isPublished,
  mapAssetTypeToTutorialType,
};
