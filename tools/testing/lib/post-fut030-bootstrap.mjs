/**
 * Post-FUT-030 disposable fixture bootstrap.
 * Creates VERIFY| athlete + enrollment when legacy Schmidt enrollments were wiped.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  requireToken,
  createRecords,
  listRecords,
  deleteRecords,
  ROOT,
} from "./airtable-client.mjs";

export const MANIFEST_PATH = resolve(ROOT, "docs/testing/evidence/post-fut030-bootstrap/latest.json");
export const VERIFY_PREFIX = "VERIFY|";

export async function listFirst(token, baseId, table) {
  const rows = await listRecords(token, baseId, table, { maxRecords: 5 });
  return rows[0] || null;
}

export async function bootstrapDisposableEnrollment(token, baseId, { stamp = null, parentEmail = "mschmidt@fairfield.k12.mt.us" } = {}) {
  const runStamp = stamp || new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
  const suffix = runStamp.slice(-8);

  const pi = await listFirst(token, baseId, "Program Instance - Sync");
  const school = await listFirst(token, baseId, "School - Synced");
  const gradeBand = await listFirst(token, baseId, "Grade Bands");
  if (!pi?.id || !school?.id || !gradeBand?.id) {
    throw new Error("Post-FUT-030 bootstrap missing Program Instance, School, or Grade Band seed rows");
  }

  const athleteRes = await createRecords(token, baseId, "Athletes", [
    {
      fields: {
        "First Name": "VERIFY",
        "Last Name": suffix,
        "Parent Email": parentEmail,
        "Active?": true,
      },
    },
  ]);
  const athleteId = athleteRes.records[0].id;

  const enrollmentRes = await createRecords(token, baseId, "Enrollments", [
    {
      fields: {
        Athlete: [athleteId],
        "Athlete First Name": "VERIFY",
        "Athlete Last Name": suffix,
        "Parent First Name": "Mike",
        "Parent Last Name": "Schmidt",
        "Parent Email": parentEmail,
        "Athlete Email": parentEmail,
        "School Year": "2026-2027",
        Grade: "11",
        "Grade Band": [gradeBand.id],
        School: [school.id],
        "Program Instance": [pi.id],
        "Active?": true,
      },
    },
  ]);
  const enrollmentId = enrollmentRes.records[0].id;

  const manifest = {
    harness: "post-fut030-bootstrap",
    createdAt: new Date().toISOString(),
    stamp: runStamp,
    prefix: `${VERIFY_PREFIX}${runStamp}`,
    athleteId,
    enrollmentId,
    programInstanceId: pi.id,
    gradeBandId: gradeBand.id,
    schoolId: school.id,
  };

  mkdirSync(resolve(ROOT, "docs/testing/evidence/post-fut030-bootstrap"), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifest;
}

export function loadBootstrapManifest(path = MANIFEST_PATH) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

export async function cleanupBootstrapManifest(token, baseId, manifest) {
  if (!manifest) return { deleted: [] };
  const deleted = [];
  if (manifest.enrollmentId) {
    try {
      await deleteRecords(token, baseId, "Enrollments", [manifest.enrollmentId]);
      deleted.push(`Enrollments/${manifest.enrollmentId}`);
    } catch {
      /* best effort */
    }
  }
  if (manifest.athleteId) {
    try {
      await deleteRecords(token, baseId, "Athletes", [manifest.athleteId]);
      deleted.push(`Athletes/${manifest.athleteId}`);
    } catch {
      /* best effort */
    }
  }
  return { deleted };
}
