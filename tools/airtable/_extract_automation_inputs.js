#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "../../airtable/automations/shooting-challenge");
const known = [
  "recordId",
  "makeWebhookUrl",
  "webhookUrl",
  "sendMode",
  "sendModeInput",
  "testRecipientEmail",
  "replyTo",
  "dryRun",
  "emptyWeekPolicy",
  "allowSchmidtInput",
  "includeSchmidt",
  "excludedEnrollmentIds",
];

for (const f of fs
  .readdirSync(dir)
  .filter((x) => x.endsWith(".js") && !x.startsWith("_"))
  .sort()) {
  const c = fs.readFileSync(path.join(dir, f), "utf8");
  const ver =
    (c.match(/version:\s*"([^"]+)"/) ||
      c.match(/Version:\s*([^\r\n]+)/) ||
      [])[1] || "?";
  const tight = new Set();
  for (const m of c.matchAll(/\bcfg\.([A-Za-z0-9_]+)/g)) tight.add(m[1]);
  for (const k of known) {
    if (
      c.includes(`cfg.${k}`) ||
      c.includes(`inputConfig.${k}`) ||
      c.includes(`config.${k}`)
    ) {
      tight.add(k);
    }
  }
  console.log(
    [
      f.replace(/\.js$/, ""),
      String(ver).trim().slice(0, 16),
      [...tight].sort().join("|") || "(none)",
      /\bfetch\s*\(/.test(c) ? "fetch" : "",
    ].join("\t")
  );
}
