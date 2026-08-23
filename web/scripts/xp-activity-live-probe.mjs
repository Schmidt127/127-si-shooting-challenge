/**
 * Live probe: compare broken ARRAYJOIN({Enrollment}) vs Enrollment Record ID filter.
 * Usage: node scripts/xp-activity-live-probe.mjs [enrollmentId]
 */

const ENR = process.argv[2] || "recCyFEPeATOVNlr9";
const token = process.env.AIRTABLE_API_TOKEN?.trim();
const baseId = process.env.AIRTABLE_BASE_ID?.trim();

if (!token || !baseId) {
  console.error("Missing AIRTABLE_API_TOKEN or AIRTABLE_BASE_ID");
  process.exit(1);
}

async function listXp(filterByFormula, maxRecords = 10) {
  const params = new URLSearchParams({
    filterByFormula,
    pageSize: String(maxRecords),
    maxRecords: String(maxRecords),
  });
  params.append("fields[]", "Source Key");
  params.append("fields[]", "XP Source");
  params.append("fields[]", "Active XP Points");
  params.append("fields[]", "XP Activity Date");

  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent("XP Events")}?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    throw new Error(`Airtable ${response.status}: ${await response.text()}`);
  }
  const body = await response.json();
  return body.records ?? [];
}

const brokenFilter = `FIND("${ENR}", ARRAYJOIN({Enrollment}))`;
const fixedFilter = `{Enrollment Record ID}="${ENR}"`;

const [broken, fixed] = await Promise.all([
  listXp(brokenFilter),
  listXp(fixedFilter, 100),
]);

console.log(
  JSON.stringify(
    {
      enrollmentId: ENR,
      brokenFormula: brokenFilter,
      brokenCount: broken.length,
      fixedFormula: fixedFilter,
      fixedCount: fixed.length,
      sampleFixed: fixed.slice(0, 3).map((row) => ({
        id: row.id,
        source: row.fields?.["XP Source"],
        points: row.fields?.["Active XP Points"],
        date: row.fields?.["XP Activity Date"],
      })),
    },
    null,
    2,
  ),
);
