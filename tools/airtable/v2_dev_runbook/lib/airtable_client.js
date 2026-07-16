"use strict";

const {
  DEV_BASE_ID,
  REQUIRED_TABLES,
  REQUIRED_FIELDS,
} = require("./constants");
const {
  SafetyError,
  assertDevBaseId,
  getToken,
  getBaseId,
} = require("./safety");

/**
 * Minimal DEV-only Airtable REST client.
 * Refuses any base other than DEV. Never logs tokens.
 */
function createAirtableClient({ env, fetchImpl, dryRun = true } = {}) {
  const baseId = assertDevBaseId(getBaseId(env));
  const token = getToken(env);
  if (!token) {
    throw new SafetyError("missing_token", "AIRTABLE_TOKEN is missing.");
  }
  const fetchFn = fetchImpl || global.fetch;
  if (!fetchFn) {
    throw new SafetyError(
      "missing_fetch",
      "No fetch implementation available (Node 18+ required for live calls).",
    );
  }

  async function request(method, table, { recordId = "", body = null, query = "" } = {}) {
    if (baseId !== DEV_BASE_ID) {
      throw new SafetyError("prod_base_refused", "Client baseId is not DEV.");
    }
    const encodedTable = encodeURIComponent(table);
    let url = `https://api.airtable.com/v0/${baseId}/${encodedTable}`;
    if (recordId) url += `/${recordId}`;
    if (query) url += query.startsWith("?") ? query : `?${query}`;

    if (dryRun && method !== "GET") {
      return {
        dryRun: true,
        method,
        table,
        recordId,
        body,
        wouldCall: url.replace(token, "[redacted]"),
      };
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const res = await fetchFn(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 400) };
    }
    if (!res.ok) {
      throw new SafetyError(
        "airtable_http_error",
        `Airtable ${method} ${table} failed: HTTP ${res.status}`,
      );
    }
    return json;
  }

  return {
    baseId,
    dryRun,
    async listRecords(table, { maxRecords = 5, filterByFormula = "" } = {}) {
      const params = new URLSearchParams();
      params.set("pageSize", String(Math.min(maxRecords, 100)));
      params.set("maxRecords", String(maxRecords));
      if (filterByFormula) params.set("filterByFormula", filterByFormula);
      return request("GET", table, { query: `?${params.toString()}` });
    },
    async createRecord(table, fields) {
      return request("POST", table, { body: { fields, typecast: true } });
    },
    async updateRecord(table, recordId, fields) {
      return request("PATCH", table, { recordId, body: { fields, typecast: true } });
    },
    async deleteRecord(table, recordId) {
      return request("DELETE", table, { recordId });
    },
    async metaTables() {
      // Schema endpoint — read-only
      const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
      const res = await fetchFn(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new SafetyError(
          "airtable_http_error",
          `Airtable meta tables failed: HTTP ${res.status}`,
        );
      }
      return res.json();
    },
  };
}

/**
 * Offline/schema-less verify used when no network — validates required
 * table/field names against a provided meta snapshot or returns planned checks.
 */
function planSchemaChecks() {
  return {
    requiredTables: [...REQUIRED_TABLES],
    requiredFields: { ...REQUIRED_FIELDS },
  };
}

function evaluateSchemaMeta(meta) {
  const tables = (meta && meta.tables) || [];
  const byName = new Map(tables.map((t) => [t.name, t]));
  const missingTables = REQUIRED_TABLES.filter((name) => !byName.has(name));
  const missingFields = [];
  for (const [tableName, fields] of Object.entries(REQUIRED_FIELDS)) {
    const table = byName.get(tableName);
    if (!table) continue;
    const fieldNames = new Set((table.fields || []).map((f) => f.name));
    for (const field of fields) {
      if (!fieldNames.has(field)) {
        missingFields.push(`${tableName}.${field}`);
      }
    }
  }
  return {
    ok: missingTables.length === 0 && missingFields.length === 0,
    missingTables,
    missingFields,
    tableCount: tables.length,
  };
}

module.exports = {
  createAirtableClient,
  planSchemaChecks,
  evaluateSchemaMeta,
};
