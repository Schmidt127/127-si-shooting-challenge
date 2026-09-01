#!/usr/bin/env node
/**
 * One-off PHA homework catalog diagnostic (read-only).
 * Loads web/.env.local when present.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const token = process.env.AIRTABLE_API_TOKEN?.trim();
const baseId = process.env.AIRTABLE_BASE_ID?.trim();
if (!token || !baseId) {
  console.error("Missing AIRTABLE_API_TOKEN or AIRTABLE_BASE_ID");
  process.exit(1);
}

async function listTable(tableName, params = {}) {
  const records = [];
  let offset;
  do {
    const search = new URLSearchParams();
    if (params.filterByFormula) search.set("filterByFormula", params.filterByFormula);
    if (params.fields?.length) {
      for (const field of params.fields) search.append("fields[]", field);
    }
    search.set("pageSize", "100");
    if (offset) search.set("offset", offset);
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?${search}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.text();
    if (!res.ok) {
      throw new Error(`Airtable ${res.status} on ${tableName}: ${body.slice(0, 500)}`);
    }
    const json = JSON.parse(body);
    records.push(...json.records);
    offset = json.offset;
  } while (offset);
  return records;
}

const REGISTERING_FILTER = "AND({Program - Linked}='Shooting Challenge',{Status}='Registering')";

try {
  const programInstances = await listTable("Program Instance - Sync", {
    filterByFormula: REGISTERING_FILTER,
    fields: ["Name - Program Instance", "School Year - Linked", "Program - Linked", "Status", "Record Id"],
  });
  console.log("Program instances:", programInstances.length);
  for (const pi of programInstances) {
    console.log("  PI:", pi.id, pi.fields["Name - Program Instance"], pi.fields["School Year - Linked"]);
  }

  if (programInstances.length !== 1) {
    throw new Error(`Expected 1 Registering SC PI, found ${programInstances.length}`);
  }

  const pi = programInstances[0];
  const schoolYear = pi.fields["School Year - Linked"];
  const expectedName = `Shooting Challenge | ${schoolYear}`;
  const name = pi.fields["Name - Program Instance"];
  if (name !== expectedName) {
    throw new Error(`PI name mismatch: expected "${expectedName}", got "${name}"`);
  }

  const phaFilter = `AND({Active?}=1,FIND('${pi.id}',ARRAYJOIN({Program Instance RID})))`;
  const phaRecords = await listTable("Program Homework Assignments", {
    filterByFormula: phaFilter,
    fields: [
      "Homework Assignment",
      "Program Instance",
      "Program Instance RID",
      "Week",
      "Grade Band",
      "Homework Slot",
      "Active?",
      "Due Date",
    ],
  });
  console.log("Active PHA rows:", phaRecords.length);

  const slots = new Map();
  const duplicateSlotKeys = [];
  const homeworkIds = new Set();
  const weekIds = new Set();

  for (const pha of phaRecords) {
    const hw = pha.fields["Homework Assignment"]?.[0]?.id;
    const week = pha.fields.Week?.[0]?.id;
    const piLink = pha.fields["Program Instance"]?.[0]?.id;
    const slot = pha.fields["Homework Slot"]?.name ?? pha.fields["Homework Slot"];
    if (hw) homeworkIds.add(hw);
    if (week) weekIds.add(week);
    if (piLink && week && slot) {
      const key = `${piLink}|${week}|${slot}`;
      if (slots.has(key) && slots.get(key) !== pha.id) {
        if (!duplicateSlotKeys.includes(key)) duplicateSlotKeys.push(key);
      } else {
        slots.set(key, pha.id);
      }
    }
  }

  if (duplicateSlotKeys.length) {
    throw new Error(`Duplicate PHA slots: ${duplicateSlotKeys.join(", ")}`);
  }

  const libraryRecords = await listTable("Homework Library", {
    filterByFormula: `OR(${[...homeworkIds].map((id) => `RECORD_ID()='${id}'`).join(",")})`,
    fields: ["Assignment Full Name - Display"],
  });
  const libraryIds = new Set(libraryRecords.map((r) => r.id));
  const missing = [...homeworkIds].filter((id) => !libraryIds.has(id));
  if (missing.length) {
    throw new Error(`Missing Homework Library records: ${missing.join(", ")}`);
  }

  console.log("SUCCESS: catalog would load", phaRecords.length, "assignments,", weekIds.size, "weeks");
} catch (err) {
  console.error("FAIL:", err.message);
  process.exit(1);
}
