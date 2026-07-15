/**
 * Canonical 127 Sports Intensity brand assets for the web app.
 * Files live in /public/brand/ (synced from production S3 URLs below).
 *
 * Logo variants available in-repo:
 * - circle: compact nav / favicon
 * - horizontal: wide headers / footers
 * Stacked logo: NOT present in web/public/brand/ — do not invent paths.
 * Use horizontal centered, or circle, for centered branded areas until a
 * stacked asset is added from the approved brand kit.
 */

export const BRAND_LOGOS = {
  /** Circular stamp — compact nav, favicon source, footers */
  circle: "/brand/logo-circle-blue-orange.png",
  /** Primary horizontal lockup — wide headers, footers, hub hero */
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

export const BRAND_COLORS = {
  blue: "#0034B7",
  orange: "#FF8B00",
  charcoal: "#262626",
  lightGray: "#F2F2F2",
  mediumGray: "#C4C4C4",
  white: "#FFFFFF",
} as const;

/** Controlled Shooting Challenge supporting palette (never dominate brand). */
export const PROGRAM_COLORS = {
  navy: "#001A5C",
  courtTan: "#C4A574",
  mutedGold: "#C9A227",
} as const;

/**
 * Typography note: Magistral (display) is licensed for desktop brand kit use.
 * Web uses Maven Pro 700–800 for display headings until approved web font files
 * are added under web/public/fonts/ (do not invent CDN URLs).
 */
export const BRAND_TYPOGRAPHY = {
  display: "Maven Pro",
  displayFallbackReason: "Magistral web font files not present in repository",
  body: "Maven Pro",
} as const;
