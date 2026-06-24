/**
 * Canonical 127 Sports Intensity brand assets for the web app.
 * Files live in /public/brand/ (synced from production S3 URLs below).
 */

export const BRAND_LOGOS = {
  /** Circular stamp — compact nav, favicon source, footers */
  circle: "/brand/logo-circle-blue-orange.png",
  /** Primary horizontal lockup — hub hero, wide headers */
  horizontal: "/brand/logo-v1-blue-orange.png",
} as const;

/** Production source URLs (Make / S3) — re-download if assets change. */
export const BRAND_LOGO_SOURCES = {
  circle:
    "https://make-021891587263-us-east-2-an.s3.us-east-2.amazonaws.com/BlueOrangeCircleLogo.png",
  horizontal:
    "https://make-021891587263-us-east-2-an.s3.us-east-2.amazonaws.com/Logo_V1_Blue_Orange.png",
} as const;

export const BRAND_ORG_NAME = "127 Sports Intensity";
