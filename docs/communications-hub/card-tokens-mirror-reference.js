/**
 * FUT-043 — Hub email card token mirror (reference copy for communications repo)
 *
 * Canonical web tokens: web/app/globals.css + web/docs/sc-card-design-tokens.md
 * Production path in Hub repo: emails/lib/card-tokens.js
 *
 * Keep numeric values aligned with the web token table when either side changes.
 */

export const SC_CARD = {
  radius: "12px",
  radiusSm: "8px",
  borderColor: "#d8d8d8",
  bg: "#ffffff",
  shadow: "0 1px 3px rgba(38, 38, 38, 0.08)",
  paddingRow: "1.25rem",
  paddingPanel: "1.25rem",
  sectionTitleSize: "18px",
  sectionTitleWeight: "800",
  headingSize: "16px",
  headingWeight: "700",
  eyebrowSize: "11px",
  eyebrowTracking: "0.22em",
  bgAccent: "#FFF7ED",
  borderColorAccent: "#FFCC80",
  bgBlue: "#F5F8FF",
  borderColorBlue: "#B3C7F0",
};

export function scCardShellStyle(overrides = {}) {
  return {
    borderRadius: SC_CARD.radius,
    border: `1px solid ${SC_CARD.borderColor}`,
    backgroundColor: SC_CARD.bg,
    boxShadow: SC_CARD.shadow,
    ...overrides,
  };
}

export function scCardHeadingStyle(overrides = {}) {
  return {
    fontSize: SC_CARD.headingSize,
    fontWeight: SC_CARD.headingWeight,
    margin: 0,
    ...overrides,
  };
}
