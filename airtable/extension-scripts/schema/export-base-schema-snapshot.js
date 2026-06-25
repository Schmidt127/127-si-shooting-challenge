/*
Extension Script: Export Base Schema Snapshot
System: 127 SI Shooting Challenge
Purpose:
  Exports table + field schema from inside Airtable (no schema PAT required).
  Use when tools/airtable/export_airtable_schema.py fails with 403 on meta API.

Output:
  JSON to console — copy and save as:
  airtable/schema/snapshots/YYYY-MM-DD/schema_scripting_export.json

Default: read-only
*/

// @ts-nocheck

const CONFIG = {
  scriptName: "export-base-schema-snapshot",
  version: "v1.0",
};

function serializeField(field) {
  const row = {
    id: field.id,
    name: field.name,
    type: field.type,
    isComputed: field.isComputed === true,
  };

  try {
    if (field.description) row.description = field.description;
  } catch {
    // description not always available
  }

  try {
    const options = field.options;
    if (options !== undefined && options !== null) {
      row.options = options;
    }
  } catch {
    // some field types throw when options unavailable
  }

  return row;
}

function serializeTable(table) {
  return {
    id: table.id,
    name: table.name,
    fields: table.fields.map(serializeField),
  };
}

async function main() {
  const tables = base.tables.map(serializeTable);

  const payload = {
    script: CONFIG.scriptName,
    version: CONFIG.version,
    exportedAt: new Date().toISOString(),
    baseName: base.name,
    tableCount: tables.length,
    fieldCount: tables.reduce((sum, table) => sum + table.fields.length, 0),
    tables,
    notes: [
      "Exported via Airtable Scripting API (in-base).",
      "Formula text is in field.options.formula when type=formula.",
      "For full view metadata and dependency graphs, use export_airtable_schema.py with schema.bases:read PAT.",
    ],
  };

  console.log("===== EXPORT BASE SCHEMA SNAPSHOT =====");
  console.log(JSON.stringify(payload, null, 2));
}

await main();
