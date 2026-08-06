#!/usr/bin/env node
/**
 * Create Enrollment Record ID Lookup + update Submitted Same Day? formula (PROD).
 * Gated Perfect Week fixture timestamp path.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
function loadEnv() {
  for (const p of [resolve(ROOT, "web/.env.local"), resolve(ROOT, ".env.local"), resolve(ROOT, ".env")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const TOKEN = process.env.AIRTABLE_API_TOKEN;
const BASE = "appn84sqPw03zEbTT";
const SUB_TABLE = "tblEVjVpGGlPTsYSt";
const SAME_DAY_FIELD = "fldE7G8H1O7HPYuIi";
const ENROLLMENT_LINK = "fld0fKiO62UiztNQH";
const ENROLLMENT_RECORD_ID = "fldnsyxEUbrJjyzXU"; // Enrollments.Record Id = RECORD_ID()
const ACTIVITY_DATE = "fldpkkSBsx8kQRZos";
const SUBMITTED_AT = "fld7JJ7neI0YYmB7i"; // production path (CREATED_TIME twin of Created)
const SCHMIDT_ENR = "recCyFEPeATOVNlr9";

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

const ORIGINAL_FORMULA = `IF(
  AND(
    {${SUBMITTED_AT}},
    {${ACTIVITY_DATE}}
  ),
  IF(
    DATETIME_FORMAT(SET_TIMEZONE({${SUBMITTED_AT}}, "America/Denver"), "YYYY-MM-DD") =
    DATETIME_FORMAT({${ACTIVITY_DATE}}, "YYYY-MM-DD"),
    1,
    0
  ),
  0
)`;

async function metaGet() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE}/tables`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`meta ${res.status} ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const applyFormula = process.argv.includes("--apply-formula");
  const createLookup = process.argv.includes("--create-lookup");

  const meta = await metaGet();
  const sub = meta.tables.find((t) => t.id === SUB_TABLE);
  const tRec = sub.fields.find((f) => f.name === "Perfect Week Test Record?");
  const tAt = sub.fields.find((f) => f.name === "Perfect Week Test Submitted At");
  let lookup = sub.fields.find((f) => f.name === "Enrollment Record ID Lookup");

  if (!tRec || !tAt) {
    throw new Error("New test fields missing — wait for Mike to create them");
  }

  const report = {
    testRecordField: { name: tRec.name, id: tRec.id, type: tRec.type },
    testSubmittedAtField: {
      name: tAt.name,
      id: tAt.id,
      type: tAt.type,
      timeZone: tAt.options?.timeZone,
    },
    originalFormulaFieldIds: ORIGINAL_FORMULA,
    productionUsesSubmittedAtNotCreated: true,
    submittedAtId: SUBMITTED_AT,
    createdId: "fld4G2aFUD8mxwjJ5",
  };

  if (!lookup && createLookup) {
    const res = await fetch(
      `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${SUB_TABLE}/fields`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Enrollment Record ID Lookup",
          type: "multipleLookupValues",
          description:
            "Gated PW fixtures: lookup Enrollments.Record Id. Used by Submitted Same Day? test path only.",
          options: {
            recordLinkFieldId: ENROLLMENT_LINK,
            fieldIdInLinkedTable: ENROLLMENT_RECORD_ID,
          },
        }),
      }
    );
    const text = await res.text();
    report.createLookup = { status: res.status, body: text.slice(0, 1000) };
    if (!res.ok) throw new Error(`create lookup failed: ${text}`);
    lookup = JSON.parse(text);
  } else if (!lookup) {
    report.lookupStatus = "MISSING — run with --create-lookup";
  } else {
    report.lookupStatus = "exists";
    report.lookup = { id: lookup.id, type: lookup.type };
  }

  // Refresh if just created
  const meta2 = lookup?.id && !lookup.options ? await metaGet() : null;
  if (meta2) {
    lookup = meta2.tables
      .find((t) => t.id === SUB_TABLE)
      .fields.find((f) => f.name === "Enrollment Record ID Lookup");
  }

  const lookupId = lookup?.id;
  const testRecId = tRec.id;
  const testAtId = tAt.id;

  // Preserve number 1/0 output; production branch keeps Submitted At (existing field), not Created twin.
  const NEW_FORMULA = `IF(
  AND(
    {${testRecId}},
    {${testAtId}},
    FIND("${SCHMIDT_ENR}", ARRAYJOIN({${lookupId}})) > 0
  ),
  IF(
    AND(
      {${testAtId}},
      {${ACTIVITY_DATE}}
    ),
    IF(
      DATETIME_FORMAT(SET_TIMEZONE({${testAtId}}, "America/Denver"), "YYYY-MM-DD") =
      DATETIME_FORMAT({${ACTIVITY_DATE}}, "YYYY-MM-DD"),
      1,
      0
    ),
    0
  ),
  IF(
    AND(
      {${SUBMITTED_AT}},
      {${ACTIVITY_DATE}}
    ),
    IF(
      DATETIME_FORMAT(SET_TIMEZONE({${SUBMITTED_AT}}, "America/Denver"), "YYYY-MM-DD") =
      DATETIME_FORMAT({${ACTIVITY_DATE}}, "YYYY-MM-DD"),
      1,
      0
    ),
    0
  )
)`;

  // Human-readable names version for docs
  const NEW_FORMULA_NAMED = `IF(
  AND(
    {Perfect Week Test Record?},
    {Perfect Week Test Submitted At},
    FIND("${SCHMIDT_ENR}", ARRAYJOIN({Enrollment Record ID Lookup})) > 0
  ),
  IF(
    AND(
      {Perfect Week Test Submitted At},
      {Activity Date}
    ),
    IF(
      DATETIME_FORMAT(SET_TIMEZONE({Perfect Week Test Submitted At}, "America/Denver"), "YYYY-MM-DD") =
      DATETIME_FORMAT({Activity Date}, "YYYY-MM-DD"),
      1,
      0
    ),
    0
  ),
  IF(
    AND(
      {Submitted At},
      {Activity Date}
    ),
    IF(
      DATETIME_FORMAT(SET_TIMEZONE({Submitted At}, "America/Denver"), "YYYY-MM-DD") =
      DATETIME_FORMAT({Activity Date}, "YYYY-MM-DD"),
      1,
      0
    ),
    0
  )
)`;

  const ORIGINAL_NAMED = `IF(
  AND(
    {Submitted At},
    {Activity Date}
  ),
  IF(
    DATETIME_FORMAT(SET_TIMEZONE({Submitted At}, "America/Denver"), "YYYY-MM-DD") =
    DATETIME_FORMAT({Activity Date}, "YYYY-MM-DD"),
    1,
    0
  ),
  0
)`;

  report.newFormulaNamed = NEW_FORMULA_NAMED;
  report.originalFormulaNamed = ORIGINAL_NAMED;
  report.lookupId = lookupId;

  if (applyFormula) {
    if (!lookupId) throw new Error("Cannot apply formula without lookup field");
    const res = await fetch(
      `https://api.airtable.com/v0/meta/bases/${BASE}/tables/${SUB_TABLE}/fields/${SAME_DAY_FIELD}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          description:
            "Same Denver calendar day for submit vs activity. Gated PW fixtures for Enrollment recCyFEPeATOVNlr9 may use Perfect Week Test Submitted At when Test Record? is checked; all other records use Submitted At (CREATED_TIME).",
          options: { formula: NEW_FORMULA },
        }),
      }
    );
    const text = await res.text();
    report.applyFormula = { status: res.status, body: text.slice(0, 1500) };
    if (!res.ok) throw new Error(`apply formula failed: ${text}`);
  }

  const out = resolve(
    ROOT,
    "docs/testing/perfect-week/fixtures/_pw-test-path-formula.json"
  );
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (dry) console.log("dry-run only");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
