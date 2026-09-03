import { asUrl, lookupItems } from "@/lib/data/airtable-values";

/** Parent-facing Lambda reviewer URLs — never raw S3 object URLs. */
export const LAMBDA_REVIEWER_URL_RE =
  /^https:\/\/[^/]+\.lambda-url\.us-east-2\.on\.aws\/file\/rec[a-zA-Z0-9]{14}(?:\?token=[^&]+)?$/;

export function resolveSecureReviewerUrl(values: unknown): string | null {
  for (const item of lookupItems(values)) {
    const url = asUrl(item);
    if (url && LAMBDA_REVIEWER_URL_RE.test(url)) return url;
  }
  const direct = asUrl(values);
  if (direct && LAMBDA_REVIEWER_URL_RE.test(direct)) return direct;
  return null;
}
