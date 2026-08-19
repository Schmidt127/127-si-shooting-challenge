import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    // Server pages intentionally convert Airtable fetch failures into branded
    // fallback states. Moving all of those routes to error boundaries is a
    // separate UI architecture change, not part of the framework/security
    // upgrade. The mobile menu also intentionally closes when pathname changes.
    rules: {
      "react-hooks/error-boundaries": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "coverage/**",
    "out/**",
    "next-env.d.ts",
  ]),
]);
