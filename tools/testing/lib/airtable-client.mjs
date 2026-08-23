/**
 * Shared Airtable REST helpers for testing tools.
 * Never logs tokens. Prefer filterByFormula over direct GET when PAT row scope varies.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, "../../..");
export const BASE_DEFAULT = "appn84sqPw03zEbTT";

export function loadEnv() {
  for (const p of [
    resolve(ROOT, "web/.env.local"),
    resolve(ROOT, ".env.local"),
    resolve(ROOT, ".env"),
  ]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2];
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}

export function requireToken() {
  loadEnv();
  const token = process.env.AIRTABLE_API_TOKEN?.trim();
  const baseId = (process.env.AIRTABLE_BASE_ID || BASE_DEFAULT).trim();
  if (!token) throw new Error("AIRTABLE_API_TOKEN missing");
  return { token, baseId };
}

export function airtableHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function apiRequest(token, baseId, method, tableOrPath, body, query) {
  const path = tableOrPath.includes("/")
    ? tableOrPath
    : `${encodeURIComponent(tableOrPath)}${query ? `?${query}` : ""}`;
  const url = `https://api.airtable.com/v0/${baseId}/${path}`;
  const res = await fetch(url, {
    method,
    headers: airtableHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`${method} ${tableOrPath} ${res.status}: ${text.slice(0, 400)}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function getRecord(token, baseId, table, id) {
  try {
    return await apiRequest(token, baseId, "GET", `${encodeURIComponent(table)}/${id}`);
  } catch (err) {
    if (err.status !== 403) throw err;
    const rows = await listRecords(token, baseId, table, {
      filterByFormula: `RECORD_ID()="${id}"`,
      maxRecords: 1,
    });
    if (!rows.length) {
      const blocked = new Error(`Record not visible: ${table}/${id}`);
      blocked.status = 404;
      throw blocked;
    }
    return rows[0];
  }
}

export async function listRecords(token, baseId, table, { fields, filterByFormula, maxRecords = 100 } = {}) {
  const params = new URLSearchParams({ pageSize: "100" });
  if (filterByFormula) params.set("filterByFormula", filterByFormula);
  if (maxRecords) params.set("maxRecords", String(maxRecords));
  if (fields) for (const f of fields) params.append("fields[]", f);

  const records = [];
  let offset;
  do {
    if (offset) params.set("offset", offset);
    const data = await apiRequest(token, baseId, "GET", table, null, params.toString());
    records.push(...(data.records || []));
    offset = data.offset;
    if (maxRecords && records.length >= maxRecords) break;
  } while (offset);
  return maxRecords ? records.slice(0, maxRecords) : records;
}

export async function createRecords(token, baseId, table, records) {
  return apiRequest(token, baseId, "POST", table, { records, typecast: true });
}

export async function updateRecords(token, baseId, table, records) {
  return apiRequest(token, baseId, "PATCH", table, { records, typecast: true });
}

export async function deleteRecords(token, baseId, table, ids) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));
  const results = [];
  for (const chunk of chunks) {
    const query = chunk.map((id) => `records[]=${id}`).join("&");
    const data = await apiRequest(token, baseId, "DELETE", `${encodeURIComponent(table)}?${query}`);
    results.push(...(data.records || []));
  }
  return results;
}

export async function listTableNames(token, baseId) {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`meta tables ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data.tables || [];
}
