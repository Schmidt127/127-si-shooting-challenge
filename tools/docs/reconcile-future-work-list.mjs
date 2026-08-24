import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");
const legacyPath = path.join(root, "tools/docs/_legacy-work-list-snapshot.md");
const listPath = path.join(root, "docs/127-SI-MASTER-FUTURE-WORK-LIST.md");

const trackedUnder = {
  "SC-068": "C-010",
  "SC-067": "V2-013",
  "SC-105": "C-026",
  "SC-117": "C-022",
  "SC-134": "V2-011",
  "SC-135": "V2-012",
  "SC-097": "C-023",
  "SC-098": "C-023",
  "SC-034": "V2-002",
  "SC-064": "C-018",
  "SC-133": "V2-010",
  "SC-088": "C-025-EMAIL",
  "SC-076": "SC-027",
  "SC-086": "SC-074",
};

const monitoring = new Set([
  "SC-014",
  "SC-023",
  "SC-027",
  "SC-083",
  "SC-004",
  "SC-008",
  "SC-061",
  "SC-095",
  "SC-006",
]);

const relatedNotes = {
  "C-010":
    "Canonical for Active? hardening; merged SC-068 (PPE backfill, automation guards, 072/118/119 Schmidt visibility conflict).",
  "C-026":
    "Canonical for Tutorials table merge; merged SC-105 (web cutover proof, Dribble category audit EXT-QA-003).",
  "C-022":
    "Canonical for Presentation-field policy; SC-117 web wiring tracked here; email slices V2-003/V2-004.",
  "C-023": "Canonical for content-hash dedup; merged SC-097/SC-098 proof slices.",
  "V2-002": "Canonical for config-over-scripts audit; merged SC-034 implementation pass.",
  "V2-011": "Canonical for pre-season audit pack; merged SC-134.",
  "V2-012": "Canonical for Schmidt dry-run season; merged SC-135.",
  "V2-013": "Canonical for Program Instance architecture; merged SC-067.",
  "C-018": "Canonical for intake-open vs challenge-run calendars; merged SC-064 wiring.",
  "C-025-EMAIL": "Canonical for Zoom recording approval email; merged SC-088 live proof.",
  "V2-010": "Canonical for pre-season parent comms; merged SC-133.",
  "C-011":
    "Related proof slices: SC-031 and SC-035 — not duplicate deliverables.",
  "C-017": "Related to SC-060; keep both — SC-060 covers intake-reopen validation.",
  "SC-060": "Related to C-017; keep open for intake-reopen validation work.",
  "SC-031": "Proof slice for C-011 weekly email automation — keep open.",
  "SC-035": "Proof slice for C-011 WAS build path — keep open.",
};

function splitRow(line) {
  const sanitized = line.replace(/\\\|/g, "\u0000");
  const parts = sanitized.split("|");
  if (parts.length < 3) return null;
  return parts.slice(1, -1).map((s) => s.replace(/\u0000/g, "|").trim());
}

function patchSectionBLine(line) {
  if (!line.startsWith("| **SC-")) return line;
  const cols = splitRow(line);
  if (!cols || cols.length < 7) return line;
  const id = cols[0].replace(/\*\*/g, "");
  if (trackedUnder[id]) cols[4] = `Tracked under ${trackedUnder[id]}`;
  else if (monitoring.has(id)) cols[4] = "Monitoring";
  if (relatedNotes[id]) cols[6] = `${relatedNotes[id]} ${cols[6]}`.trim();
  return `| **${id}** | ${cols.slice(1).join(" | ")} |`;
}

function patchSectionA(line) {
  if (!line.startsWith("| **C-") && !line.startsWith("| **V2-")) return line;
  const cols = splitRow(line);
  if (!cols || cols.length < 5) return line;
  const id = cols[0].replace(/\*\*/g, "");
  if (relatedNotes[id]) cols[4] = relatedNotes[id];
  return `| **${id}** | ${cols.slice(1).join(" | ")} |`;
}

const legacy = fs.readFileSync(legacyPath, "utf8");
const sectionAStart = legacy.indexOf("## Section A");
const sectionBStart = legacy.indexOf("## Section B");
const supplementaryStart = legacy.indexOf("## Supplementary context");
if (sectionAStart < 0 || sectionBStart < 0) {
  throw new Error("Legacy snapshot missing Section A/B");
}

let legacyBody = legacy.slice(sectionAStart, supplementaryStart > 0 ? supplementaryStart : undefined);
legacyBody = legacyBody
  .split("\n")
  .filter((line) => !/^\| \*\*SC-079\*\*/.test(line))
  .map((line) => {
    if (line.startsWith("| **SC-")) return patchSectionBLine(line);
    if (line.startsWith("| **C-") || line.startsWith("| **V2-")) return patchSectionA(line);
    return line;
  })
  .join("\n");

const reconciliation = `## F. Legacy C-/SC- inventory (reconciled 2026-08-24)

The owner-facing **FUT-** items above are the active future-work queue. The tables below preserve migrated **C-/V2-/SC-** IDs from historical planning documents with duplicate reconciliation applied. Use them for traceability and evidence lookup — not as a second active queue.

### Duplicate reconciliation summary

| Overlap | Canonical | Other status |
|---------|-----------|--------------|
| C-010 / SC-068 | **C-010** | SC-068 → Tracked under C-010 |
| V2-013 / SC-067 | **V2-013** | SC-067 → Tracked under V2-013 |
| C-026 / SC-105 | **C-026** | SC-105 → Tracked under C-026 |
| C-022 / SC-117 | **C-022** | SC-117 → Tracked under C-022 |
| V2-002 / SC-034 | **V2-002** | SC-034 → Tracked under V2-002 |
| V2-011 / SC-134 | **V2-011** | SC-134 → Tracked under V2-011 |
| V2-012 / SC-135 | **V2-012** | SC-135 → Tracked under V2-012 |
| C-023 / SC-097 / SC-098 | **C-023** | SC-097/098 → Tracked under C-023 |
| C-018 / SC-064 | **C-018** | SC-064 → Tracked under C-018 |
| C-025-EMAIL / SC-088 | **C-025-EMAIL** | SC-088 → Tracked under C-025-EMAIL |
| V2-010 / SC-133 | **V2-010** | SC-133 → Tracked under V2-010 |
| SC-027 / SC-076 | **SC-027** | SC-076 → Tracked under SC-027 |
| SC-074 / SC-086 | **SC-074** | SC-086 → Tracked under SC-074 |
| C-011 / SC-031 / SC-035 | **C-011** | SC-031/035 stay open (proof slices) |
| C-017 / SC-060 | **Both open** | Related; cross-reference only |

**Monitoring** (Live Tested with optional follow-up only): SC-004, SC-006, SC-008, SC-014, SC-023, SC-061, SC-083, SC-095, SC-027.

Removed corrupted migration row **SC-079**.

`;

let current = fs.readFileSync(listPath, "utf8");
const marker = "## F. Legacy C-/SC- inventory";
if (current.includes(marker)) {
  current = current.slice(0, current.indexOf(marker));
}
if (!current.includes("## Governance")) {
  const governance = `## Governance

**Canonical future-work source:** this document.

**Operating mode:** [CHATGPT-PROJECT-OPERATING-MODE.md](./CHATGPT-PROJECT-OPERATING-MODE.md) · [AGENTS.md](../AGENTS.md)

**Work-list policy:** Items already listed here may proceed without a separate backlog-ID approval. New work must be added to this list and assigned an identifier before implementation.

**Historical evidence:** [SHOOTING_CHALLENGE_COMPLETION_MASTER.md](./SHOOTING_CHALLENGE_COMPLETION_MASTER.md) · retired [v2-change-backlog.md](./v2-change-backlog.md) (git: \`2f243d8\`) · retired [CHATGPT-MASTER-PLAN-BRIEF.md](./CHATGPT-MASTER-PLAN-BRIEF.md) (git: \`a081b76\`)

---

`;
  current = current.replace("## How to use this document", `${governance}## How to use this document`);
}

current = `${current.trim()}\n\n---\n\n${reconciliation}${legacyBody.trim()}\n`;
fs.writeFileSync(listPath, current);
console.log("Appended reconciled legacy inventory to master future work list");
