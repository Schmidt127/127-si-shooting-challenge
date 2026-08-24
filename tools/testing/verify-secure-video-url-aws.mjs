#!/usr/bin/env node
/**
 * Disposable AWS URL verification for secure video pipeline (read-only).
 * Uses Airtable to read URL fields; probes anonymously without logging tokens.
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classifySecureVideoUrl, redactSecureVideoUrl } from "../../lib/secure-video-url.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
for (const p of [resolve(ROOT, "web/.env.local"), resolve(ROOT, ".env.local")]) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[m[1]] = val;
  }
}

const token = process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_TOKEN;
const base = process.env.PROBE_BASE_ID || process.env.AIRTABLE_BASE_ID || "appn84sqPw03zEbTT";
const assetId = process.env.PROBE_ASSET_ID || "recaXBfjeeu3bcm0t";

if (!token) {
  console.error("AIRTABLE_API_TOKEN missing");
  process.exit(1);
}

async function getAsset(id) {
  const fields = ["Reviewer File URL", "Canonical File URL", "Upload Status", "Reviewer Access Token"];
  const params = new URLSearchParams();
  for (const f of fields) params.append("fields[]", f);
  const res = await fetch(
    `https://api.airtable.com/v0/${base}/Submission%20Assets/${id}?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`asset ${res.status}`);
  return res.json();
}

async function probeAnonymous(url) {
  if (!url) return { skipped: true };
  try {
    const res = await fetch(url, { redirect: "manual" });
    const loc = res.headers.get("location") || "";
    const body = (await res.text()).slice(0, 400);
    return {
      status: res.status,
      redirect: Boolean(loc),
      locationHost: loc ? new URL(loc).host : "",
      hasPresignRedirect: /X-Amz-|amazonaws\.com/i.test(loc),
      accessDeniedXml: /<Code>AccessDenied<\/Code>/i.test(body),
    };
  } catch (error) {
    return { error: String(error.message || error).slice(0, 120) };
  }
}

const asset = await getAsset(assetId);
const reviewer = asset.fields?.["Reviewer File URL"] || "";
const canonical = asset.fields?.["Canonical File URL"] || "";
const reviewerClass = classifySecureVideoUrl(reviewer);
const canonicalClass = classifySecureVideoUrl(canonical);

const report = {
  assetId,
  uploadStatus: asset.fields?.["Upload Status"] || "",
  reviewerTokenPresent: Boolean(asset.fields?.["Reviewer Access Token"]),
  reviewerClass: reviewerClass.classification,
  canonicalClass: canonicalClass.classification,
  reviewerRedacted: redactSecureVideoUrl(reviewer),
  canonicalRedacted: redactSecureVideoUrl(canonical),
  reviewerProbe: await probeAnonymous(reviewerClass.safeUrl || reviewer),
  canonicalProbe: await probeAnonymous(canonical),
  reportContainsToken: JSON.stringify({ reviewerRedacted: redactSecureVideoUrl(reviewer) }).includes(
    String(reviewer).match(/token=([^&]+)/)?.[1] || "__none__"
  ),
};

const outPath = resolve(ROOT, "tools/testing/_secure_video_url_aws_report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

const ok =
  reviewerClass.classification === "valid_lambda_viewer" &&
  (report.reviewerProbe.status === 302 || report.reviewerProbe.redirect === true) &&
  (report.canonicalProbe.accessDeniedXml === true || report.canonicalProbe.status === 403) &&
  report.reportContainsToken === false;

process.exit(ok ? 0 : 2);
