// Overnight audit helper: syntax-check Airtable automation scripts (top-level await wrapped).
const fs = require("fs");
const files = process.argv.slice(2);
let failed = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  try {
    // Airtable scripts allow top-level await; wrap in async function for parsing.
    new Function("input", "base", "output", "fetch", "remoteFetchAsync", "console",
      "return (async () => {" + src + "\n})();");
    const v = src.match(/version: *"(v[\d.]+)"/);
    console.log("PARSE OK", f, v ? v[1] : "(no version)");
  } catch (e) {
    failed++;
    console.log("PARSE FAIL", f, e.message);
  }
}
process.exit(failed ? 1 : 0);
