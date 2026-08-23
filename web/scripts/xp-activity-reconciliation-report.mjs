/**
 * Reconciliation report for one enrollment's submission ↔ XP Event mapping.
 * Usage: npx tsx scripts/xp-activity-reconciliation-report.mjs [enrollmentId]
 */
import { writeFileSync } from "node:fs";
import { loadXpActivityForEnrollment } from "../lib/data/xp-activity-loader.ts";

const ENR = process.argv[2] || "rec93mAfo5jKqP3g5";
const outPath =
  process.argv[3] || `/opt/cursor/artifacts/xp-activity-reconciliation-${ENR}.json`;

async function main() {
  const result = await loadXpActivityForEnrollment(ENR, { maxRows: 200 });

  const report = {
    enrollmentId: ENR,
    strategy: result.strategy,
    warning: result.warning,
    displayedRowCount: result.rows.length,
    missingXpSubmissionIds: result.missingXpSubmissionIds,
    displayedRows: result.rows.map((row) => ({
      xpEventId: row.id,
      source: row.sourceLabel,
      displayedDate: row.activityDate,
      points: row.points,
    })),
    reconciliation: result.reconciliation,
  };

  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ enrollmentId: ENR, outPath, ...report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
